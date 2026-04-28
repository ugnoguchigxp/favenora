import type {
  CompleteUploadInput,
  CreateExternalSourceInput,
  CreateUploadIntentInput,
  DeliveryUrlQuery,
  MediaAsset,
  MediaKind,
  MediaUploadIntent,
  ProviderUploadIntent,
  UpdateMediaAssetInput,
} from '../../../shared/schemas/media.schema';
import { ForbiddenError, NotFoundError, ValidationError } from '../../lib/errors';
import {
  type DeliveryProvider,
  LocalDeliveryProvider,
  LocalStorageProvider,
  NoopTransformProvider,
  type StorageProvider,
  type TransformProvider,
} from './media.providers';
import {
  InMemoryMediaRepository,
  type MediaRepository,
  type StoredMediaAsset,
  type StoredMediaVariant,
} from './media.repository';

const DEFAULT_MAX_UPLOAD_BYTES = 250 * 1024 * 1024;
const DEFAULT_UPLOAD_TTL_SECONDS = 15 * 60;

const allowedMimeTypePrefixes = ['image/', 'video/', 'audio/', 'text/'];
const allowedExactMimeTypes = new Set([
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/json',
  'application/octet-stream',
]);

export type MediaServiceDependencies = {
  repository?: MediaRepository;
  storageProviders?: StorageProvider[];
  deliveryProviders?: DeliveryProvider[];
  transformProvider?: TransformProvider;
  now?: () => Date;
  maxUploadBytes?: number;
  uploadTtlSeconds?: number;
};

export type CreateUploadIntentResult = {
  asset: MediaAsset;
  uploadIntent: MediaUploadIntent;
  providerUpload: ProviderUploadIntent;
};

export class MediaService {
  private readonly repository: MediaRepository;

  private readonly storageProviders: Map<string, StorageProvider>;

  private readonly deliveryProviders: Map<string, DeliveryProvider>;

  private readonly transformProvider: TransformProvider;

  private readonly now: () => Date;

  private readonly maxUploadBytes: number;

  private readonly uploadTtlSeconds: number;

  constructor(dependencies: MediaServiceDependencies = {}) {
    this.repository = dependencies.repository ?? new InMemoryMediaRepository();
    const storageProviders = dependencies.storageProviders ?? [new LocalStorageProvider()];
    const deliveryProviders = dependencies.deliveryProviders ?? [new LocalDeliveryProvider()];
    this.storageProviders = new Map(storageProviders.map((provider) => [provider.key, provider]));
    this.deliveryProviders = new Map(deliveryProviders.map((provider) => [provider.key, provider]));
    this.transformProvider = dependencies.transformProvider ?? new NoopTransformProvider();
    this.now = dependencies.now ?? (() => new Date());
    this.maxUploadBytes = dependencies.maxUploadBytes ?? DEFAULT_MAX_UPLOAD_BYTES;
    this.uploadTtlSeconds = dependencies.uploadTtlSeconds ?? DEFAULT_UPLOAD_TTL_SECONDS;
  }

  async createUploadIntent(input: CreateUploadIntentInput): Promise<CreateUploadIntentResult> {
    this.validateUploadMetadata(input.mimeType, input.byteSize);

    const mediaKind = inferMediaKind(input.mimeType);
    const provider = this.selectStorageProvider();
    const expiresAt = new Date(this.now().getTime() + this.uploadTtlSeconds * 1000);

    const pendingAsset = await this.repository.createAsset({
      ownerId: input.ownerId,
      ownerType: input.ownerType,
      mediaKind,
      status: 'pending_upload',
      visibility: input.visibility,
      providerKey: provider.key,
      storageHandle: '',
      originalFilename: input.originalFilename,
      mimeType: input.mimeType,
      byteSize: input.byteSize,
      checksum: input.checksum ?? null,
    });

    const providerIntent = await provider.createUploadIntent({
      mediaId: pendingAsset.id,
      ownerId: input.ownerId,
      mimeType: input.mimeType,
      byteSize: input.byteSize,
      originalFilename: input.originalFilename,
      expiresAt,
    });

    const asset = await this.repository.updateAsset(pendingAsset.id, {
      storageHandle: providerIntent.storageHandle,
    });
    if (!asset) {
      throw new NotFoundError('Media asset not found');
    }

    const uploadIntent = await this.repository.createUploadIntent({
      mediaId: asset.id,
      providerKey: provider.key,
      expiresAt: expiresAt.toISOString(),
      maxBytes: input.byteSize,
      allowedMimeTypes: [input.mimeType],
      status: 'pending',
    });

    return {
      asset: publicAsset(asset),
      uploadIntent,
      providerUpload: providerIntent.providerUpload,
    };
  }

