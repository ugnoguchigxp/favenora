import { z } from '@hono/zod-openapi';
import sanitizeHtml from 'sanitize-html';

const sanitize = (val: string) => sanitizeHtml(val);
const uuidSchema = z.string().uuid();
const nullableUuidSchema = uuidSchema.nullable();
const isoDateSchema = z.preprocess(
  (value) => (value instanceof Date ? value.toISOString() : value),
  z.string().datetime()
);
const nullableIsoDateSchema = isoDateSchema.nullable();

export const billingIntervalSchema = z.enum(['monthly', 'annual']).openapi('BillingInterval');
export const billingModelSchema = z
  .enum(['subscription', 'complimentary', 'free', 'one_time'])
  .openapi('BillingModel');
export const membershipTierVisibilitySchema = z
  .enum(['draft', 'published', 'archived'])
  .openapi('MembershipTierVisibility');
export const subscriptionStatusSchema = z
  .enum(['active', 'past_due', 'cancel_at_period_end', 'canceled', 'expired'])
  .openapi('SubscriptionStatus');
export const entitlementTargetTypeSchema = z
  .enum(['creator', 'tier', 'post', 'project_update', 'stream_archive'])
  .openapi('EntitlementTargetType');
export const entitlementSourceTypeSchema = z
  .enum(['subscription', 'complimentary', 'free_membership', 'one_time_purchase', 'manual_grant'])
  .openapi('EntitlementSourceType');

export const membershipTierPriceSchema = z
  .object({
    id: uuidSchema,
    tierId: uuidSchema,
    amount: z.number().int().min(0),
    currency: z.string().length(3),
    billingInterval: z.string(),
    providerPriceId: z.string().nullable(),
    effectiveFrom: isoDateSchema,
    effectiveTo: nullableIsoDateSchema,
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
  })
  .openapi('MembershipTierPrice');

export const tierBenefitSchema = z
  .object({
    id: uuidSchema,
    tierId: uuidSchema,
    kind: z.string(),
    label: z.string(),
    description: z.string().nullable(),
    sortOrder: z.number().int(),
    deliveryHint: z.string().nullable(),
    isHighlighted: z.boolean(),
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
  })
  .openapi('TierBenefit');

export const membershipTierSchema = z
  .object({
    id: uuidSchema,
    creatorId: uuidSchema,
    name: z.string(),
    description: z.string().nullable(),
    priceAmount: z.number().int().min(0),
    currency: z.string().length(3),
    billingInterval: z.string(),
    visibility: z.string(),
    sortOrder: z.number().int(),
    coverMediaId: nullableUuidSchema,
    maxMembers: z.number().int().positive().nullable(),
    ageRating: z.string(),
    benefits: z.array(tierBenefitSchema).optional(),
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
  })
  .openapi('MembershipTier');

export const createTierBenefitSchema = z.object({
  kind: z.string().min(1).transform(sanitize),
  label: z.string().min(1).transform(sanitize),
  description: z.string().transform(sanitize).optional(),
  sortOrder: z.number().int().min(0).default(0),
  deliveryHint: z.string().transform(sanitize).optional(),
  isHighlighted: z.boolean().default(false),
});

export const createMembershipTierSchema = z
  .object({
    creatorId: uuidSchema,
    name: z.string().min(1).max(80).transform(sanitize),
    description: z.string().max(2000).transform(sanitize).optional(),
    priceAmount: z.number().int().min(0),
    currency: z
      .string()
      .length(3)
      .transform((value) => value.toUpperCase()),
    billingInterval: billingIntervalSchema.default('monthly'),
    visibility: membershipTierVisibilitySchema.default('draft'),
    sortOrder: z.number().int().min(0).default(0),
    coverMediaId: uuidSchema.optional(),
    maxMembers: z.number().int().positive().optional(),
    ageRating: z.enum(['all_ages', 'mature', 'adult']).default('all_ages'),
    benefits: z.array(createTierBenefitSchema).max(20).default([]),
  })
  .openapi('CreateMembershipTierInput');

export const updateMembershipTierSchema = createMembershipTierSchema
  .omit({ creatorId: true })
  .partial()
  .openapi('UpdateMembershipTierInput');

