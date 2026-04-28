import { z } from '@hono/zod-openapi';
import sanitizeHtml from 'sanitize-html';

const sanitize = (val: string) => sanitizeHtml(val).trim();
const uuidSchema = z.string().uuid();
const nullableUuidSchema = uuidSchema.nullable();
const isoDateSchema = z.string().datetime();
const nullableIsoDateSchema = isoDateSchema.nullable();
const dateSchema = z.string().date();
const jsonRecordSchema = z.record(z.string(), z.unknown());

export const analyticsSourceDomainSchema = z.enum([
  'posts',
  'memberships',
  'payments',
  'fansubs',
  'streams',
  'notifications',
  'projects',
  'media',
  'content-safety',
]);

export const achievementScopeSchema = z.enum(['creator', 'fan', 'platform']);
export const achievementRepeatabilitySchema = z.enum(['once', 'daily', 'monthly', 'unlimited']);
export const analyticsAlertTypeSchema = z.enum([
  'membership_churn_spike',
  'daily_membership_summary',
  'achievement_unlocked',
  'post_engagement_spike',
  'fan_sub_activity_spike',
  'stream_attendance_milestone',
]);
export const analyticsAlertPrioritySchema = z.enum(['low', 'normal', 'high', 'critical']);

export const analyticsEventSchema = z
  .object({
    id: uuidSchema,
    sourceDomain: z.string(),
    eventType: z.string(),
    actorUserId: nullableUuidSchema,
    creatorId: nullableUuidSchema,
    targetType: z.string().nullable(),
    targetId: nullableUuidSchema,
    occurredAt: isoDateSchema,
    metadata: z.unknown().nullable(),
    idempotencyKey: z.string(),
    ingestedAt: isoDateSchema,
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
  })
  .openapi('AnalyticsEvent');

export const createAnalyticsEventSchema = z
  .object({
    sourceDomain: analyticsSourceDomainSchema,
    eventType: z.string().min(1).max(120).transform(sanitize),
    actorUserId: uuidSchema.optional(),
    creatorId: uuidSchema.optional(),
    targetType: z.string().min(1).max(80).transform(sanitize).optional(),
    targetId: uuidSchema.optional(),
    occurredAt: isoDateSchema.optional(),
    metadata: jsonRecordSchema.default({}),
    idempotencyKey: z.string().min(1).max(240).transform(sanitize),
  })
  .openapi('CreateAnalyticsEventInput');

export const creatorDailyMetricsSchema = z
  .object({
    id: uuidSchema,
    creatorId: uuidSchema,
    date: dateSchema,
    timezone: z.string(),
    followersDelta: z.number().int(),
    freeMembersDelta: z.number().int(),
    paidMembersDelta: z.number().int(),
    cancellations: z.number().int(),
    activeSupporters: z.number().int(),
    postViews: z.number().int(),
    comments: z.number().int(),
    translationSubmissions: z.number().int(),
    streamAttendance: z.number().int(),
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
  })
  .openapi('CreatorDailyMetrics');

export const fanActivityDailyMetricsSchema = z
  .object({
    id: uuidSchema,
    creatorId: uuidSchema,
    fanUserId: uuidSchema,
    date: dateSchema,
    activityScore: z.number().int(),
    eventCounts: z.unknown(),
    lastActivityAt: nullableIsoDateSchema,
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
  })
  .openapi('FanActivityDailyMetrics');

export const membershipDailySummarySchema = z
  .object({
    id: uuidSchema,
    creatorId: uuidSchema,
    date: dateSchema,
    timezone: z.string(),
    summary: z.string(),
    metrics: z.unknown(),
    notableEvents: z.unknown(),
    notificationStatus: z.string(),
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
  })
  .openapi('MembershipDailySummary');

export const achievementDefinitionSchema = z
  .object({
    id: uuidSchema,
    key: z.string(),
    scope: z.string(),
    title: z.string(),
    description: z.string(),
    conditionType: z.string(),
    conditionConfig: z.unknown(),
    repeatability: z.string(),
    visibility: z.string(),
    enabled: z.boolean(),
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
  })
  .openapi('AchievementDefinition');