  async completeUpload(
    mediaId: string,
    input: CompleteUploadInput,
    actorId: string
  ): Promise<MediaAsset> {
    const asset = await this.getOwnedAsset(mediaId, actorId);
    if (asset.status !== 'pending_upload') {
      throw new ValidationError('Media asset is not awaiting upload');
    }

    const intent = await this.repository.findLatestUploadIntent(mediaId);
    if (!intent || intent.status !== 'pending') {
      throw new ValidationError('No pending upload intent exists for media asset');
    }
    if (new Date(intent.expiresAt).getTime() <= this.now().getTime()) {
      await this.repository.updateUploadIntentStatus(intent.id, 'expired');
      throw new ValidationError('Upload intent has expired');
    }

    const provider = this.getStorageProvider(asset.providerKey);
    const metadata = await provider.confirmUpload({
      storageHandle: asset.storageHandle,
      expectedByteSize: input.byteSize ?? asset.byteSize ?? 0,
      expectedChecksum: input.checksum ?? asset.checksum,
    });

    if (asset.byteSize !== null && metadata.byteSize !== asset.byteSize) {
      throw new ValidationError('Uploaded object size does not match upload intent');
    }
    if (asset.checksum && metadata.checksum && metadata.checksum !== asset.checksum) {
      throw new ValidationError('Uploaded object checksum does not match upload intent');
    }

    await this.repository.updateUploadIntentStatus(intent.id, 'completed');
    const uploadedAsset = await this.repository.updateAsset(mediaId, {
      status: 'processing',
      byteSize: metadata.byteSize,
      checksum: metadata.checksum ?? asset.checksum,
      mimeType: metadata.mimeType ?? asset.mimeType,
      mediaKind: inferMediaKind(metadata.mimeType ?? asset.mimeType ?? ''),
      width: metadata.width ?? null,
      height: metadata.height ?? null,
      durationMs: metadata.durationMs ?? null,
    });
    if (!uploadedAsset) {
      throw new NotFoundError('Media asset not found');
    }

    await this.transformProvider.enqueueTransforms({
      mediaId,
      storageHandle: asset.storageHandle,
      mediaKind: uploadedAsset.mediaKind,
    });

    const readyAsset = await this.repository.updateAsset(mediaId, {
      status: 'ready',
    });
    if (!readyAsset) {
      throw new NotFoundError('Media asset not found');
    }

    return publicAsset(readyAsset);
  }

  async getAsset(mediaId: string, actorId: string): Promise<MediaAsset> {
    return publicAsset(await this.getReadableAsset(mediaId, actorId));
  }

  async listVariants(mediaId: string, actorId: string): Promise<StoredMediaVariant[]> {
    await this.getReadableAsset(mediaId, actorId);
    return this.repository.listVariants(mediaId);
  }

  async createDeliveryUrl(mediaId: string, query: DeliveryUrlQuery, actorId: string) {
    const asset = await this.getReadableAsset(mediaId, actorId);
    if (asset.status !== 'ready') {
      throw new ValidationError('Media asset is not ready for delivery');
    }
    if (asset.visibility === 'private' && query.purpose !== 'editor') {
      throw new ForbiddenError('Private media requires editor delivery purpose');
    }

    const provider = this.getDeliveryProvider(asset.providerKey);
    const variant = query.variantKind
      ? (await this.repository.listVariants(mediaId)).find(
          (candidate) => candidate.variantKind === query.variantKind
        )
      : null;
    const delivery = await provider.createDeliveryUrl({
      storageHandle: variant?.storageHandle ?? asset.storageHandle,
      purpose: query.purpose,
      variantKind: query.variantKind,
      ttlSeconds: query.ttlSeconds,
      isPublic: asset.visibility === 'public' && query.purpose !== 'download',
    });

    return {
      mediaId,
      variantId: variant?.id ?? null,
      purpose: query.purpose,
      url: delivery.url,
      expiresAt: delivery.expiresAt,
    };
  }

