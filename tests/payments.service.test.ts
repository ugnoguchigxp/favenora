import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findCreatorById: vi.fn(),
  findTierById: vi.fn(),
  createCheckoutSession: vi.fn(),
  createTip: vi.fn(),
  checkText: vi.fn(),
}));

vi.mock('../api/modules/creators/creators.repository', () => ({
  findCreatorById: mocks.findCreatorById,
}));
vi.mock('../api/modules/memberships/memberships.repository', () => ({
  findTierById: mocks.findTierById,
}));
vi.mock('../api/modules/content-safety/content-safety.service', () => ({
  checkText: mocks.checkText,
}));
vi.mock('../api/modules/payments/payments.repository', () => ({
  createCheckoutSession: mocks.createCheckoutSession,
  createTip: mocks.createTip,
}));

import { PaymentsService } from '../api/modules/payments/payments.service';

describe('payments service', () => {
  const gateway = {
    provider: 'stripe' as const,
    createSubscriptionCheckout: vi.fn(),
    createOneTimeCheckout: vi.fn(),
    createTipCheckout: vi.fn(),
    createBillingPortalSession: vi.fn(),
    verifyWebhook: vi.fn(),
    createRefund: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    gateway.createSubscriptionCheckout.mockResolvedValue({
      id: 'cs_test_subscription',
      url: 'https://checkout.stripe.com/c/subscription',
      expiresAt: new Date('2026-05-01T00:00:00.000Z'),
    });
    gateway.createTipCheckout.mockResolvedValue({
      id: 'cs_test_tip',
      url: 'https://checkout.stripe.com/c/tip',
      expiresAt: new Date('2026-05-01T00:00:00.000Z'),
    });
    mocks.findCreatorById.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: '550e8400-e29b-41d4-a716-446655440010',
    });
    mocks.findTierById.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440001',
      creatorId: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Gold',
      priceAmount: 500,
      currency: 'JPY',
      visibility: 'published',
    });
    mocks.createCheckoutSession.mockImplementation(async (value) => ({
      id: 'checkout-id',
      ...value,
    }));
    mocks.checkText.mockResolvedValue({ decision: 'allow' });
  });

  it('creates subscription checkout without marking membership active', async () => {
    const service = new PaymentsService(() => gateway);
    const result = await service.createSubscriptionCheckout(
      {
        creatorId: '550e8400-e29b-41d4-a716-446655440000',
        tierId: '550e8400-e29b-41d4-a716-446655440001',
      },
      '550e8400-e29b-41d4-a716-446655440020'
    );

    expect(gateway.createSubscriptionCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 500, currency: 'JPY', tierName: 'Gold' })
    );
    expect(result.status).toBe('pending');
  });

  it('checks tip message with content safety before creating checkout', async () => {
    const service = new PaymentsService(() => gateway);
    await service.createTipCheckout(
      {
        creatorId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 300,
        currency: 'JPY',
        message: 'thanks',
        visibility: 'public',
      },
      '550e8400-e29b-41d4-a716-446655440020'
    );

    expect(mocks.checkText).toHaveBeenCalledWith(
      expect.objectContaining({ targetType: 'tip_message', text: 'thanks' })
    );
    expect(mocks.createTip).toHaveBeenCalled();
  });
});
