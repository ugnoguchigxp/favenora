import { createRoute, z } from '@hono/zod-openapi';
import {
  achievementsResponseSchema,
  achievementUnlocksResponseSchema,
  analyticsCreatorDateQuerySchema,
  analyticsEventResponseSchema,
  analyticsJobsResponseSchema,
  analyticsRangeQuerySchema,
  createAchievementDefinitionSchema,
  createAnalyticsEventSchema,
  creatorAnalyticsOverviewResponseSchema,
  dailyRollupSchema,
  fanTrendAnalyticsResponseSchema,
  membershipDailySummariesResponseSchema,
  updateAchievementDefinitionSchema,
} from '../../../shared/schemas/analytics.schema';
import { createOpenApiRouter } from '../../lib/openapi';
import { authMiddleware } from '../../middleware/auth';
import * as AnalyticsService from './analytics.service';

const uuidParamSchema = z.object({ id: z.string().uuid() });

const overviewRoute = createRoute({
  method: 'get',
  path: '/overview',
  request: { query: analyticsRangeQuerySchema },
  responses: {
    200: {
      content: { 'application/json': { schema: creatorAnalyticsOverviewResponseSchema } },
      description: 'Creator analytics overview',
    },
  },
});

const fansRoute = createRoute({
  method: 'get',
  path: '/fans',
  request: { query: analyticsCreatorDateQuerySchema.omit({ timezone: true }) },
  responses: {
    200: {
      content: { 'application/json': { schema: fanTrendAnalyticsResponseSchema } },
      description: 'Fan trend analytics',
    },
  },
});

const membershipDailyRoute = createRoute({
  method: 'get',
  path: '/memberships/daily',
  request: { query: analyticsRangeQuerySchema },
  responses: {
    200: {
      content: { 'application/json': { schema: membershipDailySummariesResponseSchema } },
      description: 'Membership daily summaries',
    },
  },
});

const achievementsRoute = createRoute({
  method: 'get',
  path: '/achievements',
  responses: {
    200: {
      content: { 'application/json': { schema: achievementsResponseSchema } },
      description: 'Achievement definitions',
    },
  },
});

const achievementUnlocksRoute = createRoute({
  method: 'get',
  path: '/achievements/unlocks',
  request: {
    query: z.object({
      creatorId: z.string().uuid().optional(),
      userId: z.string().uuid().optional(),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: achievementUnlocksResponseSchema } },
      description: 'Achievement unlocks',
    },
  },
});

const createEventRoute = createRoute({
  method: 'post',
  path: '/events',
  request: {
    body: { content: { 'application/json': { schema: createAnalyticsEventSchema } } },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: analyticsEventResponseSchema } },
      description: 'Analytics event ingested',
    },
  },
});

const dailyRollupRoute = createRoute({
  method: 'post',
  path: '/jobs/daily-rollup',
  request: {
    body: { content: { 'application/json': { schema: dailyRollupSchema } } },
  },
  responses: {
    200: { description: 'Daily rollup completed' },
  },
});

const adminJobsRoute = createRoute({
  method: 'get',
  path: '/jobs',
  responses: {
    200: {
      content: { 'application/json': { schema: analyticsJobsResponseSchema } },
      description: 'Analytics jobs',
    },
  },
});

const retryJobRoute = createRoute({
  method: 'post',
  path: '/jobs/:id/retry',
  request: { params: uuidParamSchema },
  responses: {
    202: { description: 'Retry queued' },
  },
});

const adminAchievementDefinitionsRoute = createRoute({
  method: 'get',
  path: '/achievement-definitions',
  responses: {
    200: {
      content: { 'application/json': { schema: achievementsResponseSchema } },
      description: 'Achievement definitions',
    },
  },
});

const createAchievementDefinitionRoute = createRoute({
  method: 'post',
  path: '/achievement-definitions',
  request: {
    body: { content: { 'application/json': { schema: createAchievementDefinitionSchema } } },
  },
  responses: {
    201: { description: 'Achievement definition created' },
  },
});

const updateAchievementDefinitionRoute = createRoute({
  method: 'patch',
  path: '/achievement-definitions/:id',
  request: {
    params: uuidParamSchema,
    body: { content: { 'application/json': { schema: updateAchievementDefinitionSchema } } },
  },
  responses: {
    200: { description: 'Achievement definition updated' },
  },
});

const dashboardBase = createOpenApiRouter();
dashboardBase.use('*', authMiddleware());
const dashboardAnalyticsRouter = dashboardBase
  .openapi(overviewRoute, async (c) => {
    const query = c.req.valid('query');
    const overview = await AnalyticsService.getOverview(query);
    return c.json({ overview }, 200);
  })
  .openapi(fansRoute, async (c) => {
    const query = c.req.valid('query');
    const fanTrend = await AnalyticsService.getFanTrend(query);
    return c.json({ fanTrend }, 200);
  })
  .openapi(membershipDailyRoute, async (c) => {
    const query = c.req.valid('query');
    const summaries = await AnalyticsService.listMembershipDailySummaries(query);
    return c.json({ summaries }, 200);
  })
  .openapi(achievementsRoute, async (c) => {
    const achievements = await AnalyticsService.listAchievementDefinitions();
    return c.json({ achievements }, 200);
  })
  .openapi(achievementUnlocksRoute, async (c) => {
    const unlocks = await AnalyticsService.listAchievementUnlocks(c.req.valid('query'));
    return c.json({ unlocks }, 200);
  });

const internalAnalyticsRouter = createOpenApiRouter()
  .openapi(createEventRoute, async (c) => {
    const event = await AnalyticsService.ingestEvent(c.req.valid('json'));
    return c.json({ event }, 201);
  })
  .openapi(dailyRollupRoute, async (c) => {
    const result = await AnalyticsService.runDailyRollup(c.req.valid('json'));
    return c.json(result, 200);
  });

const adminBase = createOpenApiRouter();
adminBase.use('*', authMiddleware());
const adminAnalyticsRouter = adminBase
  .openapi(adminJobsRoute, async (c) => {
    const jobs = await AnalyticsService.listAnalyticsJobs();
    return c.json({ jobs }, 200);
  })
  .openapi(retryJobRoute, async (c) => {
    return c.json({ jobId: c.req.param('id'), status: 'queued' }, 202);
  })
  .openapi(adminAchievementDefinitionsRoute, async (c) => {
    const achievements = await AnalyticsService.listAchievementDefinitions();
    return c.json({ achievements }, 200);
  })
  .openapi(createAchievementDefinitionRoute, async (c) => {
    const achievement = await AnalyticsService.createAchievementDefinition(c.req.valid('json'));
    return c.json({ achievement }, 201);
  })
  .openapi(updateAchievementDefinitionRoute, async (c) => {
    const achievement = await AnalyticsService.updateAchievementDefinition(
      c.req.param('id'),
      c.req.valid('json')
    );
    return c.json({ achievement }, 200);
  });

export { adminAnalyticsRouter, dashboardAnalyticsRouter, internalAnalyticsRouter };
