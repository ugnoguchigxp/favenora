import { z } from '@hono/zod-openapi';
import sanitizeHtml from 'sanitize-html';

const sanitize = (val: string) => sanitizeHtml(val).trim();
const emptyToNull = (val: unknown) => (typeof val === 'string' && val.trim() === '' ? null : val);
const uuidSchema = z.string().uuid();
const nullableUuidSchema = uuidSchema.nullable();
const isoDateSchema = z.preprocess(
  (value) => (value instanceof Date ? value.toISOString() : value),
  z.string().datetime()
);
const nullableIsoDateSchema = isoDateSchema.nullable();
const nullableText = (max: number) =>
  z.preprocess(emptyToNull, z.string().max(max).transform(sanitize).nullable().optional());

export const projectStatusSchema = z.enum(['draft', 'active', 'completed', 'archived']);
export const projectVisibilitySchema = z.enum(['private', 'public', 'supporters']);
export const projectMilestoneStatusSchema = z.enum([
  'planned',
  'in_progress',
  'completed',
  'blocked',
]);
export const projectTaskStatusSchema = z.enum(['todo', 'in_progress', 'blocked', 'done']);
export const projectUpdateVisibilitySchema = z.enum(['private', 'public', 'supporters', 'tiers']);
export const projectRelationTypeSchema = z.enum([
  'announcement',
  'work_log',
  'completed_work',
  'reference',
]);

export const projectSchema = z
  .object({
    id: uuidSchema,
    creatorId: uuidSchema,
    title: z.string(),
    slug: z.string(),
    summary: z.string().nullable(),
    description: z.string().nullable(),
    status: z.string(),
    visibility: z.string(),
    coverMediaId: nullableUuidSchema,
    startedAt: nullableIsoDateSchema,
    targetDate: nullableIsoDateSchema,
    completedAt: nullableIsoDateSchema,
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
  })
  .openapi('Project');

export const createProjectSchema = z
  .object({
    title: z.string().min(1).max(160).transform(sanitize),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(1)
      .max(180)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    summary: nullableText(500),
    description: nullableText(5000),
    status: projectStatusSchema.default('draft'),
    visibility: projectVisibilitySchema.default('private'),
    coverMediaId: uuidSchema.nullable().optional(),
    startedAt: isoDateSchema.nullable().optional(),
    targetDate: isoDateSchema.nullable().optional(),
  })
  .openapi('CreateProjectInput');

export const updateProjectSchema = createProjectSchema.partial().openapi('UpdateProjectInput');

export const projectMilestoneSchema = z
  .object({
    id: uuidSchema,
    projectId: uuidSchema,
    title: z.string(),
    description: z.string().nullable(),
    dueDate: nullableIsoDateSchema,
    status: z.string(),
    sortOrder: z.number().int(),
    completedAt: nullableIsoDateSchema,
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
  })
  .openapi('ProjectMilestone');

export const createProjectMilestoneSchema = z
  .object({
    title: z.string().min(1).max(160).transform(sanitize),
    description: nullableText(1000),
    dueDate: isoDateSchema.nullable().optional(),
    status: projectMilestoneStatusSchema.default('planned'),
    sortOrder: z.number().int().min(0).default(0),
  })
  .openapi('CreateProjectMilestoneInput');

export const updateProjectMilestoneSchema = createProjectMilestoneSchema
  .partial()
  .openapi('UpdateProjectMilestoneInput');

export const projectTaskSchema = z
  .object({
    id: uuidSchema,
    projectId: uuidSchema,
    milestoneId: nullableUuidSchema,
    title: z.string(),
    description: z.string().nullable(),
    status: z.string(),
    assigneeId: nullableUuidSchema,
    dueDate: nullableIsoDateSchema,
    sortOrder: z.number().int(),
    completedAt: nullableIsoDateSchema,
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
  })
  .openapi('ProjectTask');

