import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('../api/db/client', () => ({
  db: {
    execute: mocks.execute,
    transaction: mocks.transaction,
  },
}));

const repository = await import('../api/modules/creators/creators.repository');

describe('creators.repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps raw creator profile rows when finding by slug', async () => {
    mocks.execute.mockResolvedValue([
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: '550e8400-e29b-41d4-a716-446655440001',
        slug: 'jane-creator',
        displayName: 'Jane',
        tagline: null,
        bio: 'Bio',
        avatarMediaId: null,
        bannerMediaId: null,
        publicLocationLabel: 'Online',
        primaryLanguage: 'en',
        translationContributionsEnabled: true,
        commissionEnabled: false,
        status: 'published',
        reviewStatus: 'approved',
        reviewNote: null,
        publishedAt: new Date('2026-04-28T00:00:00.000Z'),
        createdAt: new Date('2026-04-27T00:00:00.000Z'),
        updatedAt: new Date('2026-04-28T00:00:00.000Z'),
      },
    ]);

    const creator = await repository.findCreatorBySlug('jane-creator');

    expect(creator).toMatchObject({
      slug: 'jane-creator',
      displayName: 'Jane',
      status: 'published',
      reviewStatus: 'approved',
      publishedAt: '2026-04-28T00:00:00.000Z',
    });
  });

  it('returns null when a creator is not found', async () => {
    mocks.execute.mockResolvedValue([]);

    await expect(repository.findCreatorBySlug('missing')).resolves.toBeNull();
  });
});
