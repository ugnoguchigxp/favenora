import { createHash } from 'node:crypto';
import type {
  CreateBillingPortalInput,
  CreateOneTimePurchaseCheckoutInput,
  CreateRefundInput,
  CreateSubscriptionCheckoutInput,
  CreateTipCheckoutInput,
} from '../../../shared/schemas/payments.schema';
import { config } from '../../config';
import { ForbiddenError, NotFoundError, ValidationError } from '../../lib/errors';
import * as ContentSafetyService from '../content-safety/content-safety.service';
import * as CreatorsRepository from '../creators/creators.repository';
import * as MembershipRepository from '../memberships/memberships.repository';
import {
  createPaymentGateway,
  type PaymentGateway,
  type PaymentProviderEvent,
} from './payments.provider';
import * as Repository from './payments.repository';

const defaultSuccessUrl = () =>
  config.STRIPE_SUCCESS_URL ?? `${config.APP_URL ?? 'http://localhost:5173'}/payments/success`;
const defaultCancelUrl = () =>
  config.STRIPE_CANCEL_URL ?? `${config.APP_URL ?? 'http://localhost:5173'}/payments/cancel`;

const assertCreatorExists = async (creatorId: string) => {
  const creator = await CreatorsRepository.findCreatorById(creatorId);
  if (!creator) throw new NotFoundError('Creator not found');
  return creator;
};

const assertCreatorOwner = async (creatorId: string, userId: string) => {
  const creator = await assertCreatorExists(creatorId);
  if (creator.userId !== userId) {
    throw new ForbiddenError('Only the creator owner can access this payment resource');
  }
};

const hashRawBody = (rawBody: string) => createHash('sha256').update(rawBody).digest('hex');

export class PaymentsService {
  constructor(private readonly gatewayFactory: () => PaymentGateway = createPaymentGateway) {}

  async createSubscriptionCheckout(input: CreateSubscriptionCheckoutInput, userId: string) {
    await assertCreatorExists(input.creatorId);
    const tier = await MembershipRepository.findTierById(input.tierId);
    if (!tier || tier.creatorId !== input.creatorId) {
      throw new ValidationError('Membership tier does not belong to creator');
    }
    if (tier.visibility !== 'published') {
      throw new ValidationError('Only published membership tiers can receive checkout');
    }
    if (tier.priceAmount <= 0) {
      throw new ValidationError('Paid checkout requires a positive tier price');
    }

    const successUrl = input.successUrl ?? defaultSuccessUrl();
    const cancelUrl = input.cancelUrl ?? defaultCancelUrl();
    const providerSession = await this.gatewayFactory().createSubscriptionCheckout({
      ...input,
      userId,
      amount: tier.priceAmount,
      currency: tier.currency,
      tierName: tier.name,
      successUrl,
      cancelUrl,
    });

    return Repository.createCheckoutSession({
      provider: 'stripe',
      purpose: 'subscription_start',
      userId,
      creatorId: input.creatorId,
      tierId: input.tierId,
      postId: null,
      streamId: null,
      amount: tier.priceAmount,
      currency: tier.currency,
      status: 'pending',
      providerCheckoutSessionId: providerSession.id,
      url: providerSession.url,
      successUrl,
      cancelUrl,
      expiresAt: providerSession.expiresAt,
      metadata: { tierName: tier.name },
    });
  }

  async createTipCheckout(input: CreateTipCheckoutInput, userId: string) {
    await assertCreatorExists(input.creatorId);
    if (input.message) {
      const safety = await ContentSafetyService.checkText({
        targetType: 'tip_message',
        actorId: userId,
        targetId: input.creatorId,
        text: input.message,
        source: 'payments.tip',
      });
      if (safety.decision === 'block') {
        throw new ValidationError('Tip message was blocked by content safety');
      }
    }

    const successUrl = input.successUrl ?? defaultSuccessUrl();
    const cancelUrl = input.cancelUrl ?? defaultCancelUrl();
    const providerSession = await this.gatewayFactory().createTipCheckout({
      ...input,
      userId,
      successUrl,
      cancelUrl,
    });
    const checkout = await Repository.createCheckoutSession({
      provider: 'stripe',
      purpose: 'tip',
      userId,
      creatorId: input.creatorId,
      tierId: null,
      postId: input.postId ?? null,
      streamId: input.streamId ?? null,
      amount: input.amount,
      currency: input.currency,
      status: 'pending',
      providerCheckoutSessionId: providerSession.id,
      url: providerSession.url,
      successUrl,
      cancelUrl,
      expiresAt: providerSession.expiresAt,
      metadata: { visibility: input.visibility },
    });
    await Repository.createTip({
      payerId: userId,
      creatorId: input.creatorId,
      postId: input.postId ?? null,
      streamId: input.streamId ?? null,
      amount: input.amount,
      currency: input.currency,
      message: input.message ?? null,
      visibility: input.visibility,
      status: 'pending',
      checkoutSessionId: checkout.id,
    });
    return checkout;
  }

  async createOneTimePurchaseCheckout(input: CreateOneTimePurchaseCheckoutInput, userId: string) {
    await assertCreatorExists(input.creatorId);
    const successUrl = input.successUrl ?? defaultSuccessUrl();
    const cancelUrl = input.cancelUrl ?? defaultCancelUrl();
    const providerSession = await this.gatewayFactory().createOneTimeCheckout({
      ...input,
      userId,
      successUrl,
      cancelUrl,
    });
    return Repository.createCheckoutSession({
      provider: 'stripe',
      purpose: 'one_time_purchase',
      userId,
      creatorId: input.creatorId,
      tierId: null,
      postId: input.postId ?? null,
      streamId: null,
      amount: input.amount,
      currency: input.currency,
      status: 'pending',
      providerCheckoutSessionId: providerSession.id,
      url: providerSession.url,
      successUrl,
      cancelUrl,
      expiresAt: providerSession.expiresAt,
    });
  }

