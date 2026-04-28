import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findPublishedCreators: vi.fn(),
  findCreatorBySlug: vi.fn(),
  findCreatorById: vi.fn(),
  findCreatorByUserId: vi.fn(),
  insertCreatorProfile: vi.fn(),
  updateCreatorProfile: vi.fn(),
  replaceCreatorCategories: vi.fn(),
  replaceCreatorTags: vi.fn(),
  replaceCreatorLinks: vi.fn(),
  replaceCreatorPortfolio: vi.fn(),
  listCreatorCategoryKeys: vi.fn(),
  listCreatorTags: vi.fn(),
  listCreatorLinks: vi.fn(),
  listPortfolioItems: vi.fn(),
  listProfileSections: vi.fn(),
  insertFollow: vi.fn(),
  deleteFollow: vi.fn(),
  countFollowers: vi.fn(),
  isFollowingCreator: vi.fn(),
}));

vi.mock('../api/modules/creators/creators.repository', () => mocks);

const service = await import('../api/modules/creators/creators.service');

const creatorRow = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  userId: '550e8400-e29b-41d4-a716-446655440001',
  slug: 'jane-creator',
  displayName: 'Jane',
  tagline: 'Fantasy art',
  bio: null,
  avatarMediaId: null,
  bannerMediaId: null,
  publicLocationLabel: null,
  primaryLanguage: 'en',
  translationContributionsEnabled: false,
  commissionEnabled: true,
  status: 'draft',
  reviewStatus: 'pending',
  reviewNote: null,
  publishedAt: null,
  createdAt: '2026-04-28T00:00:00.000Z',
  updatedAt: '2026-04-28T00:00:00.000Z',
};

const setupProfileDetails = () => {
  mocks.listCreatorCategoryKeys.mockResolvedValue(['illustration']);
  mocks.listCreatorTags.mockResolvedValue(['fantasy']);
  mocks.listCreatorLinks.mockResolvedValue([]);
  mocks.listPortfolioItems.mockResolvedValue([]);
  mocks.listProfileSections.mockResolvedValue([]);
  mocks.countFollowers.mockResolvedValue(0);
  mocks.isFollowingCreator.mockResolvedValue(false);
};

describe('creators.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupProfileDetails();
  });

  it('rejects reserved slugs before inserting a creator profile', async () => {
    await expect(
      service.createCreatorProfile({ slug: 'admin', displayName: 'Admin' }, creatorRow.userId)
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });

    expect(mocks.insertCreatorProfile).not.toHaveBeenCalled();
  });

  it('creates a dashboard profile for a user with no existing profile', async () => {
    mocks.findCreatorByUserId.mockResolvedValue(null);
    mocks.findCreatorBySlug.mockResolvedValue(null);
    mocks.insertCreatorProfile.mockResolvedValue(creatorRow);

    const profile = await service.createCreatorProfile(
      { slug: 'jane-creator', displayName: 'Jane' },
      creatorRow.userId
    );

    expect(profile.userId).toBe(creatorRow.userId);
    expect(profile.reviewStatus).toBe('pending');
    expect(mocks.insertCreatorProfile).toHaveBeenCalledWith(
      { slug: 'jane-creator', displayName: 'Jane' },
      creatorRow.userId
    );
  });

  it('hides non-approved public creator profiles', async () => {
    mocks.findCreatorBySlug.mockResolvedValue({
      ...creatorRow,
      status: 'published',
      reviewStatus: 'pending',
    });

    await expect(service.getCreatorBySlug('jane-creator')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('normalizes tags and replaces profile categories during update', async () => {
    mocks.findCreatorByUserId.mockResolvedValue(creatorRow);
    mocks.updateCreatorProfile.mockResolvedValue({ ...creatorRow, displayName: 'Jane Updated' });
    mocks.findCreatorById.mockResolvedValue({ ...creatorRow, displayName: 'Jane Updated' });

    await service.updateMyCreatorProfile(
      {
        displayName: 'Jane Updated',
        categories: ['illustration', 'novel'],
        tags: [' Fantasy ', 'fantasy', 'Sci Fi'],
      },
      creatorRow.userId
    );

    expect(mocks.updateCreatorProfile).toHaveBeenCalledWith(creatorRow.id, {
      displayName: 'Jane Updated',
    });
    expect(mocks.replaceCreatorCategories).toHaveBeenCalledWith(creatorRow.id, [
      'illustration',
      'novel',
    ]);
    expect(mocks.replaceCreatorTags).toHaveBeenCalledWith(creatorRow.id, ['Fantasy', 'Sci Fi']);
  });

  it('rejects following your own creator profile', async () => {
    mocks.findCreatorById.mockResolvedValue({
      ...creatorRow,
      status: 'published',
      reviewStatus: 'approved',
    });

    await expect(service.followCreator(creatorRow.id, creatorRow.userId)).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
    expect(mocks.insertFollow).not.toHaveBeenCalled();
  });
});
