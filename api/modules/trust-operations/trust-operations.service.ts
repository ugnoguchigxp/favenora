import type {
  CreateTrustCaseInput,
  CreateTrustInternalNoteInput,
  CreateTrustReportInput,
  CreateTrustStaffActionInput,
  PublishTrustDecisionInput,
  ResolveTrustAppealInput,
  UpdateTrustCaseInput,
} from '../../../shared/schemas/trust-operations.schema';
import { NotFoundError } from '../../lib/errors';
import {
  type NotificationsService,
  notificationsService,
} from '../notifications/notifications.service';
import * as Repository from './trust-operations.repository';

export type TrustOperationsRepository = typeof Repository;

export class TrustOperationsService {
  constructor(
    private readonly repository: TrustOperationsRepository = Repository,
    private readonly notifications: NotificationsService = notificationsService
  ) {}

  createReport(input: CreateTrustReportInput, reporterId?: string) {
    return this.repository.createReportWithCase(input, reporterId);
  }

  listReports(status?: string) {
    return this.repository.listReports(status);
  }

  listCases(status?: string) {
    return this.repository.listCases(status);
  }

  createCase(input: CreateTrustCaseInput, openedByUserId: string) {
    return this.repository.createCase(input, openedByUserId);
  }

  async getCaseDetail(id: string) {
    const detail = await this.repository.getCaseDetail(id);
    if (!detail) throw new NotFoundError('Trust case not found');
    return detail;
  }

  async updateCase(id: string, input: UpdateTrustCaseInput, actorId: string) {
    const trustCase = await this.repository.updateCase(id, input, actorId);
    if (!trustCase) throw new NotFoundError('Trust case not found');
    return trustCase;
  }

  async addStaffAction(caseId: string, staffUserId: string, input: CreateTrustStaffActionInput) {
    await this.assertCaseExists(caseId);
    return this.repository.addStaffAction(caseId, staffUserId, input);
  }

  async addInternalNote(caseId: string, staffUserId: string, input: CreateTrustInternalNoteInput) {
    await this.assertCaseExists(caseId);
    return this.repository.addInternalNote(caseId, staffUserId, input);
  }

  async publishDecision(caseId: string, staffUserId: string, input: PublishTrustDecisionInput) {
    await this.assertCaseExists(caseId);
    const decision = await this.repository.publishDecision(caseId, staffUserId, input);
    const recipientUserId =
      input.notifyUserId ?? (input.targetType === 'user' ? input.targetId : undefined);
    if (recipientUserId && (input.userVisibleSummary || input.creatorVisibleSummary)) {
      await this.notifications.enqueueNotificationRequest({
        recipientUserId,
        audienceType: input.targetType === 'creator' ? 'creator' : 'user',
        notificationType: 'trust_case_update',
        priority: 'high',
        title: 'Trust case update',
        body: input.userVisibleSummary ?? input.creatorVisibleSummary ?? undefined,
        payload: {
          kind: 'trust_case_update',
          targetType: 'trust_case',
          targetId: caseId,
          metadata: { decisionId: decision.id, decisionType: decision.decisionType },
        },
        sourceDomain: 'trust-operations',
        sourceEventId: decision.id,
      });
    }
    return decision;
  }

  listAppeals(status?: string) {
    return this.repository.listAppeals(status);
  }

  async resolveAppeal(id: string, staffUserId: string, input: ResolveTrustAppealInput) {
    const appeal = await this.repository.resolveAppeal(id, staffUserId, input);
    if (!appeal) throw new NotFoundError('Trust appeal not found');
    return appeal;
  }

  listAuditEvents(filters: {
    sourceDomain?: string;
    actorId?: string;
    targetType?: string;
    targetId?: string;
    limit?: number;
  }) {
    return this.repository.listAuditEvents(filters);
  }

  private async assertCaseExists(id: string) {
    const trustCase = await this.repository.findCaseById(id);
    if (!trustCase) throw new NotFoundError('Trust case not found');
    return trustCase;
  }
}

export const trustOperationsService = new TrustOperationsService();
