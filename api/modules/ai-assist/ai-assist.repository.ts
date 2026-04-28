import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../../db/client';
import {
  aiAssistUsage,
  aiGlossaryTerms,
  aiProviderConfigs,
  aiTranslationCache,
  aiTranslationDrafts,
  aiTranslationSegments,
} from '../../db/schema';

export const createDraftWithSegments = async (input: {
  targetType: string;
  targetId?: string;
  userId: string;
  creatorId?: string;
  provider: string;
  model: string;
  sourceLanguage: string;
  targetLanguage: string;
  promptVersion: string;
  status: string;
  safetyDecision: string;
  segments: Array<{
    sourceTextHash: string;
    sourceTextPreview: string;
    translatedText: string;
    startMs?: number;
    endMs?: number;
    anchorData?: Record<string, unknown>;
    sortOrder: number;
  }>;
}) =>
  db.transaction(async (tx) => {
    const [draft] = await tx
      .insert(aiTranslationDrafts)
      .values({
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        userId: input.userId,
        creatorId: input.creatorId ?? null,
        provider: input.provider,
        model: input.model,
        sourceLanguage: input.sourceLanguage,
        targetLanguage: input.targetLanguage,
        promptVersion: input.promptVersion,
        status: input.status,
        safetyDecision: input.safetyDecision,
      })
      .returning();

    await tx.insert(aiTranslationSegments).values(
      input.segments.map((segment) => ({
        draftId: draft.id,
        sourceTextHash: segment.sourceTextHash,
        sourceTextPreview: segment.sourceTextPreview,
        translatedText: segment.translatedText,
        startMs: segment.startMs ?? null,
        endMs: segment.endMs ?? null,
        anchorData: segment.anchorData ?? null,
        sortOrder: segment.sortOrder,
      }))
    );
    const segments = await tx
      .select()
      .from(aiTranslationSegments)
      .where(eq(aiTranslationSegments.draftId, draft.id))
      .orderBy(aiTranslationSegments.sortOrder);
    return { draft, segments };
  });

export const findDraftById = async (id: string) => {
  const [draft] = await db.select().from(aiTranslationDrafts).where(eq(aiTranslationDrafts.id, id));
  if (!draft) return null;
  const segments = await db
    .select()
    .from(aiTranslationSegments)
    .where(eq(aiTranslationSegments.draftId, id))
    .orderBy(aiTranslationSegments.sortOrder);
  return { draft, segments };
};

export const updateDraftStatus = async (id: string, status: string) => {
  const [draft] = await db
    .update(aiTranslationDrafts)
    .set({ status })
    .where(eq(aiTranslationDrafts.id, id))
    .returning();
  return draft ?? null;
};

export const findTranslationCache = async (input: {
  targetType: string;
  targetId?: string;
  sourceHash: string;
  targetLanguage: string;
}) => {
  const targetCondition = input.targetId
    ? eq(aiTranslationCache.targetId, input.targetId)
    : isNull(aiTranslationCache.targetId);
  const [cache] = await db
    .select()
    .from(aiTranslationCache)
    .where(
      and(
        eq(aiTranslationCache.targetType, input.targetType),
        targetCondition,
        eq(aiTranslationCache.sourceHash, input.sourceHash),
        eq(aiTranslationCache.targetLanguage, input.targetLanguage)
      )
    );
  return cache ?? null;
};

export const upsertTranslationCache = async (input: {
  targetType: string;
  targetId?: string;
  sourceHash: string;
  sourceLanguage: string;
  targetLanguage: string;
  translatedText: string;
  provider: string;
  model: string;
  safetyDecision: string;
  expiresAt?: Date;
}) => {
  const [cache] = await db
    .insert(aiTranslationCache)
    .values({
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      sourceHash: input.sourceHash,
      sourceLanguage: input.sourceLanguage,
      targetLanguage: input.targetLanguage,
      translatedText: input.translatedText,
      provider: input.provider,
      model: input.model,
      safetyDecision: input.safetyDecision,
      expiresAt: input.expiresAt ?? null,
    })
    .onConflictDoUpdate({
      target: [
        aiTranslationCache.targetType,
        aiTranslationCache.targetId,
        aiTranslationCache.sourceHash,
        aiTranslationCache.targetLanguage,
      ],
      set: {
        translatedText: input.translatedText,
        provider: input.provider,
        model: input.model,
        safetyDecision: input.safetyDecision,
        expiresAt: input.expiresAt ?? null,
      },
    })
    .returning();
  return cache;
};

export const createGlossaryTerm = async (input: {
  creatorId?: string;
  postId?: string;
  seriesId?: string;
  sourceText: string;
  targetText: string;
  sourceLanguage: string;
  targetLanguage: string;
  note?: string;
  createdByUserId: string;
}) => {
  const [term] = await db
    .insert(aiGlossaryTerms)
    .values({
      creatorId: input.creatorId ?? null,
      postId: input.postId ?? null,
      seriesId: input.seriesId ?? null,
      sourceText: input.sourceText,
      targetText: input.targetText,
      sourceLanguage: input.sourceLanguage,
      targetLanguage: input.targetLanguage,
      note: input.note ?? null,
      createdByUserId: input.createdByUserId,
    })
    .returning();
  return term;
};

export const listGlossaryTerms = async (creatorId?: string) =>
  db
    .select()
    .from(aiGlossaryTerms)
    .where(creatorId ? eq(aiGlossaryTerms.creatorId, creatorId) : undefined)
    .orderBy(desc(aiGlossaryTerms.updatedAt))
    .limit(200);

export const listProviderConfigs = async () => db.select().from(aiProviderConfigs);

export const recordUsage = async (input: {
  userId: string;
  creatorId?: string;
  postId?: string;
  targetType: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
}) => {
  const [usage] = await db
    .insert(aiAssistUsage)
    .values({
      userId: input.userId,
      creatorId: input.creatorId ?? null,
      postId: input.postId ?? null,
      targetType: input.targetType,
      provider: input.provider,
      model: input.model,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      estimatedCost: input.estimatedCost,
    })
    .returning();
  return usage;
};

export const listUsageByUser = async (userId: string) =>
  db
    .select()
    .from(aiAssistUsage)
    .where(eq(aiAssistUsage.userId, userId))
    .orderBy(desc(aiAssistUsage.generatedAt));