export const subscriptionSchema = z
  .object({
    id: uuidSchema,
    userId: uuidSchema,
    creatorId: uuidSchema,
    tierId: uuidSchema,
    status: z.string(),
    billingModel: z.string(),
    billingInterval: z.string(),
    currentPeriodStart: isoDateSchema,
    currentPeriodEnd: isoDateSchema,
    cancelAtPeriodEnd: z.boolean(),
    gracePeriodEndsAt: nullableIsoDateSchema,
    provider: z.string().nullable(),
    providerCustomerId: z.string().nullable(),
    providerSubscriptionId: z.string().nullable(),
    priceVersionId: nullableUuidSchema,
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
  })
  .openapi('Subscription');

export const subscriptionEventSchema = z
  .object({
    id: uuidSchema,
    subscriptionId: nullableUuidSchema,
    eventType: z.string(),
    source: z.string(),
    sourceEventId: z.string(),
    occurredAt: isoDateSchema,
    metadata: z.record(z.string(), z.unknown()).nullable(),
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
  })
  .openapi('SubscriptionEvent');

export const entitlementSchema = z
  .object({
    id: uuidSchema,
    userId: uuidSchema,
    creatorId: uuidSchema,
    targetType: z.string(),
    targetId: nullableUuidSchema,
    sourceType: z.string(),
    sourceId: nullableUuidSchema,
    startsAt: isoDateSchema,
    expiresAt: nullableIsoDateSchema,
    revokedAt: nullableIsoDateSchema,
    revokeReason: z.string().nullable(),
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
  })
  .openapi('Entitlement');

export const entitlementCheckQuerySchema = z
  .object({
    creatorId: uuidSchema,
    targetType: entitlementTargetTypeSchema.default('creator'),
    targetId: uuidSchema.optional(),
    tierIds: z
      .union([z.string(), z.array(uuidSchema)])
      .optional()
      .transform((value) => {
        if (!value) return [];
        return Array.isArray(value) ? value : value.split(',').filter(Boolean);
      }),
  })
  .openapi('EntitlementCheckQuery');

export const entitlementCheckResultSchema = z
  .object({
    allowed: z.boolean(),
    reason: z
      .enum([
        'public',
        'owner',
        'active_subscription',
        'active_entitlement',
        'membership_required',
        'tier_required',
        'expired',
        'revoked',
        'unauthenticated',
      ])
      .nullable(),
    requiredTierIds: z.array(uuidSchema),
    matchedEntitlementId: uuidSchema.nullable(),
    expiresAt: nullableIsoDateSchema,
  })
  .openapi('EntitlementCheckResult');

export const complimentaryMembershipSchema = z
  .object({
    id: uuidSchema,
    creatorId: uuidSchema,
    grantedByUserId: uuidSchema,
    userId: uuidSchema,
    tierId: uuidSchema,
    startsAt: isoDateSchema,
    expiresAt: nullableIsoDateSchema,
    reason: z.string().nullable(),
    status: z.string(),
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
  })
  .openapi('ComplimentaryMembership');

export const grantComplimentaryMembershipSchema = z
  .object({
    creatorId: uuidSchema,
    userId: uuidSchema,
    tierId: uuidSchema,
    startsAt: isoDateSchema.optional(),
    expiresAt: isoDateSchema.optional(),
    reason: z.string().max(500).transform(sanitize).optional(),
  })
  .openapi('GrantComplimentaryMembershipInput');

export const supporterSummarySchema = z
  .object({
    userId: uuidSchema,
    creatorId: uuidSchema,
    tierId: uuidSchema.nullable(),
    status: z.string(),
    expiresAt: nullableIsoDateSchema,
    note: z.string().nullable(),
  })
  .openapi('SupporterSummary');

export const supporterNoteSchema = z
  .object({
    note: z.string().min(1).max(2000).transform(sanitize),
  })
  .openapi('SupporterNoteInput');

export const listMembershipTiersResponseSchema = z.object({
  tiers: z.array(membershipTierSchema),
});
export const listSubscriptionsResponseSchema = z.object({
  subscriptions: z.array(subscriptionSchema),
});
export const listEntitlementsResponseSchema = z.object({
  entitlements: z.array(entitlementSchema),
});
export const listSupportersResponseSchema = z.object({
  supporters: z.array(supporterSummarySchema),
});

export type CreateMembershipTierInput = z.infer<typeof createMembershipTierSchema>;
export type UpdateMembershipTierInput = z.infer<typeof updateMembershipTierSchema>;
export type EntitlementCheckResult = z.infer<typeof entitlementCheckResultSchema>;
export type GrantComplimentaryMembershipInput = z.infer<typeof grantComplimentaryMembershipSchema>;
