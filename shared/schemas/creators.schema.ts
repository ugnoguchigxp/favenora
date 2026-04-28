import { z } from '@hono/zod-openapi';
import sanitizeHtml from 'sanitize-html';

const sanitize = (val: string) => sanitizeHtml(val).trim();
const emptyToNull = (val: unknown) => (typeof val === 'string' && val.trim() === '' ? null : val);
const optionalNullableText = (max: number) =>
  z.preprocess(emptyToNull, z.string().max(max).transform(sanitize).nullable().optional());

export const creatorSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(40)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/)
  .openapi({ example: 'favorite-creator' });

export const creatorStatusSchema = z.enum(['draft', 'published', 'suspended']);

export const creatorReviewStatusSchema = z.enum(['pending', 'approved', 'rejected']);

export const creatorLinkKindSchema = z.enum([
  'website',
  'x',
  'youtube',
  'twitch',
  'pixiv',
  'github',
  'store',
  'other',
]);

export const creatorCategoryKeySchema = z.enum([
  'novel',
  'video',
  'manga',
  'illustration',
  'streaming',
  'music',
  'game',
  'voice',
]);

export const portfolioVisibilitySchema = z.enum(['public', 'supporters', 'private']);

export const creatorProfileSectionKindSchema = z.enum([
  'about',
  'goals',
  'works',
  'supportMessage',
  'custom',
]);

const profileLinkBaseSchema = z.object({
  kind: creatorLinkKindSchema,
  label: z.string().min(1).max(40).transform(sanitize),
  url: z.string().trim().url(),
  sortOrder: z.number().int().min(0).max(1000).default(0),
});

export const creatorLinkSchema = profileLinkBaseSchema
  .extend({
    id: z.string().uuid(),
  })
  .openapi('CreatorLink');

export const upsertCreatorLinkSchema = profileLinkBaseSchema
  .extend({
    id: z.string().uuid().optional(),
  })
  .openapi('UpsertCreatorLinkInput');

const portfolioItemBaseSchema = z.object({
  title: z.string().min(1).max(120).transform(sanitize),
  description: optionalNullableText(1000),
  url: z.preprocess(emptyToNull, z.string().trim().url().nullable().optional()),
  mediaId: z.string().uuid().nullable().optional(),
  role: optionalNullableText(80),
  completedAt: z.preprocess(emptyToNull, z.string().date().nullable().optional()),
  sortOrder: z.number().int().min(0).max(1000).default(0),
  visibility: portfolioVisibilitySchema.default('public'),
});

export const creatorPortfolioItemSchema = portfolioItemBaseSchema
  .extend({
    id: z.string().uuid(),
    description: z.string().max(1000).nullable(),
    url: z.string().url().nullable(),
    mediaId: z.string().uuid().nullable(),
    role: z.string().max(80).nullable(),
    completedAt: z.string().nullable(),
  })
  .openapi('CreatorPortfolioItem');

export const upsertCreatorPortfolioItemSchema = portfolioItemBaseSchema
  .extend({
    id: z.string().uuid().optional(),
  })
  .openapi('UpsertCreatorPortfolioItemInput');

export const creatorProfileSectionSchema = z
  .object({
    id: z.string().uuid(),
    kind: creatorProfileSectionKindSchema,
    title: z.string().max(80).nullable(),
    body: z.string().max(3000),
    sortOrder: z.number().int().min(0),
    visibility: portfolioVisibilitySchema,
  })
  .openapi('CreatorProfileSection');

export const publicCreatorProfileSchema = z
  .object({
    id: z.string().uuid(),
    slug: creatorSlugSchema,
    displayName: z.string().min(1).max(80),
    tagline: z.string().max(160).nullable(),
    bio: z.string().max(5000).nullable(),
    avatarMediaId: z.string().uuid().nullable(),
    bannerMediaId: z.string().uuid().nullable(),
    publicLocationLabel: z.string().max(80).nullable(),
    primaryLanguage: z.string().max(16).nullable(),
    translationContributionsEnabled: z.boolean(),
    commissionEnabled: z.boolean(),
    categories: z.array(creatorCategoryKeySchema),
    tags: z.array(z.string().min(1).max(40)),
    links: z.array(creatorLinkSchema),
    portfolioItems: z.array(creatorPortfolioItemSchema),
    profileSections: z.array(creatorProfileSectionSchema).default([]),
    followerCount: z.number().int().min(0),
    isFollowing: z.boolean().optional(),
  })
  .openapi('PublicCreatorProfile');

