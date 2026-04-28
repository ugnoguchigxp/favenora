import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TrustOperationsService } from '../api/modules/trust-operations/trust-operations.service';

describe('trust operations service', () => {
  const repository = {
    createReportWithCase: vi.fn(),
    listReports: vi.fn(),
    listCases: vi.fn(),
    createCase: vi.fn(),
    findCaseById: vi.fn(),
    getCaseDetail: vi.fn(),
    updateCase: vi.fn(),
    addStaffAction: vi.fn(),
    addInternalNote: vi.fn(),
    publishDecision: vi.fn(),
    listAppeals: vi.fn(),
    resolveAppeal: vi.fn(),
    listAuditEvents: vi.fn(),
  };
  const notifications = {
    enqueueNotificationRequest: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    repository.findCaseById.mockResolvedValue({ id: '550e8400-e29b-41d4-a716-446655440010' });
    repository.publishDecision.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440020',
      decisionType: 'warn',
    });
  });

  it('checks case existence before recording staff actions', async () => {
    repository.addStaffAction.mockResolvedValue({ id: 'action-id' });
    const service = new TrustOperationsService(repository, notifications as never);

    await service.addStaffAction(
      '550e8400-e29b-41d4-a716-446655440010',
      '550e8400-e29b-41d4-a716-446655440011',
      { actionType: 'hide_content', reason: 'policy violation' }
    );

    expect(repository.findCaseById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440010');
    expect(repository.addStaffAction).toHaveBeenCalled();
  });

  it('sends a notification when publishing a visible decision', async () => {
    const service = new TrustOperationsService(repository, notifications as never);

    await service.publishDecision(
      '550e8400-e29b-41d4-a716-446655440010',
      '550e8400-e29b-41d4-a716-446655440011',
      {
        decisionType: 'warn',
        targetType: 'user',
        targetId: '550e8400-e29b-41d4-a716-446655440012',
        userVisibleSummary: 'Please review the policy.',
        internalRationale: 'Matched policy rule.',
      }
    );

    expect(notifications.enqueueNotificationRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientUserId: '550e8400-e29b-41d4-a716-446655440012',
        notificationType: 'trust_case_update',
        sourceDomain: 'trust-operations',
      })
    );
  });
});
