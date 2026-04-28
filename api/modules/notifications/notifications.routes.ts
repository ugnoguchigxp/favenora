import { createRoute, z } from '@hono/zod-openapi';
import {
  notificationDeviceResponseSchema,
  notificationDigestPreferencesResponseSchema,
  notificationPreferencesResponseSchema,
  notificationsResponseSchema,
  registerNotificationDeviceSchema,
  unreadCountResponseSchema,
  updateDigestPreferenceSchema,
  updateNotificationPreferenceSchema,
} from '../../../shared/schemas/notifications.schema';
import { AuthError } from '../../lib/errors';
import { createOpenApiRouter } from '../../lib/openapi';
import { authMiddleware } from '../../middleware/auth';
import { notificationsService } from './notifications.service';

const idParamSchema = z.object({ id: z.string().uuid() });
const requireUserId = (user: { userId: string } | undefined) => {
  if (!user) throw new AuthError();
  return user.userId;
};

const listRoute = createRoute({
  method: 'get',
  path: '/',
  request: { query: z.object({ limit: z.coerce.number().int().min(1).max(100).default(50) }) },
  responses: {
    200: {
      content: { 'application/json': { schema: notificationsResponseSchema } },
      description: 'Notifications',
    },
  },
});

const unreadCountRoute = createRoute({
  method: 'get',
  path: '/unread-count',
  responses: {
    200: {
      content: { 'application/json': { schema: unreadCountResponseSchema } },
      description: 'Unread notification count',
    },
  },
});

const markReadRoute = createRoute({
  method: 'post',
  path: '/:id/read',
  request: { params: idParamSchema },
  responses: { 200: { description: 'Notification marked read' } },
});

const readAllRoute = createRoute({
  method: 'post',
  path: '/read-all',
  responses: { 200: { description: 'Notifications marked read' } },
});

const archiveRoute = createRoute({
  method: 'post',
  path: '/:id/archive',
  request: { params: idParamSchema },
  responses: { 200: { description: 'Notification archived' } },
});

const preferencesRoute = createRoute({
  method: 'get',
  path: '/preferences',
  responses: {
    200: {
      content: { 'application/json': { schema: notificationPreferencesResponseSchema } },
      description: 'Notification preferences',
    },
  },
});

const updatePreferenceRoute = createRoute({
  method: 'patch',
  path: '/preferences',
  request: {
    body: { content: { 'application/json': { schema: updateNotificationPreferenceSchema } } },
  },
  responses: { 200: { description: 'Notification preference updated' } },
});

const digestPreferencesRoute = createRoute({
  method: 'get',
  path: '/digest-preferences',
  responses: {
    200: {
      content: { 'application/json': { schema: notificationDigestPreferencesResponseSchema } },
      description: 'Digest preferences',
    },
  },
});

const updateDigestPreferenceRoute = createRoute({
  method: 'patch',
  path: '/digest-preferences',
  request: {
    body: { content: { 'application/json': { schema: updateDigestPreferenceSchema } } },
  },
  responses: { 200: { description: 'Digest preference updated' } },
});

const registerDeviceRoute = createRoute({
  method: 'post',
  path: '/devices',
  request: {
    body: { content: { 'application/json': { schema: registerNotificationDeviceSchema } } },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: notificationDeviceResponseSchema } },
      description: 'Notification device registered',
    },
  },
});

const revokeDeviceRoute = createRoute({
  method: 'delete',
  path: '/devices/:id',
  request: { params: idParamSchema },
  responses: { 200: { description: 'Notification device revoked' } },
});

const protectedBase = createOpenApiRouter();
protectedBase.use('*', authMiddleware());

export const notificationsRouter = protectedBase
  .openapi(listRoute, async (c) => {
    const notifications = await notificationsService.listNotifications(
      requireUserId(c.get('user')),
      c.req.valid('query').limit
    );
    return c.json(notificationsResponseSchema.parse({ notifications }), 200);
  })
  .openapi(unreadCountRoute, async (c) => {
    const count = await notificationsService.countUnread(requireUserId(c.get('user')));
    return c.json({ count }, 200);
  })
  .openapi(markReadRoute, async (c) => {
    const notification = await notificationsService.markRead(
      requireUserId(c.get('user')),
      c.req.param('id')
    );
    return c.json(notification, 200);
  })
  .openapi(readAllRoute, async (c) => {
    const notifications = await notificationsService.markAllRead(requireUserId(c.get('user')));
    return c.json(notificationsResponseSchema.parse({ notifications }), 200);
  })
  .openapi(archiveRoute, async (c) => {
    const notification = await notificationsService.archive(
      requireUserId(c.get('user')),
      c.req.param('id')
    );
    return c.json(notification, 200);
  })
  .openapi(preferencesRoute, async (c) => {
    const preferences = await notificationsService.listPreferences(requireUserId(c.get('user')));
    return c.json(notificationPreferencesResponseSchema.parse({ preferences }), 200);
  })
  .openapi(updatePreferenceRoute, async (c) => {
    return c.json(
      await notificationsService.updatePreference(
        requireUserId(c.get('user')),
        c.req.valid('json')
      ),
      200
    );
  })
  .openapi(digestPreferencesRoute, async (c) => {
    const preferences = await notificationsService.listDigestPreferences(
      requireUserId(c.get('user'))
    );
    return c.json(notificationDigestPreferencesResponseSchema.parse({ preferences }), 200);
  })
  .openapi(updateDigestPreferenceRoute, async (c) => {
    return c.json(
      await notificationsService.updateDigestPreference(
        requireUserId(c.get('user')),
        c.req.valid('json')
      ),
      200
    );
  })
  .openapi(registerDeviceRoute, async (c) => {
    const device = await notificationsService.registerDevice(
      requireUserId(c.get('user')),
      c.req.valid('json')
    );
    return c.json(notificationDeviceResponseSchema.parse({ device }), 201);
  })
  .openapi(revokeDeviceRoute, async (c) => {
    return c.json(
      await notificationsService.revokeDevice(requireUserId(c.get('user')), c.req.param('id')),
      200
    );
  });
