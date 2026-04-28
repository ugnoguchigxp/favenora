import { createRoute, z } from '@hono/zod-openapi';
import type { Context } from 'hono';
import { getCookie } from 'hono/cookie';
import {
  createPostCommentSchema,
  createPostDraftSchema,
  listPostsResponseSchema,
  postCommentSchema,
  postResponseSchema,
  postSchema,
  postViewerResponseSchema,
  publishPostSchema,
  schedulePostSchema,
  updatePostDraftSchema,
} from '../../../shared/schemas/posts.schema';
import { ACCESS_TOKEN_COOKIE_NAME } from '../../lib/auth-cookies';
import { AuthError } from '../../lib/errors';
import { createOpenApiRouter } from '../../lib/openapi';
import type { AppEnv } from '../../lib/types';
import { authMiddleware } from '../../middleware/auth';
import { verifyAccessToken } from '../../services/token.service';
import { IDENTITY_SESSION_COOKIE_NAME } from '../identity/identity.cookies';
import * as IdentityService from '../identity/identity.service';
import * as PostsService from './posts.service';

const idParamSchema = z.object({ id: z.string().uuid() });

const getOptionalUserId = async (c: Context<AppEnv>) => {
  const authHeader = c.req.header('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  const localCookieToken = getCookie(c, ACCESS_TOKEN_COOKIE_NAME);
  const identitySessionToken = getCookie(c, IDENTITY_SESSION_COOKIE_NAME);
  const token = bearerToken || localCookieToken || identitySessionToken;
  if (!token) return null;

  try {
    if (identitySessionToken && token === identitySessionToken) {
      return (await IdentityService.authenticateSessionToken(identitySessionToken)).userId;
    }
    const payload = await verifyAccessToken(token);
    return payload.userId;
  } catch {
    if (!bearerToken || !IdentityService.isIdentityProviderEnabled()) {
      return null;
    }
    try {
      return (await IdentityService.authenticateBearerToken(bearerToken)).userId;
    } catch {
      return null;
    }
  }
};

const listPostsRoute = createRoute({
  method: 'get',
  path: '/',
  request: {
    query: z.object({
      creatorId: z.string().uuid().optional(),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: listPostsResponseSchema } },
      description: 'Published posts',
    },
  },
});

const getPostRoute = createRoute({
  method: 'get',
  path: '/:id',
  request: { params: idParamSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: postResponseSchema } },
      description: 'Post metadata',
    },
  },
});

const getViewerRoute = createRoute({
  method: 'get',
  path: '/:id/viewer',
  request: {
    params: idParamSchema,
    query: z.object({ allowAgeRestricted: z.coerce.boolean().optional() }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: postViewerResponseSchema } },
      description: 'Post viewer response',
    },
  },
});

const createPostRoute = createRoute({
  method: 'post',
  path: '/',
  request: {
    body: { content: { 'application/json': { schema: createPostDraftSchema } } },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: postSchema } },
      description: 'Draft created',
    },
  },
});

const updatePostRoute = createRoute({
  method: 'patch',
  path: '/:id',
  request: {
    params: idParamSchema,
    body: { content: { 'application/json': { schema: updatePostDraftSchema } } },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: postSchema } },
      description: 'Post updated',
    },
  },
});

const deletePostRoute = createRoute({
  method: 'delete',
  path: '/:id',
  request: { params: idParamSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: postSchema } },
      description: 'Post archived',
    },
  },
});

const publishPostRoute = createRoute({
  method: 'post',
  path: '/:id/publish',
  request: {
    params: idParamSchema,
    body: { content: { 'application/json': { schema: publishPostSchema } } },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: postSchema } },
      description: 'Post published',
    },
  },
});

const schedulePostRoute = createRoute({
  method: 'post',
  path: '/:id/schedule',
  request: {
    params: idParamSchema,
    body: { content: { 'application/json': { schema: schedulePostSchema } } },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: postSchema } },
      description: 'Post scheduled',
    },
  },
});

const createCommentRoute = createRoute({
  method: 'post',
  path: '/:id/comments',
  request: {
    params: idParamSchema,
    body: { content: { 'application/json': { schema: createPostCommentSchema } } },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: postCommentSchema } },
      description: 'Comment created',
    },
  },
});

const publicPosts = createOpenApiRouter()
  .openapi(listPostsRoute, async (c) => {
    const query = c.req.valid('query');
    const viewerId = await getOptionalUserId(c);
    const posts = await PostsService.listPosts({ creatorId: query.creatorId, viewerId });
    return c.json(listPostsResponseSchema.parse({ posts }), 200);
  })
  .openapi(getPostRoute, async (c) => {
    const viewerId = await getOptionalUserId(c);
    const post = await PostsService.getPost(c.req.param('id'), viewerId);
    return c.json(postResponseSchema.parse({ post }), 200);
  })
  .openapi(getViewerRoute, async (c) => {
    const query = c.req.valid('query');
    const viewerId = await getOptionalUserId(c);
    const viewer = await PostsService.getViewer(
      c.req.param('id'),
      viewerId,
      query.allowAgeRestricted
    );
    return c.json(postViewerResponseSchema.parse({ viewer }), 200);
  });

const protectedPostsBase = createOpenApiRouter();
protectedPostsBase.use('*', authMiddleware());
const protectedPosts = protectedPostsBase
  .openapi(createPostRoute, async (c) => {
    const user = c.get('user');
    if (!user) throw new AuthError();
    const post = await PostsService.createDraft(c.req.valid('json'), user.userId);
    return c.json(postSchema.parse(post), 201);
  })
  .openapi(updatePostRoute, async (c) => {
    const user = c.get('user');
    if (!user) throw new AuthError();
    const post = await PostsService.updateDraft(
      c.req.param('id'),
      c.req.valid('json'),
      user.userId
    );
    return c.json(postSchema.parse(post), 200);
  })
  .openapi(deletePostRoute, async (c) => {
    const user = c.get('user');
    if (!user) throw new AuthError();
    const post = await PostsService.archivePost(c.req.param('id'), user.userId);
    return c.json(postSchema.parse(post), 200);
  })
  .openapi(publishPostRoute, async (c) => {
    const user = c.get('user');
    if (!user) throw new AuthError();
    const post = await PostsService.publishPost(
      c.req.param('id'),
      c.req.valid('json'),
      user.userId
    );
    return c.json(postSchema.parse(post), 200);
  })
  .openapi(schedulePostRoute, async (c) => {
    const user = c.get('user');
    if (!user) throw new AuthError();
    const post = await PostsService.schedulePost(
      c.req.param('id'),
      c.req.valid('json'),
      user.userId
    );
    return c.json(postSchema.parse(post), 200);
  })
  .openapi(createCommentRoute, async (c) => {
    const user = c.get('user');
    if (!user) throw new AuthError();
    const comment = await PostsService.createComment(
      c.req.param('id'),
      c.req.valid('json'),
      user.userId
    );
    return c.json(postCommentSchema.parse(comment), 201);
  });

export const postsRouter = createOpenApiRouter().route('/', publicPosts).route('/', protectedPosts);
