import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationsService } from '../api/modules/notifications/notifications.service';

describe('notifications service', () => {
  const repository = {
    findRequestByIdempotencyKey: vi.fn(),
    findPreference: vi.fn(),
    createRequestWithNotification: vi.fn(),
    markRequestFailed: vi.fn(),
    listNotifications: vi.fn(),
    countUnread: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    archive: vi.fn(),
    listPreferences: vi.fn(),
    upsertPreference: vi.fn(),
    listDigestPreferences: vi.fn(),
    upsertDigestPreference: vi.fn(),
    registerDevice: vi.fn(),
    revokeDevice: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    repository.findRequestByIdempotencyKey.mockResolvedValue(null);
    repository.findPreference.mockResolvedValue(null);
    repository.createRequestWithNotification.mockResolvedValue({
      request: { id: 'request-id' },
      notification: { id: 'notification-id' },
    });
  });

  it('deduplicates requests by source and recipient idempotency key', async () => {
    repository.findRequestByIdempotencyKey.mockResolvedValue({ id: 'existing-request' });
    const service = new NotificationsService(repository);

    const result = await service.enqueueNotificationRequest({
      recipientUserId: '550e8400-e29b-41d4-a716-446655440000',
      notificationType: 'payment_succeeded',
      priority: 'normal',
      title: 'Payment succeeded',
      sourceDomain: 'payments',
      sourceEventId: 'evt_1',
    });

    expect(result.duplicate).toBe(true);
    expect(repository.createRequestWithNotification).not.toHaveBeenCalled();
  });

  it('mutes non-critical notifications when in-app preference is disabled', async () => {
    repository.findPreference.mockResolvedValue({
      enabled: false,
      deliveryMode: 'immediate',
    });
    const service = new NotificationsService(repository);

    await service.enqueueNotificationRequest({
      recipientUserId: '550e8400-e29b-41d4-a716-446655440000',
      notificationType: 'fan_activity_summary',
      priority: 'normal',
      title: 'Fan activity',
      sourceDomain: 'analytics',
      sourceEventId: 'daily-1',
    });

    expect(repository.createRequestWithNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey:
          'analytics:daily-1:fan_activity_summary:550e8400-e29b-41d4-a716-446655440000',
      }),
      'muted'
    );
  });

  it('delivers critical notifications even when preference is disabled', async () => {
    repository.findPreference.mockResolvedValue({
      enabled: false,
      deliveryMode: 'muted',
    });
    const service = new NotificationsService(repository);

    await service.enqueueNotificationRequest({
      recipientUserId: '550e8400-e29b-41d4-a716-446655440000',
      notificationType: 'system_announcement',
      priority: 'critical',
      title: 'Security update',
      sourceDomain: 'system',
      sourceEventId: 'critical-1',
    });

    expect(repository.createRequestWithNotification).toHaveBeenCalledWith(
      expect.any(Object),
      'immediate'
    );
  });
});
