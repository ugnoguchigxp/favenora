import { createRoute, z } from '@hono/zod-openapi';
import {
  createMembershipTierSchema,
  entitlementCheckQuerySchema,
  entitlementCheckResultSchema,
  grantComplimentaryMembershipSchema,
  listEntitlementsResponseSchema,
  listMembershipTiersResponseSchema,
  listSubscriptionsResponseSchema,
  listSupportersResponseSchema,
  membershipTierSchema,
  subscriptionSchema,
  supporterNoteSchema,
  updateMembershipTierSchema,
} from '../../../shared/schemas/memberships.schema';
import { AuthError } from '../../lib/errors';
import { createOpenApiRouter } from '../../lib/openapi';
import { authMiddleware } from '../../middleware/auth';
import * as MembershipService from './memberships.service';

const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

const listTiersRoute = createRoute({
  method: 'get',
  path: '/creators/:creatorId/tiers',
  request: {
    params: z.object({ creatorId: z.string().uuid() }),
    query: z.object({ includeArchived: z.coerce.boolean().optional() }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: listMembershipTiersResponseSchema } },
      description: 'Membership tiers for a creator',
    },
  },
});

const createTierRoute = createRoute({
  method: 'post',
  path: '/tiers',
  request: {
    body: { content: { 'application/json': { schema: createMembershipTierSchema } } },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: membershipTierSchema } },
      description: 'Membership tier created',
    },
  },
});

const updateTierRoute = createRoute({
  method: 'patch',
  path: '/tiers/:id',
  request: {
    params: uuidParamSchema,
    body: { content: { 'application/json': { schema: updateMembershipTierSchema } } },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: membershipTierSchema } },
      description: 'Membership tier updated',
    },
  },
});

const archiveTierRoute = createRoute({
  method: 'post',
  path: '/tiers/:id/archive',
  request: { params: uuidParamSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: membershipTierSchema } },
      description: 'Membership tier archived',
    },
  },
});

const listSubscriptionsRoute = createRoute({
  method: 'get',
  path: '/subscriptions/me',
  responses: {
    200: {
      content: { 'application/json': { schema: listSubscriptionsResponseSchema } },
      description: 'Current user subscriptions',
    },
  },
});

const getSubscriptionRoute = createRoute({
  method: 'get',
  path: '/subscriptions/:id',
  request: { params: uuidParamSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: subscriptionSchema } },
      description: 'Subscription detail',
    },
  },
});

const cancelSubscriptionRoute = createRoute({
  method: 'post',
  path: '/subscriptions/:id/cancel',
  request: { params: uuidParamSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: subscriptionSchema } },
      description: 'Subscription cancellation scheduled',
    },
  },
});

const checkEntitlementRoute = createRoute({
  method: 'get',
  path: '/entitlements/check',
  request: { query: entitlementCheckQuerySchema },
  responses: {
    200: {
      content: { 'application/json': { schema: entitlementCheckResultSchema } },
      description: 'Entitlement check result',
    },
  },
});

const listEntitlementsRoute = createRoute({
  method: 'get',
  path: '/entitlements/me',
  responses: {
    200: {
      content: { 'application/json': { schema: listEntitlementsResponseSchema } },
      description: 'Current user entitlements',
    },
  },
});

const listSupportersRoute = createRoute({
  method: 'get',
  path: '/supporters',
  request: { query: z.object({ creatorId: z.string().uuid() }) },
  responses: {
    200: {
      content: { 'application/json': { schema: listSupportersResponseSchema } },
      description: 'Supporters for a creator',
    },
  },
});

const grantComplimentaryRoute = createRoute({
  method: 'post',
  path: '/complimentary',
  request: {
    body: { content: { 'application/json': { schema: grantComplimentaryMembershipSchema } } },
  },
  responses: {
    201: { description: 'Complimentary membership granted' },
  },
});

const revokeComplimentaryRoute = createRoute({
  method: 'delete',
  path: '/complimentary/:id',
  request: { params: uuidParamSchema },
  responses: {
    200: { description: 'Complimentary membership revoked' },
  },
});

const saveSupporterNoteRoute = createRoute({
  method: 'post',
  path: '/supporters/:userId/notes',
  request: {
    params: z.object({ userId: z.string().uuid() }),
    query: z.object({ creatorId: z.string().uuid() }),
    body: { content: { 'application/json': { schema: supporterNoteSchema } } },
  },
  responses: {
    200: { description: 'Supporter note saved' },
  },
});