  async createExternalSource(input: CreateExternalSourceInput): Promise<MediaAsset> {
    const providerKey = 'remote_url';
    const asset = await this.repository.createAsset({
      ownerId: input.ownerId,
      ownerType: input.ownerType,
      mediaKind: 'external_embed',
      status: 'ready',
      visibility: input.visibility,
      providerKey,
      storageHandle: input.url,
      originalFilename: null,
      mimeType: null,
      byteSize: null,
      checksum: null,
    });

    await this.repository.createExternalSource({
      mediaId: asset.id,
      sourceType: input.sourceType,
      url: input.url,
      providerName: input.providerName ?? null,
      embedHtml: input.embedHtml ?? null,
      thumbnailUrl: input.thumbnailUrl ?? null,
      metadata: input.metadata ?? null,
      lastFetchedAt: this.now().toISOString(),
    });

    return publicAsset(asset);
  }

  async updateAsset(
    mediaId: string,
    input: UpdateMediaAssetInput,
    actorId: string
  ): Promise<MediaAsset> {
    await this.getOwnedAsset(mediaId, actorId);
    const asset = await this.repository.updateAsset(mediaId, input);
    if (!asset) {
      throw new NotFoundError('Media asset not found');
    }
    return publicAsset(asset);
  }

  async deleteAsset(mediaId: string, actorId: string): Promise<void> {
    await this.getOwnedAsset(mediaId, actorId);
    await this.repository.updateAsset(mediaId, {
      status: 'deleted',
      deletedAt: this.now().toISOString(),
    });
  }

  async listDashboardMedia(ownerId: string): Promise<MediaAsset[]> {
    const assets = await this.repository.listAssetsByOwner(ownerId);
    return assets.map(publicAsset);
  }

  private validateUploadMetadata(mimeType: string, byteSize: number) {
    if (byteSize > this.maxUploadBytes) {
      throw new ValidationError('File exceeds media upload size limit', {
        maxUploadBytes: this.maxUploadBytes,
      });
    }
    if (!isAllowedMimeType(mimeType)) {
      throw new ValidationError('MIME type is not allowed for media upload', { mimeType });
    }
  }

  private selectStorageProvider(): StorageProvider {
    const provider =
      this.storageProviders.get('local') ?? Array.from(this.storageProviders.values())[0];
    if (!provider) {
      throw new ValidationError('No media storage provider is configured');
    }
    return provider;
  }

  private getStorageProvider(providerKey: string): StorageProvider {
    const provider = this.storageProviders.get(providerKey);
    if (!provider) {
      throw new ValidationError('Media storage provider is not configured', { providerKey });
    }
    return provider;
  }

  private getDeliveryProvider(providerKey: string): DeliveryProvider {
    const provider = this.deliveryProviders.get(providerKey) ?? this.deliveryProviders.get('local');
    if (!provider) {
      throw new ValidationError('Media delivery provider is not configured', { providerKey });
    }
    return provider;
  }

  private async getOwnedAsset(mediaId: string, actorId: string): Promise<StoredMediaAsset> {
    const asset = await this.repository.findAssetById(mediaId);
    if (!asset || asset.status === 'deleted') {
      throw new NotFoundError('Media asset not found');
    }
    if (asset.ownerId !== actorId) {
      throw new ForbiddenError('Media asset belongs to another owner');
    }
    return asset;
  }

  private async getReadableAsset(mediaId: string, actorId: string): Promise<StoredMediaAsset> {
    const asset = await this.repository.findAssetById(mediaId);
    if (!asset || asset.status === 'deleted') {
      throw new NotFoundError('Media asset not found');
    }
    if (asset.visibility !== 'public' && asset.ownerId !== actorId) {
      throw new ForbiddenError('Media asset is not available to this actor');
    }
    return asset;
  }
}

export const inferMediaKind = (mimeType: string): MediaKind => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/zip' || mimeType === 'application/x-zip-compressed')
    return 'archive';
  if (mimeType.startsWith('text/') || mimeType === 'application/pdf') return 'document';
  return 'unknown';
};

export const isAllowedMimeType = (mimeType: string) =>
  allowedMimeTypePrefixes.some((prefix) => mimeType.startsWith(prefix)) ||
  allowedExactMimeTypes.has(mimeType);

const publicAsset = (asset: StoredMediaAsset): MediaAsset => {
  const { storageHandle: _storageHandle, ...publicFields } = asset;
  return publicFields;
};

export const mediaService = new MediaService();
