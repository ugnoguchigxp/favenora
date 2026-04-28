import { createRoute, z } from '@hono/zod-openapi';
import {
  billingPortalResponseSchema,
  checkoutSessionResponseSchema,
  createBillingPortalSchema,
  createOneTimePurchaseCheckoutSchema,
  createRefundSchema,
  createSubscriptionCheckoutSchema,
  createTipCheckoutSchema,
  ledgerResponseSchema,
  refundResponseSchema,
  refundsResponseSchema,
  revenueSummaryResponseSchema,
} from '../../../shared/schemas/payments.schema';
import { AuthError } from '../../lib/errors';
import { createOpenApiRouter } from '../../lib/openapi';
import { authMiddleware } from '../../middleware/auth';
import { paymentsService } from './payments.service';

const requireUserId = (user: { userId: string } | undefined) => {
  if (!user) throw new AuthError();
  return user.userId;
};

const subscriptionCheckoutRoute = createRoute({
  method: 'post',
  path: '/checkout/subscription',
  request: {
    body: { content: { 'application/json': { schema: createSubscriptionCheckoutSchema } } },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: checkoutSessionResponseSchema } },
      description: 'Subscription checkout created',
    },
  },
});

const oneTimeCheckoutRoute = createRoute({
  method: 'post',
  path: '/checkout/one-time-purchase',
  request: {
    body: { content: { 'application/json': { schema: createOneTimePurchaseCheckoutSchema } } },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: checkoutSessionResponseSchema } },
      description: 'One-time checkout created',
    },
  },
});

const tipCheckoutRoute = createRoute({
  method: 'post',
  path: '/checkout/tip',
  request: { body: { content: { 'application/json': { schema: createTipCheckoutSchema } } } },
  responses: {
    201: {
      content: { 'application/json': { schema: checkoutSessionResponseSchema } },
      description: 'Tip checkout created',
    },
  },
});

const billingPortalRoute = createRoute({
  method: 'post',
  path: '/billing-portal',
  request: { body: { content: { 'application/json': { schema: createBillingPortalSchema } } } },
  responses: {
    200: {
      content: { 'application/json': { schema: billingPortalResponseSchema } },
      description: 'Billing portal URL',
    },
  },
});

const webhookRoute = createRoute({
  method: 'post',
  path: '/webhooks/:provider',
  request: { params: z.object({ provider: z.string() }) },
  responses: { 200: { description: 'Webhook processed' } },
});

const revenueRoute = createRoute({
  method: 'get',
  path: '/revenue',
  request: {
    query: z.object({
      creatorId: z.string().uuid(),
      currency: z.string().length(3).default('JPY'),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: revenueSummaryResponseSchema } },
      description: 'Revenue summary',
    },
  },
});

const ledgerRoute = createRoute({
  method: 'get',
  path: '/revenue/ledger',
  request: { query: z.object({ creatorId: z.string().uuid() }) },
  responses: {
    200: {
      content: { 'application/json': { schema: ledgerResponseSchema } },
      description: 'Revenue ledger',
    },
  },
});

const refundRoute = createRoute({
  method: 'post',
  path: '/refunds',
  request: { body: { content: { 'application/json': { schema: createRefundSchema } } } },
  responses: {
    201: {
      content: { 'application/json': { schema: refundResponseSchema } },
      description: 'Refund created',
    },
  },
});

const listRefundsRoute = createRoute({
  method: 'get',
  path: '/refunds',
  request: { query: z.object({ creatorId: z.string().uuid() }) },
  responses: {
    200: {
      content: { 'application/json': { schema: refundsResponseSchema } },
      description: 'Refunds',
    },
  },
});

const protectedBase = createOpenApiRouter();
protectedBase.use('*', authMiddleware());

const protectedPayments = protectedBase
  .openapi(subscriptionCheckoutRoute, async (c) => {
    const checkoutSession = await paymentsService.createSubscriptionCheckout(
      c.req.valid('json'),
      requireUserId(c.get('user'))
    );
    return c.json(checkoutSessionResponseSchema.parse({ checkoutSession }), 201);
  })
  .openapi(oneTimeCheckoutRoute, async (c) => {
    const checkoutSession = await paymentsService.createOneTimePurchaseCheckout(
      c.req.valid('json'),
      requireUserId(c.get('user'))
    );
    return c.json(checkoutSessionResponseSchema.parse({ checkoutSession }), 201);
  })
  .openapi(tipCheckoutRoute, async (c) => {
    const checkoutSession = await paymentsService.createTipCheckout(
      c.req.valid('json'),
      requireUserId(c.get('user'))
    );
    return c.json(checkoutSessionResponseSchema.parse({ checkoutSession }), 201);
  })
  .openapi(billingPortalRoute, async (c) => {
    const result = await paymentsService.createBillingPortal(
      c.req.valid('json'),
      requireUserId(c.get('user'))
    );
    return c.json(result, 200);
  })
  .openapi(revenueRoute, async (c) => {
    const query = c.req.valid('query');
    const summary = await paymentsService.getRevenueSummary(
      query.creatorId,
      requireUserId(c.get('user')),
      query.currency
    );
    return c.json({ summary }, 200);
  })
  .openapi(ledgerRoute, async (c) => {
    const entries = await paymentsService.listLedger(
      c.req.valid('query').creatorId,
      requireUserId(c.get('user'))
    );
    return c.json(ledgerResponseSchema.parse({ entries }), 200);
  })
  .openapi(refundRoute, async (c) => {
    const refund = await paymentsService.createRefund(
      c.req.valid('json'),
      requireUserId(c.get('user'))
    );
    return c.json(refundResponseSchema.parse({ refund }), 201);
  })
  .openapi(listRefundsRoute, async (c) => {
    const refunds = await paymentsService.listRefunds(
      c.req.valid('query').creatorId,
      requireUserId(c.get('user'))
    );
    return c.json(refundsResponseSchema.parse({ refunds }), 200);
  });

const publicPayments = createOpenApiRouter().openapi(webhookRoute, async (c) => {
  const rawBody = await c.req.text();
  const result = await paymentsService.processWebhook(
    c.req.param('provider'),
    rawBody,
    c.req.header('stripe-signature')
  );
  return c.json({ received: true, ...result }, 200);
});

export const paymentsRouter = createOpenApiRouter()
  .route('/', publicPayments)
  .route('/', protectedPayments);
