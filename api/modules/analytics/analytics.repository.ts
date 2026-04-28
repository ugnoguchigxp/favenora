import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm';
import type {
  CreateAchievementDefinitionInput,
  CreateAnalyticsEventInput,
  UpdateAchievementDefinitionInput,
} from '../../../shared/schemas/analytics.schema';
import { db } from '../../db/client';
import {
  achievementDefinitions,
  achievementUnlocks,
  analyticsAlertCandidates,
  analyticsEvents,
  analyticsJobs,
  creatorDailyMetrics,
  creatorMembershipDailySummaries,
  fanActivityDailyMetrics,
} from '../../db/schema';

export const insertAnalyticsEvent = async (input: CreateAnalyticsEventInput) => {
  const [event] = await db
    .insert(analyticsEvents)
    .values({
      sourceDomain: input.sourceDomain,
      eventType: input.eventType,
      actorUserId: input.actorUserId ?? null,
      creatorId: input.creatorId ?? null,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
      metadata: input.metadata,
      idempotencyKey: input.idempotencyKey,
    })
    .onConflictDoNothing({ target: analyticsEvents.idempotencyKey })
    .returning();
  return event ?? null;
};

export const findAnalyticsEventByIdempotencyKey = async (idempotencyKey: string) => {
  const [event] = await db
    .select()
    .from(analyticsEvents)
    .where(eq(analyticsEvents.idempotencyKey, idempotencyKey));
  return event ?? null;
};

export const listEventsForRollup = async (input: { date: string; creatorId?: string }) => {
  const from = new Date(`${input.date}T00:00:00.000Z`);
  const to = new Date(`${input.date}T23:59:59.999Z`);
  return db
    .select()
    .from(analyticsEvents)
    .where(
      and(
        input.creatorId ? eq(analyticsEvents.creatorId, input.creatorId) : undefined,
        gte(analyticsEvents.occurredAt, from),
        lte(analyticsEvents.occurredAt, to)
      )
    );
};

export const upsertCreatorDailyMetrics = async (data: typeof creatorDailyMetrics.$inferInsert) => {
  const [metrics] = await db
    .insert(creatorDailyMetrics)
    .values(data)
    .onConflictDoUpdate({
      target: [
        creatorDailyMetrics.creatorId,
        creatorDailyMetrics.date,
        creatorDailyMetrics.timezone,
      ],
      set: {
        followersDelta: data.followersDelta ?? 0,
        freeMembersDelta: data.freeMembersDelta ?? 0,
        paidMembersDelta: data.paidMembersDelta ?? 0,
        cancellations: data.cancellations ?? 0,
        activeSupporters: data.activeSupporters ?? 0,
        postViews: data.postViews ?? 0,
        comments: data.comments ?? 0,
        translationSubmissions: data.translationSubmissions ?? 0,
        streamAttendance: data.streamAttendance ?? 0,
      },
    })
    .returning();
  return metrics;
};

export const listCreatorDailyMetrics = async (input: {
  creatorId: string;
  from?: string;
  to?: string;
}) => {
  return db
    .select()
    .from(creatorDailyMetrics)
    .where(
      and(
        eq(creatorDailyMetrics.creatorId, input.creatorId),
        input.from ? gte(creatorDailyMetrics.date, input.from) : undefined,
        input.to ? lte(creatorDailyMetrics.date, input.to) : undefined
      )
    )
    .orderBy(asc(creatorDailyMetrics.date));
};

export const upsertFanActivityDailyMetric = async (
  data: typeof fanActivityDailyMetrics.$inferInsert
) => {
  const [metric] = await db
    .insert(fanActivityDailyMetrics)
    .values(data)
    .onConflictDoUpdate({
      target: [
        fanActivityDailyMetrics.creatorId,
        fanActivityDailyMetrics.fanUserId,
        fanActivityDailyMetrics.date,
      ],
      set: {
        activityScore: data.activityScore ?? 0,
        eventCounts: data.eventCounts,
        lastActivityAt: data.lastActivityAt ?? null,
      },
    })
    .returning();
  return metric;
};

export const listFanActivity = async (input: { creatorId: string; date?: string }) => {
  return db
    .select()
    .from(fanActivityDailyMetrics)
    .where(
      and(
        eq(fanActivityDailyMetrics.creatorId, input.creatorId),
        input.date ? eq(fanActivityDailyMetrics.date, input.date) : undefined
      )
    )
    .orderBy(desc(fanActivityDailyMetrics.activityScore));
};

