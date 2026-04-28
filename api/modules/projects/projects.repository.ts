import { and, asc, desc, eq, ne } from 'drizzle-orm';
import type {
  CreateProjectInput,
  CreateProjectMilestoneInput,
  CreateProjectTaskInput,
  CreateProjectUpdateInput,
  ReplaceProjectRelatedPostsInput,
  UpdateProjectInput,
  UpdateProjectMilestoneInput,
  UpdateProjectTaskInput,
} from '../../../shared/schemas/projects.schema';
import { db } from '../../db/client';
import {
  projectCollaborators,
  projectMilestones,
  projectRelatedPosts,
  projects,
  projectTasks,
  projectUpdates,
} from '../../db/schema';

const dateOrNull = (value: string | null | undefined) => (value ? new Date(value) : null);

export const listProjects = async (input: { creatorId?: string; includeArchived?: boolean }) => {
  return db
    .select()
    .from(projects)
    .where(
      and(
        input.creatorId ? eq(projects.creatorId, input.creatorId) : undefined,
        input.includeArchived ? undefined : ne(projects.status, 'archived')
      )
    )
    .orderBy(desc(projects.updatedAt));
};

export const findProjectById = async (id: string) => {
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  return project ?? null;
};

export const insertProject = async (creatorId: string, input: CreateProjectInput) => {
  const [project] = await db
    .insert(projects)
    .values({
      creatorId,
      title: input.title,
      slug: input.slug,
      summary: input.summary ?? null,
      description: input.description ?? null,
      status: input.status,
      visibility: input.visibility,
      coverMediaId: input.coverMediaId ?? null,
      startedAt: dateOrNull(input.startedAt),
      targetDate: dateOrNull(input.targetDate),
    })
    .returning();
  return project;
};

export const updateProject = async (id: string, input: UpdateProjectInput) => {
  const [project] = await db
    .update(projects)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.summary !== undefined ? { summary: input.summary } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
      ...(input.coverMediaId !== undefined ? { coverMediaId: input.coverMediaId } : {}),
      ...(input.startedAt !== undefined ? { startedAt: dateOrNull(input.startedAt) } : {}),
      ...(input.targetDate !== undefined ? { targetDate: dateOrNull(input.targetDate) } : {}),
      ...(input.status === 'completed' ? { completedAt: new Date() } : {}),
    })
    .where(eq(projects.id, id))
    .returning();
  return project ?? null;
};

export const archiveProject = async (id: string) => {
  const [project] = await db
    .update(projects)
    .set({ status: 'archived' })
    .where(eq(projects.id, id))
    .returning();
  return project ?? null;
};

export const listMilestones = async (projectId: string) => {
  return db
    .select()
    .from(projectMilestones)
    .where(eq(projectMilestones.projectId, projectId))
    .orderBy(asc(projectMilestones.sortOrder), asc(projectMilestones.createdAt));
};

export const insertMilestone = async (projectId: string, input: CreateProjectMilestoneInput) => {
  const [milestone] = await db
    .insert(projectMilestones)
    .values({
      projectId,
      title: input.title,
      description: input.description ?? null,
      dueDate: dateOrNull(input.dueDate),
      status: input.status,
      sortOrder: input.sortOrder,
      completedAt: input.status === 'completed' ? new Date() : null,
    })
    .returning();
  return milestone;
};

export const updateMilestone = async (
  id: string,
  projectId: string,
  input: UpdateProjectMilestoneInput
) => {
  const [milestone] = await db
    .update(projectMilestones)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.dueDate !== undefined ? { dueDate: dateOrNull(input.dueDate) } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.status === 'completed' ? { completedAt: new Date() } : {}),
    })
    .where(and(eq(projectMilestones.id, id), eq(projectMilestones.projectId, projectId)))
    .returning();
  return milestone ?? null;
};

export const listTasks = async (projectId: string) => {
  return db
    .select()
    .from(projectTasks)
    .where(eq(projectTasks.projectId, projectId))
    .orderBy(asc(projectTasks.sortOrder), asc(projectTasks.createdAt));
};

export const insertTask = async (projectId: string, input: CreateProjectTaskInput) => {
  const [task] = await db
    .insert(projectTasks)
    .values({
      projectId,
      milestoneId: input.milestoneId ?? null,
      title: input.title,
      description: input.description ?? null,
      status: input.status,
      assigneeId: input.assigneeId ?? null,
      dueDate: dateOrNull(input.dueDate),
      sortOrder: input.sortOrder,
      completedAt: input.status === 'done' ? new Date() : null,
    })
    .returning();
  return task;
};

export const updateTask = async (id: string, projectId: string, input: UpdateProjectTaskInput) => {
  const [task] = await db
    .update(projectTasks)
    .set({
      ...(input.milestoneId !== undefined ? { milestoneId: input.milestoneId } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId } : {}),
      ...(input.dueDate !== undefined ? { dueDate: dateOrNull(input.dueDate) } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.status === 'done' ? { completedAt: new Date() } : {}),
    })
    .where(and(eq(projectTasks.id, id), eq(projectTasks.projectId, projectId)))
    .returning();
  return task ?? null;
};

export const listUpdates = async (projectId: string) => {
  return db
    .select()
    .from(projectUpdates)
    .where(eq(projectUpdates.projectId, projectId))
    .orderBy(desc(projectUpdates.publishedAt), desc(projectUpdates.createdAt));
};

export const insertUpdate = async (
  projectId: string,
  input: CreateProjectUpdateInput,
  createdBy: string
) => {
  const [update] = await db
    .insert(projectUpdates)
    .values({
      projectId,
      title: input.title,
      body: input.body,
      visibility: input.visibility,
      tierIds: input.tierIds,
      publishedAt: dateOrNull(input.publishedAt),
      createdBy,
    })
    .returning();
  return update;
};

export const listRelatedPosts = async (projectId: string) => {
  return db
    .select()
    .from(projectRelatedPosts)
    .where(eq(projectRelatedPosts.projectId, projectId))
    .orderBy(asc(projectRelatedPosts.sortOrder));
};

export const replaceRelatedPosts = async (
  projectId: string,
  input: ReplaceProjectRelatedPostsInput
) => {
  return db.transaction(async (tx) => {
    await tx.delete(projectRelatedPosts).where(eq(projectRelatedPosts.projectId, projectId));
    if (input.posts.length > 0) {
      await tx.insert(projectRelatedPosts).values(
        input.posts.map((post) => ({
          projectId,
          postId: post.postId,
          relationType: post.relationType,
          sortOrder: post.sortOrder,
        }))
      );
    }
    return tx
      .select()
      .from(projectRelatedPosts)
      .where(eq(projectRelatedPosts.projectId, projectId))
      .orderBy(asc(projectRelatedPosts.sortOrder));
  });
};

export const findCollaborator = async (projectId: string, userId: string) => {
  const [collaborator] = await db
    .select()
    .from(projectCollaborators)
    .where(
      and(eq(projectCollaborators.projectId, projectId), eq(projectCollaborators.userId, userId))
    );
  return collaborator ?? null;
};
