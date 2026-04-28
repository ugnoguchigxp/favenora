import { createRoute, z } from '@hono/zod-openapi';
import {
  createProjectMilestoneSchema,
  createProjectSchema,
  createProjectTaskSchema,
  createProjectUpdateSchema,
  listProjectsQuerySchema,
  projectDashboardResponseSchema,
  projectMilestoneResponseSchema,
  projectRelatedPostsResponseSchema,
  projectResponseSchema,
  projectRoadmapResponseSchema,
  projectsResponseSchema,
  projectTaskResponseSchema,
  projectUpdateResponseSchema,
  projectUpdatesResponseSchema,
  replaceProjectRelatedPostsSchema,
  updateProjectMilestoneSchema,
  updateProjectSchema,
  updateProjectTaskSchema,
} from '../../../shared/schemas/projects.schema';
import { AuthError } from '../../lib/errors';
import { createOpenApiRouter } from '../../lib/openapi';
import { authMiddleware } from '../../middleware/auth';
import * as ProjectsService from './projects.service';

const idParamSchema = z.object({ id: z.string().uuid() });
const nestedMilestoneParamSchema = z.object({
  id: z.string().uuid(),
  milestoneId: z.string().uuid(),
});
const nestedTaskParamSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
});

const userIdFromContext = (user: { userId: string } | undefined) => {
  if (!user) throw new AuthError('Unauthorized');
  return user.userId;
};

const listProjectsRoute = createRoute({
  method: 'get',
  path: '/',
  request: { query: listProjectsQuerySchema },
  responses: {
    200: {
      content: { 'application/json': { schema: projectsResponseSchema } },
      description: 'Projects',
    },
  },
});

const getProjectRoute = createRoute({
  method: 'get',
  path: '/:id',
  request: { params: idParamSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: projectDashboardResponseSchema } },
      description: 'Project dashboard',
    },
  },
});

const createProjectRoute = createRoute({
  method: 'post',
  path: '/',
  request: { body: { content: { 'application/json': { schema: createProjectSchema } } } },
  responses: {
    201: {
      content: { 'application/json': { schema: projectResponseSchema } },
      description: 'Project created',
    },
  },
});

const updateProjectRoute = createRoute({
  method: 'patch',
  path: '/:id',
  request: {
    params: idParamSchema,
    body: { content: { 'application/json': { schema: updateProjectSchema } } },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: projectResponseSchema } },
      description: 'Project updated',
    },
  },
});

const archiveProjectRoute = createRoute({
  method: 'post',
  path: '/:id/archive',
  request: { params: idParamSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: projectResponseSchema } },
      description: 'Project archived',
    },
  },
});

const createMilestoneRoute = createRoute({
  method: 'post',
  path: '/:id/milestones',
  request: {
    params: idParamSchema,
    body: { content: { 'application/json': { schema: createProjectMilestoneSchema } } },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: projectMilestoneResponseSchema } },
      description: 'Milestone created',
    },
  },
});

const updateMilestoneRoute = createRoute({
  method: 'patch',
  path: '/:id/milestones/:milestoneId',
  request: {
    params: nestedMilestoneParamSchema,
    body: { content: { 'application/json': { schema: updateProjectMilestoneSchema } } },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: projectMilestoneResponseSchema } },
      description: 'Milestone updated',
    },
  },
});

const createTaskRoute = createRoute({
  method: 'post',
  path: '/:id/tasks',
  request: {
    params: idParamSchema,
    body: { content: { 'application/json': { schema: createProjectTaskSchema } } },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: projectTaskResponseSchema } },
      description: 'Task created',
    },
  },
});

const updateTaskRoute = createRoute({
  method: 'patch',
  path: '/:id/tasks/:taskId',
  request: {
    params: nestedTaskParamSchema,
    body: { content: { 'application/json': { schema: updateProjectTaskSchema } } },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: projectTaskResponseSchema } },
      description: 'Task updated',
    },
  },
});

const createUpdateRoute = createRoute({
  method: 'post',
  path: '/:id/updates',
  request: {
    params: idParamSchema,
    body: { content: { 'application/json': { schema: createProjectUpdateSchema } } },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: projectUpdateResponseSchema } },
      description: 'Project update created',
    },
  },
});

const listUpdatesRoute = createRoute({
  method: 'get',
  path: '/:id/updates',
  request: { params: idParamSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: projectUpdatesResponseSchema } },
      description: 'Project updates',
    },
  },
});

