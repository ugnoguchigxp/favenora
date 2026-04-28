import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryMocks = vi.hoisted(() => ({
  findActiveEntitlements: vi.fn(),
  findActiveSubscriptions: vi.fn(),
}));

vi.mock('../api/modules/memberships/memberships.repository', () => repositoryMocks);
vi.mock('../api/modules/creators/creators.repository', () => ({
  findCreatorById: vi.fn(async (creatorId: string) =>
    creatorId === 'creator-id' ? { id: creatorId, userId: 'creator-id' } : null
  ),
}));

import { checkEntitlement } from '../api/modules/memberships/memberships.service';

describe('memberships service entitlement checks', () => {
  beforeEach(() => {
    repositoryMocks.findActiveEntitlements.mockReset();
    repositoryMocks.findActiveSubscriptions.mockReset();
  });

  it('allows creators to view their own locked content', async () => {
    const result = await checkEntitlement({
      userId: 'creator-id',
      creatorId: 'creator-id',
      ownerId: 'creator-id',
      tierIds: ['tier-id'],
    });

    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('owner');
    expect(repositoryMocks.findActiveEntitlements).not.toHaveBeenCalled();
  });

  it('returns tier_required when the viewer has no matching entitlement or subscription', async () => {
    repositoryMocks.findActiveEntitlements.mockResolvedValue([]);
    repositoryMocks.findActiveSubscriptions.mockResolvedValue([]);

    const result = await checkEntitlement({
      userId: 'fan-id',
      creatorId: 'creator-id',
      targetType: 'post',
      targetId: 'post-id',
      tierIds: ['tier-id'],
    });

    expect(result).toMatchObject({
      allowed: false,
      reason: 'tier_required',
      requiredTierIds: ['tier-id'],
    });
  });

  it('allows active tier entitlements before falling back to subscriptions', async () => {
    repositoryMocks.findActiveEntitlements.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: 'entitlement-id',
        expiresAt: new Date('2026-05-01T00:00:00.000Z'),
      },
    ]);

    const result = await checkEntitlement({
      userId: 'fan-id',
      creatorId: 'creator-id',
      targetType: 'post',
      targetId: 'post-id',
      tierIds: ['tier-id'],
    });

    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('active_entitlement');
    expect(result.matchedEntitlementId).toBe('entitlement-id');
    expect(repositoryMocks.findActiveSubscriptions).not.toHaveBeenCalled();
  });
});