export const createProjectTaskSchema = z
  .object({
    milestoneId: uuidSchema.nullable().optional(),
    title: z.string().min(1).max(160).transform(sanitize),
    description: nullableText(1000),
    status: projectTaskStatusSchema.default('todo'),
    assigneeId: uuidSchema.nullable().optional(),
    dueDate: isoDateSchema.nullable().optional(),
    sortOrder: z.number().int().min(0).default(0),
  })
  .openapi('CreateProjectTaskInput');

export const updateProjectTaskSchema = createProjectTaskSchema
  .partial()
  .openapi('UpdateProjectTaskInput');

export const projectUpdateSchema = z
  .object({
    id: uuidSchema,
    projectId: uuidSchema,
    title: z.string(),
    body: z.string(),
    visibility: z.string(),
    tierIds: z.unknown(),
    publishedAt: nullableIsoDateSchema,
    createdBy: uuidSchema,
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
  })
  .openapi('ProjectUpdate');

export const createProjectUpdateSchema = z
  .object({
    title: z.string().min(1).max(160).transform(sanitize),
    body: z.string().min(1).max(5000).transform(sanitize),
    visibility: projectUpdateVisibilitySchema.default('private'),
    tierIds: z.array(uuidSchema).default([]),
    publishedAt: isoDateSchema.nullable().optional(),
  })
  .openapi('CreateProjectUpdateInput');

export const projectRelatedPostSchema = z
  .object({
    id: uuidSchema.optional(),
    projectId: uuidSchema.optional(),
    postId: uuidSchema,
    relationType: z.string(),
    sortOrder: z.number().int(),
  })
  .openapi('ProjectRelatedPost');

export const replaceProjectRelatedPostsSchema = z
  .object({
    posts: z
      .array(
        z.object({
          postId: uuidSchema,
          relationType: projectRelationTypeSchema.default('work_log'),
          sortOrder: z.number().int().min(0).default(0),
        })
      )
      .max(100),
  })
  .openapi('ReplaceProjectRelatedPostsInput');

export const projectDashboardSchema = z
  .object({
    project: projectSchema,
    milestones: z.array(projectMilestoneSchema),
    tasks: z.array(projectTaskSchema),
    updates: z.array(projectUpdateSchema),
    relatedPosts: z.array(projectRelatedPostSchema),
    progress: z.object({
      milestonesTotal: z.number().int(),
      milestonesCompleted: z.number().int(),
      tasksTotal: z.number().int(),
      tasksDone: z.number().int(),
    }),
  })
  .openapi('ProjectDashboard');

export const projectRoadmapSchema = z
  .object({
    creatorId: uuidSchema,
    projects: z.array(projectDashboardSchema),
  })
  .openapi('ProjectRoadmap');

export const listProjectsQuerySchema = z.object({
  creatorId: uuidSchema.optional(),
  includeArchived: z.coerce.boolean().default(false),
});

export const projectResponseSchema = z.object({ project: projectSchema });
export const projectsResponseSchema = z.object({ projects: z.array(projectSchema) });
export const projectDashboardResponseSchema = z.object({ dashboard: projectDashboardSchema });
export const projectMilestoneResponseSchema = z.object({ milestone: projectMilestoneSchema });
export const projectTaskResponseSchema = z.object({ task: projectTaskSchema });
export const projectUpdateResponseSchema = z.object({ update: projectUpdateSchema });
export const projectUpdatesResponseSchema = z.object({ updates: z.array(projectUpdateSchema) });
export const projectRelatedPostsResponseSchema = z.object({
  relatedPosts: z.array(projectRelatedPostSchema),
});
export const projectRoadmapResponseSchema = z.object({ roadmap: projectRoadmapSchema });

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateProjectMilestoneInput = z.infer<typeof createProjectMilestoneSchema>;
export type UpdateProjectMilestoneInput = z.infer<typeof updateProjectMilestoneSchema>;
export type CreateProjectTaskInput = z.infer<typeof createProjectTaskSchema>;
export type UpdateProjectTaskInput = z.infer<typeof updateProjectTaskSchema>;
export type CreateProjectUpdateInput = z.infer<typeof createProjectUpdateSchema>;
export type ReplaceProjectRelatedPostsInput = z.infer<typeof replaceProjectRelatedPostsSchema>;
