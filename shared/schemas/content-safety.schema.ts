import { z } from '@hono/zod-openapi';
import sanitizeHtml from 'sanitize-html';

const sanitize = (value: string) =>
  sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();

export const contentSafetyTargetTypeSchema = z.enum([
  'post_title',
  'post_body',
  'post_comment',
  'creator_profile',
  'subtitle_track_title',
  'subtitle_cue',
  'translation_annotation',
  'translation_note',
  'stream_chat',
  'tip_message',
  'project_update',
  'ai_draft',
  'report_reason',
]);

export const contentSafetyDecisionSchema = z.enum([
  'allow',
  'warn',
  'hold',
  'block',
  'shadow_limit',
]);

export const blockedTermSeveritySchema = z.enum(['info', 'low', 'medium', 'high', 'critical']);
export const blockedTermMatchTypeSchema = z.enum([
  'exact',
  'word',
  'phrase',
  'regex',
  'normalized',
]);
export const blockedTermCategorySchema = z.enum([
  'hate',
  'harassment',
  'sexual',
  'violence',
  'self_harm',
  'spam',
  'scam',
  'personal_info',
  'spoiler',
  'custom',
]);
export const contextPolicySchema = z.enum([
  'always',
  'allow_quote',
  'allow_educational',
  'allow_self_reference',
]);

export const blockedTermSchema = z.object({
  id: z.string().uuid(),
  language: z.string(),
  locale: z.string().nullable(),
  script: z.string().nullable(),
  category: blockedTermCategorySchema,
  pattern: z.string(),
  normalizedPattern: z.string(),
  matchType: blockedTermMatchTypeSchema,
  severity: blockedTermSeveritySchema,
  decision: contentSafetyDecisionSchema,
  contextPolicy: contextPolicySchema,
  enabled: z.boolean(),
  createdByUserId: z.string().uuid().nullable(),
  createdAt: z.preprocess((v) => (v instanceof Date ? v.toISOString() : v), z.string().datetime()),
  updatedAt: z.preprocess((v) => (v instanceof Date ? v.toISOString() : v), z.string().datetime()),
});

export const createBlockedTermSchema = z.object({
  language: z.string().min(2).max(16).default('und'),
  locale: z.string().max(32).optional(),
  script: z.string().max(32).optional(),
  category: blockedTermCategorySchema,
  pattern: z.string().min(1).max(500).transform(sanitize),
  matchType: blockedTermMatchTypeSchema.default('normalized'),
  severity: blockedTermSeveritySchema.default('medium'),
  decision: contentSafetyDecisionSchema.default('hold'),
  contextPolicy: contextPolicySchema.default('always'),
  enabled: z.boolean().default(true),
});

export const updateBlockedTermSchema = createBlockedTermSchema.partial();

export const allowedTermSchema = z.object({
  id: z.string().uuid(),
  language: z.string(),
  locale: z.string().nullable(),
  pattern: z.string(),
  normalizedPattern: z.string(),
  matchType: blockedTermMatchTypeSchema,
  reason: z.string().nullable(),
  enabled: z.boolean(),
  createdByUserId: z.string().uuid().nullable(),
  createdAt: z.preprocess((v) => (v instanceof Date ? v.toISOString() : v), z.string().datetime()),
  updatedAt: z.preprocess((v) => (v instanceof Date ? v.toISOString() : v), z.string().datetime()),
});

export const createAllowedTermSchema = z.object({
  language: z.string().min(2).max(16).default('und'),
  locale: z.string().max(32).optional(),
  pattern: z.string().min(1).max(500).transform(sanitize),
  matchType: blockedTermMatchTypeSchema.default('normalized'),
  reason: z.string().max(500).transform(sanitize).optional(),
  enabled: z.boolean().default(true),
});

export const contentSafetyCheckSchema = z.object({
  targetType: contentSafetyTargetTypeSchema,
  targetId: z.string().uuid().optional(),
  actorId: z.string().uuid().optional(),
  language: z.string().max(16).optional(),
  source: z.string().max(100).optional(),
  text: z.string().max(50_000),
});

export const contentSafetyBatchCheckSchema = z.object({
  items: z.array(contentSafetyCheckSchema).min(1).max(50),
});

export const contentSafetyMatchSchema = z.object({
  termId: z.string().uuid().nullable(),
  category: blockedTermCategorySchema,
  severity: blockedTermSeveritySchema,
  decision: contentSafetyDecisionSchema,
  matchedTextPreview: z.string(),
  startOffset: z.number().int().min(0),
  endOffset: z.number().int().min(0),
  messageKey: z.string(),
});

export const contentSafetyResultSchema = z.object({
  checkId: z.string().uuid(),
  decision: contentSafetyDecisionSchema,
  maxSeverity: blockedTermSeveritySchema,
  matches: z.array(contentSafetyMatchSchema),
  messageKeys: z.array(z.string()),
  reviewRequired: z.boolean(),
});

export const contentSafetyReviewDecisionSchema = z.object({
  decision: contentSafetyDecisionSchema,
  reason: z.string().min(1).max(1000).transform(sanitize),
});

export const contentSafetyAppealSchema = z.object({
  reason: z.string().min(1).max(2000).transform(sanitize),
});

export const checkResponseSchema = z.object({ result: contentSafetyResultSchema });
export const batchCheckResponseSchema = z.object({ results: z.array(contentSafetyResultSchema) });
export const blockedTermsResponseSchema = z.object({ blockedTerms: z.array(blockedTermSchema) });
export const allowedTermsResponseSchema = z.object({ allowedTerms: z.array(allowedTermSchema) });

export type ContentSafetyDecision = z.infer<typeof contentSafetyDecisionSchema>;
export type BlockedTermSeverity = z.infer<typeof blockedTermSeveritySchema>;
export type BlockedTermMatchType = z.infer<typeof blockedTermMatchTypeSchema>;
export type ContentSafetyCheckInput = z.infer<typeof contentSafetyCheckSchema>;
export type ContentSafetyResult = z.infer<typeof contentSafetyResultSchema>;
export type CreateBlockedTermInput = z.infer<typeof createBlockedTermSchema>;
export type UpdateBlockedTermInput = z.infer<typeof updateBlockedTermSchema>;
export type CreateAllowedTermInput = z.infer<typeof createAllowedTermSchema>;
