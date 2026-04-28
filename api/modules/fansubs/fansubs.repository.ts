import { asc, desc, eq } from 'drizzle-orm';
import { db } from '../../db/client';
import {
  creatorTranslationApprovals,
  fanTranslationTracks,
  subtitleCues,
  translationAnnotations,
  translationReports,
  translationVotes,
} from '../../db/schema';

export const listTracksByPostId = async (postId: string) =>
  db
    .select()
    .from(fanTranslationTracks)
    .where(eq(fanTranslationTracks.postId, postId))
    .orderBy(desc(fanTranslationTracks.updatedAt));

export const createTrack = async (input: {
  postId: string;
  authorId: string;
  contributionType: string;
  sourceLanguage: string;
  targetLanguage: string;
  locale?: string;
  title: string;
  visibility: string;
  status: string;
}) => {
  const [track] = await db
    .insert(fanTranslationTracks)
    .values({
      postId: input.postId,
      authorId: input.authorId,
      contributionType: input.contributionType,
      sourceLanguage: input.sourceLanguage,
      targetLanguage: input.targetLanguage,
      locale: input.locale ?? null,
      title: input.title,
      visibility: input.visibility,
      status: input.status,
    })
    .returning();
  return track;
};

export const findTrackById = async (id: string) => {
  const [track] = await db
    .select()
    .from(fanTranslationTracks)
    .where(eq(fanTranslationTracks.id, id));
  return track ?? null;
};

export const updateTrack = async (id: string, patch: Record<string, unknown>) => {
  const [track] = await db
    .update(fanTranslationTracks)
    .set(patch)
    .where(eq(fanTranslationTracks.id, id))
    .returning();
  return track ?? null;
};

export const listCues = async (trackId: string) =>
  db
    .select()
    .from(subtitleCues)
    .where(eq(subtitleCues.trackId, trackId))
    .orderBy(asc(subtitleCues.sortOrder));

export const replaceCues = async (
  trackId: string,
  cues: Array<{ startMs: number; endMs: number; text: string; sortOrder: number }>
) =>
  db.transaction(async (tx) => {
    await tx.delete(subtitleCues).where(eq(subtitleCues.trackId, trackId));
    if (cues.length > 0) {
      await tx.insert(subtitleCues).values(cues.map((cue) => ({ trackId, ...cue })));
    }
    return tx
      .select()
      .from(subtitleCues)
      .where(eq(subtitleCues.trackId, trackId))
      .orderBy(asc(subtitleCues.sortOrder));
  });

export const listAnnotations = async (trackId: string) =>
  db
    .select()
    .from(translationAnnotations)
    .where(eq(translationAnnotations.trackId, trackId))
    .orderBy(asc(translationAnnotations.createdAt));

export const replaceAnnotations = async (
  trackId: string,
  annotations: Array<{
    anchorType: string;
    anchorData: Record<string, unknown>;
    originalText?: string;
    translatedText: string;
    note?: string;
    status: string;
  }>
) =>
  db.transaction(async (tx) => {
    await tx.delete(translationAnnotations).where(eq(translationAnnotations.trackId, trackId));
    if (annotations.length > 0) {
      await tx.insert(translationAnnotations).values(
        annotations.map((annotation) => ({
          trackId,
          anchorType: annotation.anchorType,
          anchorData: annotation.anchorData,
          originalText: annotation.originalText ?? null,
          translatedText: annotation.translatedText,
          note: annotation.note ?? null,
          status: annotation.status,
        }))
      );
    }
    return tx
      .select()
      .from(translationAnnotations)
      .where(eq(translationAnnotations.trackId, trackId));
  });

export const upsertVote = async (
  trackId: string,
  userId: string,
  value: string,
  reason?: string
) => {
  const [vote] = await db
    .insert(translationVotes)
    .values({ trackId, userId, value, reason: reason ?? null })
    .onConflictDoUpdate({
      target: [translationVotes.trackId, translationVotes.userId],
      set: { value, reason: reason ?? null },
    })
    .returning();
  return vote;
};

export const createReport = async (trackId: string, reporterId: string, reason: string) => {
  const [report] = await db
    .insert(translationReports)
    .values({ trackId, reporterId, reason })
    .returning();
  return report;
};

export const upsertCreatorApproval = async (
  trackId: string,
  creatorId: string,
  approvalState: string,
  note?: string
) => {
  const [approval] = await db
    .insert(creatorTranslationApprovals)
    .values({ trackId, creatorId, approvalState, note: note ?? null })
    .onConflictDoUpdate({
      target: [creatorTranslationApprovals.trackId, creatorTranslationApprovals.creatorId],
      set: { approvalState, note: note ?? null, decidedAt: new Date() },
    })
    .returning();
  return approval;
};
