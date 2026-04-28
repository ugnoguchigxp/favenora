import { createRoute, z } from '@hono/zod-openapi';
import {
  createCreatorProfileSchema,
  dashboardCreatorProfileResponseSchema,
  listCreatorsQuerySchema,
  listCreatorsResponseSchema,
  publicCreatorProfileResponseSchema,
  replaceCreatorLinksSchema,
  replaceCreatorPortfolioSchema,
  updateCreatorProfileSchema,
} from '../../../shared/schemas/creators.schema';
import { AuthError } from '../../lib/errors';
import { createOpenApiRouter } from '../../lib/openapi';
import { authMiddleware } from '../../middleware/auth';
import * as CreatorsService from './creators.service';

const uuidParamSchema = z.object({
  id: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
});

const listCreatorsRoute = createRoute({
  method: 'get',
  path: '/',
  request: {
    query: listCreatorsQuerySchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: listCreatorsResponseSchema,
        },
      },
      description: 'Published creator profiles',
    },
  },
});

const getCreatorRoute = createRoute({
  method: 'get',
  path: '/:slug',
  request: {
    params: z.object({
      slug: z.string().openapi({ example: 'favorite-creator' }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: publicCreatorProfileResponseSchema,
        },
      },
      description: 'Public creator profile',
    },
    404: {
      description: 'Creator not found',
    },
  },
});

const getMyCreatorRoute = createRoute({
  method: 'get',
  path: '/me',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: dashboardCreatorProfileResponseSchema,
        },
      },
      description: 'Dashboard creator profile for the authenticated user',
    },
    404: {
      description: 'Creator profile not found',
    },
  },
});

const createMyCreatorRoute = createRoute({
  method: 'post',
  path: '/me',
  request: {
    body: {
      content: {
        'application/json': {
          schema: createCreatorProfileSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: dashboardCreatorProfileResponseSchema,
        },
      },
      description: 'Creator profile created',
    },
  },
});

const updateMyCreatorRoute = createRoute({
  method: 'patch',
  path: '/me',
  request: {
    body: {
      content: {
        'application/json': {
          schema: updateCreatorProfileSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: dashboardCreatorProfileResponseSchema,
        },
      },
      description: 'Creator profile updated',
    },
  },
});

const publishMyCreatorRoute = createRoute({
  method: 'post',
  path: '/me/publish',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: dashboardCreatorProfileResponseSchema,
        },
      },
      description: 'Creator profile submitted for publication',
    },
  },
});

const replaceMyLinksRoute = createRoute({
  method: 'put',
  path: '/me/links',
  request: {
    body: {
      content: {
        'application/json': {
          schema: replaceCreatorLinksSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: dashboardCreatorProfileResponseSchema,
        },
      },
      description: 'Creator profile links replaced',
    },
  },
});

const replaceMyPortfolioRoute = createRoute({
  method: 'put',
  path: '/me/portfolio',
  request: {
    body: {
      content: {
        'application/json': {
          schema: replaceCreatorPortfolioSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: dashboardCreatorProfileResponseSchema,
        },
      },
      description: 'Creator portfolio items replaced',
    },
  },
});

const followCreatorRoute = createRoute({
  method: 'post',
  path: '/:id/follow',
  request: {
    params: uuidParamSchema,
  },
  responses: {
    204: {
      description: 'Creator followed',
    },
  },
});

const unfollowCreatorRoute = createRoute({
  method: 'delete',
  path: '/:id/follow',
  request: {
    params: uuidParamSchema,
  },
  responses: {
    204: {
      description: 'Creator unfollowed',
    },
  },
});

const userIdFromContext = (user: { userId: string } | undefined) => {
  if (!user) throw new AuthError('Unauthorized');
  return user.userId;
};

const protectedCreatorsBase = createOpenApiRouter();
protectedCreatorsBase.use('*', authMiddleware());

const protectedCreators = protectedCreatorsBase
  .openapi(getMyCreatorRoute, async (c) => {
    const userId = userIdFromContext(c.get('user'));
    const creator = await CreatorsService.getMyCreatorProfile(userId);
    return c.json({ creator }, 200);
  })
  .openapi(createMyCreatorRoute, async (c) => {
    const userId = userIdFromContext(c.get('user'));
    const data = c.req.valid('json');
    const creator = await CreatorsService.createCreatorProfile(data, userId);
    return c.json({ creator }, 201);
  })
  .openapi(updateMyCreatorRoute, async (c) => {
    const userId = userIdFromContext(c.get('user'));
    const data = c.req.valid('json');
    const creator = await CreatorsService.updateMyCreatorProfile(data, userId);
    return c.json({ creator }, 200);
  })
  .openapi(publishMyCreatorRoute, async (c) => {
    const userId = userIdFromContext(c.get('user'));
    const creator = await CreatorsService.publishMyCreatorProfile(userId);
    return c.json({ creator }, 200);
  })
  .openapi(replaceMyLinksRoute, async (c) => {
    const userId = userIdFromContext(c.get('user'));
    const data = c.req.valid('json');
    const creator = await CreatorsService.replaceMyCreatorLinks(data, userId);
    return c.json({ creator }, 200);
  })
  .openapi(replaceMyPortfolioRoute, async (c) => {
    const userId = userIdFromContext(c.get('user'));
    const data = c.req.valid('json');
    const creator = await CreatorsService.replaceMyCreatorPortfolio(data, userId);
    return c.json({ creator }, 200);
  })
  .openapi(followCreatorRoute, async (c) => {
    const userId = userIdFromContext(c.get('user'));
    const id = c.req.param('id');
    await CreatorsService.followCreator(id, userId);
    return c.body(null, 204);
  })
  .openapi(unfollowCreatorRoute, async (c) => {
    const userId = userIdFromContext(c.get('user'));
    const id = c.req.param('id');
    await CreatorsService.unfollowCreator(id, userId);
    return c.body(null, 204);
  });

const publicCreators = createOpenApiRouter()
  .openapi(listCreatorsRoute, async (c) => {
    const { limit } = c.req.valid('query');
    const creators = await CreatorsService.listCreators(limit);
    return c.json({ creators }, 200);
  })
  .openapi(getCreatorRoute, async (c) => {
    const slug = c.req.param('slug');
    const creator = await CreatorsService.getCreatorBySlug(slug);
    return c.json({ creator }, 200);
  });

export const creatorsRouter = createOpenApiRouter()
  .route('/', protectedCreators)
  .route('/', publicCreators);
