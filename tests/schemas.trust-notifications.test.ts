import { describe, expect, it } from 'vitest';
import {
  enqueueNotificationRequestSchema,
  updateNotificationPreferenceSchema,
} from '../shared/schemas/notifications.schema';
import {
  createTrustReportSchema,
  publishTrustDecisionSchema,
} from '../shared/schemas/trust-operations.schema';

describe('trust operations schemas', () => {
  it('sanitizes report descriptions', () => {
    const parsed = createTrustReportSchema.parse({
      targetType: 'post',
      targetId: '550e8400-e29b-41d4-a716-446655440000',
      reason: 'harassment',
      description: '<b>bad</b><script>alert(1)</script>',
    });

    expect(parsed.description).not.toContain('<script>');
    expect(parsed.description).toContain('bad');
  });

  it('requires internal rationale for trust decisions', () => {
    expect(() =>
      publishTrustDecisionSchema.parse({
        decisionType: 'warn',
        userVisibleSummary: 'Policy warning',
      })
    ).toThrow();
  });
});

describe('notification schemas', () => {
  it('defaults request audience and priority', () => {
    const parsed = enqueueNotificationRequestSchema.parse({
      recipientUserId: '550e8400-e29b-41d4-a716-446655440000',
      notificationType: 'fan_activity_summary',
      title: 'Daily summary',
      sourceDomain: 'analytics',
      sourceEventId: 'daily-2026-04-28',
    });

    expect(parsed.audienceType).toBe('user');
    expect(parsed.priority).toBe('normal');
  });

  it('validates notification preference channel modes', () => {
    expect(
      updateNotificationPreferenceSchema.parse({
        notificationType: 'payment_failed',
        channel: 'email',
        deliveryMode: 'digest_daily',
        enabled: true,
      })
    ).toMatchObject({ channel: 'email', deliveryMode: 'digest_daily' });
  });
});
