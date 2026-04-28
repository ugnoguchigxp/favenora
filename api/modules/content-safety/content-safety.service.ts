import type {
  BlockedTermSeverity,
  ContentSafetyCheckInput,
  ContentSafetyDecision,
  ContentSafetyResult,
  CreateAllowedTermInput,
  CreateBlockedTermInput,
  UpdateBlockedTermInput,
} from '../../../shared/schemas/content-safety.schema';
import { NotFoundError } from '../../lib/errors';
import { hashText, normalizeSafetyText, previewText } from './content-safety.normalize';
import * as Repository from './content-safety.repository';

const severityRank: Record<BlockedTermSeverity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const decisionRank: Record<ContentSafetyDecision, number> = {
  allow: 0,
  warn: 1,
  hold: 2,
  block: 3,
  shadow_limit: 4,
};

const maxSeverity = (severities: BlockedTermSeverity[]): BlockedTermSeverity => {
  return severities.sort((a, b) => severityRank[b] - severityRank[a])[0] ?? 'info';
};

const maxDecision = (decisions: ContentSafetyDecision[]): ContentSafetyDecision => {
  return decisions.sort((a, b) => decisionRank[b] - decisionRank[a])[0] ?? 'allow';
};

const isAllowed = (normalizedText: string, normalizedPattern: string, matchType: string) => {
  if (matchType === 'exact') return normalizedText === normalizedPattern;
  return normalizedText.includes(normalizedPattern);
};

const findIndex = (normalizedText: string, normalizedPattern: string) => {
  const start = normalizedText.indexOf(normalizedPattern);
  return {
    start: Math.max(0, start),
    end: Math.max(0, start + normalizedPattern.length),
  };
};

export const checkText = async (input: ContentSafetyCheckInput): Promise<ContentSafetyResult> => {
  const normalizedText = normalizeSafetyText(input.text);
  const [blockedTerms, allowedTerms] = await Promise.all([
    Repository.listEnabledBlockedTerms(),
    Repository.listEnabledAllowedTerms(),
  ]);

  const activeAllowedPatterns = allowedTerms
    .filter(
      (term) => !input.language || term.language === 'und' || term.language === input.language
    )
    .filter((term) => isAllowed(normalizedText, term.normalizedPattern, term.matchType));

  const matches = blockedTerms
    .filter(
      (term) => !input.language || term.language === 'und' || term.language === input.language
    )
    .filter(
      (term) =>
        !activeAllowedPatterns.some(
          (allowed) => allowed.normalizedPattern === term.normalizedPattern
        )
    )
    .filter((term) => {
      if (term.matchType === 'exact') return normalizedText === term.normalizedPattern;
      if (term.matchType === 'regex') return new RegExp(term.pattern, 'iu').test(input.text);
      return normalizedText.includes(term.normalizedPattern);
    })
    .map((term) => {
      const span =
        term.matchType === 'regex'
          ? { start: 0, end: Math.min(input.text.length, term.pattern.length) }
          : findIndex(normalizedText, term.normalizedPattern);
      const preview = previewText(input.text, span.start, span.end);
      return {
        termId: term.id,
        category: term.category as never,
        severity: term.severity as BlockedTermSeverity,
        decision: term.decision as ContentSafetyDecision,
        matchedTextPreview: preview,
        startOffset: span.start,
        endOffset: span.end,
        messageKey: `content_safety.${term.category}.${term.decision}`,
      };
    });

  const decision = maxDecision(matches.map((match) => match.decision));
  const severity = maxSeverity(matches.map((match) => match.severity));
  const check = await Repository.persistCheck({
    targetType: input.targetType,
    targetId: input.targetId,
    actorId: input.actorId,
    language: input.language,
    source: input.source,
    textHash: hashText(input.text),
    decision,
    maxSeverity: severity,
    matches: matches.map((match) => ({
      termId: match.termId,
      matchedTextHash: hashText(match.matchedTextPreview),
      matchedTextPreview: match.matchedTextPreview,
      startOffset: match.startOffset,
      endOffset: match.endOffset,
      severity: match.severity,
      decision: match.decision,
    })),
  });

  return {
    checkId: check.id,
    decision,
    maxSeverity: severity,
    matches,
    messageKeys: [...new Set(matches.map((match) => match.messageKey))],
    reviewRequired: decision === 'hold',
  };
};

export const checkBatch = async (items: ContentSafetyCheckInput[]) => {
  return Promise.all(items.map(checkText));
};

export const listBlockedTerms = Repository.listBlockedTerms;
export const listAllowedTerms = Repository.listAllowedTerms;
export const createBlockedTerm = async (input: CreateBlockedTermInput, userId?: string) =>
  Repository.createBlockedTerm(input, userId);
export const updateBlockedTerm = async (id: string, input: UpdateBlockedTermInput) => {
  return Repository.updateBlockedTerm(id, input).then((term) => {
    if (!term) throw new NotFoundError('Blocked term not found');
    return term;
  });
};
export const createAllowedTerm = async (input: CreateAllowedTermInput, userId?: string) =>
  Repository.createAllowedTerm(input, userId);
export const decideReview = Repository.decideReview;
export const createAppeal = Repository.createAppeal;
export const createRescanJob = Repository.createRescanJob;
