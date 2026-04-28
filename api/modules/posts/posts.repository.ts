import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import type {
  CreatePostCommentInput,
  CreatePostDraftInput,
  UpdatePostDraftInput,
} from '../../../shared/schemas/posts.schema';
import { db } from '../../db/client';
import {
  postAccessRules,
  postBlocks,
  postComments,
  posts,
  postTags,
  series,
  seriesEntries,
} from '../../db/schema';

const normalizeTag = (tag: string) => tag.trim().toLowerCase().replace(/\s+/g, '-');

export const findPosts = async (input: { creatorId?: string; includeDrafts?: boolean }) => {
  return db
    .select()
    .from(posts)
    .where(
      and(
        input.creatorId ? eq(posts.creatorId, input.creatorId) : undefined,
        input.includeDrafts ? undefined : eq(posts.status, 'published')
      )
    )
    .orderBy(desc(posts.publishedAt), desc(posts.createdAt));
};

export const findPostById = async (id: string) => {
  const [post] = await db.select().from(posts).where(eq(posts.id, id));
  return post || null;
};

export const findPostDetailById = async (id: string) => {
  const post = await findPostById(id);
  if (!post) return null;
  const [blocks, accessRules, tags, comments] = await Promise.all([
    db
      .select()
      .from(postBlocks)
      .where(eq(postBlocks.postId, id))
      .orderBy(asc(postBlocks.sortOrder)),
    db.select().from(postAccessRules).where(eq(postAccessRules.postId, id)),
    db.select().from(postTags).where(eq(postTags.postId, id)),
    db
      .select()
      .from(postComments)
      .where(eq(postComments.postId, id))
      .orderBy(asc(postComments.createdAt)),
  ]);
  return { post, blocks, accessRules, tags, comments };
};

export const insertPostDraft = async (data: CreatePostDraftInput, creatorId: string) => {
  return db.transaction(async (tx) => {
    const [post] = await tx
      .insert(posts)
      .values({
        creatorId,
        postType: data.postType,
        title: data.title,
        slug: data.slug,
        summary: data.summary ?? null,
        accessType: data.accessType,
        ageRating: data.ageRating,
        isAiGenerated: data.isAiGenerated,
        language: data.language,
        thumbnailMediaId: data.thumbnailMediaId ?? null,
      })
      .returning();

    if (data.blocks.length > 0) {
      await tx.insert(postBlocks).values(
        data.blocks.map((block) => ({
          postId: post.id,
          type: block.type,
          sortOrder: block.sortOrder,
          visibility: block.visibility,
          data: block.data,
        }))
      );
    }

    if (data.accessRules.length > 0) {
      await tx.insert(postAccessRules).values(
        data.accessRules.map((rule) => ({
          postId: post.id,
          ruleType: rule.ruleType,
          tierId: rule.tierId ?? null,
          priceId: rule.priceId ?? null,
          startsAt: rule.startsAt ? new Date(rule.startsAt) : null,
          endsAt: rule.endsAt ? new Date(rule.endsAt) : null,
        }))
      );
    }

    if (data.tags.length > 0) {
      await tx.insert(postTags).values(
        data.tags.map((tag) => ({
          postId: post.id,
          normalizedName: normalizeTag(tag),
          displayName: tag,
        }))
      );
    }

    return post;
  });
};

