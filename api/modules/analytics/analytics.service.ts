import type {
  CreateAchievementDefinitionInput,
  CreateAnalyticsEventInput,
  DailyRollupInput,
  UpdateAchievementDefinitionInput,
} from '../../../shared/schemas/analytics.schema';
import { NotFoundError } from '../../lib/errors';
import * as AnalyticsRepository from './analytics.repository';

const metricKeys = {
  follower_joined: 'followersDelta',
  follower_left: 'followersDelta',
  free_membership_joined: 'freeMembersDelta',
  free_membership_left: 'freeMembersDelta',
  membership_joined: 'paidMembersDelta',
  membership_canceled: 'cancellations',
  post_viewed: 'postViews',
  post_commented: 'comments',
  translation_submitted: 'translationSubmissions',
  stream_attended: 'streamAttendance',
} as const;

type MetricKey = (typeof metricKeys)[keyof typeof metricKeys];

const emptyMetrics = () => ({
  followersDelta: 0,
  freeMembersDelta: 0,
  paidMembersDelta: 0,
  cancellations: 0,
  activeSupporters: 0,
  postViews: 0,
  comments: 0,
  translationSubmissions: 0,
  streamAttendance: 0,
});

const toDateString = (date = new Date()) => date.toISOString().slice(0, 10);

const activityWeight = (eventType: string) => {
  if (eventType.includes('comment')) return 5;
  if (eventType.includes('membership')) return 10;
  if (eventType.includes('tip') || eventType.includes('payment')) return 12;
  if (eventType.includes('view')) return 1;
  return 2;
};

export const ingestEvent = async (input: CreateAnalyticsEventInput) => {
  const inserted = await AnalyticsRepository.insertAnalyticsEvent(input);
  const event =
    inserted ??
    (await AnalyticsRepository.findAnalyticsEventByIdempotencyKey(input.idempotencyKey));
  if (!event) throw new NotFoundError('Analytics event not found');

  if (inserted) {
    await evaluateAchievementsForEvent(inserted);
  }

  return event;
};

export const runDailyRollup = async (input: DailyRollupInput) => {
  const job = await AnalyticsRepository.createAnalyticsJob({
    jobType: 'daily_rollup',
    targetDate: input.date,
    status: 'running',
    startedAt: new Date(),
  });

  try {
    const events = await AnalyticsRepository.listEventsForRollup({
      date: input.date,
      creatorId: input.creatorId,
    });

    const byCreator = new Map<string, ReturnType<typeof emptyMetrics>>();
    const fanCounts = new Map<string, Record<string, number>>();
    const fanLastActivity = new Map<string, Date>();

    for (const event of events) {
      if (!event.creatorId) continue;
      const metrics = byCreator.get(event.creatorId) ?? emptyMetrics();
      const key = metricKeys[event.eventType as keyof typeof metricKeys] as MetricKey | undefined;
      if (key) {
        metrics[key] += event.eventType.endsWith('_left') ? -1 : 1;
      }
      byCreator.set(event.creatorId, metrics);

      if (event.actorUserId) {
        const fanKey = `${event.creatorId}:${event.actorUserId}`;
        const counts = fanCounts.get(fanKey) ?? {};
        counts[event.eventType] = (counts[event.eventType] ?? 0) + 1;
        fanCounts.set(fanKey, counts);
        fanLastActivity.set(fanKey, event.occurredAt);
      }
    }

    const metricsRows = [];
    for (const [creatorId, metrics] of byCreator.entries()) {
      const row = await AnalyticsRepository.upsertCreatorDailyMetrics({
        creatorId,
        date: input.date,
        timezone: input.timezone,
        ...metrics,
      });
      metricsRows.push(row);

      const summary = await AnalyticsRepository.upsertMembershipDailySummary({
        creatorId,
        date: input.date,
        timezone: input.timezone,
        summary: buildMembershipSummary(metrics),
        metrics,
        notableEvents: events
          .filter((event) => event.creatorId === creatorId)
          .slice(0, 20)
          .map((event) => ({
            id: event.id,
            eventType: event.eventType,
            occurredAt: event.occurredAt,
          })),
        notificationStatus: 'pending',
      });

      if (metrics.paidMembersDelta > 0 || metrics.cancellations > 0) {
        await AnalyticsRepository.createAlertCandidate({
          creatorId,
          alertType: 'daily_membership_summary',
          priority: 'normal',
          payload: { summaryId: summary.id, date: input.date },
          status: 'pending',
        });
      }
    }

    for (const [key, counts] of fanCounts.entries()) {
      const [creatorId, fanUserId] = key.split(':');
      await AnalyticsRepository.upsertFanActivityDailyMetric({
        creatorId,
        fanUserId,
        date: input.date,
        eventCounts: counts,
        activityScore: Object.entries(counts).reduce(
          (score, [eventType, count]) => score + activityWeight(eventType) * count,
          0
        ),
        lastActivityAt: fanLastActivity.get(key) ?? null,
      });
    }

    await AnalyticsRepository.updateAnalyticsJob(job.id, {
      status: 'finished',
      finishedAt: new Date(),
    });

    return { job: { ...job, status: 'finished', finishedAt: new Date() }, metrics: metricsRows };
  } catch (error) {
    await AnalyticsRepository.updateAnalyticsJob(job.id, {
      status: 'failed',
      finishedAt: new Date(),
      error: error instanceof Error ? error.message : 'Unknown analytics rollup error',
    });
    throw error;
  }
};

