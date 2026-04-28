import { and, asc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import type {
  CreateMembershipTierInput,
  GrantComplimentaryMembershipInput,
  UpdateMembershipTierInput,
} from '../../../shared/schemas/memberships.schema';
import { db } from '../../db/client';
import {
  complimentaryMemberships,
  entitlements,
  membershipTiers,
  subscriptions,
  supporterNotes,
  tierBenefits,
} from '../../db/schema';

export const findTiersByCreatorId = async (creatorId: string, includeArchived = false) => {
  const tiers = await db
    .select()
    .from(membershipTiers)
    .where(
      includeArchived
        ? eq(membershipTiers.creatorId, creatorId)
        : and(
            eq(membershipTiers.creatorId, creatorId),
            sql`${membershipTiers.visibility} <> 'archived'`
          )
    )
    .orderBy(asc(membershipTiers.sortOrder), asc(membershipTiers.createdAt));

  if (tiers.length === 0) return [];
  const benefits = await db
    .select()
    .from(tierBenefits)
    .where(
      inArray(
        tierBenefits.tierId,
        tiers.map((tier) => tier.id)
      )
    )
    .orderBy(asc(tierBenefits.sortOrder));

  return tiers.map((tier) => ({
    ...tier,
    benefits: benefits.filter((benefit) => benefit.tierId === tier.id),
  }));
};

export const findTierById = async (id: string) => {
  const [tier] = await db.select().from(membershipTiers).where(eq(membershipTiers.id, id));
  return tier || null;
};

export const insertTier = async (data: CreateMembershipTierInput) => {
  return db.transaction(async (tx) => {
    const [tier] = await tx
      .insert(membershipTiers)
      .values({
        creatorId: data.creatorId,
        name: data.name,
        description: data.description ?? null,
        priceAmount: data.priceAmount,
        currency: data.currency,
        billingInterval: data.billingInterval,
        visibility: data.visibility,
        sortOrder: data.sortOrder,
        coverMediaId: data.coverMediaId ?? null,
        maxMembers: data.maxMembers ?? null,
        ageRating: data.ageRating,
      })
      .returning();

    if (data.benefits.length > 0) {
      await tx.insert(tierBenefits).values(
        data.benefits.map((benefit) => ({
          tierId: tier.id,
          kind: benefit.kind,
          label: benefit.label,
          description: benefit.description ?? null,
          sortOrder: benefit.sortOrder,
          deliveryHint: benefit.deliveryHint ?? null,
          isHighlighted: benefit.isHighlighted,
        }))
      );
    }

    return tier;
  });
};

export const updateTier = async (id: string, data: UpdateMembershipTierInput) => {
  const [tier] = await db
    .update(membershipTiers)
    .set({
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.priceAmount !== undefined ? { priceAmount: data.priceAmount } : {}),
      ...(data.currency !== undefined ? { currency: data.currency } : {}),
      ...(data.billingInterval !== undefined ? { billingInterval: data.billingInterval } : {}),
      ...(data.visibility !== undefined ? { visibility: data.visibility } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      ...(data.coverMediaId !== undefined ? { coverMediaId: data.coverMediaId } : {}),
      ...(data.maxMembers !== undefined ? { maxMembers: data.maxMembers } : {}),
      ...(data.ageRating !== undefined ? { ageRating: data.ageRating } : {}),
    })
    .where(eq(membershipTiers.id, id))
    .returning();
  return tier || null;
};

export const archiveTier = async (id: string) => {
  const [tier] = await db
    .update(membershipTiers)
    .set({ visibility: 'archived' })
    .where(eq(membershipTiers.id, id))
    .returning();
  return tier || null;
};

export const findSubscriptionsByUserId = async (userId: string) => {
  return db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
};

export const findSubscriptionById = async (id: string) => {
  const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
  return subscription || null;
};

export const cancelSubscriptionAtPeriodEnd = async (id: string) => {
  const [subscription] = await db
    .update(subscriptions)
    .set({ cancelAtPeriodEnd: true, status: 'cancel_at_period_end' })
    .where(eq(subscriptions.id, id))
    .returning();
  return subscription || null;
};

export const findEntitlementsByUserId = async (userId: string) => {
  return db.select().from(entitlements).where(eq(entitlements.userId, userId));
};

export const findActiveEntitlements = async (input: {
  userId: string;
  creatorId: string;
  targetType: string;
  targetId?: string | null;
}) => {
  const now = new Date();
  return db
    .select()
    .from(entitlements)
    .where(
      and(
        eq(entitlements.userId, input.userId),
        eq(entitlements.creatorId, input.creatorId),
        eq(entitlements.targetType, input.targetType),
        input.targetId ? eq(entitlements.targetId, input.targetId) : isNull(entitlements.targetId),
        isNull(entitlements.revokedAt),
        or(isNull(entitlements.expiresAt), sql`${entitlements.expiresAt} > ${now}`)
      )
    );
};

export const findActiveSubscriptions = async (input: {
  userId: string;
  creatorId: string;
  tierIds?: string[];
}) => {
  const now = new Date();
  return db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, input.userId),
        eq(subscriptions.creatorId, input.creatorId),
        input.tierIds?.length ? inArray(subscriptions.tierId, input.tierIds) : undefined,
        inArray(subscriptions.status, ['active', 'cancel_at_period_end', 'past_due']),
        or(
          sql`${subscriptions.currentPeriodEnd} > ${now}`,
          sql`${subscriptions.gracePeriodEndsAt} > ${now}`
        )
      )
    );
};

