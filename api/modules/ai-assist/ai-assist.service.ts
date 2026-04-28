import { createHash } from 'node:crypto';
import type { CreateTranslationDraftInput } from '../../../shared/schemas/ai-assist.schema';
import { ForbiddenError, NotFoundError, ValidationError } from '../../lib/errors';
import * as ContentSafetyService from '../content-safety/content-safety.service';
import * as FansubsRepository from '../fansubs/fansubs.repository';
import * as MembershipService from '../memberships/memberships.service';
import * as PostsRepository from '../posts/posts.repository';
import * as Repository from './ai-assist.repository';

const providerName = 'mock-open';
const providerModel = 'mock-translate-v1';
const promptVersion = 'v1';

const hash = (text: string) => createHash('sha256').update(text).digest('hex');
const translateText = (text: string, targetLanguage: string) => `[${targetLanguage}] ${text}`;

const assertTargetAccessible = async (
  targetType: string,
  targetId: string | undefined,
  userId: string
) => {
  if (!targetId) return;
  let postId: string | undefined;
  if (targetType === 'post_block') postId = targetId;
  if (targetType === 'comment') {
    const comment = await PostsRepository.findPostCommentById(targetId);
    postId = comment?.postId;
  }
  if (targetType === 'subtitle_track' || targetType === 'translation_annotation') {
    const track = await FansubsRepository.findTrackById(targetId);
    postId = track?.postId;
  }
  if (!postId) return;
  const post = await PostsRepository.findPostById(postId);
  if (!post) return;
  const access = await MembershipService.checkEntitlement({
    userId,
    creatorId: post.creatorId,
    targetType: 'post',
    targetId: post.id,
    tierIds: [],
    ownerId: post.creatorId,
  });
  if (!access.allowed) throw new ForbiddenError('Target content is not accessible');
};

export const createTranslationDraft = async (
  input: CreateTranslationDraftInput,
  userId: string
) => {
  await assertTargetAccessible(input.targetType, input.targetId, userId);
  const translated = input.segments.map((segment) => ({
    sourceTextHash: hash(segment.sourceText),
    sourceTextPreview: segment.sourceText.slice(0, 500),
    translatedText: translateText(segment.sourceText, input.targetLanguage),
    startMs: segment.startMs,
    endMs: segment.endMs,
    anchorData: segment.anchorData,
    sortOrder: segment.sortOrder,
  }));
  const safety = await ContentSafetyService.checkText({
    targetType: 'ai_draft',
    targetId: input.targetId,
    actorId: userId,
    source: 'ai-assist.draft',
    text: translated.map((segment) => segment.translatedText).join('\n'),
  });
  const status =
    safety.decision === 'block' ? 'blocked' : safety.decision === 'hold' ? 'hold' : 'generated';
  const draft = await Repository.createDraftWithSegments({
    targetType: input.targetType,
    targetId: input.targetId,
    userId,
    creatorId: input.creatorId,
    provider: providerName,
    model: providerModel,
    sourceLanguage: input.sourceLanguage,
    targetLanguage: input.targetLanguage,
    promptVersion,
    status,
    safetyDecision: safety.decision,
    segments: translated,
  });
  await Repository.recordUsage({
    userId,
    creatorId: input.creatorId,
    targetType: input.targetType,
    provider: providerName,
    model: providerModel,
    inputTokens: input.segments.length * 64,
    outputTokens: input.segments.length * 72,
    estimatedCost: input.segments.length,
  });
  return draft;
};

export const getTranslationDraft = async (id: string, userId: string) => {
  const detail = await Repository.findDraftById(id);
  if (!detail) throw new NotFoundError('Translation draft not found');
  if (detail.draft.userId !== userId) throw new ForbiddenError('Draft is not accessible');
  return detail;
};

export const applyTranslationDraft = async (
  id: string,
  trackId: string | undefined,
  userId: string
) => {
  const detail = await getTranslationDraft(id, userId);
  if (detail.draft.status === 'blocked' || detail.draft.status === 'hold') {
    throw new ValidationError('Draft cannot be applied until safety review passes');
  }
  const targetTrackId = trackId ?? detail.draft.targetId ?? undefined;
  if (!targetTrackId) throw new ValidationError('trackId is required');
  const track = await FansubsRepository.findTrackById(targetTrackId);
  if (!track) throw new NotFoundError('Translation track not found');
  if (track.authorId !== userId) throw new ForbiddenError('Only track author can apply draft');

  if (detail.draft.targetType === 'subtitle_track') {
    await FansubsRepository.replaceCues(
      targetTrackId,
      detail.segments.map((segment, index) => ({
        startMs: segment.startMs ?? index * 2000,
        endMs: segment.endMs ?? index * 2000 + 1800,
        text: segment.translatedText,
        sortOrder: segment.sortOrder,
      }))
    );
  } else if (detail.draft.targetType === 'translation_annotation') {
    await FansubsRepository.replaceAnnotations(
      targetTrackId,
      detail.segments.map((segment) => ({
        anchorType: 'whole_work',
        anchorData: (segment.anchorData ?? {}) as Record<string, unknown>,
        translatedText: segment.translatedText,
        status: 'active',
      }))
    );
  } else {
    throw new ValidationError('Draft target does not support apply operation');
  }
  await Repository.updateDraftStatus(id, 'applied');
  return { applied: true, draftId: id };
};

export const translateComment = async (
  input: {
    sourceText: string;
    sourceLanguage: string;
    targetLanguage: string;
    targetType: string;
    targetId?: string;
  },
  userId: string
) => {
  await assertTargetAccessible(input.targetType, input.targetId, userId);
  const sourceHash = hash(input.sourceText);
  const cached = await Repository.findTranslationCache({
    targetType: input.targetType,
    targetId: input.targetId,
    sourceHash,
    targetLanguage: input.targetLanguage,
  });
  if (cached && (!cached.expiresAt || cached.expiresAt.getTime() > Date.now())) return cached;

  const translatedText = translateText(input.sourceText, input.targetLanguage);
  const safety = await ContentSafetyService.checkText({
    targetType: 'post_comment',
    targetId: input.targetId,
    actorId: userId,
    source: 'ai-assist.comment_translation',
    text: translatedText,
  });
  if (safety.decision === 'block') throw new ValidationError('Generated translation was blocked');
  const cache = await Repository.upsertTranslationCache({
    targetType: input.targetType,
    targetId: input.targetId,
    sourceHash,
    sourceLanguage: input.sourceLanguage,
    targetLanguage: input.targetLanguage,
    translatedText,
    provider: providerName,
    model: providerModel,
    safetyDecision: safety.decision,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
  await Repository.recordUsage({
    userId,
    targetType: input.targetType,
    provider: providerName,
    model: providerModel,
    inputTokens: 64,
    outputTokens: 72,
    estimatedCost: 1,
  });
  return cache;
};

export const createGlossaryTerm = async (
  input: {
    creatorId?: string;
    postId?: string;
    seriesId?: string;
    sourceText: string;
    targetText: string;
    sourceLanguage: string;
    targetLanguage: string;
    note?: string;
  },
  userId: string
) => Repository.createGlossaryTerm({ ...input, createdByUserId: userId });

export const listGlossaryTerms = async (creatorId?: string) =>
  Repository.listGlossaryTerms(creatorId);
export const listProviders = async () => Repository.listProviderConfigs();
export const listUsage = async (userId: string) => Repository.listUsageByUser(userId);
