import Stripe from 'stripe';
import type {
  CreateOneTimePurchaseCheckoutInput,
  CreateSubscriptionCheckoutInput,
  CreateTipCheckoutInput,
} from '../../../shared/schemas/payments.schema';
import { config } from '../../config';
import { ValidationError } from '../../lib/errors';

export type ProviderCheckoutResult = {
  id: string;
  url: string | null;
  expiresAt: Date | null;
};

export type PaymentProviderEvent = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
};

export interface PaymentGateway {
  provider: 'stripe';
  createSubscriptionCheckout(
    input: CreateSubscriptionCheckoutInput & {
      userId: string;
      amount: number;
      currency: string;
      tierName: string;
      successUrl: string;
      cancelUrl: string;
    }
  ): Promise<ProviderCheckoutResult>;
  createOneTimeCheckout(
    input: CreateOneTimePurchaseCheckoutInput & {
      userId: string;
      successUrl: string;
      cancelUrl: string;
    }
  ): Promise<ProviderCheckoutResult>;
  createTipCheckout(
    input: CreateTipCheckoutInput & {
      userId: string;
      successUrl: string;
      cancelUrl: string;
    }
  ): Promise<ProviderCheckoutResult>;
  createBillingPortalSession(input: {
    customerId: string;
    returnUrl: string;
  }): Promise<{ url: string }>;
  verifyWebhook(rawBody: string, signature: string): PaymentProviderEvent;
  createRefund(input: {
    providerPaymentId: string;
    amount?: number;
    reason?: string;
  }): Promise<{ id: string; status: string }>;
}

export class StripePaymentGateway implements PaymentGateway {
  readonly provider = 'stripe' as const;

  private readonly stripe: Stripe;

  constructor(secretKey = config.STRIPE_SECRET_KEY) {
    if (!secretKey) {
      throw new ValidationError('Stripe is not configured');
    }
    this.stripe = new Stripe(secretKey);
  }

  async createSubscriptionCheckout(
    input: CreateSubscriptionCheckoutInput & {
      userId: string;
      amount: number;
      currency: string;
      tierName: string;
      successUrl: string;
      cancelUrl: string;
    }
  ) {
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      client_reference_id: input.userId,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: input.amount,
            recurring: { interval: 'month' },
            product_data: { name: input.tierName },
          },
        },
      ],
      metadata: {
        purpose: 'subscription_start',
        userId: input.userId,
        creatorId: input.creatorId,
        tierId: input.tierId,
      },
    });
    return this.toCheckoutResult(session);
  }

  async createOneTimeCheckout(
    input: CreateOneTimePurchaseCheckoutInput & {
      userId: string;
      successUrl: string;
      cancelUrl: string;
    }
  ) {
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      client_reference_id: input.userId,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: input.amount,
            product_data: { name: 'One-time purchase' },
          },
        },
      ],
      metadata: {
        purpose: 'one_time_purchase',
        userId: input.userId,
        creatorId: input.creatorId,
        ...(input.postId ? { postId: input.postId } : {}),
      },
    });
    return this.toCheckoutResult(session);
  }

  async createTipCheckout(
    input: CreateTipCheckoutInput & {
      userId: string;
      successUrl: string;
      cancelUrl: string;
    }
  ) {
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      client_reference_id: input.userId,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: input.amount,
            product_data: { name: 'Creator tip' },
          },
        },
      ],
      metadata: {
        purpose: 'tip',
        userId: input.userId,
        creatorId: input.creatorId,
        visibility: input.visibility,
        ...(input.postId ? { postId: input.postId } : {}),
        ...(input.streamId ? { streamId: input.streamId } : {}),
      },
    });
    return this.toCheckoutResult(session);
  }

  async createBillingPortalSession(input: { customerId: string; returnUrl: string }) {
    return this.stripe.billingPortal.sessions.create({
      customer: input.customerId,
      return_url: input.returnUrl,
    });
  }

  verifyWebhook(rawBody: string, signature: string): PaymentProviderEvent {
    if (!config.STRIPE_WEBHOOK_SECRET) {
      throw new ValidationError('Stripe webhook secret is not configured');
    }
    const event = this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      config.STRIPE_WEBHOOK_SECRET
    );
    return {
      id: event.id,
      type: event.type,
      payload: event as unknown as Record<string, unknown>,
    };
  }

  async createRefund(input: { providerPaymentId: string; amount?: number; reason?: string }) {
    const refund = await this.stripe.refunds.create({
      payment_intent: input.providerPaymentId,
      ...(input.amount ? { amount: input.amount } : {}),
      metadata: input.reason ? { reason: input.reason } : undefined,
    });
    return { id: refund.id, status: refund.status ?? 'pending' };
  }

  private toCheckoutResult(session: Stripe.Checkout.Session): ProviderCheckoutResult {
    return {
      id: session.id,
      url: session.url,
      expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : null,
    };
  }
}

export const createPaymentGateway = (): PaymentGateway => new StripePaymentGateway();
