import type {
  CreateStreamChatMessageInput,
  CreateStreamInput,
  CreateStreamTipGoalInput,
  UpdateStreamInput,
  UpdateStreamTipGoalInput,
} from '../../../shared/schemas/streams.schema';
import { ForbiddenError, NotFoundError, ValidationError } from '../../lib/errors';
import * as ContentSafetyService from '../content-safety/content-safety.service';
import * as CreatorsRepository from '../creators/creators.repository';
import { notificationsService } from '../notifications/notifications.service';
import * as PostsService from '../posts/posts.service';
import * as Repository from './streams.repository';

const assertCreatorOwner = async (creatorId: string, userId: string) => {
  const creator = await CreatorsRepository.findCreatorById(creatorId);
  if (!creator) throw new NotFoundError('Creator not found');
  if (creator.userId !== userId) throw new ForbiddenError('Only creator owner can manage streams');
  return creator;
};

const requireStream = async (streamId: string) => {
  const stream = await Repository.findStreamById(streamId);
  if (!stream) throw new NotFoundError('Stream not found');
  return stream;
};

export const createStream = async (input: CreateStreamInput, userId: string) => {
  await assertCreatorOwner(input.creatorId, userId);
  const stream = await Repository.createStream(input);
  await Repository.appendStreamEvent({ streamId: stream.id, eventType: 'stream_created' });
  return stream;
};

export const getStream = async (id: string) => {
  return requireStream(id);
};

export const listCreatorStreams = async (creatorId: string) =>
  Repository.findStreamsByCreatorId(creatorId);
export const listDashboardStreams = async () => Repository.listDashboardStreams();

export const updateStream = async (id: string, input: UpdateStreamInput, userId: string) => {
  const stream = await requireStream(id);
  await assertCreatorOwner(stream.creatorId, userId);
  const updated = await Repository.updateStream(id, input);
  if (!updated) throw new NotFoundError('Stream not found');
  return updated;
};

export const scheduleStream = async (id: string, scheduledAt: string, userId: string) => {
  const stream = await requireStream(id);
  await assertCreatorOwner(stream.creatorId, userId);
  const date = new Date(scheduledAt);
  if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
    throw new ValidationError('Scheduled time must be in the future');
  }
  const updated = await Repository.updateStreamLifecycle(id, {
    status: 'scheduled',
    scheduledAt: date,
  });
  await Repository.appendStreamEvent({
    streamId: id,
    eventType: 'stream_scheduled',
    payload: { scheduledAt },
  });
  return updated;
};

export const startStream = async (id: string, userId: string) => {
  const stream = await requireStream(id);
  await assertCreatorOwner(stream.creatorId, userId);
  if (!['scheduled', 'draft', 'ended'].includes(stream.status)) {
    throw new ValidationError('Stream cannot be started from current state');
  }
  const updated = await Repository.updateStreamLifecycle(id, {
    status: 'live',
    startedAt: new Date(),
    endedAt: null,
  });
  await Repository.appendStreamEvent({ streamId: id, eventType: 'stream_started' });
  await notificationsService.enqueueNotificationRequest({
    recipientUserId: userId,
    audienceType: 'creator',
    notificationType: 'system_announcement',
    priority: 'normal',
    title: 'Stream is live',
    body: updated?.title,
    sourceDomain: 'streams',
    sourceEventId: `stream_started:${id}`,
    payload: { targetType: 'stream', targetId: id },
  });
  return updated;
};

export const endStream = async (id: string, userId: string) => {
  const stream = await requireStream(id);
  await assertCreatorOwner(stream.creatorId, userId);
  if (stream.status !== 'live') throw new ValidationError('Only live streams can end');
  const updated = await Repository.updateStreamLifecycle(id, {
    status: 'ended',
    endedAt: new Date(),
  });
  await Repository.appendStreamEvent({ streamId: id, eventType: 'stream_ended' });
  return updated;
};

