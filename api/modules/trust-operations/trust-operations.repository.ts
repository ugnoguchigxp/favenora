import { and, desc, eq } from 'drizzle-orm';
import type {
  CreateTrustCaseInput,
  CreateTrustInternalNoteInput,
  CreateTrustReportInput,
  CreateTrustStaffActionInput,
  PublishTrustDecisionInput,
  ResolveTrustAppealInput,
  UpdateTrustCaseInput,
} from '../../../shared/schemas/trust-operations.schema';
import { db } from '../../db/client';
import {
  systemAuditEvents,
  trustAppeals,
  trustCaseEvents,
  trustCaseReports,
  trustCases,
  trustDecisions,
  trustInternalNotes,
  trustReports,
  trustStaffActions,
} from '../../db/schema';

export const listReports = async (status?: string) => {
  return db
    .select()
    .from(trustReports)
    .where(status ? eq(trustReports.status, status) : undefined)
    .orderBy(desc(trustReports.createdAt));
};

export const createReportWithCase = async (
  input: CreateTrustReportInput,
  reporterId: string | undefined
) => {
  return db.transaction(async (tx) => {
    const [report] = await tx
      .insert(trustReports)
      .values({
        reporterId,
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        reason: input.reason,
        description: input.description ?? null,
        status: 'linked',
        priority: 'normal',
        metadata: input.metadata ?? {},
      })
      .returning();

    const [trustCase] = await tx
      .insert(trustCases)
      .values({
        caseType: input.reason === 'payment_dispute' ? 'payment_dispute' : 'user_report',
        status: 'open',
        severity: input.reason === 'illegal_content' ? 'high' : 'medium',
        priority: input.reason === 'illegal_content' ? 'high' : 'normal',
        primaryTargetType: input.targetType,
        primaryTargetId: input.targetId ?? null,
        openedByUserId: reporterId,
        metadata: { reason: input.reason },
      })
      .returning();

    await tx.insert(trustCaseReports).values({ caseId: trustCase.id, reportId: report.id });
    await tx.insert(trustCaseEvents).values({
      caseId: trustCase.id,
      eventType: 'report_created',
      actorId: reporterId,
      summary: `Report created for ${input.targetType}`,
      metadata: { reportId: report.id, reason: input.reason },
    });

    return { report, case: trustCase };
  });
};

export const listCases = async (status?: string) => {
  return db
    .select()
    .from(trustCases)
    .where(status ? eq(trustCases.status, status) : undefined)
    .orderBy(desc(trustCases.createdAt));
};

export const createCase = async (input: CreateTrustCaseInput, openedByUserId: string) => {
  return db.transaction(async (tx) => {
    const [trustCase] = await tx
      .insert(trustCases)
      .values({
        caseType: input.caseType,
        status: 'open',
        severity: input.severity,
        priority: input.priority,
        primaryTargetType: input.primaryTargetType,
        primaryTargetId: input.primaryTargetId ?? null,
        openedByUserId,
        metadata: input.metadata ?? {},
      })
      .returning();

    if (input.reportId) {
      await tx.insert(trustCaseReports).values({ caseId: trustCase.id, reportId: input.reportId });
      await tx
        .update(trustReports)
        .set({ status: 'linked' })
        .where(eq(trustReports.id, input.reportId));
    }

    await tx.insert(trustCaseEvents).values({
      caseId: trustCase.id,
      eventType: 'case_created',
      actorId: openedByUserId,
      summary: `Case created: ${input.caseType}`,
      metadata: input.metadata ?? {},
    });

    return trustCase;
  });
};

export const findCaseById = async (id: string) => {
  const [trustCase] = await db.select().from(trustCases).where(eq(trustCases.id, id));
  return trustCase ?? null;
};

export const getCaseDetail = async (id: string) => {
  const trustCase = await findCaseById(id);
  if (!trustCase) return null;
  const [events, actions, notes, decisions, appeals] = await Promise.all([
    db.select().from(trustCaseEvents).where(eq(trustCaseEvents.caseId, id)),
    db.select().from(trustStaffActions).where(eq(trustStaffActions.caseId, id)),
    db.select().from(trustInternalNotes).where(eq(trustInternalNotes.caseId, id)),
    db.select().from(trustDecisions).where(eq(trustDecisions.caseId, id)),
    db.select().from(trustAppeals).where(eq(trustAppeals.caseId, id)),
  ]);
  return { case: trustCase, events, actions, notes, decisions, appeals };
};

