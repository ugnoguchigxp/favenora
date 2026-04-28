import { randomUUID } from 'node:crypto';
import type {
  MediaAsset,
  MediaAssetStatus,
  MediaExternalSource,
  MediaKind,
  MediaOwnerType,
  MediaUploadIntent,
  MediaUploadIntentStatus,
  MediaVariant,
  MediaVisibility,
} from '../../../shared/schemas/media.schema';

type Timestamped = {
  createdAt: string;
  updatedAt: string;
};

export type NewMediaAsset = {
  ownerId: string;
  ownerType: MediaOwnerType;
  mediaKind: MediaKind;
  status: MediaAssetStatus;
  visibility: MediaVisibility;
  providerKey: string;
  storageHandle: string;
  originalFilename: string | null;
  mimeType: string | null;
  byteSize: number | null;
  checksum: string | null;
};

export type StoredMediaAsset = MediaAsset & {
  storageHandle: string;
};

export type StoredMediaVariant = MediaVariant & {
  storageHandle: string;
};

export type NewMediaUploadIntent = {
  mediaId: string;
  providerKey: string;
  expiresAt: string;
  maxBytes: number;
  allowedMimeTypes: string[];
  status: MediaUploadIntentStatus;
};

export type NewMediaExternalSource = {
  mediaId: string;
  sourceType: MediaExternalSource['sourceType'];
  url: string;
  providerName: string | null;
  embedHtml: string | null;
  thumbnailUrl: string | null;
  metadata: Record<string, unknown> | null;
  lastFetchedAt: string | null;
};

export interface MediaRepository {
  createAsset(input: NewMediaAsset): Promise<StoredMediaAsset>;
  findAssetById(id: string): Promise<StoredMediaAsset | null>;
  updateAsset(
    id: string,
    updates: Partial<
      Pick<
        StoredMediaAsset,
        | 'status'
        | 'visibility'
        | 'storageHandle'
        | 'byteSize'
        | 'checksum'
        | 'mimeType'
        | 'mediaKind'
        | 'width'
        | 'height'
        | 'durationMs'
        | 'failureReason'
        | 'originalFilename'
        | 'deletedAt'
      >
    >
  ): Promise<StoredMediaAsset | null>;
  listAssetsByOwner(ownerId: string, ownerType?: MediaOwnerType): Promise<StoredMediaAsset[]>;
  createUploadIntent(input: NewMediaUploadIntent): Promise<MediaUploadIntent>;
  findLatestUploadIntent(mediaId: string): Promise<MediaUploadIntent | null>;
  updateUploadIntentStatus(
    id: string,
    status: MediaUploadIntentStatus
  ): Promise<MediaUploadIntent | null>;
  listVariants(mediaId: string): Promise<StoredMediaVariant[]>;
  createExternalSource(input: NewMediaExternalSource): Promise<MediaExternalSource>;
}

const now = () => new Date().toISOString();

const withTimestamps = (): Timestamped => {
  const timestamp = now();
  return {
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

export class InMemoryMediaRepository implements MediaRepository {
  private readonly assets = new Map<string, StoredMediaAsset>();

  private readonly uploadIntents = new Map<string, MediaUploadIntent>();

  private readonly variants = new Map<string, StoredMediaVariant>();

  private readonly externalSources = new Map<string, MediaExternalSource>();

  async createAsset(input: NewMediaAsset): Promise<StoredMediaAsset> {
    const timestamps = withTimestamps();
    const asset: StoredMediaAsset = {
      id: randomUUID(),
      ownerId: input.ownerId,
      ownerType: input.ownerType,
      mediaKind: input.mediaKind,
      status: input.status,
      visibility: input.visibility,
      providerKey: input.providerKey,
      storageHandle: input.storageHandle,
      originalFilename: input.originalFilename,
      mimeType: input.mimeType,
      byteSize: input.byteSize,
      checksum: input.checksum,
      width: null,
      height: null,
      durationMs: null,
      failureReason: null,
      createdAt: timestamps.createdAt,
      updatedAt: timestamps.updatedAt,
      deletedAt: null,
    };

    this.assets.set(asset.id, asset);
    return asset;
  }

  async findAssetById(id: string): Promise<StoredMediaAsset | null> {
    return this.assets.get(id) ?? null;
  }

  async updateAsset(
    id: string,
    updates: Partial<StoredMediaAsset>
  ): Promise<StoredMediaAsset | null> {
    const asset = this.assets.get(id);
    if (!asset) return null;

    const updated = {
      ...asset,
      ...updates,
      updatedAt: now(),
    };
    this.assets.set(id, updated);
    return updated;
  }

  async listAssetsByOwner(
    ownerId: string,
    ownerType?: MediaOwnerType
  ): Promise<StoredMediaAsset[]> {
    return Array.from(this.assets.values())
      .filter((asset) => asset.ownerId === ownerId && (!ownerType || asset.ownerType === ownerType))
      .filter((asset) => asset.status !== 'deleted')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createUploadIntent(input: NewMediaUploadIntent): Promise<MediaUploadIntent> {
    const intent: MediaUploadIntent = {
      id: randomUUID(),
      mediaId: input.mediaId,
      providerKey: input.providerKey,
      expiresAt: input.expiresAt,
      maxBytes: input.maxBytes,
      allowedMimeTypes: input.allowedMimeTypes,
      status: input.status,
    };

    this.uploadIntents.set(intent.id, intent);
    return intent;
  }

  async findLatestUploadIntent(mediaId: string): Promise<MediaUploadIntent | null> {
    const intents = Array.from(this.uploadIntents.values())
      .filter((intent) => intent.mediaId === mediaId)
      .sort((a, b) => b.expiresAt.localeCompare(a.expiresAt));
    return intents[0] ?? null;
  }

  async updateUploadIntentStatus(
    id: string,
    status: MediaUploadIntentStatus
  ): Promise<MediaUploadIntent | null> {
    const intent = this.uploadIntents.get(id);
    if (!intent) return null;

    const updated = {
      ...intent,
      status,
    };
    this.uploadIntents.set(id, updated);
    return updated;
  }

  async listVariants(mediaId: string): Promise<StoredMediaVariant[]> {
    return Array.from(this.variants.values()).filter((variant) => variant.mediaId === mediaId);
  }

  async createExternalSource(input: NewMediaExternalSource): Promise<MediaExternalSource> {
    const source: MediaExternalSource = {
      id: randomUUID(),
      mediaId: input.mediaId,
      sourceType: input.sourceType,
      url: input.url,
      providerName: input.providerName,
      embedHtml: input.embedHtml,
      thumbnailUrl: input.thumbnailUrl,
      metadata: input.metadata,
      lastFetchedAt: input.lastFetchedAt,
    };

    this.externalSources.set(source.id, source);
    return source;
  }
}

export const createInMemoryMediaRepository = () => new InMemoryMediaRepository();
