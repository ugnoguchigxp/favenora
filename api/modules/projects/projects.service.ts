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
import { ForbiddenError, NotFoundError } from '../../lib/errors';
import * as CreatorsRepository from '../creators/creators.repository';
import * as ProjectsRepository from './projects.repository';

const getOwnedCreator = async (userId: string) => {
  const creator = await CreatorsRepository.findCreatorByUserId(userId);
  if (!creator) throw new NotFoundError('Creator profile not found');
  return creator;
};

const assertProjectWriteAccess = async (projectId: string, userId: string) => {
  const project = await ProjectsRepository.findProjectById(projectId);
  if (!project) throw new NotFoundError('Project not found');

  const creator = await CreatorsRepository.findCreatorById(project.creatorId);
  if (creator?.userId === userId) return project;

  const collaborator = await ProjectsRepository.findCollaborator(projectId, userId);
  if (collaborator && ['owner', 'editor'].includes(collaborator.role)) return project;

  throw new ForbiddenError('Project is not editable by this user');
};

const filterVisibleUpdates = (
  updates: Awaited<ReturnType<typeof ProjectsRepository.listUpdates>>,
  options: { isOwner: boolean; isSupporter?: boolean }
) => {
  if (options.isOwner) return updates;
  return updates.filter((update) => {
    if (!update.publishedAt) return false;
    if (update.visibility === 'public') return true;
    if (update.visibility === 'supporters') return options.isSupporter;
    return false;
  });
};

const buildDashboard = async (
  project: NonNullable<Awaited<ReturnType<typeof ProjectsRepository.findProjectById>>>,
  options: { isOwner?: boolean; isSupporter?: boolean } = {}
) => {
  const [milestones, tasks, updates, relatedPosts] = await Promise.all([
    ProjectsRepository.listMilestones(project.id),
    ProjectsRepository.listTasks(project.id),
    ProjectsRepository.listUpdates(project.id),
    ProjectsRepository.listRelatedPosts(project.id),
  ]);

  return {
    project,
    milestones,
    tasks,
    updates: filterVisibleUpdates(updates, {
      isOwner: options.isOwner ?? true,
      isSupporter: options.isSupporter,
    }),
    relatedPosts,
    progress: {
      milestonesTotal: milestones.length,
      milestonesCompleted: milestones.filter((milestone) => milestone.status === 'completed')
        .length,
      tasksTotal: tasks.length,
      tasksDone: tasks.filter((task) => task.status === 'done').length,
    },
  };
};

export const listProjects = async (input: {
  creatorId?: string;
  includeArchived?: boolean;
  userId?: string;
}) => {
  if (input.creatorId) {
    return ProjectsRepository.listProjects({
      creatorId: input.creatorId,
      includeArchived: input.includeArchived,
    });
  }
  if (!input.userId) {
    return ProjectsRepository.listProjects({ includeArchived: input.includeArchived });
  }
  const creator = await getOwnedCreator(input.userId);
  return ProjectsRepository.listProjects({
    creatorId: creator.id,
    includeArchived: input.includeArchived,
  });
};

export const getProjectDashboard = async (id: string, userId?: string) => {
  const project = await ProjectsRepository.findProjectById(id);
  if (!project) throw new NotFoundError('Project not found');
  const creator = await CreatorsRepository.findCreatorById(project.creatorId);
  const isOwner = Boolean(userId && creator?.userId === userId);
  if (!isOwner && project.status === 'archived') throw new NotFoundError('Project not found');
  if (!isOwner && project.visibility === 'private') throw new NotFoundError('Project not found');
  return buildDashboard(project, { isOwner });
};

export const createProject = async (input: CreateProjectInput, userId: string) => {
  const creator = await getOwnedCreator(userId);
  return ProjectsRepository.insertProject(creator.id, input);
};

export const updateProject = async (id: string, input: UpdateProjectInput, userId: string) => {
  await assertProjectWriteAccess(id, userId);
  const project = await ProjectsRepository.updateProject(id, input);
  if (!project) throw new NotFoundError('Project not found');
  return project;
};

export const archiveProject = async (id: string, userId: string) => {
  await assertProjectWriteAccess(id, userId);
  const project = await ProjectsRepository.archiveProject(id);
  if (!project) throw new NotFoundError('Project not found');
  return project;
};

export const createMilestone = async (
  projectId: string,
  input: CreateProjectMilestoneInput,
  userId: string
) => {
  await assertProjectWriteAccess(projectId, userId);
  return ProjectsRepository.insertMilestone(projectId, input);
};

export const updateMilestone = async (
  projectId: string,
  milestoneId: string,
  input: UpdateProjectMilestoneInput,
  userId: string
) => {
  await assertProjectWriteAccess(projectId, userId);
  const milestone = await ProjectsRepository.updateMilestone(milestoneId, projectId, input);
  if (!milestone) throw new NotFoundError('Milestone not found');
  return milestone;
};

export const createTask = async (
  projectId: string,
  input: CreateProjectTaskInput,
  userId: string
) => {
  await assertProjectWriteAccess(projectId, userId);
  return ProjectsRepository.insertTask(projectId, input);
};

export const updateTask = async (
  projectId: string,
  taskId: string,
  input: UpdateProjectTaskInput,
  userId: string
) => {
  await assertProjectWriteAccess(projectId, userId);
  const task = await ProjectsRepository.updateTask(taskId, projectId, input);
  if (!task) throw new NotFoundError('Task not found');
  return task;
};

export const createUpdate = async (
  projectId: string,
  input: CreateProjectUpdateInput,
  userId: string
) => {
  await assertProjectWriteAccess(projectId, userId);
  return ProjectsRepository.insertUpdate(projectId, input, userId);
};

export const listUpdates = async (projectId: string, userId?: string) => {
  const project = await ProjectsRepository.findProjectById(projectId);
  if (!project) throw new NotFoundError('Project not found');
  const creator = await CreatorsRepository.findCreatorById(project.creatorId);
  const isOwner = Boolean(userId && creator?.userId === userId);
  const updates = await ProjectsRepository.listUpdates(projectId);
  return filterVisibleUpdates(updates, { isOwner });
};

export const replaceRelatedPosts = async (
  projectId: string,
  input: ReplaceProjectRelatedPostsInput,
  userId: string
) => {
  await assertProjectWriteAccess(projectId, userId);
  return ProjectsRepository.replaceRelatedPosts(projectId, input);
};

export const getCreatorRoadmap = async (creatorId: string, userId?: string) => {
  const creator = await CreatorsRepository.findCreatorById(creatorId);
  if (!creator) throw new NotFoundError('Creator not found');
  const isOwner = userId === creator.userId;
  const projects = await ProjectsRepository.listProjects({ creatorId, includeArchived: isOwner });
  const visible = projects.filter((project) => {
    if (isOwner) return true;
    return project.status !== 'archived' && project.visibility !== 'private';
  });
  const dashboards = await Promise.all(
    visible.map((project) => buildDashboard(project, { isOwner }))
  );
  return { creatorId, projects: dashboards };
};