export const insertComplimentaryMembership = async (
  data: GrantComplimentaryMembershipInput,
  grantedByUserId: string
) => {
  return db.transaction(async (tx) => {
    const startsAt = data.startsAt ? new Date(data.startsAt) : new Date();
    const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    const [grant] = await tx
      .insert(complimentaryMemberships)
      .values({
        creatorId: data.creatorId,
        grantedByUserId,
        userId: data.userId,
        tierId: data.tierId,
        startsAt,
        expiresAt,
        reason: data.reason ?? null,
        status: 'active',
      })
      .returning();

    await tx.insert(entitlements).values({
      userId: data.userId,
      creatorId: data.creatorId,
      targetType: 'tier',
      targetId: data.tierId,
      sourceType: 'complimentary',
      sourceId: grant.id,
      startsAt,
      expiresAt,
    });

    return grant;
  });
};

export const revokeComplimentaryMembership = async (id: string, reason = 'revoked_by_creator') => {
  return db.transaction(async (tx) => {
    const [grant] = await tx
      .update(complimentaryMemberships)
      .set({ status: 'revoked' })
      .where(eq(complimentaryMemberships.id, id))
      .returning();
    if (!grant) return null;

    await tx
      .update(entitlements)
      .set({ revokedAt: new Date(), revokeReason: reason })
      .where(and(eq(entitlements.sourceType, 'complimentary'), eq(entitlements.sourceId, id)));

    return grant;
  });
};

export const listSupporters = async (creatorId: string) => {
  const now = new Date();
  const activeSubscriptions = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.creatorId, creatorId),
        inArray(subscriptions.status, ['active', 'cancel_at_period_end', 'past_due']),
        or(
          sql`${subscriptions.currentPeriodEnd} > ${now}`,
          sql`${subscriptions.gracePeriodEndsAt} > ${now}`
        )
      )
    );
  const activeComplimentaryMemberships = await db
    .select()
    .from(complimentaryMemberships)
    .where(
      and(
        eq(complimentaryMemberships.creatorId, creatorId),
        eq(complimentaryMemberships.status, 'active'),
        or(
          isNull(complimentaryMemberships.expiresAt),
          sql`${complimentaryMemberships.expiresAt} > ${now}`
        )
      )
    );
  const notes = await db
    .select()
    .from(supporterNotes)
    .where(eq(supporterNotes.creatorId, creatorId));

  const supporters: Array<{
    userId: string;
    creatorId: string;
    tierId: string | null;
    status: string;
    expiresAt: Date | null;
    note: string | null;
  }> = activeSubscriptions.map((subscription) => ({
    userId: subscription.userId,
    creatorId,
    tierId: subscription.tierId,
    status: subscription.status,
    expiresAt: subscription.currentPeriodEnd,
    note: notes.find((note) => note.supporterUserId === subscription.userId)?.note ?? null,
  }));

  for (const grant of activeComplimentaryMemberships) {
    if (supporters.some((supporter) => supporter.userId === grant.userId)) continue;
    supporters.push({
      userId: grant.userId,
      creatorId,
      tierId: grant.tierId,
      status: 'complimentary',
      expiresAt: grant.expiresAt,
      note: notes.find((note) => note.supporterUserId === grant.userId)?.note ?? null,
    });
  }

  return supporters;
};

export const upsertSupporterNote = async (input: {
  creatorId: string;
  supporterUserId: string;
  note: string;
  createdByUserId: string;
}) => {
  const [note] = await db
    .insert(supporterNotes)
    .values(input)
    .onConflictDoUpdate({
      target: [supporterNotes.creatorId, supporterNotes.supporterUserId],
      set: { note: input.note },
    })
    .returning();
  return note;
};