export const upsertMembershipDailySummary = async (
  data: typeof creatorMembershipDailySummaries.$inferInsert
) => {
  const [summary] = await db
    .insert(creatorMembershipDailySummaries)
    .values(data)
    .onConflictDoUpdate({
      target: [
        creatorMembershipDailySummaries.creatorId,
        creatorMembershipDailySummaries.date,
        creatorMembershipDailySummaries.timezone,
      ],
      set: {
        summary: data.summary,
        metrics: data.metrics,
        notableEvents: data.notableEvents,
        notificationStatus: data.notificationStatus ?? 'pending',
      },
    })
    .returning();
  return summary;
};

export const listMembershipDailySummaries = async (input: {
  creatorId: string;
  from?: string;
  to?: string;
}) => {
  return db
    .select()
    .from(creatorMembershipDailySummaries)
    .where(
      and(
        eq(creatorMembershipDailySummaries.creatorId, input.creatorId),
        input.from ? gte(creatorMembershipDailySummaries.date, input.from) : undefined,
        input.to ? lte(creatorMembershipDailySummaries.date, input.to) : undefined
      )
    )
    .orderBy(desc(creatorMembershipDailySummaries.date));
};

export const createAnalyticsJob = async (data: typeof analyticsJobs.$inferInsert) => {
  const [job] = await db
    .insert(analyticsJobs)
    .values(data)
    .onConflictDoUpdate({
      target: [analyticsJobs.jobType, analyticsJobs.targetDate],
      set: { status: data.status ?? 'queued', error: null },
    })
    .returning();
  return job;
};

export const updateAnalyticsJob = async (
  id: string,
  data: Partial<typeof analyticsJobs.$inferInsert>
) => {
  const [job] = await db
    .update(analyticsJobs)
    .set(data)
    .where(eq(analyticsJobs.id, id))
    .returning();
  return job ?? null;
};

export const listAnalyticsJobs = async () => {
  return db.select().from(analyticsJobs).orderBy(desc(analyticsJobs.createdAt));
};

export const listAchievementDefinitions = async (enabledOnly = false) => {
  return db
    .select()
    .from(achievementDefinitions)
    .where(enabledOnly ? eq(achievementDefinitions.enabled, true) : undefined)
    .orderBy(asc(achievementDefinitions.createdAt));
};

export const createAchievementDefinition = async (input: CreateAchievementDefinitionInput) => {
  const [definition] = await db
    .insert(achievementDefinitions)
    .values(input)
    .onConflictDoNothing({ target: achievementDefinitions.key })
    .returning();
  return definition ?? null;
};

export const updateAchievementDefinition = async (
  id: string,
  input: UpdateAchievementDefinitionInput
) => {
  const [definition] = await db
    .update(achievementDefinitions)
    .set(input)
    .where(eq(achievementDefinitions.id, id))
    .returning();
  return definition ?? null;
};

export const createAchievementUnlock = async (
  data: typeof achievementUnlocks.$inferInsert,
  repeatable: boolean
) => {
  const statement = db.insert(achievementUnlocks).values(data);
  const [unlock] = await (repeatable
    ? statement.returning()
    : statement
        .onConflictDoNothing({
          target: [
            achievementUnlocks.achievementId,
            achievementUnlocks.scope,
            achievementUnlocks.creatorId,
            achievementUnlocks.userId,
          ],
        })
        .returning());
  return unlock ?? null;
};

export const listAchievementUnlocks = async (input: { creatorId?: string; userId?: string }) => {
  return db
    .select()
    .from(achievementUnlocks)
    .where(
      and(
        input.creatorId ? eq(achievementUnlocks.creatorId, input.creatorId) : undefined,
        input.userId ? eq(achievementUnlocks.userId, input.userId) : undefined
      )
    )
    .orderBy(desc(achievementUnlocks.unlockedAt));
};

export const createAlertCandidate = async (data: typeof analyticsAlertCandidates.$inferInsert) => {
  const [candidate] = await db.insert(analyticsAlertCandidates).values(data).returning();
  return candidate;
};

export const countEvents = async (input: {
  creatorId?: string | null;
  actorUserId?: string | null;
  eventType: string;
}) => {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.eventType, input.eventType),
        input.creatorId ? eq(analyticsEvents.creatorId, input.creatorId) : undefined,
        input.actorUserId ? eq(analyticsEvents.actorUserId, input.actorUserId) : undefined
      )
    );
  return Number(row?.count ?? 0);
};
