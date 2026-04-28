import type {
  EnqueueNotificationRequestInput,
  NotificationDeliveryMode,
  RegisterNotificationDeviceInput,
  UpdateDigestPreferenceInput,
  UpdateNotificationPreferenceInput,
} from '../../../shared/schemas/notifications.schema';
import { NotFoundError } from '../../lib/errors';
import * as Repository from './notifications.repository';

export type NotificationsRepository = typeof Repository;

const buildIdempotencyKey = (input: EnqueueNotificationRequestInput) =>
  input.idempotencyKey ??
  [input.sourceDomain, input.sourceEventId, input.notificationType, input.recipientUserId].join(
    ':'
  );
const toDeliveryMode = (value: string | undefined): NotificationDeliveryMode => {
  if (
    value === 'silent' ||
    value === 'immediate' ||
    value === 'digest_daily' ||
    value === 'digest_weekly' ||
    value === 'muted'
  ) {
    return value;
  }
  return 'immediate';
};

export class NotificationsService {
  constructor(private readonly repository: NotificationsRepository = Repository) {}

  async enqueueNotificationRequest(input: EnqueueNotificationRequestInput) {
    const idempotencyKey = buildIdempotencyKey(input);
    const existing = await this.repository.findRequestByIdempotencyKey(idempotencyKey);
    if (existing) return { duplicate: true, request: existing, notification: null };

    const preference = await this.repository.findPreference({
      userId: input.recipientUserId,
      notificationType: input.notificationType,
      channel: 'in_app',
    });
    const deliveryMode: NotificationDeliveryMode =
      input.priority === 'critical'
        ? 'immediate'
        : preference && !preference.enabled
          ? 'muted'
          : toDeliveryMode(preference?.deliveryMode);

    const result = await this.repository.createRequestWithNotification(
      { ...input, idempotencyKey },
      deliveryMode
    );
    return { duplicate: false, ...result };
  }

  enqueueDigestNotification(input: EnqueueNotificationRequestInput) {
    return this.enqueueNotificationRequest({
      ...input,
      priority: input.priority ?? 'normal',
      payload: { ...(input.payload ?? {}), digest: true },
    });
  }

  listNotifications(userId: string, limit?: number) {
    return this.repository.listNotifications(userId, limit);
  }

  countUnread(userId: string) {
    return this.repository.countUnread(userId);
  }

  async markRead(userId: string, id: string) {
    const notification = await this.repository.markRead(userId, id);
    if (!notification) throw new NotFoundError('Notification not found');
    return notification;
  }

  markAllRead(userId: string) {
    return this.repository.markAllRead(userId);
  }

  async archive(userId: string, id: string) {
    const notification = await this.repository.archive(userId, id);
    if (!notification) throw new NotFoundError('Notification not found');
    return notification;
  }

  listPreferences(userId: string) {
    return this.repository.listPreferences(userId);
  }

  updatePreference(userId: string, input: UpdateNotificationPreferenceInput) {
    return this.repository.upsertPreference(userId, input);
  }

  listDigestPreferences(userId: string) {
    return this.repository.listDigestPreferences(userId);
  }

  updateDigestPreference(userId: string, input: UpdateDigestPreferenceInput) {
    return this.repository.upsertDigestPreference(userId, input);
  }

  registerDevice(userId: string, input: RegisterNotificationDeviceInput) {
    return this.repository.registerDevice(userId, input);
  }

  async revokeDevice(userId: string, id: string) {
    const device = await this.repository.revokeDevice(userId, id);
    if (!device) throw new NotFoundError('Notification device not found');
    return device;
  }
}

export const notificationsService = new NotificationsService();
