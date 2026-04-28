import { z } from '@hono/zod-openapi';
import sanitizeHtml from 'sanitize-html';

const sanitize = (v: string) => sanitizeHtml(v, { allowedTags: [], allowedAttributes: {} }).trim();
const uuidSchema = z.string().uuid();
const isoDateSchema = z.preprocess(
  (value) => (value instanceof Date ? value.toISOString() : value),
  z.string().datetime()
);
const nullableIsoDateSchema = isoDateSchema.nullable();

export const streamStatusSchema = z.enum([
  'draft',
  'scheduled',
  'live',
  'ended',
  'archiving',
  'archived',
  'cancelled',
]);
export const streamVisibilitySchema = z.enum(['public', 'supporters', 'private']);
export const streamChatMessageStatusSchema = z.enum([
  'visible',
  'held_for_review',
  'hidden_by_creator',
  'hidden_by_staff',
  'removed',
]);
export const streamTipGoalStatusSchema = z.enum(['draft', 'active', 'completed', 'archived']);

export const streamSchema = z.object({
  id: uuidSchema,
  creatorId: uuidSchema,
  title: z.string(),
  description: z.string().nullable(),
  status: streamStatusSchema,
  visibility: streamVisibilitySchema,
  scheduledAt: nullableIsoDateSchema,
  startedAt: nullableIsoDateSchema,
  endedAt: nullableIsoDateSchema,
  embedUrl: z.string().url().nullable(),
  embedProvider: z.string().nullable(),
  posterMediaId: uuidSchema.nullable(),
  archivePostId: uuidSchema.nullable(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const streamChatMessageSchema = z.object({
  id: uuidSchema,
  streamId: uuidSchema,
  authorId: uuidSchema,
  message: z.string(),
  status: streamChatMessageStatusSchema,
  safetyDecision: z.enum(['allow', 'warn', 'hold', 'block']).nullable(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const streamTipGoalSchema = z.object({
  id: uuidSchema,
  streamId: uuidSchema,
  title: z.string(),
  description: z.string().nullable(),
  targetAmount: z.number().int(),
  currentAmount: z.number().int(),
  currency: z.string().length(3),
  status: streamTipGoalStatusSchema,
  sortOrder: z.number().int(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const streamArchiveRequestSchema = z.object({
  id: uuidSchema,
  streamId: uuidSchema,
  requestedByUserId: uuidSchema,
  status: z.enum(['queued', 'processing', 'completed', 'failed']),
  archiveMediaId: uuidSchema.nullable(),
  archivePostId: uuidSchema.nullable(),
  error: z.string().nullable(),
  createdAt: isoDateSchema,
  completedAt: nullableIsoDateSchema,
});

export const createStreamSchema = z.object({
  creatorId: uuidSchema,
  title: z.string().min(1).max(200).transform(sanitize),
  description: z.string().max(4000).transform(sanitize).optional(),
  visibility: streamVisibilitySchema.default('public'),
  embedUrl: z.string().url().optional(),
  embedProvider: z.string().min(1).max(80).optional(),
  posterMediaId: uuidSchema.optional(),
});

export const updateStreamSchema = createStreamSchema.omit({ creatorId: true }).partial();

export const streamScheduleSchema = z.object({ scheduledAt: isoDateSchema });

export const createStreamChatMessageSchema = z.object({
  message: z.string().min(1).max(4000).transform(sanitize),
});

export const createStreamTipGoalSchema = z.object({
  title: z.string().min(1).max(120).transform(sanitize),
  description: z.string().max(1000).transform(sanitize).optional(),
  targetAmount: z.number().int().positive(),
  currency: z
    .string()
    .length(3)
    .transform((v) => v.toUpperCase()),
  status: streamTipGoalStatusSchema.default('draft'),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateStreamTipGoalSchema = createStreamTipGoalSchema.partial();

export const archiveStreamSchema = z.object({
  makePostPublic: z.boolean().default(false),
});

export const streamsResponseSchema = z.object({ streams: z.array(streamSchema) });
export const streamResponseSchema = z.object({ stream: streamSchema });
export const streamChatResponseSchema = z.object({ messages: z.array(streamChatMessageSchema) });
export const streamTipGoalsResponseSchema = z.object({ goals: z.array(streamTipGoalSchema) });

export type CreateStreamInput = z.infer<typeof createStreamSchema>;
export type UpdateStreamInput = z.infer<typeof updateStreamSchema>;
export type CreateStreamChatMessageInput = z.infer<typeof createStreamChatMessageSchema>;
export type CreateStreamTipGoalInput = z.infer<typeof createStreamTipGoalSchema>;
export type UpdateStreamTipGoalInput = z.infer<typeof updateStreamTipGoalSchema>;
