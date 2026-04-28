import { z } from '@hono/zod-openapi';
import sanitizeHtml from 'sanitize-html';

const sanitize = (v: string) => sanitizeHtml(v, { allowedTags: [], allowedAttributes: {} }).trim();
const uuidSchema = z.string().uuid();
const isoDateSchema = z.preprocess(
  (value) => (value instanceof Date ? value.toISOString() : value),
  z.string().datetime()
);
const nullableIsoDateSchema = isoDateSchema.nullable();

export const aiTargetTypeSchema = z.enum([
  'subtitle_track',
  'translation_annotation',
  'comment',
  'post_block',
]);
export const aiDraftStatusSchema = z.enum(['generated', 'hold', 'blocked', 'applied', 'discarded']);

export const aiTranslationDraftSchema = z.object({
  id: uuidSchema,
  targetType: aiTargetTypeSchema,
  targetId: uuidSchema.nullable(),
  userId: uuidSchema,
  creatorId: uuidSchema.nullable(),
  provider: z.string(),
  model: z.string(),
  sourceLanguage: z.string(),
  targetLanguage: z.string(),
  promptVersion: z.string(),
  status: aiDraftStatusSchema,
  safetyDecision: z.enum(['allow', 'warn', 'hold', 'block']).nullable(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const aiTranslationSegmentSchema = z.object({
  id: uuidSchema,
  draftId: uuidSchema,
  sourceTextPreview: z.string(),
  translatedText: z.string(),
  startMs: z.number().int().nullable(),
  endMs: z.number().int().nullable(),
  anchorData: z.record(z.string(), z.unknown()).nullable(),
  sortOrder: z.number().int(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const createTranslationDraftSchema = z.object({
  targetType: aiTargetTypeSchema,
  targetId: uuidSchema.optional(),
  creatorId: uuidSchema.optional(),
  sourceLanguage: z.string().min(2).max(20),
  targetLanguage: z.string().min(2).max(20),
  segments: z
    .array(
      z.object({
        sourceText: z.string().min(1).max(5000).transform(sanitize),
        startMs: z.number().int().optional(),
        endMs: z.number().int().optional(),
        anchorData: z.record(z.string(), z.unknown()).optional(),
        sortOrder: z.number().int().min(0).default(0),
      })
    )
    .min(1)
    .max(1000),
});

export const applyTranslationDraftSchema = z.object({
  trackId: uuidSchema.optional(),
});

export const commentTranslationRequestSchema = z.object({
  sourceText: z.string().min(1).max(5000).transform(sanitize),
  sourceLanguage: z.string().min(2).max(20),
  targetLanguage: z.string().min(2).max(20),
  targetType: aiTargetTypeSchema.default('comment'),
  targetId: uuidSchema.optional(),
});

export const aiGlossaryTermSchema = z.object({
  id: uuidSchema,
  creatorId: uuidSchema.nullable(),
  postId: uuidSchema.nullable(),
  seriesId: uuidSchema.nullable(),
  sourceText: z.string(),
  targetText: z.string(),
  sourceLanguage: z.string(),
  targetLanguage: z.string(),
  note: z.string().nullable(),
  createdByUserId: uuidSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const createAiGlossaryTermSchema = z.object({
  creatorId: uuidSchema.optional(),
  postId: uuidSchema.optional(),
  seriesId: uuidSchema.optional(),
  sourceText: z.string().min(1).max(300).transform(sanitize),
  targetText: z.string().min(1).max(300).transform(sanitize),
  sourceLanguage: z.string().min(2).max(20),
  targetLanguage: z.string().min(2).max(20),
  note: z.string().max(1000).transform(sanitize).optional(),
});

export const aiProviderSchema = z.object({
  provider: z.string(),
  enabled: z.boolean(),
  allowedLanguages: z.array(z.string()),
  monthlyTokenLimit: z.number().int().nonnegative(),
  externalSendPolicy: z.enum(['allow_public_only', 'allow_if_creator_opt_in', 'deny']),
});

export const aiAssistUsageSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  creatorId: uuidSchema.nullable(),
  postId: uuidSchema.nullable(),
  targetType: aiTargetTypeSchema,
  provider: z.string(),
  model: z.string(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  estimatedCost: z.number(),
  generatedAt: isoDateSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const aiTranslationDraftResponseSchema = z.object({
  draft: aiTranslationDraftSchema,
  segments: z.array(aiTranslationSegmentSchema),
});
export const aiGlossaryTermsResponseSchema = z.object({ terms: z.array(aiGlossaryTermSchema) });
export const aiProvidersResponseSchema = z.object({ providers: z.array(aiProviderSchema) });
export const aiAssistUsageResponseSchema = z.object({ usages: z.array(aiAssistUsageSchema) });
export const commentTranslationResponseSchema = z.object({
  translatedText: z.string(),
  sourceLanguage: z.string(),
  targetLanguage: z.string(),
  provider: z.string(),
  model: z.string(),
  safetyDecision: z.enum(['allow', 'warn', 'hold', 'block']),
  expiresAt: nullableIsoDateSchema,
});

export type CreateTranslationDraftInput = z.infer<typeof createTranslationDraftSchema>;
