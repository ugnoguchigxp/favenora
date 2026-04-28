import type {
  CreatePostCommentInput,
  CreatePostDraftInput,
  PublishPostInput,
  SchedulePostInput,
  UpdatePostDraftInput,
} from '../../../shared/schemas/posts.schema';
import { ForbiddenError, NotFoundError, ValidationError } from '../../lib/errors';
import * as CreatorsRepository from '../creators/creators.repository';
import * as MembershipService from '../memberships/memberships.service';
import * as PostsRepository from './posts.repository';

const isVisiblePublishedPost = (post: { status: string; scheduledAt: Date | null }) => {
  if (post.status === 'published') return true;
  if (post.status !== 'scheduled' || !post.scheduledAt) return false;
  return post.scheduledAt.getTime() <= Date.now();
};

const requiredTierIds = (accessRules: Array<{ ruleType: string; tierId: string | null }>) =>
  accessRules
    .filter((rule) => rule.ruleType === 'tier' && rule.tierId)
    .map((rule) => rule.tierId as string);

const isCreatorOwner = async (creatorId: string, userId?: string | null) => {
  if (!userId) return false;
  const creator = await CreatorsRepository.findCreatorById(creatorId);
  return creator?.userId === userId;
};

const assertCreatorOwner = async (creatorId: string, userId: string) => {
  if (!(await isCreatorOwner(creatorId, userId))) {
    throw new ForbiddenError('Only the creator owner can manage this post');
  }
};

export const listPosts = async (input: { creatorId?: string; viewerId?: string | null }) => {
  return PostsRepository.findPosts({
    creatorId: input.creatorId,
    includeDrafts: input.creatorId ? await isCreatorOwner(input.creatorId, input.viewerId) : false,
  });
};

export const getPost = async (id: string, viewerId?: string | null) => {
  const post = await PostsRepository.findPostById(id);
  if (!post) throw new NotFoundError('Post not found');
  const isOwner = await isCreatorOwner(post.creatorId, viewerId);
  if (!isOwner && !isVisiblePublishedPost(post)) {
    throw new NotFoundError('Post not found');
  }
  return post;
};

export const createDraft = async (data: CreatePostDraftInput, editorId: string) => {
  await assertCreatorOwner(data.creatorId, editorId);
  if (data.accessType === 'tiers' && !data.accessRules.some((rule) => rule.ruleType === 'tier')) {
    throw new ValidationError('Tier-only posts require at least one tier access rule');
  }
  return PostsRepository.insertPostDraft(data, data.creatorId);
};

export const updateDraft = async (id: string, data: UpdatePostDraftInput, editorId: string) => {
  const post = await PostsRepository.findPostById(id);
  if (!post) throw new NotFoundError('Post not found');
  await assertCreatorOwner(post.creatorId, editorId);
  if (post.status === 'removed') throw new ValidationError('Removed posts cannot be updated');
  const updated = await PostsRepository.updatePostDraft(id, data);
  if (!updated) throw new NotFoundError('Post not found');
  return updated;
};

export const archivePost = async (id: string, editorId: string) => {
  const post = await PostsRepository.findPostById(id);
  if (!post) throw new NotFoundError('Post not found');
  await assertCreatorOwner(post.creatorId, editorId);
  return PostsRepository.deletePost(id);
};

export const publishPost = async (id: string, data: PublishPostInput, editorId: string) => {
  const post = await PostsRepository.findPostById(id);
  if (!post) throw new NotFoundError('Post not found');
  await assertCreatorOwner(post.creatorId, editorId);
  if (post.status === 'removed') throw new ValidationError('Removed posts cannot be published');
  return PostsRepository.publishPost(
    id,
    data.publishedAt ? new Date(data.publishedAt) : new Date()
  );
};

export const schedulePost = async (id: string, data: SchedulePostInput, editorId: string) => {
  const post = await PostsRepository.findPostById(id);
  if (!post) throw new NotFoundError('Post not found');
  await assertCreatorOwner(post.creatorId, editorId);
  const scheduledAt = new Date(data.scheduledAt);
  if (scheduledAt.getTime() <= Date.now()) {
    throw new ValidationError('Scheduled publish time must be in the future');
  }
  return PostsRepository.schedulePost(id, scheduledAt);
};

