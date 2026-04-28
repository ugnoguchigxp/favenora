import { z } from '@hono/zod-openapi';
import sanitizeHtml from 'sanitize-html';

const sanitizePlainText = (val: string) =>
  sanitizeHtml(val, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
  }).trim();

const sanitizedString = (maxLength: number) =>
  z.string().transform(sanitizePlainText).pipe(z.string().min(1).max(maxLength));

export const mediaOwnerTypeValues = ['user', 'creator', 'project', 'system'] as const;
export const mediaKindValues = [
  'image',
  'video',
  'audio',
  'document',
  'archive',
  'external_embed',
  'unknown',
] as const;
export const mediaAssetStatusValues = [
  'pending_upload',
  'uploaded',
  'processing',
  'ready',
  'failed',
  'quarantined',
  'deleted',
] as const;
export const mediaVisibilityValues = ['private', 'restricted', 'public'] as const;
export const mediaVariantKindValues = [
  'thumbnail',
  'preview_image',
  'resized_image',
  'poster',
  'transcoded_video',
  'audio_preview',
  'waveform',
  'download_original',
] as const;
export const mediaUploadIntentStatusValues = [
  'pending',
  'completed',
  'expired',
  'cancelled',
] as const;
export const mediaDeliveryPurposeValues = [
  'thumbnail',
  'preview',
  'inline',
  'download',
  'editor',
] as const;
export const mediaExternalSourceTypeValues = ['url', 'embed', 'oembed'] as const;
export const mediaUsageTypeValues = [
  'post_media',
  'post_attachment',
  'profile_avatar',
  'profile_banner',
  'project_cover',
  'stream_archive',
  'fansub_export',
  'library_item',
] as const;
export const mediaScanTypeValues = ['content_safety', 'malware', 'metadata'] as const;
export const mediaScanStatusValues = ['pending', 'passed', 'failed', 'error'] as const;
export const mediaScanVerdictValues = ['clean', 'suspicious', 'unsafe', 'unknown'] as const;

export const mediaOwnerTypeSchema = z.enum(mediaOwnerTypeValues).openapi('MediaOwnerType');
export const mediaKindSchema = z.enum(mediaKindValues).openapi('MediaKind');
export const mediaAssetStatusSchema = z.enum(mediaAssetStatusValues).openapi('MediaAssetStatus');
export const mediaVisibilitySchema = z.enum(mediaVisibilityValues).openapi('MediaVisibility');
export const mediaVariantKindSchema = z.enum(mediaVariantKindValues).openapi('MediaVariantKind');
export const mediaUploadIntentStatusSchema = z
  .enum(mediaUploadIntentStatusValues)
  .openapi('MediaUploadIntentStatus');
export const mediaDeliveryPurposeSchema = z
  .enum(mediaDeliveryPurposeValues)
  .openapi('MediaDeliveryPurpose');
export const mediaExternalSourceTypeSchema = z
  .enum(mediaExternalSourceTypeValues)
  .openapi('MediaExternalSourceType');
export const mediaUsageTypeSchema = z.enum(mediaUsageTypeValues).openapi('MediaUsageType');
export const mediaScanTypeSchema = z.enum(mediaScanTypeValues).openapi('MediaScanType');
export const mediaScanStatusSchema = z.enum(mediaScanStatusValues).openapi('MediaScanStatus');
export const mediaScanVerdictSchema = z.enum(mediaScanVerdictValues).openapi('MediaScanVerdict');

export const mediaProviderCapabilitiesSchema = z
  .object({
    supportsDirectUpload: z.boolean(),
    supportsSignedUrl: z.boolean(),
    supportsRangeRequest: z.boolean(),
    supportsImageTransform: z.boolean(),
    supportsVideoTranscode: z.boolean(),
    supportsAudioWaveform: z.boolean(),
  })
  .openapi('MediaProviderCapabilities');

