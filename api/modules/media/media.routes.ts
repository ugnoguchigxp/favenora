import { createRoute, z } from '@hono/zod-openapi';
import {
  completeUploadSchema,
  createExternalSourceSchema,
  createUploadIntentSchema,
  dashboardMediaResponseSchema,
  deliveryUrlQuerySchema,
  mediaAssetResponseSchema,
  mediaDeliveryUrlResponseSchema,
  mediaUploadIntentResponseSchema,
  mediaVariantsResponseSchema,
  updateMediaAssetSchema,
} from '../../../shared/schemas/media.schema';
import { AuthError, ForbiddenError } from '../../lib/errors';
import { createOpenApiRouter } from '../../lib/openapi';
import { authMiddleware } from '../../middleware/auth';
import { type MediaService, mediaService } from './media.service';

const mediaIdParamsSchema = z.object({
  id: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
});

const createUploadIntentRoute = createRoute({
  method: 'post',
  path: '/upload-intents',
  request: {
    body: {
      content: {
        'application/json': {
          schema: createUploadIntentSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: mediaUploadIntentResponseSchema,
        },
      },
      description: 'Upload intent created',
    },
  },
});

const completeUploadRoute = createRoute({
  method: 'post',
  path: '/:id/complete',
  request: {
    params: mediaIdParamsSchema,
    body: {
      content: {
        'application/json': {
          schema: completeUploadSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: mediaAssetResponseSchema,
        },
      },
      description: 'Upload completed',
    },
  },
});

const getAssetRoute = createRoute({
  method: 'get',
  path: '/:id',
  request: {
    params: mediaIdParamsSchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: mediaAssetResponseSchema,
        },
      },
      description: 'Media asset',
    },
    404: {
      description: 'Media asset not found',
    },
  },
});

const getDeliveryUrlRoute = createRoute({
  method: 'get',
  path: '/:id/delivery-url',
  request: {
    params: mediaIdParamsSchema,
    query: deliveryUrlQuerySchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: mediaDeliveryUrlResponseSchema,
        },
      },
      description: 'Short-lived delivery URL',
    },
  },
});

const getVariantsRoute = createRoute({
  method: 'get',
  path: '/:id/variants',
  request: {
    params: mediaIdParamsSchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: mediaVariantsResponseSchema,
        },
      },
      description: 'Media variants',
    },
  },
});

const createExternalSourceRoute = createRoute({
  method: 'post',
  path: '/external-sources',
  request: {
    body: {
      content: {
        'application/json': {
          schema: createExternalSourceSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: mediaAssetResponseSchema,
        },
      },
      description: 'External media source created',
    },
  },
});

const updateAssetRoute = createRoute({
  method: 'patch',
  path: '/:id',
  request: {
    params: mediaIdParamsSchema,
    body: {
      content: {
        'application/json': {
          schema: updateMediaAssetSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: mediaAssetResponseSchema,
        },
      },
      description: 'Media asset updated',
    },
  },
});

const deleteAssetRoute = createRoute({
  method: 'delete',
  path: '/:id',
  request: {
    params: mediaIdParamsSchema,
  },
  responses: {
    204: {
      description: 'Media asset deleted',
    },
  },
});

const dashboardMediaRoute = createRoute({
  method: 'get',
  path: '/media',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: dashboardMediaResponseSchema,
        },
      },
      description: 'Dashboard media library',
    },
  },
});

const requireUserId = (user: { userId: string } | undefined) => {
  if (!user) {
    throw new AuthError('Unauthorized');
  }
  return user.userId;
};

const assertUserOwnedRequest = (ownerId: string, userId: string) => {
  if (ownerId !== userId) {
    throw new ForbiddenError('Media owner must match authenticated user');
  }
};

export const createMediaRouter = (service: MediaService = mediaService) => {
  const protectedMediaBase = createOpenApiRouter();
  protectedMediaBase.use('*', authMiddleware());

  return protectedMediaBase
    .openapi(createUploadIntentRoute, async (c) => {
      const userId = requireUserId(c.get('user'));
      const data = c.req.valid('json');
      assertUserOwnedRequest(data.ownerId, userId);
      const result = await service.createUploadIntent(data);
      return c.json(result, 201);
    })
    .openapi(completeUploadRoute, async (c) => {
      const userId = requireUserId(c.get('user'));
      const asset = await service.completeUpload(c.req.param('id'), c.req.valid('json'), userId);
      return c.json({ asset }, 200);
    })
    .openapi(getAssetRoute, async (c) => {
      const userId = requireUserId(c.get('user'));
      const asset = await service.getAsset(c.req.param('id'), userId);
      return c.json({ asset }, 200);
    })
    .openapi(getDeliveryUrlRoute, async (c) => {
      const userId = requireUserId(c.get('user'));
      const deliveryUrl = await service.createDeliveryUrl(
        c.req.param('id'),
        c.req.valid('query'),
        userId
      );
      return c.json(deliveryUrl, 200);
    })
    .openapi(getVariantsRoute, async (c) => {
      const userId = requireUserId(c.get('user'));
      const variants = await service.listVariants(c.req.param('id'), userId);
      return c.json({ variants }, 200);
    })
    .openapi(createExternalSourceRoute, async (c) => {
      const userId = requireUserId(c.get('user'));
      const data = c.req.valid('json');
      assertUserOwnedRequest(data.ownerId, userId);
      const asset = await service.createExternalSource(data);
      return c.json({ asset }, 201);
    })
    .openapi(updateAssetRoute, async (c) => {
      const userId = requireUserId(c.get('user'));
      const asset = await service.updateAsset(c.req.param('id'), c.req.valid('json'), userId);
      return c.json({ asset }, 200);
    })
    .openapi(deleteAssetRoute, async (c) => {
      const userId = requireUserId(c.get('user'));
      await service.deleteAsset(c.req.param('id'), userId);
      return c.body(null, 204);
    });
};

export const createDashboardMediaRouter = (service: MediaService = mediaService) => {
  const protectedDashboardBase = createOpenApiRouter();
  protectedDashboardBase.use('*', authMiddleware());

  return protectedDashboardBase.openapi(dashboardMediaRoute, async (c) => {
    const userId = requireUserId(c.get('user'));
    const assets = await service.listDashboardMedia(userId);
    return c.json({ assets }, 200);
  });
};

export const mediaRouter = createMediaRouter();
export const dashboardMediaRouter = createDashboardMediaRouter();
