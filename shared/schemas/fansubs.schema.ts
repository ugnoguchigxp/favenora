import { z } from '@hono/zod-openapi';
import sanitizeHtml from 'sanitize-html';

const sanitize = (v: string) => sanitizeHtml(v, { allowedTags: [], allowedAttributes: {} }).trim();
const uuidSchema = z.string().uuid();
const isoDateSchema = z.preprocess(
  (value) => (value instanceof Date ? value.toISOString() : value),
  z.string().datetime()
);

export const translationContributionTypeSchema = z.enum([
  'subtitle_track',
  'transcript',
  'translation_note',
  'context_note',
  'correction',
]);
export const translationTrackStatusSchema = z.enum([
  'draft',
  'submitted',
  'published',
  'needs_revision',
  'hidden',
  'removed',
]);
export const translationApprovalStateSchema = z.enum([
  'unreviewed',
  'creator_approved',
  'creator_rejected',
  'official',
]);

export const fanTranslationTrackSchema = z.object({
  id: uuidSchema,
  postId: uuidSchema,
  authorId: uuidSchema,
  contributionType: translationContributionTypeSchema,
  sourceLanguage: z.string(),
  targetLanguage: z.string(),
  locale: z.string().nullable(),
  title: z.string(),
  status: translationTrackStatusSchema,
  approvalState: translationApprovalStateSchema,
  visibility: z.enum(['public', 'supporters', 'private']),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const subtitleCueSchema = z.object({
  id: uuidSchema,
  trackId: uuidSchema,
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().positive(),
  text: z.string(),
  sortOrder: z.number().int(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const translationAnnotationSchema = z.object({
  id: uuidSchema,
  trackId: uuidSchema,
  anchorType: z.enum(['time_range', 'page_region', 'text_range', 'chapter', 'whole_work']),
  anchorData: z.record(z.string(), z.unknown()),
  originalText: z.string().nullable(),
  translatedText: z.string(),
  note: z.string().nullable(),
  status: z.enum(['active', 'stale', 'removed']),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const createFanTranslationTrackSchema = z.object({
  contributionType: translationContributionTypeSchema,
  sourceLanguage: z.string().min(2).max(20),
  targetLanguage: z.string().min(2).max(20),
  locale: z.string().max(20).optional(),
  title: z.string().min(1).max(200).transform(sanitize),
  visibility: z.enum(['public', 'supporters', 'private']).default('public'),
});

export const updateFanTranslationTrackSchema = createFanTranslationTrackSchema.partial();

export const putSubtitleCuesSchema = z.object({
  cues: z.array(
    z.object({
      startMs: z.number().int().nonnegative(),
      endMs: z.number().int().positive(),
      text: z.string().min(1).max(5000).transform(sanitize),
      sortOrder: z.number().int().min(0),
    })
  ),
});

export const putTranslationAnnotationsSchema = z.object({
  annotations: z.array(
    z.object({
      anchorType: z.enum(['time_range', 'page_region', 'text_range', 'chapter', 'whole_work']),
      anchorData: z.record(z.string(), z.unknown()),
      originalText: z.string().max(5000).transform(sanitize).optional(),
      translatedText: z.string().min(1).max(5000).transform(sanitize),
      note: z.string().max(5000).transform(sanitize).optional(),
      status: z.enum(['active', 'stale', 'removed']).default('active'),
    })
  ),
});

export const voteTranslationSchema = z.object({
  value: z.enum(['up', 'down']),
  reason: z.string().max(500).transform(sanitize).optional(),
});

export const reportTranslationSchema = z.object({
  reason: z.string().min(1).max(1000).transform(sanitize),
});

export const approveTranslationSchema = z.object({
  approvalState: translationApprovalStateSchema,
  note: z.string().max(1000).transform(sanitize).optional(),
});

export const fanTranslationTracksResponseSchema = z.object({
  tracks: z.array(fanTranslationTrackSchema),
});
export const fanTranslationTrackResponseSchema = z.object({ track: fanTranslationTrackSchema });
export const subtitleCuesResponseSchema = z.object({ cues: z.array(subtitleCueSchema) });
export const translationAnnotationsResponseSchema = z.object({
  annotations: z.array(translationAnnotationSchema),
});

export type CreateFanTranslationTrackInput = z.infer<typeof createFanTranslationTrackSchema>;
export type UpdateFanTranslationTrackInput = z.infer<typeof updateFanTranslationTrackSchema>;
