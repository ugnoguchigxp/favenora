import { createRoute, z } from '@hono/zod-openapi';
import {
  archiveStreamSchema,
  createStreamChatMessageSchema,
  createStreamSchema,
  createStreamTipGoalSchema,
  streamChatResponseSchema,
  streamResponseSchema,
  streamScheduleSchema,
  streamsResponseSchema,
  streamTipGoalsResponseSchema,
  updateStreamSchema,
  updateStreamTipGoalSchema,
} from '../../../shared/schemas/streams.schema';
import { AuthError } from '../../lib/errors';
import { createOpenApiRouter } from '../../lib/openapi';
import { authMiddleware } from '../../middleware/auth';
import * as Service from './streams.service';

const idParamSchema = z.object({ id: z.string().uuid() });
const creatorParamSchema = z.object({ creatorId: z.string().uuid() });
const goalParamSchema = z.object({ id: z.string().uuid(), goalId: z.string().uuid() });
const messageParamSchema = z.object({ id: z.string().uuid(), messageId: z.string().uuid() });
const requireUserId = (user: { userId: string } | undefined) => {
  if (!user) throw new AuthError();
  return user.userId;
};

const listCreatorRoute = createRoute({
  method: 'get',
  path: '/creators/:creatorId/streams',
  request: { params: creatorParamSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: streamsResponseSchema } },
      description: 'Creator streams',
    },
  },
});
const getRoute = createRoute({
  method: 'get',
  path: '/:id',
  request: { params: idParamSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: streamResponseSchema } },
      description: 'Stream',
    },
  },
});
const createRouteDef = createRoute({
  method: 'post',
  path: '/',
  request: { body: { content: { 'application/json': { schema: createStreamSchema } } } },
  responses: { 201: { description: 'Created' } },
});
const patchRoute = createRoute({
  method: 'patch',
  path: '/:id',
  request: {
    params: idParamSchema,
    body: { content: { 'application/json': { schema: updateStreamSchema } } },
  },
  responses: { 200: { description: 'Updated' } },
});
const scheduleRoute = createRoute({
  method: 'post',
  path: '/:id/schedule',
  request: {
    params: idParamSchema,
    body: { content: { 'application/json': { schema: streamScheduleSchema } } },
  },
  responses: { 200: { description: 'Scheduled' } },
});
const startRoute = createRoute({
  method: 'post',
  path: '/:id/start',
  request: { params: idParamSchema },
  responses: { 200: { description: 'Started' } },
});
const endRoute = createRoute({
  method: 'post',
  path: '/:id/end',
  request: { params: idParamSchema },
  responses: { 200: { description: 'Ended' } },
});
const listChatRoute = createRoute({
  method: 'get',
  path: '/:id/chat',
  request: { params: idParamSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: streamChatResponseSchema } },
      description: 'Chat messages',
    },
  },
});
const createChatRoute = createRoute({
  method: 'post',
  path: '/:id/chat',
  request: {
    params: idParamSchema,
    body: { content: { 'application/json': { schema: createStreamChatMessageSchema } } },
  },
  responses: { 201: { description: 'Message created' } },
});
const hideChatRoute = createRoute({
  method: 'post',
  path: '/:id/chat/:messageId/hide',
  request: {
    params: messageParamSchema,
    body: {
      content: { 'application/json': { schema: z.object({ reason: z.string().min(1).max(500) }) } },
    },
  },
  responses: { 200: { description: 'Message hidden' } },
});
const listGoalsRoute = createRoute({
  method: 'get',
  path: '/:id/tip-goals',
  request: { params: idParamSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: streamTipGoalsResponseSchema } },
      description: 'Tip goals',
    },
  },
});
const createGoalRoute = createRoute({
  method: 'post',
  path: '/:id/tip-goals',
  request: {
    params: idParamSchema,
    body: { content: { 'application/json': { schema: createStreamTipGoalSchema } } },
  },
  responses: { 201: { description: 'Tip goal created' } },
});
const patchGoalRoute = createRoute({
  method: 'patch',
  path: '/:id/tip-goals/:goalId',
  request: {
    params: goalParamSchema,
    body: { content: { 'application/json': { schema: updateStreamTipGoalSchema } } },
  },
  responses: { 200: { description: 'Tip goal updated' } },
});
const archiveRouteDef = createRoute({
  method: 'post',
  path: '/:id/archive',
  request: {
    params: idParamSchema,
    body: { content: { 'application/json': { schema: archiveStreamSchema } } },
  },
  responses: { 201: { description: 'Archive requested' } },
});
const dashboardRoute = createRoute({
  method: 'get',
  path: '/dashboard/streams',
  responses: {
    200: {
      content: { 'application/json': { schema: streamsResponseSchema } },
      description: 'Dashboard streams',
    },
  },
});

