import type {
  MediaDeliveryPurpose,
  MediaProviderCapabilities,
  MediaVariantKind,
  ProviderUploadIntent,
} from '../../../shared/schemas/media.schema';

export interface MediaObjectMetadata {
  byteSize: number;
  checksum?: string | null;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  durationMs?: number | null;
}

export interface CreateProviderUploadIntentInput {
  mediaId: string;
  ownerId: string;
  mimeType: string;
  byteSize: number;
  originalFilename: string;
  expiresAt: Date;
}

export interface ConfirmProviderUploadInput {
  storageHandle: string;
  expectedByteSize: number;
  expectedChecksum?: string | null;
}

export interface DeliveryUrlInput {
  storageHandle: string;
  purpose: MediaDeliveryPurpose;
  variantKind?: MediaVariantKind;
  ttlSeconds: number;
  isPublic: boolean;
}

export interface DeliveryUrlResult {
  url: string;
  expiresAt: string | null;
}

export interface StorageProvider {
  key: string;
  capabilities: MediaProviderCapabilities;
  createUploadIntent(input: CreateProviderUploadIntentInput): Promise<{
    storageHandle: string;
    providerUpload: ProviderUploadIntent;
  }>;
  confirmUpload(input: ConfirmProviderUploadInput): Promise<MediaObjectMetadata>;
  getObjectMetadata(storageHandle: string): Promise<MediaObjectMetadata | null>;
  deleteObject(storageHandle: string): Promise<void>;
  copyObject?(sourceStorageHandle: string, targetStorageHandle: string): Promise<void>;
  moveObject?(sourceStorageHandle: string, targetStorageHandle: string): Promise<void>;
}

export interface DeliveryProvider {
  key: string;
  capabilities: Pick<
    MediaProviderCapabilities,
    | 'supportsSignedUrl'
    | 'supportsRangeRequest'
    | 'supportsImageTransform'
    | 'supportsVideoTranscode'
  >;
  createDeliveryUrl(input: DeliveryUrlInput): Promise<DeliveryUrlResult>;
}

export interface TransformProvider {
  key: string;
  capabilities: Pick<
    MediaProviderCapabilities,
    'supportsImageTransform' | 'supportsVideoTranscode' | 'supportsAudioWaveform'
  >;
  enqueueTransforms(input: {
    mediaId: string;
    storageHandle: string;
    mediaKind: string;
  }): Promise<void>;
}

export class LocalStorageProvider implements StorageProvider {
  readonly key = 'local';

  readonly capabilities = {
    supportsDirectUpload: true,
    supportsSignedUrl: true,
    supportsRangeRequest: true,
    supportsImageTransform: false,
    supportsVideoTranscode: false,
    supportsAudioWaveform: false,
  };

  constructor(private readonly baseUploadUrl = 'http://localhost:5173/api/media/local-upload') {}

  async createUploadIntent(input: CreateProviderUploadIntentInput) {
    const storageHandle = `local/${input.ownerId}/${input.mediaId}/${encodeURIComponent(
      input.originalFilename
    )}`;

    return {
      storageHandle,
      providerUpload: {
        method: 'PUT' as const,
        url: `${this.baseUploadUrl}/${input.mediaId}`,
        fields: {},
        headers: {
          'content-type': input.mimeType,
        },
        expiresAt: input.expiresAt.toISOString(),
      },
    };
  }

  async confirmUpload(input: ConfirmProviderUploadInput): Promise<MediaObjectMetadata> {
    return {
      byteSize: input.expectedByteSize,
      checksum: input.expectedChecksum ?? null,
    };
  }

  async getObjectMetadata(_storageHandle: string): Promise<MediaObjectMetadata | null> {
    return null;
  }

  async deleteObject(_storageHandle: string): Promise<void> {}
}

export class LocalDeliveryProvider implements DeliveryProvider {
  readonly key = 'local';

  readonly capabilities = {
    supportsSignedUrl: true,
    supportsRangeRequest: true,
    supportsImageTransform: false,
    supportsVideoTranscode: false,
  };

  constructor(
    private readonly baseDeliveryUrl = 'http://localhost:5173/api/media/local-delivery',
    private readonly now = () => new Date()
  ) {}

  async createDeliveryUrl(input: DeliveryUrlInput): Promise<DeliveryUrlResult> {
    const expiresAt = input.isPublic
      ? null
      : new Date(this.now().getTime() + input.ttlSeconds * 1000).toISOString();
    const params = new URLSearchParams({
      purpose: input.purpose,
    });
    if (input.variantKind) {
      params.set('variantKind', input.variantKind);
    }
    if (expiresAt) {
      params.set('expiresAt', expiresAt);
    }

    return {
      url: `${this.baseDeliveryUrl}/${encodeURIComponent(input.storageHandle)}?${params}`,
      expiresAt,
    };
  }
}

export class NoopTransformProvider implements TransformProvider {
  readonly key = 'noop';

  readonly capabilities = {
    supportsImageTransform: false,
    supportsVideoTranscode: false,
    supportsAudioWaveform: false,
  };

  async enqueueTransforms(_input: {
    mediaId: string;
    storageHandle: string;
    mediaKind: string;
  }): Promise<void> {}
}
