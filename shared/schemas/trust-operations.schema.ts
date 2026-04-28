import { z } from '@hono/zod-openapi';
import sanitizeHtml from 'sanitize-html';

const sanitize = (value: string) =>
  sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
const uuidSchema = z.string().uuid();
const isoDateSchema = z.preprocess(
  (value) => (value instanceof Date ? value.toISOString() : value),
  z.string().datetime()
);
const nullableIsoDateSchema = isoDateSchema.nullable();

export const trustTargetTypeSchema = z.enum([
  'post',
  'post_comment',
  'creator',
  'user',
  'media',
  'subtitle',
  'stream_chat',
  'payment',
  'system',
]);
export const trustReportReasonSchema = z.enum([
  'spam',
  'harassment',
  'illegal_content',
  'copyright',
  'payment_dispute',
  'impersonation',
  'policy_violation',
  'other',
]);
export const trustReportStatusSchema = z.enum(['open', 'triaged', 'linked', 'closed', 'rejected']);
export const trustCaseTypeSchema = z.enum([
  'content_safety_review',
  'creator_review',
  'user_report',
  'payment_dispute',
  'appeal',
  'system_audit',
]);
export const trustCaseStatusSchema = z.enum([
  'open',
  'triage',
  'investigating',
  'waiting_for_creator',
  'waiting_for_user',
  'decided',
  'resolved',
  'closed',
]);
export const trustSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export const trustPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);
export const trustDecisionTypeSchema = z.enum([
  'no_action',
  'warn',
  'remove_content',
  'restrict_account',
  'approve_creator',
  'reject_creator',
  'refund',
  'restore',
]);
export const trustAppealStatusSchema = z.enum(['open', 'under_review', 'accepted', 'rejected']);

const metadataSchema = z.record(z.string(), z.unknown()).default({});