export const getViewer = async (
  id: string,
  viewerId?: string | null,
  allowAgeRestricted = false
) => {
  const detail = await PostsRepository.findPostDetailById(id);
  if (!detail) return { kind: 'unavailable' as const, reason: 'not_found' as const };
  const { post, blocks, accessRules, tags, comments } = detail;

  const isOwner = await isCreatorOwner(post.creatorId, viewerId);
  if (!isOwner && post.status === 'draft') {
    return { kind: 'unavailable' as const, reason: 'draft' as const };
  }
  if (!isOwner && post.status === 'scheduled' && !isVisiblePublishedPost(post)) {
    return { kind: 'unavailable' as const, reason: 'scheduled' as const };
  }
  if (!isOwner && post.status === 'archived') {
    return { kind: 'unavailable' as const, reason: 'archived' as const };
  }
  if (!isOwner && post.status === 'removed') {
    return { kind: 'unavailable' as const, reason: 'removed' as const };
  }

  if (!isOwner && post.ageRating !== 'all_ages' && !allowAgeRestricted) {
    return { kind: 'age_gated' as const, post };
  }

  if (isOwner || post.accessType === 'public') {
    return { kind: 'unlocked' as const, post, blocks, tags, comments };
  }

  if (post.accessType === 'authenticated') {
    if (viewerId) {
      return { kind: 'unlocked' as const, post, blocks, tags, comments };
    }
    return {
      kind: 'locked' as const,
      post,
      previewBlocks: blocks.filter((block) => block.visibility === 'preview'),
      requiredTierIds: [],
      access: {
        allowed: false,
        reason: 'unauthenticated' as const,
        requiredTierIds: [],
        matchedEntitlementId: null,
        expiresAt: null,
      },
    };
  }

  if (post.accessType === 'followers') {
    const isFollowing = viewerId
      ? await CreatorsRepository.isFollowingCreator(post.creatorId, viewerId)
      : false;
    if (isFollowing) {
      return { kind: 'unlocked' as const, post, blocks, tags, comments };
    }
    return {
      kind: 'locked' as const,
      post,
      previewBlocks: blocks.filter((block) => block.visibility === 'preview'),
      requiredTierIds: [],
      access: {
        allowed: false,
        reason: viewerId ? ('membership_required' as const) : ('unauthenticated' as const),
        requiredTierIds: [],
        matchedEntitlementId: null,
        expiresAt: null,
      },
    };
  }

  if (post.accessType === 'creator_only') {
    return {
      kind: 'locked' as const,
      post,
      previewBlocks: blocks.filter((block) => block.visibility === 'preview'),
      requiredTierIds: [],
      access: {
        allowed: false,
        reason: 'membership_required' as const,
        requiredTierIds: [],
        matchedEntitlementId: null,
        expiresAt: null,
      },
    };
  }

  const tierIds = requiredTierIds(accessRules);
  const access = await MembershipService.checkEntitlement({
    userId: viewerId,
    creatorId: post.creatorId,
    targetType: 'post',
    targetId: post.id,
    tierIds,
    ownerId: post.creatorId,
  });

  if (access.allowed) {
    return { kind: 'unlocked' as const, post, blocks, tags, comments, access };
  }

  return {
    kind: 'locked' as const,
    post,
    access,
    previewBlocks: blocks.filter((block) => block.visibility === 'preview'),
    requiredTierIds: tierIds,
  };
};

export const createComment = async (
  postId: string,
  data: CreatePostCommentInput,
  authorId: string
) => {
  const viewer = await getViewer(postId, authorId, true);
  if (viewer.kind !== 'unlocked') {
    throw new ForbiddenError('Post is not available for comments');
  }
  if (data.parentId) {
    const parent = await PostsRepository.findPostCommentById(data.parentId);
    if (!parent) throw new NotFoundError('Parent comment not found');
    if (parent.postId !== postId) {
      throw new ValidationError('Parent comment must belong to the same post');
    }
  }
  return PostsRepository.insertPostComment(postId, data, authorId);
};