export const mediaAssetSchema = z
  .object({
    id: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    ownerId: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440001' }),
    ownerType: mediaOwnerTypeSchema,
    mediaKind: mediaKindSchema,
    status: mediaAssetStatusSchema,
    visibility: mediaVisibilitySchema,
    providerKey: z.string().min(1).openapi({ example: 'local' }),
    originalFilename: z.string().nullable().openapi({ example: 'cover.png' }),
    mimeType: z.string().nullable().openapi({ example: 'image/png' }),
    byteSize: z.number().int().nonnegative().nullable().openapi({ example: 1024 }),
    checksum: z.string().nullable().openapi({ example: 'sha256:abc123' }),
    width: z.number().int().positive().nullable().openapi({ example: 1280 }),
    height: z.number().int().positive().nullable().openapi({ example: 720 }),
    durationMs: z.number().int().positive().nullable().openapi({ example: 120000 }),
    failureReason: z.string().nullable().optional().openapi({ example: null }),
    createdAt: z.string().datetime().openapi({ example: '2026-04-02T11:47:06.000Z' }),
    updatedAt: z.string().datetime().openapi({ example: '2026-04-02T11:47:06.000Z' }),
    deletedAt: z.string().datetime().nullable().openapi({ example: null }),
  })
  .openapi('MediaAsset');

export const mediaVariantSchema = z
  .object({
    id: z.string().uuid(),
    mediaId: z.string().uuid(),
    variantKind: mediaVariantKindSchema,
    status: mediaAssetStatusSchema,
    providerKey: z.string().min(1),
    mimeType: z.string().nullable(),
    byteSize: z.number().int().nonnegative().nullable(),
    width: z.number().int().positive().nullable(),
    height: z.number().int().positive().nullable(),
    durationMs: z.number().int().positive().nullable(),
    transformPreset: z.string().nullable(),
    createdAt: z.string().datetime(),
  })
  .openapi('MediaVariant');

export const mediaExternalSourceSchema = z
  .object({
    id: z.string().uuid(),
    mediaId: z.string().uuid(),
    sourceType: mediaExternalSourceTypeSchema,
    url: z.string().url(),
    providerName: z.string().nullable(),
    embedHtml: z.string().nullable(),
    thumbnailUrl: z.string().url().nullable(),
    metadata: z.record(z.string(), z.unknown()).nullable(),
    lastFetchedAt: z.string().datetime().nullable(),
  })
  .openapi('MediaExternalSource');

export const mediaUploadIntentSchema = z
  .object({
    id: z.string().uuid(),
    mediaId: z.string().uuid(),
    providerKey: z.string().min(1),
    expiresAt: z.string().datetime(),
    maxBytes: z.number().int().positive(),
    allowedMimeTypes: z.array(z.string().min(1)).min(1),
    status: mediaUploadIntentStatusSchema,
  })
  .openapi('MediaUploadIntent');

export const providerUploadIntentSchema = z
  .object({
    method: z.enum(['POST', 'PUT']),
    url: z.string().url(),
    fields: z.record(z.string(), z.string()).default({}),
    headers: z.record(z.string(), z.string()).default({}),
    expiresAt: z.string().datetime(),
  })
  .openapi('ProviderUploadIntent');

export const createUploadIntentSchema = z
  .object({
    ownerId: z.string().uuid(),
    ownerType: mediaOwnerTypeSchema.default('user'),
    originalFilename: sanitizedString(255),
    mimeType: z
      .string()
      .transform((value) => value.toLowerCase())
      .pipe(z.string().min(1).max(255)),
    byteSize: z.number().int().positive(),
    checksum: z.string().min(1).max(255).optional(),
    visibility: mediaVisibilitySchema.default('private'),
    usageType: mediaUsageTypeSchema.optional(),
  })
  .openapi('CreateMediaUploadIntentInput');

export const completeUploadSchema = z
  .object({
    checksum: z.string().min(1).max(255).optional(),
    byteSize: z.number().int().positive().optional(),
  })
  .openapi('CompleteMediaUploadInput');