export const updatePostDraft = async (id: string, data: UpdatePostDraftInput) => {
  return db.transaction(async (tx) => {
    const [post] = await tx
      .update(posts)
      .set({
        ...(data.postType !== undefined ? { postType: data.postType } : {}),
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.slug !== undefined ? { slug: data.slug } : {}),
        ...(data.summary !== undefined ? { summary: data.summary } : {}),
        ...(data.accessType !== undefined ? { accessType: data.accessType } : {}),
        ...(data.ageRating !== undefined ? { ageRating: data.ageRating } : {}),
        ...(data.isAiGenerated !== undefined ? { isAiGenerated: data.isAiGenerated } : {}),
        ...(data.language !== undefined ? { language: data.language } : {}),
        ...(data.thumbnailMediaId !== undefined ? { thumbnailMediaId: data.thumbnailMediaId } : {}),
        editedAt: new Date(),
      })
      .where(eq(posts.id, id))
      .returning();

    if (!post) return null;

    if (data.blocks) {
      await tx.delete(postBlocks).where(eq(postBlocks.postId, id));
      if (data.blocks.length > 0) {
        await tx.insert(postBlocks).values(
          data.blocks.map((block) => ({
            postId: id,
            type: block.type,
            sortOrder: block.sortOrder,
            visibility: block.visibility,
            data: block.data,
          }))
        );
      }
    }

    if (data.accessRules) {
      await tx.delete(postAccessRules).where(eq(postAccessRules.postId, id));
      if (data.accessRules.length > 0) {
        await tx.insert(postAccessRules).values(
          data.accessRules.map((rule) => ({
            postId: id,
            ruleType: rule.ruleType,
            tierId: rule.tierId ?? null,
            priceId: rule.priceId ?? null,
            startsAt: rule.startsAt ? new Date(rule.startsAt) : null,
            endsAt: rule.endsAt ? new Date(rule.endsAt) : null,
          }))
        );
      }
    }

    if (data.tags) {
      await tx.delete(postTags).where(eq(postTags.postId, id));
      if (data.tags.length > 0) {
        await tx.insert(postTags).values(
          data.tags.map((tag) => ({
            postId: id,
            normalizedName: normalizeTag(tag),
            displayName: tag,
          }))
        );
      }
    }

    return post;
  });
};

export const publishPost = async (id: string, publishedAt: Date) => {
  const [post] = await db
    .update(posts)
    .set({ status: 'published', publishedAt, scheduledAt: null })
    .where(eq(posts.id, id))
    .returning();
  return post || null;
};

export const schedulePost = async (id: string, scheduledAt: Date) => {
  const [post] = await db
    .update(posts)
    .set({ status: 'scheduled', scheduledAt })
    .where(eq(posts.id, id))
    .returning();
  return post || null;
};

export const deletePost = async (id: string) => {
  const [post] = await db
    .update(posts)
    .set({ status: 'archived' })
    .where(eq(posts.id, id))
    .returning();
  return post || null;
};

export const insertPostComment = async (
  postId: string,
  data: CreatePostCommentInput,
  authorId: string
) => {
  const [comment] = await db
    .insert(postComments)
    .values({
      postId,
      parentId: data.parentId ?? null,
      body: data.body,
      authorId,
    })
    .returning();
  return comment;
};

export const findPostCommentById = async (id: string) => {
  const [comment] = await db.select().from(postComments).where(eq(postComments.id, id));
  return comment || null;
};

export const findSeriesById = async (id: string) => {
  const [item] = await db.select().from(series).where(eq(series.id, id));
  return item || null;
};

export const insertSeries = async (data: {
  creatorId: string;
  title: string;
  description?: string;
  postType?: string;
  visibility?: string;
  coverMediaId?: string;
}) => {
  const [item] = await db
    .insert(series)
    .values({
      creatorId: data.creatorId,
      title: data.title,
      description: data.description ?? null,
      postType: data.postType ?? null,
      visibility: data.visibility ?? 'public',
      coverMediaId: data.coverMediaId ?? null,
    })
    .returning();
  return item;
};

export const replaceSeriesEntries = async (
  seriesId: string,
  entries: Array<{
    postId: string;
    sortOrder: number;
    chapterNumber?: number;
    volumeNumber?: number;
  }>
) => {
  return db.transaction(async (tx) => {
    await tx.delete(seriesEntries).where(eq(seriesEntries.seriesId, seriesId));
    if (entries.length > 0) {
      await tx.insert(seriesEntries).values(
        entries.map((entry) => ({
          seriesId,
          postId: entry.postId,
          sortOrder: entry.sortOrder,
          chapterNumber: entry.chapterNumber ?? null,
          volumeNumber: entry.volumeNumber ?? null,
        }))
      );
    }
    return tx
      .select()
      .from(seriesEntries)
      .where(
        and(
          eq(seriesEntries.seriesId, seriesId),
          inArray(
            seriesEntries.postId,
            entries.map((entry) => entry.postId)
          )
        )
      )
      .orderBy(asc(seriesEntries.sortOrder));
  });
};
