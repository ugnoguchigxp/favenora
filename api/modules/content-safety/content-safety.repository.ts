import { desc, eq } from 'drizzle-orm';
import type {
  CreateAllowedTermInput,
  CreateBlockedTermInput,
  UpdateBlockedTermInput,
} from '../../../shared/schemas/content-safety.schema';
import { db } from '../../db/client';
import {
  allowedTerms,
  blockedTermMatches,
  blockedTerms,
  contentSafetyAppeals,
  contentSafetyChecks,
  contentSafetyRescanJobs,
  contentSafetyReviews,
} from '../../db/schema';
import { normalizeSafetyText } from './content-safety.normalize';

export const listEnabledBlockedTerms = async () => {
  return db.select().from(blockedTerms).where(eq(blockedTerms.enabled, true));
};

export const listBlockedTerms = async () => {
  return db.select().from(blockedTerms).orderBy(desc(blockedTerms.createdAt));
};

export const createBlockedTerm = async (input: CreateBlockedTermInput, userId?: string) => {
  const [term] = await db
    .insert(blockedTerms)
    .values({
      ...input,
      locale: input.locale ?? null,
      script: input.script ?? null,
      normalizedPattern: normalizeSafetyText(input.pattern),
      createdByUserId: userId,
    })
    .returning();
  return term;
};

export const updateBlockedTerm = async (id: string, input: UpdateBlockedTermInput) => {
  const [term] = await db
    .update(blockedTerms)
    .set({
      ...input,
      ...(input.locale !== undefined ? { locale: input.locale } : {}),
      ...(input.script !== undefined ? { script: input.script } : {}),
      ...(input.pattern !== undefined
        ? { normalizedPattern: normalizeSafetyText(input.pattern) }
        : {}),
    })
    .where(eq(blockedTerms.id, id))
    .returning();
  return term ?? null;
};

export const listEnabledAllowedTerms = async () => {
  return db.select().from(allowedTerms).where(eq(allowedTerms.enabled, true));
};

export const listAllowedTerms = async () => {
  return db.select().from(allowedTerms).orderBy(desc(allowedTerms.createdAt));
};

export const createAllowedTerm = async (input: CreateAllowedTermInput, userId?: string) => {
  const [term] = await db
    .insert(allowedTerms)
    .values({
      ...input,
      locale: input.locale ?? null,
      reason: input.reason ?? null,
      normalizedPattern: normalizeSafetyText(input.pattern),
      createdByUserId: userId,
    })
    .returning();
  return term;
};

export const persistCheck = async (input: {
  targetType: string;
  targetId?: string;
  actorId?: string;
  language?: string;
  source?: string;
  textHash: string;
  decision: string;
  maxSeverity: string;
  matches: Array<{
    termId: string | null;
    matchedTextHash: string;
    matchedTextPreview: string;
    startOffset: number;
    endOffset: number;
    severity: string;
    decision: string;
  }>;
}) => {
  return db.transaction(async (tx) => {
    const [check] = await tx
      .insert(contentSafetyChecks)
      .values({
        targetType: input.targetType,
        targetId: input.targetId,
        actorId: input.actorId,
        language: input.language,
        source: input.source,
        textHash: input.textHash,
        decision: input.decision,
        maxSeverity: input.maxSeverity,
      })
      .returning();

    if (input.matches.length > 0) {
      await tx.insert(blockedTermMatches).values(
        input.matches.map((match) => ({
          checkId: check.id,
          targetType: input.targetType,
          targetId: input.targetId,
          termId: match.termId,
          matchedTextHash: match.matchedTextHash,
          matchedTextPreview: match.matchedTextPreview,
          startOffset: match.startOffset,
          endOffset: match.endOffset,
          severity: match.severity,
          decision: match.decision,
        }))
      );
    }

    if (input.decision === 'hold') {
      await tx.insert(contentSafetyReviews).values({
        targetType: input.targetType,
        targetId: input.targetId,
        checkId: check.id,
        status: 'open',
        decision: input.decision,
      });
    }

    return check;
  });
};

export const decideReview = async (id: string, input: { decision: string; reason: string }) => {
  const [review] = await db
    .update(contentSafetyReviews)
    .set({
      status: 'decided',
      decision: input.decision,
      reason: input.reason,
      decidedAt: new Date(),
    })
    .where(eq(contentSafetyReviews.id, id))
    .returning();
  return review ?? null;
};

export const createAppeal = async (
  reviewId: string,
  requesterId: string | undefined,
  reason: string
) => {
  const [appeal] = await db
    .insert(contentSafetyAppeals)
    .values({ reviewId, requesterId, reason })
    .returning();
  return appeal;
};

export const createRescanJob = async (scope: string) => {
  const [job] = await db
    .insert(contentSafetyRescanJobs)
    .values({ scope, status: 'queued', ruleVersionTo: 1 })
    .returning();
  return job;
};