export const updateCase = async (id: string, input: UpdateTrustCaseInput, actorId: string) => {
  return db.transaction(async (tx) => {
    const [trustCase] = await tx
      .update(trustCases)
      .set({
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.assignedStaffId !== undefined ? { assignedStaffId: input.assignedStaffId } : {}),
        ...(input.severity !== undefined ? { severity: input.severity } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
        ...(input.status && ['resolved', 'closed'].includes(input.status)
          ? { resolvedAt: new Date() }
          : {}),
      })
      .where(eq(trustCases.id, id))
      .returning();
    if (!trustCase) return null;

    await tx.insert(trustCaseEvents).values({
      caseId: id,
      eventType: 'case_updated',
      actorId,
      summary: 'Case updated',
      metadata: input,
    });
    return trustCase;
  });
};

export const addStaffAction = async (
  caseId: string,
  staffUserId: string,
  input: CreateTrustStaffActionInput
) => {
  return db.transaction(async (tx) => {
    const [action] = await tx
      .insert(trustStaffActions)
      .values({
        caseId,
        staffUserId,
        actionType: input.actionType,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        reason: input.reason ?? null,
        metadata: input.metadata ?? {},
      })
      .returning();

    await tx.insert(trustCaseEvents).values({
      caseId,
      eventType: 'staff_action',
      actorId: staffUserId,
      summary: `Staff action: ${input.actionType}`,
      metadata: { actionId: action.id },
    });

    await tx.insert(systemAuditEvents).values({
      sourceDomain: 'trust-operations',
      eventType: 'staff_action',
      actorId: staffUserId,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      summary: `Staff action recorded: ${input.actionType}`,
      metadata: { caseId, actionId: action.id, reason: input.reason ?? null },
    });

    return action;
  });
};

export const addInternalNote = async (
  caseId: string,
  staffUserId: string,
  input: CreateTrustInternalNoteInput
) => {
  const [note] = await db
    .insert(trustInternalNotes)
    .values({ caseId, staffUserId, body: input.body, visibility: input.visibility })
    .returning();
  return note;
};

export const publishDecision = async (
  caseId: string,
  decidedByUserId: string,
  input: PublishTrustDecisionInput
) => {
  return db.transaction(async (tx) => {
    const [decision] = await tx
      .insert(trustDecisions)
      .values({
        caseId,
        decisionType: input.decisionType,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        creatorVisibleSummary: input.creatorVisibleSummary ?? null,
        userVisibleSummary: input.userVisibleSummary ?? null,
        internalRationale: input.internalRationale,
        decidedByUserId,
      })
      .returning();

    await tx
      .update(trustCases)
      .set({ status: 'decided' })
      .where(and(eq(trustCases.id, caseId), eq(trustCases.status, 'open')));
    await tx.insert(trustCaseEvents).values({
      caseId,
      eventType: 'decision_published',
      actorId: decidedByUserId,
      summary: `Decision published: ${input.decisionType}`,
      metadata: { decisionId: decision.id },
    });
    await tx.insert(systemAuditEvents).values({
      sourceDomain: 'trust-operations',
      eventType: 'decision_published',
      actorId: decidedByUserId,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      summary: `Trust decision published: ${input.decisionType}`,
      metadata: { caseId, decisionId: decision.id },
    });

    return decision;
  });
};

export const listAppeals = async (status?: string) => {
  return db
    .select()
    .from(trustAppeals)
    .where(status ? eq(trustAppeals.status, status) : undefined)
    .orderBy(desc(trustAppeals.createdAt));
};

export const resolveAppeal = async (
  id: string,
  staffUserId: string,
  input: ResolveTrustAppealInput
) => {
  const [appeal] = await db
    .update(trustAppeals)
    .set({
      status: input.status,
      resolvedByUserId: staffUserId,
      resolutionReason: input.resolutionReason,
      resolvedAt: new Date(),
    })
    .where(eq(trustAppeals.id, id))
    .returning();
  return appeal ?? null;
};

export const listAuditEvents = async (filters: {
  sourceDomain?: string;
  actorId?: string;
  targetType?: string;
  targetId?: string;
  limit?: number;
}) => {
  return db
    .select()
    .from(systemAuditEvents)
    .where(
      and(
        filters.sourceDomain ? eq(systemAuditEvents.sourceDomain, filters.sourceDomain) : undefined,
        filters.actorId ? eq(systemAuditEvents.actorId, filters.actorId) : undefined,
        filters.targetType ? eq(systemAuditEvents.targetType, filters.targetType) : undefined,
        filters.targetId ? eq(systemAuditEvents.targetId, filters.targetId) : undefined
      )
    )
    .orderBy(desc(systemAuditEvents.occurredAt))
    .limit(filters.limit ?? 100);
};