const publicMemberships = createOpenApiRouter().openapi(listTiersRoute, async (c) => {
  const creatorId = c.req.param('creatorId');
  const query = c.req.valid('query');
  const tiers = await MembershipService.listCreatorTiers(creatorId, query.includeArchived);
  return c.json(listMembershipTiersResponseSchema.parse({ tiers }), 200);
});

const protectedMembershipsBase = createOpenApiRouter();
protectedMembershipsBase.use('*', authMiddleware());
const protectedMemberships = protectedMembershipsBase
  .openapi(createTierRoute, async (c) => {
    const user = c.get('user');
    if (!user) throw new AuthError();
    const tier = await MembershipService.createTier(c.req.valid('json'), user.userId);
    return c.json(membershipTierSchema.parse(tier), 201);
  })
  .openapi(updateTierRoute, async (c) => {
    const user = c.get('user');
    if (!user) throw new AuthError();
    const tier = await MembershipService.updateTier(
      c.req.param('id'),
      c.req.valid('json'),
      user.userId
    );
    return c.json(membershipTierSchema.parse(tier), 200);
  })
  .openapi(archiveTierRoute, async (c) => {
    const user = c.get('user');
    if (!user) throw new AuthError();
    const tier = await MembershipService.archiveTier(c.req.param('id'), user.userId);
    return c.json(membershipTierSchema.parse(tier), 200);
  })
  .openapi(listSubscriptionsRoute, async (c) => {
    const user = c.get('user');
    if (!user) throw new AuthError();
    const subscriptions = await MembershipService.listMySubscriptions(user.userId);
    return c.json(listSubscriptionsResponseSchema.parse({ subscriptions }), 200);
  })
  .openapi(getSubscriptionRoute, async (c) => {
    const user = c.get('user');
    if (!user) throw new AuthError();
    const subscription = await MembershipService.getSubscription(c.req.param('id'), user.userId);
    return c.json(subscriptionSchema.parse(subscription), 200);
  })
  .openapi(cancelSubscriptionRoute, async (c) => {
    const user = c.get('user');
    if (!user) throw new AuthError();
    const subscription = await MembershipService.cancelSubscription(c.req.param('id'), user.userId);
    return c.json(subscriptionSchema.parse(subscription), 200);
  })
  .openapi(checkEntitlementRoute, async (c) => {
    const user = c.get('user');
    const query = c.req.valid('query');
    const result = await MembershipService.checkEntitlement({
      userId: user?.userId,
      creatorId: query.creatorId,
      targetType: query.targetType,
      targetId: query.targetId,
      tierIds: query.tierIds,
      ownerId: query.creatorId,
    });
    return c.json(result, 200);
  })
  .openapi(listEntitlementsRoute, async (c) => {
    const user = c.get('user');
    if (!user) throw new AuthError();
    const entitlements = await MembershipService.listMyEntitlements(user.userId);
    return c.json(listEntitlementsResponseSchema.parse({ entitlements }), 200);
  })
  .openapi(listSupportersRoute, async (c) => {
    const user = c.get('user');
    if (!user) throw new AuthError();
    const supporters = await MembershipService.listSupporters(
      c.req.valid('query').creatorId,
      user.userId
    );
    return c.json(listSupportersResponseSchema.parse({ supporters }), 200);
  })
  .openapi(grantComplimentaryRoute, async (c) => {
    const user = c.get('user');
    if (!user) throw new AuthError();
    const grant = await MembershipService.grantComplimentaryMembership(
      c.req.valid('json'),
      user.userId
    );
    return c.json(grant, 201);
  })
  .openapi(revokeComplimentaryRoute, async (c) => {
    const grant = await MembershipService.revokeComplimentaryMembership(c.req.param('id'));
    return c.json(grant, 200);
  })
  .openapi(saveSupporterNoteRoute, async (c) => {
    const user = c.get('user');
    if (!user) throw new AuthError();
    const query = c.req.valid('query');
    const note = await MembershipService.saveSupporterNote({
      creatorId: query.creatorId,
      supporterUserId: c.req.param('userId'),
      note: c.req.valid('json').note,
      createdByUserId: user.userId,
    });
    return c.json(note, 200);
  });

export const membershipsRouter = createOpenApiRouter()
  .route('/', publicMemberships)
  .route('/', protectedMemberships);