const buildMembershipSummary = (metrics: ReturnType<typeof emptyMetrics>) => {
  const parts = [
    `paid members ${metrics.paidMembersDelta >= 0 ? '+' : ''}${metrics.paidMembersDelta}`,
    `free members ${metrics.freeMembersDelta >= 0 ? '+' : ''}${metrics.freeMembersDelta}`,
    `cancellations ${metrics.cancellations}`,
  ];
  return parts.join(', ');
};

export const getOverview = async (input: { creatorId: string; from?: string; to?: string }) => {
  const from = input.from ?? toDateString(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const to = input.to ?? toDateString();
  const dailyMetrics = await AnalyticsRepository.listCreatorDailyMetrics({
    creatorId: input.creatorId,
    from,
    to,
  });
  const totals = dailyMetrics.reduce((acc, row) => {
    acc.followersDelta += row.followersDelta;
    acc.freeMembersDelta += row.freeMembersDelta;
    acc.paidMembersDelta += row.paidMembersDelta;
    acc.cancellations += row.cancellations;
    acc.activeSupporters = Math.max(acc.activeSupporters, row.activeSupporters);
    acc.postViews += row.postViews;
    acc.comments += row.comments;
    acc.translationSubmissions += row.translationSubmissions;
    acc.streamAttendance += row.streamAttendance;
    return acc;
  }, emptyMetrics());

  return { creatorId: input.creatorId, from, to, totals, dailyMetrics };
};

export const getFanTrend = async (input: { creatorId: string; date?: string }) => {
  const fans = await AnalyticsRepository.listFanActivity(input);
  return { creatorId: input.creatorId, date: input.date, fans };
};

export const listMembershipDailySummaries = (input: {
  creatorId: string;
  from?: string;
  to?: string;
}) => AnalyticsRepository.listMembershipDailySummaries(input);

export const listAchievementDefinitions = () => AnalyticsRepository.listAchievementDefinitions();

export const createAchievementDefinition = (input: CreateAchievementDefinitionInput) =>
  AnalyticsRepository.createAchievementDefinition(input);

export const updateAchievementDefinition = async (
  id: string,
  input: UpdateAchievementDefinitionInput
) => {
  const definition = await AnalyticsRepository.updateAchievementDefinition(id, input);
  if (!definition) throw new NotFoundError('Achievement definition not found');
  return definition;
};

export const listAchievementUnlocks = (input: { creatorId?: string; userId?: string }) =>
  AnalyticsRepository.listAchievementUnlocks(input);

export const listAnalyticsJobs = () => AnalyticsRepository.listAnalyticsJobs();

const evaluateAchievementsForEvent = async (event: {
  id: string;
  eventType: string;
  creatorId: string | null;
  actorUserId: string | null;
}) => {
  const definitions = await AnalyticsRepository.listAchievementDefinitions(true);
  for (const definition of definitions) {
    if (definition.conditionType !== 'event_count') continue;
    const config = definition.conditionConfig as { eventType?: string; threshold?: number };
    if (config.eventType !== event.eventType) continue;

    const count = await AnalyticsRepository.countEvents({
      creatorId: definition.scope === 'creator' ? event.creatorId : undefined,
      actorUserId: definition.scope === 'fan' ? event.actorUserId : undefined,
      eventType: event.eventType,
    });
    if (count < (config.threshold ?? 1)) continue;

    const unlock = await AnalyticsRepository.createAchievementUnlock(
      {
        achievementId: definition.id,
        scope: definition.scope,
        creatorId: definition.scope === 'creator' ? event.creatorId : null,
        userId: definition.scope === 'fan' ? event.actorUserId : null,
        sourceEventId: event.id,
        notificationStatus: 'pending',
      },
      definition.repeatability !== 'once'
    );

    if (unlock?.creatorId) {
      await AnalyticsRepository.createAlertCandidate({
        creatorId: unlock.creatorId,
        alertType: 'achievement_unlocked',
        priority: 'normal',
        payload: { achievementUnlockId: unlock.id },
        status: 'pending',
      });
    }
  }
};