export const createExternalSourceSchema = z
  .object({
    ownerId: z.string().uuid(),
    ownerType: mediaOwnerTypeSchema.default('user'),
    visibility: mediaVisibilitySchema.default('restricted'),
    sourceType: mediaExternalSourceTypeSchema,
    url: z.string().url(),
    providerName: sanitizedString(100).optional(),
    embedHtml: z.string().max(10000).optional(),
    thumbnailUrl: z.string().url().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .openapi('CreateMediaExternalSourceInput');

export const updateMediaAssetSchema = z
  .object({
    visibility: mediaVisibilitySchema.optional(),
    originalFilename: sanitizedString(255).optional(),
  })
  .openapi('UpdateMediaAssetInput');

export const deliveryUrlQuerySchema = z
  .object({
    purpose: mediaDeliveryPurposeSchema.default('inline'),
    variantKind: mediaVariantKindSchema.optional(),
    ttlSeconds: z.coerce.number().int().min(60).max(3600).default(300),
  })
  .openapi('MediaDeliveryUrlQuery');

export const mediaUploadIntentResponseSchema = z.object({
  asset: mediaAssetSchema,
  uploadIntent: mediaUploadIntentSchema,
  providerUpload: providerUploadIntentSchema,
});

export const mediaAssetResponseSchema = z.object({
  asset: mediaAssetSchema,
});

export const mediaVariantsResponseSchema = z.object({
  variants: z.array(mediaVariantSchema),
});

export const mediaDeliveryUrlResponseSchema = z.object({
  mediaId: z.string().uuid(),
  variantId: z.string().uuid().nullable(),
  purpose: mediaDeliveryPurposeSchema,
  url: z.string().url(),
  expiresAt: z.string().datetime().nullable(),
});

export const dashboardMediaResponseSchema = z.object({
  assets: z.array(mediaAssetSchema),
});

export type MediaOwnerType = z.infer<typeof mediaOwnerTypeSchema>;
export type MediaKind = z.infer<typeof mediaKindSchema>;
export type MediaAssetStatus = z.infer<typeof mediaAssetStatusSchema>;
export type MediaVisibility = z.infer<typeof mediaVisibilitySchema>;
export type MediaVariantKind = z.infer<typeof mediaVariantKindSchema>;
export type MediaUploadIntentStatus = z.infer<typeof mediaUploadIntentStatusSchema>;
export type MediaDeliveryPurpose = z.infer<typeof mediaDeliveryPurposeSchema>;
export type MediaExternalSourceType = z.infer<typeof mediaExternalSourceTypeSchema>;
export type MediaUsageType = z.infer<typeof mediaUsageTypeSchema>;
export type MediaScanType = z.infer<typeof mediaScanTypeSchema>;
export type MediaScanStatus = z.infer<typeof mediaScanStatusSchema>;
export type MediaScanVerdict = z.infer<typeof mediaScanVerdictSchema>;
export type MediaProviderCapabilities = z.infer<typeof mediaProviderCapabilitiesSchema>;
export type MediaAsset = z.infer<typeof mediaAssetSchema>;
export type MediaVariant = z.infer<typeof mediaVariantSchema>;
export type MediaExternalSource = z.infer<typeof mediaExternalSourceSchema>;
export type MediaUploadIntent = z.infer<typeof mediaUploadIntentSchema>;
export type ProviderUploadIntent = z.infer<typeof providerUploadIntentSchema>;
export type CreateUploadIntentInput = z.infer<typeof createUploadIntentSchema>;
export type CompleteUploadInput = z.infer<typeof completeUploadSchema>;
export type CreateExternalSourceInput = z.infer<typeof createExternalSourceSchema>;
export type UpdateMediaAssetInput = z.infer<typeof updateMediaAssetSchema>;
export type DeliveryUrlQuery = z.infer<typeof deliveryUrlQuerySchema>;
