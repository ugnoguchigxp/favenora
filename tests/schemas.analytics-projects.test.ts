import { describe, expect, it } from 'vitest';
import {
  analyticsAlertTypeSchema,
  createAchievementDefinitionSchema,
  createAnalyticsEventSchema,
} from '../shared/schemas/analytics.schema';
import {
  createProjectSchema,
  createProjectUpdateSchema,
  projectUpdateSchema,
} from '../shared/schemas/projects.schema';

describe('analytics and projects shared schemas', () => {
  it('normalizes analytics event inputs and sanitizes event names', () => {
    const parsed = createAnalyticsEventSchema.parse({
      sourceDomain: 'payments',
      eventType: '<b>membership_paid</b>',
      actorUserId: '550e8400-e29b-41d4-a716-446655440000',
      creatorId: '550e8400-e29b-41d4-a716-446655440001',
      targetType: '<i>membership</i>',
      targetId: '550e8400-e29b-41d4-a716-446655440002',
      idempotencyKey: ' payments:invoice-1 ',
    });

    expect(parsed.eventType).toBe('<b>membership_paid</b>');
    expect(parsed.targetType).toBe('<i>membership</i>');
    expect(parsed.metadata).toEqual({});
    expect(parsed.idempotencyKey).toBe('payments:invoice-1');
  });

  it('accepts achievement definitions for event count unlocks', () => {
    const parsed = createAchievementDefinitionSchema.parse({
      key: 'fan.first_paid_month',
      scope: 'fan',
      title: '<b>First month</b>',
      description: '<script>alert(1)</script>Paid support started',
      conditionType: 'event_count',
      conditionConfig: {
        eventType: 'membership_paid',
        threshold: 1,
      },
    });

    expect(parsed.description).toBe('Paid support started');
    expect(parsed.repeatability).toBe('once');
    expect(analyticsAlertTypeSchema.parse('achievement_unlocked')).toBe('achievement_unlocked');
  });

  it('normalizes project slugs and nullable copy', () => {
    const parsed = createProjectSchema.parse({
      title: '<b>Album Making</b>',
      slug: 'Album-Making',
      summary: '',
      description: '<script>alert(1)</script>Track progress',
      visibility: 'supporters',
    });

    expect(parsed.slug).toBe('album-making');
    expect(parsed.summary).toBeNull();
    expect(parsed.description).toBe('Track progress');
  });

  it('validates project update input and accepts jsonb tier ids from responses', () => {
    const updateInput = createProjectUpdateSchema.parse({
      title: '<b>Milestone reached</b>',
      body: '<script>alert(1)</script>We finished recording.',
      visibility: 'tiers',
      tierIds: ['550e8400-e29b-41d4-a716-446655440010'],
    });

    expect(updateInput.body).toBe('We finished recording.');
    expect(updateInput.tierIds).toHaveLength(1);

    const now = new Date().toISOString();
    const response = projectUpdateSchema.parse({
      id: '550e8400-e29b-41d4-a716-446655440020',
      projectId: '550e8400-e29b-41d4-a716-446655440021',
      title: 'Milestone reached',
      body: 'We finished recording.',
      visibility: 'tiers',
      tierIds: ['550e8400-e29b-41d4-a716-446655440010'],
      publishedAt: null,
      createdBy: '550e8400-e29b-41d4-a716-446655440022',
      createdAt: now,
      updatedAt: now,
    });

    expect(response.tierIds).toEqual(['550e8400-e29b-41d4-a716-446655440010']);
  });
});
