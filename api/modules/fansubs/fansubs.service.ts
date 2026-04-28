import type {
  CreateFanTranslationTrackInput,
  UpdateFanTranslationTrackInput,
} from '../../../shared/schemas/fansubs.schema';
import { ForbiddenError, NotFoundError, ValidationError } from '../../lib/errors';
import * as ContentSafetyService from '../content-safety/content-safety.service';
import * as CreatorsRepository from '../creators/creators.repository';
import * as PostsRepository from '../posts/posts.repository';
import * as PostsService from '../posts/posts.service';
import * as Repository from './fansubs.repository';

const requireTrack = async (trackId: string) => {
  const track = await Repository.findTrackById(trackId);
  if (!track) throw new NotFoundError('Translation track not found');
  return track;
};

const assertTrackAuthor = (track: { authorId: string }, userId: string) => {
  if (track.authorId !== userId) throw new ForbiddenError('Only track author can edit translation');
};

const assertTrackReadable = async (
  track: { postId: string; authorId: string; status: string },
  viewerId?: string
) => {
  if (track.authorId === viewerId) return;
  const viewer = await PostsService.getViewer(track.postId, viewerId, true);
  if (viewer.kind !== 'unlocked') throw new NotFoundError('Translation track not found');
  if (track.status !== 'published') throw new NotFoundError('Translation track not found');
};

export const listPostTranslations = async (postId: string, viewerId?: string) => {
  const viewer = await PostsService.getViewer(postId, viewerId, true);
  if (viewer.kind !== 'unlocked') return [];
  const tracks = await Repository.listTracksByPostId(postId);
  return tracks.filter((track) => track.status === 'published' || track.authorId === viewerId);
};

export const createTrack = async (
  postId: string,
  input: CreateFanTranslationTrackInput,
  authorId: string
) => {
  const viewer = await PostsService.getViewer(postId, authorId, true);
  if (viewer.kind !== 'unlocked') throw new ForbiddenError('Post is not accessible');
  const safety = await ContentSafetyService.checkText({
    targetType: 'translation_note',
    targetId: postId,
    actorId: authorId,
    source: 'fansubs.track_title',
    text: input.title,
  });
  const status =
    safety.decision === 'hold'
      ? 'submitted'
      : safety.decision === 'block'
        ? 'needs_revision'
        : 'draft';
  return Repository.createTrack({ postId, authorId, ...input, status });
};

export const getTrack = async (trackId: string, viewerId?: string) => {
  const track = await requireTrack(trackId);
  await assertTrackReadable(track, viewerId);
  return track;
};

export const updateTrack = async (
  trackId: string,
  input: UpdateFanTranslationTrackInput,
  userId: string
) => {
  const track = await requireTrack(trackId);
  assertTrackAuthor(track, userId);
  const updated = await Repository.updateTrack(trackId, input);
  if (!updated) throw new NotFoundError('Translation track not found');
  return updated;
};

export const listCues = async (trackId: string, viewerId?: string) => {
  const track = await requireTrack(trackId);
  await assertTrackReadable(track, viewerId);
  return Repository.listCues(trackId);
};

export const replaceCues = async (
  trackId: string,
  cues: Array<{ startMs: number; endMs: number; text: string; sortOrder: number }>,
  userId: string
) => {
  const track = await requireTrack(trackId);
  assertTrackAuthor(track, userId);
  for (const cue of cues) {
    if (cue.endMs <= cue.startMs)
      throw new ValidationError('Subtitle cue endMs must be greater than startMs');
    const safety = await ContentSafetyService.checkText({
      targetType: 'subtitle_cue',
      targetId: trackId,
      actorId: userId,
      source: 'fansubs.cue',
      text: cue.text,
    });
    if (safety.decision === 'block')
      throw new ValidationError('Subtitle cue blocked by content safety');
  }
  return Repository.replaceCues(trackId, cues);
};

export const listAnnotations = async (trackId: string, viewerId?: string) => {
  const track = await requireTrack(trackId);
  await assertTrackReadable(track, viewerId);
  return Repository.listAnnotations(trackId);
};

export const replaceAnnotations = async (
  trackId: string,
  annotations: Array<{
    anchorType: string;
    anchorData: Record<string, unknown>;
    originalText?: string;
    translatedText: string;
    note?: string;
    status: string;
  }>,
  userId: string
) => {
  const track = await requireTrack(trackId);
  assertTrackAuthor(track, userId);
  for (const annotation of annotations) {
    const safety = await ContentSafetyService.checkText({
      targetType: 'translation_annotation',
      targetId: trackId,
      actorId: userId,
      source: 'fansubs.annotation',
      text: [annotation.originalText, annotation.translatedText, annotation.note]
        .filter(Boolean)
        .join('\n'),
    });
    if (safety.decision === 'block')
      throw new ValidationError('Annotation blocked by content safety');
  }
  return Repository.replaceAnnotations(trackId, annotations);
};

export const voteTrack = async (
  trackId: string,
  userId: string,
  value: string,
  reason?: string
) => {
  await requireTrack(trackId);
  return Repository.upsertVote(trackId, userId, value, reason);
};

export const reportTrack = async (trackId: string, userId: string, reason: string) => {
  await requireTrack(trackId);
  return Repository.createReport(trackId, userId, reason);
};

export const approveTrack = async (
  trackId: string,
  approvalState: string,
  note: string | undefined,
  userId: string
) => {
  const track = await requireTrack(trackId);
  const post = await PostsRepository.findPostById(track.postId);
  if (!post) throw new NotFoundError('Post not found');
  const creator = await CreatorsRepository.findCreatorById(post.creatorId);
  if (!creator || creator.userId !== userId) {
    throw new ForbiddenError('Only creator owner can approve translation tracks');
  }
  await Repository.upsertCreatorApproval(trackId, post.creatorId, approvalState, note);
  const status = approvalState === 'creator_rejected' ? 'needs_revision' : 'published';
  return Repository.updateTrack(trackId, { approvalState, status });
};

export const exportTrackAsVtt = async (trackId: string, viewerId?: string) => {
  const track = await requireTrack(trackId);
  await assertTrackReadable(track, viewerId);
  const cues = await Repository.listCues(trackId);
  const asTime = (ms: number) => {
    const total = Math.max(0, ms);
    const h = Math.floor(total / 3_600_000);
    const m = Math.floor((total % 3_600_000) / 60_000);
    const s = Math.floor((total % 60_000) / 1000);
    const msPart = total % 1000;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(msPart).padStart(3, '0')}`;
  };
  const body = cues
    .map(
      (cue, index) => `${index + 1}\n${asTime(cue.startMs)} --> ${asTime(cue.endMs)}\n${cue.text}\n`
    )
    .join('\n');
  return `WEBVTT\n\n${body}`;
};