export const dashboardCreatorProfileSchema = publicCreatorProfileSchema
  .extend({
    userId: z.string().uuid(),
    status: creatorStatusSchema,
    reviewStatus: creatorReviewStatusSchema,
    reviewNote: z.string().max(1000).nullable(),
    publishedAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('DashboardCreatorProfile');

export const createCreatorProfileSchema = z
  .object({
    slug: creatorSlugSchema,
    displayName: z.string().min(1).max(80).transform(sanitize),
  })
  .openapi('CreateCreatorProfileInput');

export const updateCreatorProfileSchema = z
  .object({
    displayName: z.string().min(1).max(80).transform(sanitize).optional(),
    tagline: optionalNullableText(160),
    bio: optionalNullableText(5000),
    avatarMediaId: z.string().uuid().nullable().optional(),
    bannerMediaId: z.string().uuid().nullable().optional(),
    publicLocationLabel: optionalNullableText(80),
    primaryLanguage: optionalNullableText(16),
    translationContributionsEnabled: z.boolean().optional(),
    commissionEnabled: z.boolean().optional(),
    categories: z.array(creatorCategoryKeySchema).max(5).optional(),
    tags: z.array(z.string().min(1).max(40).transform(sanitize)).max(20).optional(),
  })
  .openapi('UpdateCreatorProfileInput');

export const listCreatorsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const replaceCreatorLinksSchema = z
  .object({
    links: z.array(upsertCreatorLinkSchema).max(10),
  })
  .openapi('ReplaceCreatorLinksInput');

export const replaceCreatorPortfolioSchema = z
  .object({
    portfolioItems: z.array(upsertCreatorPortfolioItemSchema).max(20),
  })
  .openapi('ReplaceCreatorPortfolioInput');

export const listCreatorsResponseSchema = z.object({
  creators: z.array(publicCreatorProfileSchema),
});

export const publicCreatorProfileResponseSchema = z.object({
  creator: publicCreatorProfileSchema,
});

export const dashboardCreatorProfileResponseSchema = z.object({
  creator: dashboardCreatorProfileSchema,
});

export type CreatorStatus = z.infer<typeof creatorStatusSchema>;
export type CreatorReviewStatus = z.infer<typeof creatorReviewStatusSchema>;
export type CreatorCategoryKey = z.infer<typeof creatorCategoryKeySchema>;
export type CreatorLinkKind = z.infer<typeof creatorLinkKindSchema>;
export type CreatorLink = z.infer<typeof creatorLinkSchema>;
export type UpsertCreatorLinkInput = z.infer<typeof upsertCreatorLinkSchema>;
export type CreatorPortfolioItem = z.infer<typeof creatorPortfolioItemSchema>;
export type UpsertCreatorPortfolioItemInput = z.infer<typeof upsertCreatorPortfolioItemSchema>;
export type CreatorProfileSection = z.infer<typeof creatorProfileSectionSchema>;
export type PublicCreatorProfile = z.infer<typeof publicCreatorProfileSchema>;
export type DashboardCreatorProfile = z.infer<typeof dashboardCreatorProfileSchema>;
export type CreateCreatorProfileInput = z.infer<typeof createCreatorProfileSchema>;
export type UpdateCreatorProfileInput = z.infer<typeof updateCreatorProfileSchema>;
export type ReplaceCreatorLinksInput = z.infer<typeof replaceCreatorLinksSchema>;
export type ReplaceCreatorPortfolioInput = z.infer<typeof replaceCreatorPortfolioSchema>;
