import type {
  CreateCreatorProfileInput,
  DashboardCreatorProfile,
  PublicCreatorProfile,
  ReplaceCreatorLinksInput,
  ReplaceCreatorPortfolioInput,
  UpdateCreatorProfileInput,
} from '../../../shared/schemas/creators.schema';
import { NotFoundError, ValidationError } from '../../lib/errors';
import type {
  CreatorLinkRow,
  CreatorPortfolioItemRow,
  CreatorProfileRow,
  CreatorProfileSectionRow,
} from './creators.repository';
import * as CreatorsRepository from './creators.repository';

const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'auth',
  'bbs',
  'creator',
  'creators',
  'dashboard',
  'help',
  'login',
  'logout',
  'me',
  'media',
  'new',
  'settings',
  'support',
  'users',
]);

const normalizeTags = (tags: string[] = []) => {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const tag of tags) {
    const label = tag.trim().replace(/\s+/g, ' ');
    const key = label.toLowerCase();
    if (!label || seen.has(key)) continue;
    seen.add(key);
    normalized.push(label);
  }
  return normalized;
};

const assertPublicCreator = (profile: CreatorProfileRow) => {
  if (profile.status !== 'published' || profile.reviewStatus !== 'approved') {
    throw new NotFoundError('Creator not found');
  }
};

const mapLinks = (links: CreatorLinkRow[]) =>
  links.map((link) => ({
    ...link,
    kind: link.kind as PublicCreatorProfile['links'][number]['kind'],
  }));

const mapPortfolioItems = (items: CreatorPortfolioItemRow[]) =>
  items.map((item) => ({
    ...item,
    completedAt: item.completedAt,
  }));

const mapSections = (sections: CreatorProfileSectionRow[]) =>
  sections.map((section) => ({
    ...section,
  }));

const buildProfile = async (
  profile: CreatorProfileRow,
  options: { viewerUserId?: string; publicOnly?: boolean } = {}
) => {
  const [categories, tags, links, portfolioItems, profileSections, followerCount, isFollowing] =
    await Promise.all([
      CreatorsRepository.listCreatorCategoryKeys(profile.id),
      CreatorsRepository.listCreatorTags(profile.id),
      CreatorsRepository.listCreatorLinks(profile.id),
      CreatorsRepository.listPortfolioItems(profile.id, options.publicOnly),
      CreatorsRepository.listProfileSections(profile.id, options.publicOnly),
      CreatorsRepository.countFollowers(profile.id),
      options.viewerUserId
        ? CreatorsRepository.isFollowingCreator(profile.id, options.viewerUserId)
        : Promise.resolve(undefined),
    ]);

  return {
    id: profile.id,
    slug: profile.slug,
    displayName: profile.displayName,
    tagline: profile.tagline,
    bio: profile.bio,
    avatarMediaId: profile.avatarMediaId,
    bannerMediaId: profile.bannerMediaId,
    publicLocationLabel: profile.publicLocationLabel,
    primaryLanguage: profile.primaryLanguage,
    translationContributionsEnabled: profile.translationContributionsEnabled,
    commissionEnabled: profile.commissionEnabled,
    categories,
    tags,
    links: mapLinks(links),
    portfolioItems: mapPortfolioItems(portfolioItems),
    profileSections: mapSections(profileSections),
    followerCount,
    ...(isFollowing === undefined ? {} : { isFollowing }),
  } satisfies PublicCreatorProfile;
};

const buildDashboardProfile = async (profile: CreatorProfileRow) => {
  const publicProfile = await buildProfile(profile, { publicOnly: false });
  return {
    ...publicProfile,
    userId: profile.userId,
    status: profile.status,
    reviewStatus: profile.reviewStatus,
    reviewNote: profile.reviewNote,
    publishedAt: profile.publishedAt,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  } satisfies DashboardCreatorProfile;
};

export const listCreators = async (limit: number, viewerUserId?: string) => {
  const creators = await CreatorsRepository.findPublishedCreators(limit);
  const approvedCreators = creators.filter((creator) => creator.reviewStatus === 'approved');
  return Promise.all(
    approvedCreators.map((creator) => buildProfile(creator, { viewerUserId, publicOnly: true }))
  );
};

export const getCreatorBySlug = async (slug: string, viewerUserId?: string) => {
  const creator = await CreatorsRepository.findCreatorBySlug(slug);
  if (!creator) throw new NotFoundError('Creator not found');
  assertPublicCreator(creator);
  return buildProfile(creator, { viewerUserId, publicOnly: true });
};

