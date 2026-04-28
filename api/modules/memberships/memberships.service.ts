import type {
  CreateMembershipTierInput,
  EntitlementCheckResult,
  GrantComplimentaryMembershipInput,
  UpdateMembershipTierInput,
} from '../../../shared/schemas/memberships.schema';
import { ForbiddenError, NotFoundError, ValidationError } from '../../lib/errors';
import * as CreatorsRepository from '../creators/creators.repository';
import * as MembershipRepository from './memberships.repository';

const toIsoOrNull = (value: Date | string | null | undefined) =>
  value ? new Date(value).toISOString() : null;

const isCreatorOwner = async (creatorId: string, userId: string) => {
  const creator = await CreatorsRepository.findCreatorById(creatorId);
  return creator?.userId === userId;
};

const assertCreatorOwner = async (creatorId: string, userId: string) => {
  if (!(await isCreatorOwner(creatorId, userId))) {
    throw new ForbiddenError('Only the creator owner can manage this membership resource');
  }
};

export const listCreatorTiers = async (creatorId: string, includeArchived = false) => {
  return MembershipRepository.findTiersByCreatorId(creatorId, includeArchived);
};

export const createTier = async (data: CreateMembershipTierInput, userId: string) => {
  await assertCreatorOwner(data.creatorId, userId);
  if (data.visibility === 'published' && data.priceAmount < 0) {
    throw new ValidationError('Tier price must be zero or greater');
  }
  return MembershipRepository.insertTier(data);
};

export const updateTier = async (id: string, data: UpdateMembershipTierInput, userId: string) => {
  const tier = await MembershipRepository.findTierById(id);
  if (!tier) throw new NotFoundError('Membership tier not found');
  await assertCreatorOwner(tier.creatorId, userId);
  return MembershipRepository.updateTier(id, data);
};

export const archiveTier = async (id: string, userId: string) => {
  const tier = await MembershipRepository.findTierById(id);
  if (!tier) throw new NotFoundError('Membership tier not found');
  await assertCreatorOwner(tier.creatorId, userId);
  return MembershipRepository.archiveTier(id);
};

export const listMySubscriptions = async (userId: string) => {
  return MembershipRepository.findSubscriptionsByUserId(userId);
};

export const getSubscription = async (id: string, userId: string) => {
  const subscription = await MembershipRepository.findSubscriptionById(id);
  if (!subscription) throw new NotFoundError('Subscription not found');
  if (subscription.userId !== userId && !(await isCreatorOwner(subscription.creatorId, userId))) {
    throw new ForbiddenError('Subscription is not visible to this user');
  }
  return subscription;
};

export const cancelSubscription = async (id: string, userId: string) => {
  const subscription = await MembershipRepository.findSubscriptionById(id);
  if (!subscription) throw new NotFoundError('Subscription not found');
  if (subscription.userId !== userId) {
    throw new ForbiddenError('Only the subscriber can cancel this subscription');
  }
  return MembershipRepository.cancelSubscriptionAtPeriodEnd(id);
};

export const listMyEntitlements = async (userId: string) => {
  return MembershipRepository.findEntitlementsByUserId(userId);
};

export const checkEntitlement = async (input: {
  userId?: string | null;
  creatorId: string;
  targetType?: string;
  targetId?: string | null;
  tierIds?: string[];
  ownerId?: string | null;
}): Promise<EntitlementCheckResult> => {
  const requiredTierIds = input.tierIds ?? [];
  if (input.userId && (await isCreatorOwner(input.creatorId, input.userId))) {
    return {
      allowed: true,
      reason: 'owner',
      requiredTierIds,
      matchedEntitlementId: null,
      expiresAt: null,
    };
  }
  if (!input.userId) {
    return {
      allowed: false,
      reason: 'unauthenticated',
      requiredTierIds,
      matchedEntitlementId: null,
      expiresAt: null,
    };
  }

  const activeTargetEntitlements = await MembershipRepository.findActiveEntitlements({
    userId: input.userId,
    creatorId: input.creatorId,
    targetType: input.targetType ?? 'creator',
    targetId: input.targetId ?? null,
  });
  if (activeTargetEntitlements.length > 0) {
    const entitlement = activeTargetEntitlements[0];
    return {
      allowed: true,
      reason: 'active_entitlement',
      requiredTierIds,
      matchedEntitlementId: entitlement.id,
      expiresAt: toIsoOrNull(entitlement.expiresAt),
    };
  }

  const tierEntitlements =
    requiredTierIds.length > 0
      ? await Promise.all(
          requiredTierIds.map((tierId) =>
            MembershipRepository.findActiveEntitlements({
              userId: input.userId as string,
              creatorId: input.creatorId,
              targetType: 'tier',
              targetId: tierId,
            })
          )
        )
      : [];
  const matchingTierEntitlement = tierEntitlements.flat()[0];
  if (matchingTierEntitlement) {
    return {
      allowed: true,
      reason: 'active_entitlement',
      requiredTierIds,
      matchedEntitlementId: matchingTierEntitlement.id,
      expiresAt: toIsoOrNull(matchingTierEntitlement.expiresAt),
    };
  }

  const activeSubscriptions = await MembershipRepository.findActiveSubscriptions({
    userId: input.userId,
    creatorId: input.creatorId,
    tierIds: requiredTierIds,
  });
  if (activeSubscriptions.length > 0) {
    return {
      allowed: true,
      reason: 'active_subscription',
      requiredTierIds,
      matchedEntitlementId: null,
      expiresAt: toIsoOrNull(activeSubscriptions[0].currentPeriodEnd),
    };
  }

  return {
    allowed: false,
    reason: requiredTierIds.length > 0 ? 'tier_required' : 'membership_required',
    requiredTierIds,
    matchedEntitlementId: null,
    expiresAt: null,
  };
};

export const grantComplimentaryMembership = async (
  data: GrantComplimentaryMembershipInput,
  grantedByUserId: string
) => {
  await assertCreatorOwner(data.creatorId, grantedByUserId);
  const tier = await MembershipRepository.findTierById(data.tierId);
  if (!tier) throw new NotFoundError('Membership tier not found');
  if (tier.creatorId !== data.creatorId) {
    throw new ValidationError('Tier must belong to the creator');
  }
  if (data.expiresAt && new Date(data.expiresAt).getTime() <= Date.now()) {
    throw new ValidationError('Complimentary membership expiration must be in the future');
  }
  return MembershipRepository.insertComplimentaryMembership(data, grantedByUserId);
};

export const revokeComplimentaryMembership = async (id: string) => {
  const grant = await MembershipRepository.revokeComplimentaryMembership(id);
  if (!grant) throw new NotFoundError('Complimentary membership not found');
  return grant;
};

export const listSupporters = async (creatorId: string, userId: string) => {
  await assertCreatorOwner(creatorId, userId);
  return MembershipRepository.listSupporters(creatorId);
};

export const saveSupporterNote = async (input: {
  creatorId: string;
  supporterUserId: string;
  note: string;
  createdByUserId: string;
}) => {
  await assertCreatorOwner(input.creatorId, input.createdByUserId);
  return MembershipRepository.upsertSupporterNote(input);
};
