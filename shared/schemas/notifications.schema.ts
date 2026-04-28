import { z } from '@hono/zod-openapi';
import sanitizeHtml from 'sanitize-html';

const sanitize = (value: string) =>
  sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
const uuidSchema = z.string().uuid();
const isoDateSchema = z.preprocess(
  (value) => (value instanceof Date ? value.toISOString() : value),
  z.string().datetime()
);
const nullableIsoDateSchema = isoDateSchema.nullable();

export const notificationTypeSchema = z.enum([
  'system_announcement',
  'creator_review_update',
  'trust_case_update',
  'report_update',
  'appeal_update',
  'membership_joined_daily_summary',
  'membership_changed',
  'payment_succeeded',
  'payment_failed',
  'fan_activity_summary',
  'achievement_unlocked',
  'post_published',
  'post_comment',
]);
export const notificationChannelSchema = z.enum(['in_app', 'email', 'push', 'webhook']);
export const notificationPrioritySchema = z.enum(['low', 'normal', 'high', 'critical']);
export const notificationDeliveryModeSchema = z.enum([
  'immediate',
  'digest_daily',
  'digest_weekly',
  'silent',
  'muted',
]);
export const notificationRequestStatusSchema = z.enum([
  'queued',
  'processing',
  'processed',
  'muted',
  'failed',
]);
export const notificationDeliveryStatusSchema = z.enum([
  'queued',
  'delivered',
  'failed',
  'skipped',
]);
export const notificationDevicePlatformSchema = z.enum(['ios', 'android', 'web']);

export const notificationPayloadSchema = z
  .object({
    kind: z.string().min(1).max(80).optional(),
    targetType: z.string().min(1).max(80).optional(),
    targetId: uuidSchema.optional(),
    summary: z.string().max(1000).optional(),
    ctaPath: z.string().max(500).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough()
  .default({});

export const notificationSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  notificationType: notificationTypeSchema,
  priority: notificationPrioritySchema,
  title: z.string(),
  body: z.string().nullable(),
  payload: notificationPayloadSchema,
  sourceDomain: z.string(),
  sourceEventId: z.string(),
  readAt: nullableIsoDateSchema,
  archivedAt: nullableIsoDateSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const notificationRequestSchema = z.object({
  id: uuidSchema,
  recipientUserId: uuidSchema,
  audienceType: z.string(),
  notificationType: notificationTypeSchema,
  priority: notificationPrioritySchema,
  title: z.string(),
  body: z.string().nullable(),
  payload: notificationPayloadSchema,
  sourceDomain: z.string(),
  sourceEventId: z.string(),
  idempotencyKey: z.string(),
  status: notificationRequestStatusSchema,
  error: z.string().nullable(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const notificationPreferenceSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  notificationType: notificationTypeSchema,
  channel: notificationChannelSchema,
  deliveryMode: notificationDeliveryModeSchema,
  enabled: z.boolean(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const notificationDigestPreferenceSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  digestKey: z.enum(['daily_summary', 'weekly_summary']),
  timezone: z.string(),
  sendHour: z.number().int().min(0).max(23),
  enabled: z.boolean(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const notificationDeviceSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  platform: notificationDevicePlatformSchema,
  deviceName: z.string().nullable(),
  lastSeenAt: isoDateSchema,
  revokedAt: nullableIsoDateSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const enqueueNotificationRequestSchema = z.object({
  recipientUserId: uuidSchema,
  audienceType: z.enum(['user', 'creator', 'staff']).default('user'),
  notificationType: notificationTypeSchema,
  priority: notificationPrioritySchema.default('normal'),
  title: z.string().min(1).max(140).transform(sanitize),
  body: z.string().max(1000).transform(sanitize).optional(),
  payload: notificationPayloadSchema.optional(),
  sourceDomain: z.string().min(1).max(80),
  sourceEventId: z.string().min(1).max(160),
  idempotencyKey: z.string().min(1).max(300).optional(),
});

export const updateNotificationPreferenceSchema = z.object({
  notificationType: notificationTypeSchema,
  channel: notificationChannelSchema,
  deliveryMode: notificationDeliveryModeSchema.default('immediate'),
  enabled: z.boolean(),
});

export const updateDigestPreferenceSchema = z.object({
  digestKey: z.enum(['daily_summary', 'weekly_summary']),
  timezone: z.string().min(1).max(80).default('Asia/Tokyo'),
  sendHour: z.number().int().min(0).max(23).default(9),
  enabled: z.boolean(),
});

export const registerNotificationDeviceSchema = z.object({
  platform: notificationDevicePlatformSchema,
  token: z.string().min(10).max(4096),
  deviceName: z.string().max(120).transform(sanitize).optional(),
});

export const notificationsResponseSchema = z.object({
  notifications: z.array(notificationSchema),
});
export const unreadCountResponseSchema = z.object({ count: z.number().int().nonnegative() });
export const notificationPreferencesResponseSchema = z.object({
  preferences: z.array(notificationPreferenceSchema),
});
export const notificationDigestPreferencesResponseSchema = z.object({
  preferences: z.array(notificationDigestPreferenceSchema),
});
export const notificationDeviceResponseSchema = z.object({ device: notificationDeviceSchema });

export type EnqueueNotificationRequestInput = z.infer<typeof enqueueNotificationRequestSchema>;
export type NotificationDeliveryMode = z.infer<typeof notificationDeliveryModeSchema>;
export type UpdateNotificationPreferenceInput = z.infer<typeof updateNotificationPreferenceSchema>;
export type UpdateDigestPreferenceInput = z.infer<typeof updateDigestPreferenceSchema>;
export type RegisterNotificationDeviceInput = z.infer<typeof registerNotificationDeviceSchema>;
