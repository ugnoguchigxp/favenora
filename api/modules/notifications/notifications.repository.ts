import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import type {
  EnqueueNotificationRequestInput,
  RegisterNotificationDeviceInput,
  UpdateDigestPreferenceInput,
  UpdateNotificationPreferenceInput,
} from '../../../shared/schemas/notifications.schema';
import { db } from '../../db/client';
import {
  notificationDeliveries,
  notificationDevices,
  notificationDigestPreferences,
  notificationPreferences,
  notificationRequests,
  notifications,
} from '../../db/schema';

export const listNotifications = async (userId: string, limit = 50) => {
  return db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.archivedAt)))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
};

export const countUnread = async (userId: string) => {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        isNull(notifications.readAt),
        isNull(notifications.archivedAt)
      )
    );
  return row?.count ?? 0;
};

export const findRequestByIdempotencyKey = async (idempotencyKey: string) => {
  const [request] = await db
    .select()
    .from(notificationRequests)
    .where(eq(notificationRequests.idempotencyKey, idempotencyKey));
  return request ?? null;
};

export const findPreference = async (input: {
  userId: string;
  notificationType: string;
  channel: string;
}) => {
  const [preference] = await db
    .select()
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.userId, input.userId),
        eq(notificationPreferences.notificationType, input.notificationType),
        eq(notificationPreferences.channel, input.channel)
      )
    );
  return preference ?? null;
};

export const createRequestWithNotification = async (
  input: EnqueueNotificationRequestInput & { idempotencyKey: string },
  deliveryMode: 'immediate' | 'digest_daily' | 'digest_weekly' | 'silent' | 'muted'
) => {
  return db.transaction(async (tx) => {
    const [request] = await tx
      .insert(notificationRequests)
      .values({
        recipientUserId: input.recipientUserId,
        audienceType: input.audienceType,
        notificationType: input.notificationType,
        priority: input.priority,
        title: input.title,
        body: input.body ?? null,
        payload: input.payload ?? {},
        sourceDomain: input.sourceDomain,
        sourceEventId: input.sourceEventId,
        idempotencyKey: input.idempotencyKey,
        status: deliveryMode === 'muted' ? 'muted' : 'processing',
      })
      .returning();

    if (deliveryMode === 'muted' || deliveryMode === 'silent') {
      return { request, notification: null };
    }

    const [notification] = await tx
      .insert(notifications)
      .values({
        userId: input.recipientUserId,
        requestId: request.id,
        notificationType: input.notificationType,
        priority: input.priority,
        title: input.title,
        body: input.body ?? null,
        payload: input.payload ?? {},
        sourceDomain: input.sourceDomain,
        sourceEventId: input.sourceEventId,
      })
      .returning();

    await tx.insert(notificationDeliveries).values({
      notificationId: notification.id,
      requestId: request.id,
      channel: 'in_app',
      status: 'delivered',
      attemptedAt: new Date(),
      deliveredAt: new Date(),
    });

    const [processedRequest] = await tx
      .update(notificationRequests)
      .set({ status: 'processed' })
      .where(eq(notificationRequests.id, request.id))
      .returning();

    return { request: processedRequest, notification };
  });
};

export const markRequestFailed = async (id: string, error: string) => {
  const [request] = await db
    .update(notificationRequests)
    .set({ status: 'failed', error })
    .where(eq(notificationRequests.id, id))
    .returning();
  return request ?? null;
};

export const markRead = async (userId: string, id: string) => {
  const [notification] = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .returning();
  return notification ?? null;
};

export const markAllRead = async (userId: string) => {
  return db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
    .returning();
};

export const archive = async (userId: string, id: string) => {
  const [notification] = await db
    .update(notifications)
    .set({ archivedAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .returning();
  return notification ?? null;
};

export const listPreferences = async (userId: string) => {
  return db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId));
};

export const upsertPreference = async (
  userId: string,
  input: UpdateNotificationPreferenceInput
) => {
  const [preference] = await db
    .insert(notificationPreferences)
    .values({
      userId,
      notificationType: input.notificationType,
      channel: input.channel,
      deliveryMode: input.deliveryMode,
      enabled: input.enabled,
    })
    .onConflictDoUpdate({
      target: [
        notificationPreferences.userId,
        notificationPreferences.notificationType,
        notificationPreferences.channel,
      ],
      set: { deliveryMode: input.deliveryMode, enabled: input.enabled },
    })
    .returning();
  return preference;
};

export const listDigestPreferences = async (userId: string) => {
  return db
    .select()
    .from(notificationDigestPreferences)
    .where(eq(notificationDigestPreferences.userId, userId));
};

export const upsertDigestPreference = async (
  userId: string,
  input: UpdateDigestPreferenceInput
) => {
  const [preference] = await db
    .insert(notificationDigestPreferences)
    .values({
      userId,
      digestKey: input.digestKey,
      timezone: input.timezone,
      sendHour: input.sendHour,
      enabled: input.enabled,
    })
    .onConflictDoUpdate({
      target: [notificationDigestPreferences.userId, notificationDigestPreferences.digestKey],
      set: { timezone: input.timezone, sendHour: input.sendHour, enabled: input.enabled },
    })
    .returning();
  return preference;
};

export const registerDevice = async (userId: string, input: RegisterNotificationDeviceInput) => {
  const [device] = await db
    .insert(notificationDevices)
    .values({
      userId,
      platform: input.platform,
      tokenCiphertext: input.token,
      deviceName: input.deviceName ?? null,
      lastSeenAt: new Date(),
    })
    .returning();
  return device;
};

export const revokeDevice = async (userId: string, id: string) => {
  const [device] = await db
    .update(notificationDevices)
    .set({ revokedAt: new Date() })
    .where(and(eq(notificationDevices.id, id), eq(notificationDevices.userId, userId)))
    .returning();
  return device ?? null;
};
