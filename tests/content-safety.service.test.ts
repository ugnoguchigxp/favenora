import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryMocks = vi.hoisted(() => ({
  listEnabledBlockedTerms: vi.fn(),
  listEnabledAllowedTerms: vi.fn(),
  listBlockedTerms: vi.fn(),
  listAllowedTerms: vi.fn(),
  createBlockedTerm: vi.fn(),
  updateBlockedTerm: vi.fn(),
  createAllowedTerm: vi.fn(),
  persistCheck: vi.fn(),
  decideReview: vi.fn(),
  createAppeal: vi.fn(),
  createRescanJob: vi.fn(),
}));

vi.mock('../api/modules/content-safety/content-safety.repository', () => repositoryMocks);

import { checkText } from '../api/modules/content-safety/content-safety.service';

describe('content safety service', () => {
  beforeEach(() => {
    repositoryMocks.listEnabledBlockedTerms.mockReset();
    repositoryMocks.listEnabledAllowedTerms.mockReset();
    repositoryMocks.persistCheck.mockReset();
    repositoryMocks.persistCheck.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440099',
    });
  });

  it('blocks normalized text matches and persists redacted match logs', async () => {
    repositoryMocks.listEnabledBlockedTerms.mockResolvedValue([
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        language: 'und',
        category: 'harassment',
        pattern: 'bad',
        normalizedPattern: 'bad',
        matchType: 'normalized',
        severity: 'high',
        decision: 'block',
      },
    ]);
    repositoryMocks.listEnabledAllowedTerms.mockResolvedValue([]);

    const result = await checkText({
      targetType: 'post_comment',
      text: 'b@d',
    });

    expect(result.decision).toBe('block');
    expect(result.maxSeverity).toBe('high');
    expect(repositoryMocks.persistCheck).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: 'block',
        matches: [expect.objectContaining({ termId: '550e8400-e29b-41d4-a716-446655440001' })],
      })
    );
  });

  it('suppresses blocked term matches when an allow term matches the same normalized pattern', async () => {
    repositoryMocks.listEnabledBlockedTerms.mockResolvedValue([
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        language: 'und',
        category: 'custom',
        pattern: 'review',
        normalizedPattern: 'review',
        matchType: 'normalized',
        severity: 'medium',
        decision: 'hold',
      },
    ]);
    repositoryMocks.listEnabledAllowedTerms.mockResolvedValue([
      {
        language: 'und',
        normalizedPattern: 'review',
        matchType: 'normalized',
      },
    ]);

    const result = await checkText({
      targetType: 'ai_draft',
      text: 'review',
    });

    expect(result.decision).toBe('allow');
    expect(result.matches).toEqual([]);
  });
});
