import { z } from '@hono/zod-openapi';
import sanitizeHtml from 'sanitize-html';
import { entitlementCheckResultSchema } from './memberships.schema';

const sanitize = (val: string) => sanitizeHtml(val);
const uuidSchema = z.string().uuid();
const nullableUuidSchema = uuidSchema.nullable();
const isoDateSchema = z.preprocess(
  (value) => (value instanceof Date ? value.toISOString() : value),
  z.string().datetime()
);
const nullableIsoDateSchema = isoDateSchema.nullable();

export const postTypeSchema = z
  .enum(['article', 'illustration', 'manga', 'novel', 'video', 'audio', 'file', 'stream_archive'])
  .openapi('PostType');
export const postStatusSchema = z
  .enum(['draft', 'published', 'scheduled', 'archived', 'removed'])
  .openapi('PostStatus');
export const postAccessTypeSchema = z
  .enum([
    'public',
    'authenticated',
    'followers',
    'free_members',
    'paid_members',
    'tiers',
    'paid_unlock',
    'creator_only',
  ])
  .openapi('PostAccessType');
export const postAgeRatingSchema = z.enum(['all_ages', 'mature', 'adult']).openapi('PostAgeRating');

export const postBlockSchema = z
  .object({
    id: uuidSchema.optional(),
    postId: uuidSchema.optional(),
    type: z.string(),
    sortOrder: z.number().int().min(0),
    visibility: z.string().default('full'),
    data: z.unknown(),
    createdAt: isoDateSchema.optional(),
    updatedAt: isoDateSchema.optional(),
  })
  .openapi('PostBlock');

export const postAccessRuleSchema = z
  .object({
    id: uuidSchema.optional(),
    postId: uuidSchema.optional(),
    ruleType: z.string(),
    tierId: nullableUuidSchema.optional(),
    priceId: nullableUuidSchema.optional(),
    startsAt: nullableIsoDateSchema.optional(),
    endsAt: nullableIsoDateSchema.optional(),
    createdAt: isoDateSchema.optional(),
    updatedAt: isoDateSchema.optional(),
  })
  .openapi('PostAccessRule');

export const postTagSchema = z
  .object({
    id: uuidSchema.optional(),
    postId: uuidSchema.optional(),
    normalizedName: z.string(),
    displayName: z.string(),
    locale: z.string().nullable().optional(),
  })
  .openapi('PostTag');

export const postSchema = z
  .object({
    id: uuidSchema,
    creatorId: uuidSchema,
    postType: postTypeSchema,
    title: z.string(),
    slug: z.string(),
    summary: z.string().nullable(),
    status: postStatusSchema,
    accessType: postAccessTypeSchema,
    ageRating: postAgeRatingSchema,
    isAiGenerated: z.boolean(),
    language: z.string(),
    thumbnailMediaId: nullableUuidSchema,
    publishedAt: nullableIsoDateSchema,
    scheduledAt: nullableIsoDateSchema,
    backdatedAt: nullableIsoDateSchema,
    editedAt: nullableIsoDateSchema,
    version: z.number().int(),
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
  })
  .openapi('Post');

export const postCommentSchema = z
  .object({
    id: uuidSchema,
    postId: uuidSchema,
    parentId: nullableUuidSchema,
    body: z.string(),
    status: z.string(),
    authorId: uuidSchema,
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
  })
  .openapi('PostComment');

const basePostDraftSchema = z.object({
  creatorId: uuidSchema,
  postType: postTypeSchema.default('article'),
  title: z.string().min(1).max(160).transform(sanitize),
  slug: z
    .string()
    .min(1)
    .max(180)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  summary: z.string().max(500).transform(sanitize).optional(),
  accessType: postAccessTypeSchema.default('public'),
  ageRating: postAgeRatingSchema.default('all_ages'),
  isAiGenerated: z.boolean().default(false),
  language: z.string().min(2).max(10).default('ja'),
  thumbnailMediaId: uuidSchema.optional(),
  blocks: z
    .array(postBlockSchema.omit({ id: true, postId: true, createdAt: true, updatedAt: true }))
    .default([]),
  accessRules: z
    .array(postAccessRuleSchema.omit({ id: true, postId: true, createdAt: true, updatedAt: true }))
    .default([]),
  tags: z.array(z.string().min(1).max(40).transform(sanitize)).max(30).default([]),
});

export const createPostDraftSchema = basePostDraftSchema.openapi('CreatePostDraftInput');
export const updatePostDraftSchema = basePostDraftSchema
  .omit({ creatorId: true })
  .partial()
  .openapi('UpdatePostDraftInput');

export const publishPostSchema = z
  .object({
    publishedAt: isoDateSchema.optional(),
  })
  .openapi('PublishPostInput');

export const schedulePostSchema = z
  .object({
    scheduledAt: isoDateSchema,
  })
  .openapi('SchedulePostInput');

export const createPostCommentSchema = z
  .object({
    body: z.string().min(1).max(5000).transform(sanitize),
    parentId: uuidSchema.optional(),
  })
  .openapi('CreatePostCommentInput');

const postViewerBaseSchema = z.object({
  post: postSchema,
  access: entitlementCheckResultSchema.optional(),
});

export const postViewerSchema = z
  .discriminatedUnion('kind', [
    postViewerBaseSchema.extend({
      kind: z.literal('unlocked'),
      blocks: z.array(postBlockSchema),
      tags: z.array(postTagSchema),
      comments: z.array(postCommentSchema).default([]),
    }),
    postViewerBaseSchema.extend({
      kind: z.literal('locked'),
      previewBlocks: z.array(postBlockSchema),
      requiredTierIds: z.array(uuidSchema),
    }),
    postViewerBaseSchema.extend({
      kind: z.literal('age_gated'),
    }),
    z.object({
      kind: z.literal('unavailable'),
      reason: z.enum(['not_found', 'draft', 'scheduled', 'archived', 'removed']),
    }),
  ])
  .openapi('PostViewer');

export const collectionSchema = z
  .object({
    id: uuidSchema,
    creatorId: uuidSchema,
    title: z.string(),
    description: z.string().nullable(),
    thumbnailMediaId: nullableUuidSchema,
    visibility: z.string(),
    sortOrder: z.number().int(),
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
  })
  .openapi('Collection');

export const seriesSchema = z
  .object({
    id: uuidSchema,
    creatorId: uuidSchema,
    title: z.string(),
    description: z.string().nullable(),
    postType: z.string().nullable(),
    visibility: z.string(),
    coverMediaId: nullableUuidSchema,
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
  })
  .openapi('Series');

export const listPostsResponseSchema = z.object({
  posts: z.array(postSchema),
});
export const postResponseSchema = z.object({
  post: postSchema,
});
export const postViewerResponseSchema = z.object({
  viewer: postViewerSchema,
});
export const listPostCommentsResponseSchema = z.object({
  comments: z.array(postCommentSchema),
});

export type CreatePostDraftInput = z.infer<typeof createPostDraftSchema>;
export type UpdatePostDraftInput = z.infer<typeof updatePostDraftSchema>;
export type PublishPostInput = z.infer<typeof publishPostSchema>;
export type SchedulePostInput = z.infer<typeof schedulePostSchema>;
export type CreatePostCommentInput = z.infer<typeof createPostCommentSchema>;
export type PostViewer = z.infer<typeof postViewerSchema>;