export const createAchievementDefinitionSchema = z
  .object({
    key: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9_.-]+$/),
    scope: achievementScopeSchema,
    title: z.string().min(1).max(120).transform(sanitize),
    description: z.string().min(1).max(1000).transform(sanitize),
    conditionType: z.enum(['event_count', 'metric_threshold']),
    conditionConfig: jsonRecordSchema,
    repeatability: achievementRepeatabilitySchema.default('once'),
    visibility: z.enum(['public', 'private']).default('public'),
    enabled: z.boolean().default(true),
  })
  .openapi('CreateAchievementDefinitionInput');

export const updateAchievementDefinitionSchema = createAchievementDefinitionSchema
  .partial()
  .openapi('UpdateAchievementDefinitionInput');

export const achievementUnlockSchema = z
  .object({
    id: uuidSchema,
    achievementId: uuidSchema,
    scope: z.string(),
    creatorId: nullableUuidSchema,
    userId: nullableUuidSchema,
    unlockedAt: isoDateSchema,
    sourceEventId: nullableUuidSchema,
    notificationStatus: z.string(),
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
  })
  .openapi('AchievementUnlock');

export const analyticsAlertCandidateSchema = z
  .object({
    id: uuidSchema,
    creatorId: uuidSchema,
    alertType: z.string(),
    priority: z.string(),
    payload: z.unknown(),
    status: z.string(),
    processedAt: nullableIsoDateSchema,
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
  })
  .openapi('AnalyticsAlertCandidate');

export const analyticsJobSchema = z
  .object({
    id: uuidSchema,
    jobType: z.string(),
    targetDate: dateSchema,
    status: z.string(),
    startedAt: nullableIsoDateSchema,
    finishedAt: nullableIsoDateSchema,
    error: z.string().nullable(),
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
  })
  .openapi('AnalyticsJob');

export const creatorAnalyticsOverviewSchema = z
  .object({
    creatorId: uuidSchema,
    from: dateSchema,
    to: dateSchema,
    totals: z.object({
      followersDelta: z.number().int(),
      freeMembersDelta: z.number().int(),
      paidMembersDelta: z.number().int(),
      cancellations: z.number().int(),
      activeSupporters: z.number().int(),
      postViews: z.number().int(),
      comments: z.number().int(),
      translationSubmissions: z.number().int(),
      streamAttendance: z.number().int(),
    }),
    dailyMetrics: z.array(creatorDailyMetricsSchema),
  })
  .openapi('CreatorAnalyticsOverview');

export const fanTrendAnalyticsSchema = z
  .object({
    creatorId: uuidSchema,
    date: dateSchema.optional(),
    fans: z.array(fanActivityDailyMetricsSchema),
  })
  .openapi('FanTrendAnalytics');

export const analyticsRangeQuerySchema = z.object({
  creatorId: uuidSchema,
  from: dateSchema.optional(),
  to: dateSchema.optional(),
});

export const analyticsCreatorDateQuerySchema = z.object({
  creatorId: uuidSchema,
  date: dateSchema.optional(),
  timezone: z.string().default('UTC'),
});

export const dailyRollupSchema = z
  .object({
    date: dateSchema,
    timezone: z.string().default('UTC'),
    creatorId: uuidSchema.optional(),
  })
  .openapi('DailyRollupInput');

export const analyticsEventResponseSchema = z.object({ event: analyticsEventSchema });
export const creatorAnalyticsOverviewResponseSchema = z.object({
  overview: creatorAnalyticsOverviewSchema,
});
export const fanTrendAnalyticsResponseSchema = z.object({ fanTrend: fanTrendAnalyticsSchema });
export const membershipDailySummariesResponseSchema = z.object({
  summaries: z.array(membershipDailySummarySchema),
});
export const achievementsResponseSchema = z.object({
  achievements: z.array(achievementDefinitionSchema),
});
export const achievementUnlocksResponseSchema = z.object({
  unlocks: z.array(achievementUnlockSchema),
});
export const analyticsJobsResponseSchema = z.object({ jobs: z.array(analyticsJobSchema) });

export type CreateAnalyticsEventInput = z.infer<typeof createAnalyticsEventSchema>;
export type CreateAchievementDefinitionInput = z.infer<typeof createAchievementDefinitionSchema>;
export type UpdateAchievementDefinitionInput = z.infer<typeof updateAchievementDefinitionSchema>;
export type DailyRollupInput = z.infer<typeof dailyRollupSchema>;
