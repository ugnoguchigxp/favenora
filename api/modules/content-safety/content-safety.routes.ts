import { createRoute, z } from '@hono/zod-openapi';
import {
  allowedTermsResponseSchema,
  batchCheckResponseSchema,
  blockedTermsResponseSchema,
  checkResponseSchema,
  contentSafetyAppealSchema,
  contentSafetyBatchCheckSchema,
  contentSafetyCheckSchema,
  contentSafetyReviewDecisionSchema,
  createAllowedTermSchema,
  createBlockedTermSchema,
  updateBlockedTermSchema,
} from '../../../shared/schemas/content-safety.schema';
import { AuthError, ForbiddenError } from '../../lib/errors';
import { createOpenApiRouter } from '../../lib/openapi';
import { authMiddleware } from '../../middleware/auth';
import * as Service from './content-safety.service';

const idParamSchema = z.object({ id: z.string().uuid() });

const requireUser = (
  user: { userId: string; capabilities?: { canManageContentSafety?: boolean } } | undefined
) => {
  if (!user) throw new AuthError();
  return user;
};

const requireStaff = (
  user: { userId: string; capabilities?: { canManageContentSafety?: boolean } } | undefined
) => {
  const currentUser = requireUser(user);
  if (!currentUser.capabilities?.canManageContentSafety) {
    throw new ForbiddenError('Content safety management permission is required');
  }
  return currentUser;
};

const checkRoute = createRoute({
  method: 'post',
  path: '/check',
  request: { body: { content: { 'application/json': { schema: contentSafetyCheckSchema } } } },
  responses: {
    200: {
      content: { 'application/json': { schema: checkResponseSchema } },
      description: 'Safety check',
    },
  },
});

const batchRoute = createRoute({
  method: 'post',
  path: '/check-batch',
  request: { body: { content: { 'application/json': { schema: contentSafetyBatchCheckSchema } } } },
  responses: {
    200: {
      content: { 'application/json': { schema: batchCheckResponseSchema } },
      description: 'Batch safety check',
    },
  },
});

const listBlockedRoute = createRoute({
  method: 'get',
  path: '/blocked-terms',
  responses: {
    200: {
      content: { 'application/json': { schema: blockedTermsResponseSchema } },
      description: 'Blocked terms',
    },
  },
});

const createBlockedRoute = createRoute({
  method: 'post',
  path: '/blocked-terms',
  request: { body: { content: { 'application/json': { schema: createBlockedTermSchema } } } },
  responses: { 201: { description: 'Blocked term created' } },
});

const updateBlockedRoute = createRoute({
  method: 'patch',
  path: '/blocked-terms/:id',
  request: {
    params: idParamSchema,
    body: { content: { 'application/json': { schema: updateBlockedTermSchema } } },
  },
  responses: { 200: { description: 'Blocked term updated' } },
});

const listAllowedRoute = createRoute({
  method: 'get',
  path: '/allowed-terms',
  responses: {
    200: {
      content: { 'application/json': { schema: allowedTermsResponseSchema } },
      description: 'Allowed terms',
    },
  },
});

const createAllowedRoute = createRoute({
  method: 'post',
  path: '/allowed-terms',
  request: { body: { content: { 'application/json': { schema: createAllowedTermSchema } } } },
  responses: { 201: { description: 'Allowed term created' } },
});

const appealRoute = createRoute({
  method: 'post',
  path: '/reviews/:id/appeal',
  request: {
    params: idParamSchema,
    body: { content: { 'application/json': { schema: contentSafetyAppealSchema } } },
  },
  responses: { 201: { description: 'Appeal created' } },
});

const decideRoute = createRoute({
  method: 'post',
  path: '/reviews/:id/decision',
  request: {
    params: idParamSchema,
    body: { content: { 'application/json': { schema: contentSafetyReviewDecisionSchema } } },
  },
  responses: { 200: { description: 'Review decided' } },
});

const rescanRoute = createRoute({
  method: 'post',
  path: '/rescan',
  request: {
    body: {
      content: { 'application/json': { schema: z.object({ scope: z.string().min(1).max(100) }) } },
    },
  },
  responses: { 201: { description: 'Rescan job queued' } },
});

const protectedBase = createOpenApiRouter();
protectedBase.use('*', authMiddleware());

export const contentSafetyRouter = protectedBase
  .openapi(checkRoute, async (c) =>
    c.json({ result: await Service.checkText(c.req.valid('json')) }, 200)
  )
  .openapi(batchRoute, async (c) =>
    c.json({ results: await Service.checkBatch(c.req.valid('json').items) }, 200)
  )
  .openapi(listBlockedRoute, async (c) => {
    requireStaff(c.get('user'));
    return c.json(
      blockedTermsResponseSchema.parse({ blockedTerms: await Service.listBlockedTerms() }),
      200
    );
  })
  .openapi(createBlockedRoute, async (c) => {
    const user = requireStaff(c.get('user'));
    return c.json(await Service.createBlockedTerm(c.req.valid('json'), user.userId), 201);
  })
  .openapi(updateBlockedRoute, async (c) => {
    requireStaff(c.get('user'));
    return c.json(await Service.updateBlockedTerm(c.req.param('id'), c.req.valid('json')), 200);
  })
  .openapi(listAllowedRoute, async (c) => {
    requireStaff(c.get('user'));
    return c.json(
      allowedTermsResponseSchema.parse({ allowedTerms: await Service.listAllowedTerms() }),
      200
    );
  })
  .openapi(createAllowedRoute, async (c) => {
    const user = requireStaff(c.get('user'));
    return c.json(await Service.createAllowedTerm(c.req.valid('json'), user.userId), 201);
  })
  .openapi(appealRoute, async (c) => {
    const user = requireUser(c.get('user'));
    return c.json(
      await Service.createAppeal(c.req.param('id'), user.userId, c.req.valid('json').reason),
      201
    );
  })
  .openapi(decideRoute, async (c) => {
    requireStaff(c.get('user'));
    return c.json(await Service.decideReview(c.req.param('id'), c.req.valid('json')), 200);
  })
  .openapi(rescanRoute, async (c) => {
    requireStaff(c.get('user'));
    return c.json(await Service.createRescanJob(c.req.valid('json').scope), 201);
  });