export const listChatMessages = async (streamId: string) => {
  await requireStream(streamId);
  return Repository.listChatMessages(streamId);
};

export const createChatMessage = async (
  streamId: string,
  input: CreateStreamChatMessageInput,
  authorId: string
) => {
  await requireStream(streamId);
  const safety = await ContentSafetyService.checkText({
    targetType: 'stream_chat',
    targetId: streamId,
    actorId: authorId,
    source: 'streams.chat',
    text: input.message,
  });
  if (safety.decision === 'block') throw new ValidationError('Message blocked by content safety');
  const status = safety.decision === 'hold' ? 'held_for_review' : 'visible';
  return Repository.createChatMessage(streamId, authorId, input, status, safety.decision);
};

export const hideChatMessage = async (
  streamId: string,
  messageId: string,
  actorId: string,
  reason: string
) => {
  const stream = await requireStream(streamId);
  await assertCreatorOwner(stream.creatorId, actorId);
  const message = await Repository.hideChatMessage(streamId, messageId, actorId, reason);
  if (!message) throw new NotFoundError('Stream message not found');
  return message;
};

export const listTipGoals = async (streamId: string) => {
  await requireStream(streamId);
  return Repository.listTipGoals(streamId);
};

export const createTipGoal = async (
  streamId: string,
  input: CreateStreamTipGoalInput,
  userId: string
) => {
  const stream = await requireStream(streamId);
  await assertCreatorOwner(stream.creatorId, userId);
  return Repository.createTipGoal(streamId, input);
};

export const updateTipGoal = async (
  streamId: string,
  goalId: string,
  input: UpdateStreamTipGoalInput,
  userId: string
) => {
  const stream = await requireStream(streamId);
  await assertCreatorOwner(stream.creatorId, userId);
  const goal = await Repository.updateTipGoal(streamId, goalId, input);
  if (!goal) throw new NotFoundError('Tip goal not found');
  return goal;
};

export const archiveStream = async (streamId: string, userId: string, makePostPublic: boolean) => {
  const stream = await requireStream(streamId);
  await assertCreatorOwner(stream.creatorId, userId);
  if (!['ended', 'archiving', 'archived'].includes(stream.status)) {
    throw new ValidationError('Stream must be ended before archive');
  }
  const request = await Repository.createArchiveRequest(streamId, userId);
  await Repository.updateArchiveRequest(request.id, { status: 'processing' });
  await Repository.updateStreamLifecycle(streamId, { status: 'archiving' });

  try {
    const slug = `stream-archive-${streamId.slice(0, 8)}-${Date.now()}`;
    const draft = await PostsService.createDraft(
      {
        creatorId: stream.creatorId,
        postType: 'stream_archive',
        title: stream.title,
        slug,
        summary: stream.description ?? undefined,
        accessType: makePostPublic ? 'public' : 'followers',
        ageRating: 'all_ages',
        isAiGenerated: false,
        language: 'ja',
        blocks: [],
        accessRules: [],
        tags: ['stream', 'archive'],
      },
      userId
    );
    await PostsService.publishPost(draft.id, {}, userId);
    await Repository.updateStreamLifecycle(streamId, {
      status: 'archived',
      archivePostId: draft.id,
    });
    const completedRequest = await Repository.updateArchiveRequest(request.id, {
      status: 'completed',
      archivePostId: draft.id,
    });
    await Repository.appendStreamEvent({
      streamId,
      eventType: 'stream_archived',
      payload: { archivePostId: draft.id, archiveRequestId: request.id },
    });
    return { request: completedRequest ?? request, archivePostId: draft.id };
  } catch (error) {
    await Repository.updateArchiveRequest(request.id, {
      status: 'failed',
      error: error instanceof Error ? error.message : 'archive_failed',
    });
    await Repository.updateStreamLifecycle(streamId, { status: 'ended' });
    throw error;
  }
};
