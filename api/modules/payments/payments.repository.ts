import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '../../db/client';
import {
  checkoutSessions,
  internalPaymentEvents,
  paymentCustomers,
  paymentEvents,
  paymentLedgerEntries,
  payments,
  refunds,
  tips,
} from '../../db/schema';

export const createCheckoutSession = async (data: typeof checkoutSessions.$inferInsert) => {
  const [session] = await db.insert(checkoutSessions).values(data).returning();
  return session;
};

export const updateCheckoutStatus = async (
  provider: string,
  providerCheckoutSessionId: string,
  status: string
) => {
  const [session] = await db
    .update(checkoutSessions)
    .set({ status })
    .where(
      and(
        eq(checkoutSessions.provider, provider),
        eq(checkoutSessions.providerCheckoutSessionId, providerCheckoutSessionId)
      )
    )
    .returning();
  return session ?? null;
};

export const findPaymentCustomer = async (userId: string, provider = 'stripe') => {
  const [customer] = await db
    .select()
    .from(paymentCustomers)
    .where(and(eq(paymentCustomers.userId, userId), eq(paymentCustomers.provider, provider)));
  return customer ?? null;
};

export const createPaymentEvent = async (data: typeof paymentEvents.$inferInsert) => {
  const [event] = await db
    .insert(paymentEvents)
    .values(data)
    .onConflictDoNothing({
      target: [paymentEvents.provider, paymentEvents.providerEventId],
    })
    .returning();
  return event ?? null;
};

export const markPaymentEventProcessed = async (id: string, status: string, error?: string) => {
  await db
    .update(paymentEvents)
    .set({ processingStatus: status, processedAt: new Date(), error })
    .where(eq(paymentEvents.id, id));
};

export const createInternalPaymentEvent = async (
  data: typeof internalPaymentEvents.$inferInsert
) => {
  const [event] = await db.insert(internalPaymentEvents).values(data).returning();
  return event;
};

export const createPayment = async (data: typeof payments.$inferInsert) => {
  const [payment] = await db
    .insert(payments)
    .values(data)
    .onConflictDoNothing({ target: [payments.provider, payments.providerPaymentId] })
    .returning();
  return payment ?? null;
};

export const findPaymentById = async (id: string) => {
  const [payment] = await db.select().from(payments).where(eq(payments.id, id));
  return payment ?? null;
};

export const createLedgerEntry = async (data: typeof paymentLedgerEntries.$inferInsert) => {
  const [entry] = await db.insert(paymentLedgerEntries).values(data).returning();
  return entry;
};

export const createTip = async (data: typeof tips.$inferInsert) => {
  const [tip] = await db.insert(tips).values(data).returning();
  return tip;
};

export const createRefund = async (data: typeof refunds.$inferInsert) => {
  const [refund] = await db.insert(refunds).values(data).returning();
  return refund;
};

export const listRefundsByCreator = async (creatorId: string) => {
  return db
    .select()
    .from(refunds)
    .where(eq(refunds.creatorId, creatorId))
    .orderBy(desc(refunds.createdAt));
};

export const listLedgerEntries = async (input: { creatorId: string; from?: Date; to?: Date }) => {
  return db
    .select()
    .from(paymentLedgerEntries)
    .where(
      and(
        eq(paymentLedgerEntries.creatorId, input.creatorId),
        input.from ? gte(paymentLedgerEntries.occurredAt, input.from) : undefined,
        input.to ? lte(paymentLedgerEntries.occurredAt, input.to) : undefined
      )
    )
    .orderBy(desc(paymentLedgerEntries.occurredAt));
};

export const getRevenueSummary = async (creatorId: string, currency = 'JPY') => {
  const [row] = await db
    .select({
      gross: sql<number>`coalesce(sum(case when ${paymentLedgerEntries.entryType} = 'charge' then ${paymentLedgerEntries.amount} else 0 end), 0)`,
      refunds: sql<number>`coalesce(sum(case when ${paymentLedgerEntries.entryType} = 'refund' then abs(${paymentLedgerEntries.amount}) else 0 end), 0)`,
      fees: sql<number>`coalesce(sum(case when ${paymentLedgerEntries.entryType} in ('fee', 'platform_fee') then abs(${paymentLedgerEntries.amount}) else 0 end), 0)`,
    })
    .from(paymentLedgerEntries)
    .where(
      and(
        eq(paymentLedgerEntries.creatorId, creatorId),
        eq(paymentLedgerEntries.currency, currency)
      )
    );
  const gross = Number(row?.gross ?? 0);
  const refundsTotal = Number(row?.refunds ?? 0);
  const fees = Number(row?.fees ?? 0);
  return {
    creatorId,
    currency,
    gross,
    refunds: refundsTotal,
    fees,
    net: gross - refundsTotal - fees,
  };
};