export const getMyCreatorProfile = async (userId: string) => {
  const creator = await CreatorsRepository.findCreatorByUserId(userId);
  if (!creator) throw new NotFoundError('Creator profile not found');
  return buildDashboardProfile(creator);
};

export const createCreatorProfile = async (input: CreateCreatorProfileInput, userId: string) => {
  if (RESERVED_SLUGS.has(input.slug)) {
    throw new ValidationError('Slug is reserved');
  }

  const [existingForUser, existingForSlug] = await Promise.all([
    CreatorsRepository.findCreatorByUserId(userId),
    CreatorsRepository.findCreatorBySlug(input.slug),
  ]);
  if (existingForUser) {
    throw new ValidationError('User already has a creator profile');
  }
  if (existingForSlug) {
    throw new ValidationError('Slug is already taken');
  }

  const creator = await CreatorsRepository.insertCreatorProfile(input, userId);
  if (!creator) throw new ValidationError('Creator profile could not be created');
  return buildDashboardProfile(creator);
};

export const updateMyCreatorProfile = async (input: UpdateCreatorProfileInput, userId: string) => {
  const creator = await CreatorsRepository.findCreatorByUserId(userId);
  if (!creator) throw new NotFoundError('Creator profile not found');

  const tags = input.tags ? normalizeTags(input.tags) : undefined;
  const patch = { ...input };
  delete patch.categories;
  delete patch.tags;

  const updated = await CreatorsRepository.updateCreatorProfile(creator.id, patch);
  if (!updated) throw new NotFoundError('Creator profile not found');

  if (input.categories) {
    await CreatorsRepository.replaceCreatorCategories(creator.id, input.categories);
  }
  if (tags) {
    await CreatorsRepository.replaceCreatorTags(creator.id, tags);
  }

  const refreshed = await CreatorsRepository.findCreatorById(creator.id);
  if (!refreshed) throw new NotFoundError('Creator profile not found');
  return buildDashboardProfile(refreshed);
};

export const publishMyCreatorProfile = async (userId: string) => {
  const creator = await CreatorsRepository.findCreatorByUserId(userId);
  if (!creator) throw new NotFoundError('Creator profile not found');

  if (!creator.tagline && !creator.bio) {
    throw new ValidationError('Creator profile needs a tagline or bio before publishing');
  }

  const updated = await CreatorsRepository.updateCreatorProfile(creator.id, {
    status: 'published',
    reviewStatus: creator.reviewStatus === 'rejected' ? 'pending' : creator.reviewStatus,
    publishedAt: new Date().toISOString(),
    reviewNote: null,
  });
  if (!updated) throw new NotFoundError('Creator profile not found');
  return buildDashboardProfile(updated);
};

export const replaceMyCreatorLinks = async (input: ReplaceCreatorLinksInput, userId: string) => {
  const creator = await CreatorsRepository.findCreatorByUserId(userId);
  if (!creator) throw new NotFoundError('Creator profile not found');
  await CreatorsRepository.replaceCreatorLinks(creator.id, input);
  const refreshed = await CreatorsRepository.findCreatorById(creator.id);
  if (!refreshed) throw new NotFoundError('Creator profile not found');
  return buildDashboardProfile(refreshed);
};

export const replaceMyCreatorPortfolio = async (
  input: ReplaceCreatorPortfolioInput,
  userId: string
) => {
  const creator = await CreatorsRepository.findCreatorByUserId(userId);
  if (!creator) throw new NotFoundError('Creator profile not found');
  await CreatorsRepository.replaceCreatorPortfolio(creator.id, input);
  const refreshed = await CreatorsRepository.findCreatorById(creator.id);
  if (!refreshed) throw new NotFoundError('Creator profile not found');
  return buildDashboardProfile(refreshed);
};

export const followCreator = async (creatorId: string, userId: string) => {
  const creator = await CreatorsRepository.findCreatorById(creatorId);
  if (!creator) throw new NotFoundError('Creator not found');
  assertPublicCreator(creator);
  if (creator.userId === userId) {
    throw new ValidationError('Users cannot follow their own creator profile');
  }
  await CreatorsRepository.insertFollow(creatorId, userId);
};

export const unfollowCreator = async (creatorId: string, userId: string) => {
  const creator = await CreatorsRepository.findCreatorById(creatorId);
  if (!creator) throw new NotFoundError('Creator not found');
  await CreatorsRepository.deleteFollow(creatorId, userId);
};
