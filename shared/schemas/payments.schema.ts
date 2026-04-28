import { z } from '@hono/zod-openapi';
import sanitizeHtml from 'sanitize-html';

const sanitize = (value: string) =>
  sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
const isoDateSchema = z.preprocess(
  (value) => (value instanceof Date ? value.toISOString() : value),
  z.string().datetime()
);
const nullableIsoDateSchema = isoDateSchema.nullable();
const uuidSchema = z.string().uuid();

export const paymentProviderSchema = z.enum(['stripe']);
export const checkoutPurposeSchema = z.enum([
  'subscription_start',
  'subscription_change',
  'subscription_resume',
  'one_time_purchase',
  'tip',
]);
export const checkoutStatusSchema = z.enum(['pending', 'completed', 'expired', 'canceled']);
export const paymentStatusSchema = z.enum(['pending', 'paid', 'failed', 'refunded']);
export const ledgerEntryTypeSchema = z.enum([
  'charge',
  'refund',
  'fee',
  'tax',
  'creator_earning',
  'platform_fee',
  'payout',
  'payout_reversal',
  'dispute',
  'adjustment',
]);
export const internalPaymentEventTypeSchema = z.enum([
  'subscription_checkout_completed',
  'subscription_renewed',
  'subscription_payment_failed',
  'subscription_canceled',
  'subscription_period_ended',
  'subscription_refunded_full',
  'subscription_refunded_partial',
  'one_time_purchase_completed',
  'one_time_purchase_refunded',
  'tip_paid',
  'tip_refunded',
  'payout_paid',
  'payout_failed',
]);

export const checkoutSessionSchema = z.object({
  id: uuidSchema,
  provider: paymentProviderSchema,
  purpose: checkoutPurposeSchema,
  userId: uuidSchema,
  creatorId: uuidSchema,
  tierId: uuidSchema.nullable(),
  postId: uuidSchema.nullable(),
  streamId: uuidSchema.nullable(),
  amount: z.number().int(),
  currency: z.string().length(3),
  status: checkoutStatusSchema,
  providerCheckoutSessionId: z.string(),
  url: z.string().url().nullable(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  expiresAt: nullableIsoDateSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const createSubscriptionCheckoutSchema = z.object({
  creatorId: uuidSchema,
  tierId: uuidSchema,
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export const createTipCheckoutSchema = z.object({
  creatorId: uuidSchema,
  postId: uuidSchema.optional(),
  streamId: uuidSchema.optional(),
  amount: z.number().int().positive().max(1_000_000),
  currency: z
    .string()
    .length(3)
    .transform((value) => value.toUpperCase()),
  message: z.string().max(1000).transform(sanitize).optional(),
  visibility: z.enum(['public', 'creator_only', 'anonymous']).default('creator_only'),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export const createOneTimePurchaseCheckoutSchema = z.object({
  creatorId: uuidSchema,
  postId: uuidSchema.optional(),
  amount: z.number().int().positive(),
  currency: z
    .string()
    .length(3)
    .transform((value) => value.toUpperCase()),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export const createBillingPortalSchema = z.object({
  returnUrl: z.string().url().optional(),
});

export const checkoutSessionResponseSchema = z.object({ checkoutSession: checkoutSessionSchema });
export const billingPortalResponseSchema = z.object({ url: z.string().url() });

export const paymentEventSchema = z.object({
  id: uuidSchema,
  provider: paymentProviderSchema,
  providerEventId: z.string(),
  type: z.string(),
  processingStatus: z.enum(['received', 'processed', 'ignored', 'failed']),
  receivedAt: isoDateSchema,
  processedAt: nullableIsoDateSchema,
  error: z.string().nullable(),
});

export const ledgerEntrySchema = z.object({
  id: uuidSchema,
  creatorId: uuidSchema.nullable(),
  userId: uuidSchema.nullable(),
  provider: paymentProviderSchema,
  providerObjectId: z.string(),
  sourceType: z.string(),
  sourceId: uuidSchema.nullable(),
  entryType: ledgerEntryTypeSchema,
  amount: z.number().int(),
  currency: z.string().length(3),
  occurredAt: isoDateSchema,
  availableAt: nullableIsoDateSchema,
});

export const revenueSummarySchema = z.object({
  creatorId: uuidSchema,
  currency: z.string().length(3),
  gross: z.number().int(),
  refunds: z.number().int(),
  fees: z.number().int(),
  net: z.number().int(),
});

export const revenueSummaryResponseSchema = z.object({ summary: revenueSummarySchema });
export const ledgerResponseSchema = z.object({ entries: z.array(ledgerEntrySchema) });

export const createRefundSchema = z.object({
  paymentId: uuidSchema,
  amount: z.number().int().positive().optional(),
  reason: z.string().max(500).transform(sanitize).optional(),
});

export const refundSchema = z.object({
  id: uuidSchema,
  paymentId: uuidSchema.nullable(),
  creatorId: uuidSchema.nullable(),
  userId: uuidSchema.nullable(),
  amount: z.number().int(),
  currency: z.string().length(3),
  reason: z.string().nullable(),
  status: z.string(),
  providerRefundId: z.string().nullable(),
  processedAt: nullableIsoDateSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});
export const refundResponseSchema = z.object({ refund: refundSchema });
export const refundsResponseSchema = z.object({ refunds: z.array(refundSchema) });

export type CreateSubscriptionCheckoutInput = z.infer<typeof createSubscriptionCheckoutSchema>;
export type CreateTipCheckoutInput = z.infer<typeof createTipCheckoutSchema>;
export type CreateOneTimePurchaseCheckoutInput = z.infer<
  typeof createOneTimePurchaseCheckoutSchema
>;
export type CreateBillingPortalInput = z.infer<typeof createBillingPortalSchema>;
export type CreateRefundInput = z.infer<typeof createRefundSchema>;