  async createBillingPortal(input: CreateBillingPortalInput, userId: string) {
    const customer = await Repository.findPaymentCustomer(userId);
    if (!customer) throw new NotFoundError('Payment customer not found');
    return this.gatewayFactory().createBillingPortalSession({
      customerId: customer.providerCustomerId,
      returnUrl:
        input.returnUrl ??
        config.STRIPE_BILLING_PORTAL_RETURN_URL ??
        `${config.APP_URL ?? 'http://localhost:5173'}/dashboard/billing`,
    });
  }

  async processWebhook(provider: string, rawBody: string, signature: string | undefined) {
    if (provider !== 'stripe') throw new ValidationError('Unsupported payment provider');
    if (!signature) throw new ValidationError('Missing Stripe signature');
    const event = this.gatewayFactory().verifyWebhook(rawBody, signature);
    return this.persistProviderEvent(event, rawBody);
  }

  async persistProviderEvent(event: PaymentProviderEvent, rawBody: string) {
    const paymentEvent = await Repository.createPaymentEvent({
      provider: 'stripe',
      providerEventId: event.id,
      type: event.type,
      payload: event.payload,
      rawBodyHash: hashRawBody(rawBody),
      processingStatus: 'received',
    });
    if (!paymentEvent) return { duplicate: true };

    try {
      await this.applyProviderEvent(paymentEvent.id, event);
      await Repository.markPaymentEventProcessed(paymentEvent.id, 'processed');
      return { duplicate: false, eventId: paymentEvent.id };
    } catch (error) {
      await Repository.markPaymentEventProcessed(
        paymentEvent.id,
        'failed',
        error instanceof Error ? error.message : 'unknown'
      );
      throw error;
    }
  }

  async createRefund(input: CreateRefundInput, requestedByUserId: string) {
    const payment = await Repository.findPaymentById(input.paymentId);
    if (!payment) throw new NotFoundError('Payment not found');
    if (payment.creatorId) await assertCreatorOwner(payment.creatorId, requestedByUserId);
    const amount = input.amount ?? payment.amount;
    const providerRefund = await this.gatewayFactory().createRefund({
      providerPaymentId: payment.providerPaymentId,
      amount,
      reason: input.reason,
    });
    return Repository.createRefund({
      paymentId: payment.id,
      creatorId: payment.creatorId,
      userId: payment.payerId,
      amount,
      currency: payment.currency,
      reason: input.reason ?? null,
      status: providerRefund.status,
      requestedByUserId,
      providerRefundId: providerRefund.id,
      processedAt: new Date(),
    });
  }

  async getRevenueSummary(creatorId: string, userId: string, currency = 'JPY') {
    await assertCreatorOwner(creatorId, userId);
    return Repository.getRevenueSummary(creatorId, currency);
  }

  async listLedger(creatorId: string, userId: string) {
    await assertCreatorOwner(creatorId, userId);
    return Repository.listLedgerEntries({ creatorId });
  }

  async listRefunds(creatorId: string, userId: string) {
    await assertCreatorOwner(creatorId, userId);
    return Repository.listRefundsByCreator(creatorId);
  }

  private async applyProviderEvent(paymentEventId: string, event: PaymentProviderEvent) {
    if (event.type !== 'checkout.session.completed') return;
    const data = event.payload.data as { object?: Record<string, unknown> } | undefined;
    const session = data?.object;
    if (!session || typeof session.id !== 'string') return;
    const checkout = await Repository.updateCheckoutStatus('stripe', session.id, 'completed');
    if (!checkout) return;
    const paymentIntent =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : typeof session.subscription === 'string'
          ? session.subscription
          : session.id;
    await Repository.createPayment({
      provider: 'stripe',
      providerPaymentId: paymentIntent,
      payerId: checkout.userId,
      creatorId: checkout.creatorId,
      checkoutSessionId: checkout.id,
      amount: checkout.amount,
      currency: checkout.currency,
      status: 'paid',
      paidAt: new Date(),
    });
    await Repository.createLedgerEntry({
      creatorId: checkout.creatorId,
      userId: checkout.userId,
      provider: 'stripe',
      providerObjectId: paymentIntent,
      sourceType: checkout.purpose,
      sourceId: checkout.id,
      entryType: 'charge',
      amount: checkout.amount,
      currency: checkout.currency,
      occurredAt: new Date(),
      metadata: { providerEventId: event.id },
    });
    await Repository.createInternalPaymentEvent({
      paymentEventId,
      eventType:
        checkout.purpose === 'subscription_start'
          ? 'subscription_checkout_completed'
          : checkout.purpose === 'tip'
            ? 'tip_paid'
            : 'one_time_purchase_completed',
      targetDomain:
        checkout.purpose === 'subscription_start' || checkout.purpose === 'one_time_purchase'
          ? 'memberships'
          : 'streams',
      targetId: checkout.tierId ?? checkout.postId ?? checkout.streamId ?? checkout.creatorId,
      payload: {
        checkoutSessionId: checkout.id,
        providerCheckoutSessionId: checkout.providerCheckoutSessionId,
        userId: checkout.userId,
        creatorId: checkout.creatorId,
        tierId: checkout.tierId,
        postId: checkout.postId,
        streamId: checkout.streamId,
        amount: checkout.amount,
        currency: checkout.currency,
      },
    });
  }
}

export const paymentsService = new PaymentsService();