export const trustReportSchema = z.object({
  id: uuidSchema,
  reporterId: uuidSchema.nullable(),
  targetType: trustTargetTypeSchema,
  targetId: uuidSchema.nullable(),
  reason: trustReportReasonSchema,
  description: z.string().nullable(),
  status: trustReportStatusSchema,
  priority: trustPrioritySchema,
  metadata: metadataSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const trustCaseSchema = z.object({
  id: uuidSchema,
  caseType: trustCaseTypeSchema,
  status: trustCaseStatusSchema,
  severity: trustSeveritySchema,
  priority: trustPrioritySchema,
  primaryTargetType: trustTargetTypeSchema,
  primaryTargetId: uuidSchema.nullable(),
  assignedStaffId: uuidSchema.nullable(),
  openedByUserId: uuidSchema.nullable(),
  resolvedAt: nullableIsoDateSchema,
  metadata: metadataSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const trustCaseEventSchema = z.object({
  id: uuidSchema,
  caseId: uuidSchema,
  eventType: z.string(),
  actorId: uuidSchema.nullable(),
  summary: z.string(),
  metadata: metadataSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const trustStaffActionSchema = z.object({
  id: uuidSchema,
  caseId: uuidSchema,
  staffUserId: uuidSchema,
  actionType: z.string(),
  targetType: trustTargetTypeSchema.nullable(),
  targetId: uuidSchema.nullable(),
  reason: z.string().nullable(),
  metadata: metadataSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const trustInternalNoteSchema = z.object({
  id: uuidSchema,
  caseId: uuidSchema,
  staffUserId: uuidSchema,
  body: z.string(),
  visibility: z.enum(['staff_only', 'legal_hold']).default('staff_only'),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const trustDecisionSchema = z.object({
  id: uuidSchema,
  caseId: uuidSchema,
  decisionType: trustDecisionTypeSchema,
  targetType: trustTargetTypeSchema.nullable(),
  targetId: uuidSchema.nullable(),
  creatorVisibleSummary: z.string().nullable(),
  userVisibleSummary: z.string().nullable(),
  internalRationale: z.string(),
  decidedByUserId: uuidSchema,
  decidedAt: isoDateSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const trustAppealSchema = z.object({
  id: uuidSchema,
  caseId: uuidSchema,
  requesterId: uuidSchema.nullable(),
  reason: z.string(),
  status: trustAppealStatusSchema,
  resolvedByUserId: uuidSchema.nullable(),
  resolutionReason: z.string().nullable(),
  resolvedAt: nullableIsoDateSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const systemAuditEventSchema = z.object({
  id: uuidSchema,
  sourceDomain: z.string(),
  eventType: z.string(),
  actorId: uuidSchema.nullable(),
  targetType: z.string().nullable(),
  targetId: uuidSchema.nullable(),
  summary: z.string(),
  metadata: metadataSchema,
  occurredAt: isoDateSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const createTrustReportSchema = z.object({
  targetType: trustTargetTypeSchema,
  targetId: uuidSchema.optional(),
  reason: trustReportReasonSchema,
  description: z.string().max(2000).transform(sanitize).optional(),
  metadata: metadataSchema.optional(),
});

export const createTrustCaseSchema = z.object({
  caseType: trustCaseTypeSchema,
  severity: trustSeveritySchema.default('medium'),
  priority: trustPrioritySchema.default('normal'),
  primaryTargetType: trustTargetTypeSchema,
  primaryTargetId: uuidSchema.optional(),
  reportId: uuidSchema.optional(),
  metadata: metadataSchema.optional(),
});

export const updateTrustCaseSchema = z.object({
  status: trustCaseStatusSchema.optional(),
  assignedStaffId: uuidSchema.nullable().optional(),
  severity: trustSeveritySchema.optional(),
  priority: trustPrioritySchema.optional(),
  metadata: metadataSchema.optional(),
});

export const createTrustStaffActionSchema = z.object({
  actionType: z.string().min(1).max(100),
  targetType: trustTargetTypeSchema.optional(),
  targetId: uuidSchema.optional(),
  reason: z.string().max(2000).transform(sanitize).optional(),
  metadata: metadataSchema.optional(),
});

export const createTrustInternalNoteSchema = z.object({
  body: z.string().min(1).max(4000).transform(sanitize),
  visibility: z.enum(['staff_only', 'legal_hold']).default('staff_only'),
});

export const publishTrustDecisionSchema = z.object({
  decisionType: trustDecisionTypeSchema,
  targetType: trustTargetTypeSchema.optional(),
  targetId: uuidSchema.optional(),
  creatorVisibleSummary: z.string().max(2000).transform(sanitize).optional(),
  userVisibleSummary: z.string().max(2000).transform(sanitize).optional(),
  internalRationale: z.string().min(1).max(4000).transform(sanitize),
  notifyUserId: uuidSchema.optional(),
});

export const resolveTrustAppealSchema = z.object({
  status: z.enum(['accepted', 'rejected']),
  resolutionReason: z.string().min(1).max(2000).transform(sanitize),
});

export const trustReportsResponseSchema = z.object({ reports: z.array(trustReportSchema) });
export const trustCasesResponseSchema = z.object({ cases: z.array(trustCaseSchema) });
export const trustCaseDetailResponseSchema = z.object({
  case: trustCaseSchema,
  events: z.array(trustCaseEventSchema),
  actions: z.array(trustStaffActionSchema),
  notes: z.array(trustInternalNoteSchema),
  decisions: z.array(trustDecisionSchema),
  appeals: z.array(trustAppealSchema),
});
export const trustAppealsResponseSchema = z.object({ appeals: z.array(trustAppealSchema) });
export const systemAuditEventsResponseSchema = z.object({
  events: z.array(systemAuditEventSchema),
});

export type CreateTrustReportInput = z.infer<typeof createTrustReportSchema>;
export type CreateTrustCaseInput = z.infer<typeof createTrustCaseSchema>;
export type UpdateTrustCaseInput = z.infer<typeof updateTrustCaseSchema>;
export type CreateTrustStaffActionInput = z.infer<typeof createTrustStaffActionSchema>;
export type CreateTrustInternalNoteInput = z.infer<typeof createTrustInternalNoteSchema>;
export type PublishTrustDecisionInput = z.infer<typeof publishTrustDecisionSchema>;
export type ResolveTrustAppealInput = z.infer<typeof resolveTrustAppealSchema>;
