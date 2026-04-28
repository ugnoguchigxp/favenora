import { createRoute, z } from '@hono/zod-openapi';
import {
  aiAssistUsageResponseSchema,
  aiGlossaryTermsResponseSchema,
  aiProvidersResponseSchema,
  aiTranslationDraftResponseSchema,
  applyTranslationDraftSchema,
  commentTranslationRequestSchema,
  commentTranslationResponseSchema,
  createAiGlossaryTermSchema,
  createTranslationDraftSchema,
} from '../../../shared/schemas/ai-assist.schema';
import { AuthError } from '../../lib/errors';
import { createOpenApiRouter } from '../../lib/openapi';
import { authMiddleware } from '../../middleware/auth';
import * as Service from './ai-assist.service';

const idParamSchema = z.object({ id: z.string().uuid() });
const requireUserId = (user: { userId: string } | undefined) => {
  if (!user) throw new AuthError();
  return user.userId;
};

const createDraftRoute = createRoute({
  method: 'post',
  path: '/translation-drafts',
  request: { body: { content: { 'application/json': { schema: createTranslationDraftSchema } } } },
  responses: { 201: { description: 'Draft created' } },
});
const getDraftRoute = createRoute({
  method: 'get',
  path: '/translation-drafts/:id',
  request: { params: idParamSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: aiTranslationDraftResponseSchema } },
      description: 'Draft detail',
    },
  },
});
const applyDraftRoute = createRoute({
  method: 'post',
  path: '/translation-drafts/:id/apply',
  request: {
    params: idParamSchema,
    body: { content: { 'application/json': { schema: applyTranslationDraftSchema } } },
  },
  responses: { 200: { description: 'Draft applied' } },
});
const commentTranslationRoute = createRoute({
  method: 'post',
  path: '/comment-translations',
  request: {
    body: { content: { 'application/json': { schema: commentTranslationRequestSchema } } },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: commentTranslationResponseSchema } },
      description: 'Comment translation',
    },
  },
});
const createGlossaryRoute = createRoute({
  method: 'post',
  path: '/glossary',
  request: { body: { content: { 'application/json': { schema: createAiGlossaryTermSchema } } } },
  responses: { 201: { description: 'Glossary term created' } },
});
const listGlossaryRoute = createRoute({
  method: 'get',
  path: '/glossary',
  request: { query: z.object({ creatorId: z.string().uuid().optional() }) },
  responses: {
    200: {
      content: { 'application/json': { schema: aiGlossaryTermsResponseSchema } },
      description: 'Glossary terms',
    },
  },
});
const listProvidersRoute = createRoute({
  method: 'get',
  path: '/providers',
  responses: {
    200: {
      content: { 'application/json': { schema: aiProvidersResponseSchema } },
      description: 'Providers',
    },
  },
});
const listUsageRoute = createRoute({
  method: 'get',
  path: '/usage',
  responses: {
    200: {
      content: { 'application/json': { schema: aiAssistUsageResponseSchema } },
      description: 'Usage',
    },
  },
});

const protectedBase = createOpenApiRouter();
protectedBase.use('*', authMiddleware());

export const aiAssistRouter = protectedBase
  .openapi(createDraftRoute, async (c) =>
    c.json(
      await Service.createTranslationDraft(c.req.valid('json'), requireUserId(c.get('user'))),
      201
    )
  )
  .openapi(getDraftRoute, async (c) =>
    c.json(
      aiTranslationDraftResponseSchema.parse(
        await Service.getTranslationDraft(c.req.param('id'), requireUserId(c.get('user')))
      ),
      200
    )
  )
  .openapi(applyDraftRoute, async (c) =>
    c.json(
      await Service.applyTranslationDraft(
        c.req.param('id'),
        c.req.valid('json').trackId,
        requireUserId(c.get('user'))
      ),
      200
    )
  )
  .openapi(commentTranslationRoute, async (c) =>
    c.json(
      commentTranslationResponseSchema.parse(
        await Service.translateComment(c.req.valid('json'), requireUserId(c.get('user')))
      ),
      200
    )
  )
  .openapi(createGlossaryRoute, async (c) =>
    c.json(await Service.createGlossaryTerm(c.req.valid('json'), requireUserId(c.get('user'))), 201)
  )
  .openapi(listGlossaryRoute, async (c) =>
    c.json(
      aiGlossaryTermsResponseSchema.parse({
        terms: await Service.listGlossaryTerms(c.req.valid('query').creatorId),
      }),
      200
    )
  )
  .openapi(listProvidersRoute, async (c) =>
    c.json(aiProvidersResponseSchema.parse({ providers: await Service.listProviders() }), 200)
  )
  .openapi(listUsageRoute, async (c) =>
    c.json(
      aiAssistUsageResponseSchema.parse({
        usages: await Service.listUsage(requireUserId(c.get('user'))),
      }),
      200
    )
  );