const publicRouter = createOpenApiRouter()
  .openapi(listCreatorRoute, async (c) =>
    c.json(
      streamsResponseSchema.parse({
        streams: await Service.listCreatorStreams(c.req.param('creatorId')),
      }),
      200
    )
  )
  .openapi(getRoute, async (c) =>
    c.json(streamResponseSchema.parse({ stream: await Service.getStream(c.req.param('id')) }), 200)
  );

const protectedBase = createOpenApiRouter();
protectedBase.use('*', authMiddleware());

const protectedRouter = protectedBase
  .openapi(createRouteDef, async (c) =>
    c.json(await Service.createStream(c.req.valid('json'), requireUserId(c.get('user'))), 201)
  )
  .openapi(patchRoute, async (c) =>
    c.json(
      await Service.updateStream(
        c.req.param('id'),
        c.req.valid('json'),
        requireUserId(c.get('user'))
      ),
      200
    )
  )
  .openapi(scheduleRoute, async (c) =>
    c.json(
      await Service.scheduleStream(
        c.req.param('id'),
        c.req.valid('json').scheduledAt,
        requireUserId(c.get('user'))
      ),
      200
    )
  )
  .openapi(startRoute, async (c) =>
    c.json(await Service.startStream(c.req.param('id'), requireUserId(c.get('user'))), 200)
  )
  .openapi(endRoute, async (c) =>
    c.json(await Service.endStream(c.req.param('id'), requireUserId(c.get('user'))), 200)
  )
  .openapi(listChatRoute, async (c) =>
    c.json(
      streamChatResponseSchema.parse({
        messages: await Service.listChatMessages(c.req.param('id')),
      }),
      200
    )
  )
  .openapi(createChatRoute, async (c) =>
    c.json(
      await Service.createChatMessage(
        c.req.param('id'),
        c.req.valid('json'),
        requireUserId(c.get('user'))
      ),
      201
    )
  )
  .openapi(hideChatRoute, async (c) =>
    c.json(
      await Service.hideChatMessage(
        c.req.param('id'),
        c.req.param('messageId'),
        requireUserId(c.get('user')),
        c.req.valid('json').reason
      ),
      200
    )
  )
  .openapi(listGoalsRoute, async (c) =>
    c.json(
      streamTipGoalsResponseSchema.parse({ goals: await Service.listTipGoals(c.req.param('id')) }),
      200
    )
  )
  .openapi(createGoalRoute, async (c) =>
    c.json(
      await Service.createTipGoal(
        c.req.param('id'),
        c.req.valid('json'),
        requireUserId(c.get('user'))
      ),
      201
    )
  )
  .openapi(patchGoalRoute, async (c) =>
    c.json(
      await Service.updateTipGoal(
        c.req.param('id'),
        c.req.param('goalId'),
        c.req.valid('json'),
        requireUserId(c.get('user'))
      ),
      200
    )
  )
  .openapi(archiveRouteDef, async (c) =>
    c.json(
      await Service.archiveStream(
        c.req.param('id'),
        requireUserId(c.get('user')),
        c.req.valid('json').makePostPublic
      ),
      201
    )
  )
  .openapi(dashboardRoute, async (c) =>
    c.json(streamsResponseSchema.parse({ streams: await Service.listDashboardStreams() }), 200)
  );

export const streamsRouter = createOpenApiRouter()
  .route('/', publicRouter)
  .route('/', protectedRouter);