const replaceRelatedPostsRoute = createRoute({
  method: 'put',
  path: '/:id/related-posts',
  request: {
    params: idParamSchema,
    body: { content: { 'application/json': { schema: replaceProjectRelatedPostsSchema } } },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: projectRelatedPostsResponseSchema } },
      description: 'Related posts replaced',
    },
  },
});

const roadmapRoute = createRoute({
  method: 'get',
  path: '/creators/:creatorId/roadmap',
  request: { params: z.object({ creatorId: z.string().uuid() }) },
  responses: {
    200: {
      content: { 'application/json': { schema: projectRoadmapResponseSchema } },
      description: 'Creator roadmap',
    },
  },
});

const publicProjects = createOpenApiRouter()
  .openapi(listProjectsRoute, async (c) => {
    const query = c.req.valid('query');
    const projects = await ProjectsService.listProjects(query);
    return c.json({ projects }, 200);
  })
  .openapi(getProjectRoute, async (c) => {
    const dashboard = await ProjectsService.getProjectDashboard(c.req.param('id'));
    return c.json(projectDashboardResponseSchema.parse({ dashboard }), 200);
  })
  .openapi(listUpdatesRoute, async (c) => {
    const updates = await ProjectsService.listUpdates(c.req.param('id'));
    return c.json(projectUpdatesResponseSchema.parse({ updates }), 200);
  });

const protectedBase = createOpenApiRouter();
protectedBase.use('*', authMiddleware());
const protectedProjects = protectedBase
  .openapi(createProjectRoute, async (c) => {
    const project = await ProjectsService.createProject(
      c.req.valid('json'),
      userIdFromContext(c.get('user'))
    );
    return c.json({ project }, 201);
  })
  .openapi(updateProjectRoute, async (c) => {
    const project = await ProjectsService.updateProject(
      c.req.param('id'),
      c.req.valid('json'),
      userIdFromContext(c.get('user'))
    );
    return c.json({ project }, 200);
  })
  .openapi(archiveProjectRoute, async (c) => {
    const project = await ProjectsService.archiveProject(
      c.req.param('id'),
      userIdFromContext(c.get('user'))
    );
    return c.json({ project }, 200);
  })
  .openapi(createMilestoneRoute, async (c) => {
    const milestone = await ProjectsService.createMilestone(
      c.req.param('id'),
      c.req.valid('json'),
      userIdFromContext(c.get('user'))
    );
    return c.json({ milestone }, 201);
  })
  .openapi(updateMilestoneRoute, async (c) => {
    const milestone = await ProjectsService.updateMilestone(
      c.req.param('id'),
      c.req.param('milestoneId'),
      c.req.valid('json'),
      userIdFromContext(c.get('user'))
    );
    return c.json({ milestone }, 200);
  })
  .openapi(createTaskRoute, async (c) => {
    const task = await ProjectsService.createTask(
      c.req.param('id'),
      c.req.valid('json'),
      userIdFromContext(c.get('user'))
    );
    return c.json({ task }, 201);
  })
  .openapi(updateTaskRoute, async (c) => {
    const task = await ProjectsService.updateTask(
      c.req.param('id'),
      c.req.param('taskId'),
      c.req.valid('json'),
      userIdFromContext(c.get('user'))
    );
    return c.json({ task }, 200);
  })
  .openapi(createUpdateRoute, async (c) => {
    const update = await ProjectsService.createUpdate(
      c.req.param('id'),
      c.req.valid('json'),
      userIdFromContext(c.get('user'))
    );
    return c.json(projectUpdateResponseSchema.parse({ update }), 201);
  })
  .openapi(replaceRelatedPostsRoute, async (c) => {
    const relatedPosts = await ProjectsService.replaceRelatedPosts(
      c.req.param('id'),
      c.req.valid('json'),
      userIdFromContext(c.get('user'))
    );
    return c.json({ relatedPosts }, 200);
  });

export const roadmapRouter = createOpenApiRouter().openapi(roadmapRoute, async (c) => {
  const roadmap = await ProjectsService.getCreatorRoadmap(c.req.param('creatorId'));
  return c.json(projectRoadmapResponseSchema.parse({ roadmap }), 200);
});

export const projectsRouter = createOpenApiRouter()
  .route('/', publicProjects)
  .route('/', protectedProjects);
