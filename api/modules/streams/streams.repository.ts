import { and, asc, desc, eq } from 'drizzle-orm';
import type {
  CreateStreamChatMessageInput,
  CreateStreamInput,
  CreateStreamTipGoalInput,
  UpdateStreamInput,
  UpdateStreamTipGoalInput,
} from '../../../shared/schemas/streams.schema';
import { db } from '../../db/client';
import {
  streamArchiveRequests,
  streamChatMessages,
  streamChatModerationActions,
  streamEvents,
  streams,
  streamTipGoals,
} from '../../db/schema';

export const createStream = async (input: CreateStreamInput) => {
  const [stream] = await db
    .insert(streams)
    .values({
      creatorId: input.creatorId,
      title: input.title,
      description: input.description ?? null,
      visibility: input.visibility,
      embedUrl: input.embedUrl ?? null,
      embedProvider: input.embedProvider ?? null,
      posterMediaId: input.posterMediaId ?? null,
    })
    .returning();
  return stream;
};

export const findStreamById = async (id: string) => {
  const [stream] = await db.select().from(streams).where(eq(streams.id, id));
  return stream ?? null;
};

export const findStreamsByCreatorId = async (creatorId: string) => {
  return db
    .select()
    .from(streams)
    .where(eq(streams.creatorId, creatorId))
    .orderBy(desc(streams.scheduledAt), desc(streams.createdAt));
};

export const listDashboardStreams = async () => {
  return db.select().from(streams).orderBy(desc(streams.createdAt)).limit(100);
};

export const updateStream = async (id: string, input: UpdateStreamInput) => {
  const [stream] = await db
    .update(streams)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
      ...(input.embedUrl !== undefined ? { embedUrl: input.embedUrl } : {}),
      ...(input.embedProvider !== undefined ? { embedProvider: input.embedProvider } : {}),
      ...(input.posterMediaId !== undefined ? { posterMediaId: input.posterMediaId } : {}),
    })
    .where(eq(streams.id, id))
    .returning();
  return stream ?? null;
};

export const updateStreamLifecycle = async (
  id: string,
  patch: {
    status: string;
    scheduledAt?: Date | null;
    startedAt?: Date | null;
    endedAt?: Date | null;
    archivePostId?: string | null;
  }
) => {
  const [stream] = await db.update(streams).set(patch).where(eq(streams.id, id)).returning();
  return stream ?? null;
};

export const appendStreamEvent = async (input: {
  streamId: string;
  eventType: string;
  payload?: Record<string, unknown>;
}) => {
  const [event] = await db
    .insert(streamEvents)
    .values({
      streamId: input.streamId,
      eventType: input.eventType,
      payload: input.payload ?? {},
    })
    .returning();
  return event;
};

export const listChatMessages = async (streamId: string) => {
  return db
    .select()
    .from(streamChatMessages)
    .where(eq(streamChatMessages.streamId, streamId))
    .orderBy(asc(streamChatMessages.createdAt));
};

export const createChatMessage = async (
  streamId: string,
  authorId: string,
  input: CreateStreamChatMessageInput,
  status: string,
  safetyDecision: string
) => {
  const [message] = await db
    .insert(streamChatMessages)
    .values({
      streamId,
      authorId,
      message: input.message,
      status,
      safetyDecision,
    })
    .returning();
  return message;
};

export const hideChatMessage = async (
  streamId: string,
  messageId: string,
  actorId: string,
  reason: string
) => {
  return db.transaction(async (tx) => {
    const [message] = await tx
      .update(streamChatMessages)
      .set({ status: 'hidden_by_creator', hiddenAt: new Date() })
      .where(and(eq(streamChatMessages.id, messageId), eq(streamChatMessages.streamId, streamId)))
      .returning();
    if (!message) return null;
    await tx.insert(streamChatModerationActions).values({
      streamId,
      messageId,
      actorId,
      action: 'hide_message',
      reason,
    });
    return message;
  });
};

export const listTipGoals = async (streamId: string) => {
  return db
    .select()
    .from(streamTipGoals)
    .where(eq(streamTipGoals.streamId, streamId))
    .orderBy(asc(streamTipGoals.sortOrder), asc(streamTipGoals.createdAt));
};

export const createTipGoal = async (streamId: string, input: CreateStreamTipGoalInput) => {
  const [goal] = await db
    .insert(streamTipGoals)
    .values({
      streamId,
      title: input.title,
      description: input.description ?? null,
      targetAmount: input.targetAmount,
      currency: input.currency,
      status: input.status,
      sortOrder: input.sortOrder,
    })
    .returning();
  return goal;
};

export const updateTipGoal = async (
  streamId: string,
  goalId: string,
  input: UpdateStreamTipGoalInput
) => {
  const [goal] = await db
    .update(streamTipGoals)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.targetAmount !== undefined ? { targetAmount: input.targetAmount } : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    })
    .where(and(eq(streamTipGoals.id, goalId), eq(streamTipGoals.streamId, streamId)))
    .returning();
  return goal ?? null;
};

export const createArchiveRequest = async (streamId: string, requestedByUserId: string) => {
  const [request] = await db
    .insert(streamArchiveRequests)
    .values({ streamId, requestedByUserId, status: 'queued' })
    .returning();
  return request;
};

export const updateArchiveRequest = async (
  id: string,
  patch: { status: 'processing' | 'completed' | 'failed'; archivePostId?: string; error?: string }
) => {
  const [request] = await db
    .update(streamArchiveRequests)
    .set({
      status: patch.status,
      archivePostId: patch.archivePostId ?? null,
      error: patch.error ?? null,
      completedAt: patch.status === 'completed' || patch.status === 'failed' ? new Date() : null,
    })
    .where(eq(streamArchiveRequests.id, id))
    .returning();
  return request ?? null;
};
