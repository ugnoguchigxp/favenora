import { createRoute, z } from '@hono/zod-openapi';
import {
  approveTranslationSchema,
  createFanTranslationTrackSchema,
  fanTranslationTrackResponseSchema,
  fanTranslationTracksResponseSchema,
  putSubtitleCuesSchema,
  putTranslationAnnotationsSchema,
  reportTranslationSchema,
  subtitleCuesResponseSchema,
  translationAnnotationsResponseSchema,
  updateFanTranslationTrackSchema,
  voteTranslationSchema,
} from '../../../shared/schemas/fansubs.schema';
import { AuthError } from '../../lib/errors';
import { createOpenApiRouter } from '../../lib/openapi';
import { authMiddleware } from '../../middleware/auth';
import * as Service from './fansubs.service';

const postParamSchema = z.object({ id: z.string().uuid() });
const trackParamSchema = z.object({ id: z.string().uuid() });
const requireUserId = (user: { userId: string } | undefined) => {
  if (!user) throw new AuthError();
  return user.userId;
};

const listPostTranslationsRoute = createRoute({
  method: 'get',
  path: '/posts/:id/translations',
  request: { params: postParamSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: fanTranslationTracksResponseSchema } },
      description: 'Post translations',
    },
  },
});
const createTrackRoute = createRoute({
  method: 'post',
  path: '/posts/:id/translations',
  request: {
    params: postParamSchema,
    body: { content: { 'application/json': { schema: createFanTranslationTrackSchema } } },
  },
  responses: { 201: { description: 'Track created' } },
});
const getTrackRoute = createRoute({
  method: 'get',
  path: '/translations/:id',
  request: { params: trackParamSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: fanTranslationTrackResponseSchema } },
      description: 'Track detail',
    },
  },
});
const patchTrackRoute = createRoute({
  method: 'patch',
  path: '/translations/:id',
  request: {
    params: trackParamSchema,
    body: { content: { 'application/json': { schema: updateFanTranslationTrackSchema } } },
  },
  responses: { 200: { description: 'Track updated' } },
});
const listCuesRoute = createRoute({
  method: 'get',
  path: '/translations/:id/cues',
  request: { params: trackParamSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: subtitleCuesResponseSchema } },
      description: 'Track cues',
    },
  },
});
const putCuesRoute = createRoute({
  method: 'put',
  path: '/translations/:id/cues',
  request: {
    params: trackParamSchema,
    body: { content: { 'application/json': { schema: putSubtitleCuesSchema } } },
  },
  responses: { 200: { description: 'Cues replaced' } },
});
const listAnnotationsRoute = createRoute({
  method: 'get',
  path: '/translations/:id/annotations',
  request: { params: trackParamSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: translationAnnotationsResponseSchema } },
      description: 'Track annotations',
    },
  },
});
const putAnnotationsRoute = createRoute({
  method: 'put',
  path: '/translations/:id/annotations',
  request: {
    params: trackParamSchema,
    body: { content: { 'application/json': { schema: putTranslationAnnotationsSchema } } },
  },
  responses: { 200: { description: 'Annotations replaced' } },
});
const voteRoute = createRoute({
  method: 'post',
  path: '/translations/:id/vote',
  request: {
    params: trackParamSchema,
    body: { content: { 'application/json': { schema: voteTranslationSchema } } },
  },
  responses: { 200: { description: 'Vote saved' } },
});
const reportRoute = createRoute({
  method: 'post',
  path: '/translations/:id/report',
  request: {
    params: trackParamSchema,
    body: { content: { 'application/json': { schema: reportTranslationSchema } } },
  },
  responses: { 201: { description: 'Report created' } },
});
const approveRoute = createRoute({
  method: 'post',
  path: '/translations/:id/approve',
  request: {
    params: trackParamSchema,
    body: { content: { 'application/json': { schema: approveTranslationSchema } } },
  },
  responses: { 200: { description: 'Track approval updated' } },
});
const exportRoute = createRoute({
  method: 'get',
  path: '/translations/:id/export',
  request: {
    params: trackParamSchema,
    query: z.object({ format: z.enum(['vtt']).default('vtt') }),
  },
  responses: { 200: { description: 'Export translation track' } },
});

const publicRouter = createOpenApiRouter()
  .openapi(listPostTranslationsRoute, async (c) =>
    c.json(
      fanTranslationTracksResponseSchema.parse({
        tracks: await Service.listPostTranslations(c.req.param('id'), c.get('user')?.userId),
      }),
      200
    )
  )
  .openapi(getTrackRoute, async (c) =>
    c.json(
      fanTranslationTrackResponseSchema.parse({
        track: await Service.getTrack(c.req.param('id'), c.get('user')?.userId),
      }),
      200
    )
  )
  .openapi(listCuesRoute, async (c) =>
    c.json(
      subtitleCuesResponseSchema.parse({
        cues: await Service.listCues(c.req.param('id'), c.get('user')?.userId),
      }),
      200
    )
  )
  .openapi(listAnnotationsRoute, async (c) =>
    c.json(
      translationAnnotationsResponseSchema.parse({
        annotations: await Service.listAnnotations(c.req.param('id'), c.get('user')?.userId),
      }),
      200
    )
  )
  .openapi(exportRoute, async (c) => {
    const vtt = await Service.exportTrackAsVtt(c.req.param('id'), c.get('user')?.userId);
    c.header('content-type', 'text/vtt; charset=utf-8');
    return c.body(vtt);
  });

const protectedBase = createOpenApiRouter();
protectedBase.use('*', authMiddleware());
const protectedRouter = protectedBase
  .openapi(createTrackRoute, async (c) =>
    c.json(
      await Service.createTrack(
        c.req.param('id'),
        c.req.valid('json'),
        requireUserId(c.get('user'))
      ),
      201
    )
  )
  .openapi(patchTrackRoute, async (c) =>
    c.json(
      await Service.updateTrack(
        c.req.param('id'),
        c.req.valid('json'),
        requireUserId(c.get('user'))
      ),
      200
    )
  )
  .openapi(putCuesRoute, async (c) =>
    c.json(
      await Service.replaceCues(
        c.req.param('id'),
        c.req.valid('json').cues,
        requireUserId(c.get('user'))
      ),
      200
    )
  )
  .openapi(putAnnotationsRoute, async (c) =>
    c.json(
      await Service.replaceAnnotations(
        c.req.param('id'),
        c.req.valid('json').annotations,
        requireUserId(c.get('user'))
      ),
      200
    )
  )
  .openapi(voteRoute, async (c) =>
    c.json(
      await Service.voteTrack(
        c.req.param('id'),
        requireUserId(c.get('user')),
        c.req.valid('json').value,
        c.req.valid('json').reason
      ),
      200
    )
  )
  .openapi(reportRoute, async (c) =>
    c.json(
      await Service.reportTrack(
        c.req.param('id'),
        requireUserId(c.get('user')),
        c.req.valid('json').reason
      ),
      201
    )
  )
  .openapi(approveRoute, async (c) =>
    c.json(
      await Service.approveTrack(
        c.req.param('id'),
        c.req.valid('json').approvalState,
        c.req.valid('json').note,
        requireUserId(c.get('user'))
      ),
      200
    )
  );

export const fansubsRouter = createOpenApiRouter()
  .route('/', publicRouter)
  .route('/', protectedRouter);
