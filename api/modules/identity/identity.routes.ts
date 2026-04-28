import { createRoute, z } from '@hono/zod-openapi';
import { getCookie } from 'hono/cookie';
import {
  callbackQuerySchema,
  identityMeResponseSchema,
  loginUrlQuerySchema,
  loginUrlResponseSchema,
  logoutResponseSchema,
  logoutSchema,
  sessionRefreshResponseSchema,
} from '../../../shared/schemas/identity.schema';
import { AuthError } from '../../lib/errors';
import { createOpenApiRouter } from '../../lib/openapi';
import { authMiddleware } from '../../middleware/auth';
import {
  clearIdentitySessionCookie,
  IDENTITY_SESSION_COOKIE_NAME,
  setIdentitySessionCookie,
} from './identity.cookies';
import * as IdentityService from './identity.service';

const loginUrlRoute = createRoute({
  method: 'get',
  path: '/login-url',
  request: {
    query: loginUrlQuerySchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: loginUrlResponseSchema,
        },
      },
      description: 'OIDC authorization URL',
    },
  },
});

const callbackRoute = createRoute({
  method: 'get',
  path: '/callback',
  request: {
    query: callbackQuerySchema,
  },
  responses: {
    302: {
      description: 'Redirects to the saved return path',
    },
  },
});

const refreshRoute = createRoute({
  method: 'post',
  path: '/session/refresh',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: sessionRefreshResponseSchema,
        },
      },
      description: 'Identity session refreshed',
    },
  },
});

const logoutRoute = createRoute({
  method: 'post',
  path: '/logout',
  request: {
    body: {
      content: {
        'application/json': {
          schema: logoutSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: logoutResponseSchema,
        },
      },
      description: 'Identity logout completed',
    },
  },
});

const methodsRoute = createRoute({
  method: 'get',
  path: '/methods',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            enabled: z.boolean(),
            provider: z.literal('gxp-idProvider'),
          }),
        },
      },
      description: 'Identity provider availability',
    },
  },
});

const meRoute = createRoute({
  method: 'get',
  path: '/me',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: identityMeResponseSchema,
        },
      },
      description: 'Current identity user',
    },
  },
});

const publicIdentityRouter = createOpenApiRouter()
  .openapi(methodsRoute, (c) => {
    return c.json(
      {
        enabled: IdentityService.isIdentityProviderEnabled(),
        provider: 'gxp-idProvider' as const,
      },
      200
    );
  })
  .openapi(loginUrlRoute, async (c) => {
    const query = c.req.valid('query');
    const result = await IdentityService.createLoginUrl(query.returnTo);
    return c.json(result, 200);
  })
  .openapi(callbackRoute, async (c) => {
    const query = c.req.valid('query');
    const result = await IdentityService.completeCallback(
      { code: query.code, state: query.state, error: query.error },
      { userAgent: c.req.header('user-agent') }
    );
    setIdentitySessionCookie(c, result.sessionToken, result.expiresAt);
    return c.redirect(result.returnTo);
  })
  .openapi(refreshRoute, async (c) => {
    const sessionToken = getCookie(c, IDENTITY_SESSION_COOKIE_NAME);
    if (!sessionToken) {
      throw new AuthError('Missing identity session');
    }
    const result = await IdentityService.refreshSession(sessionToken);
    return c.json(result, 200);
  })
  .openapi(logoutRoute, async (c) => {
    const sessionToken = getCookie(c, IDENTITY_SESSION_COOKIE_NAME);
    const data = c.req.valid('json');
    const result = await IdentityService.logout(sessionToken, data.mode);
    clearIdentitySessionCookie(c);
    return c.json({ success: true, ...result }, 200);
  });

const protectedIdentityBase = createOpenApiRouter();
protectedIdentityBase.use('/me', authMiddleware());

const protectedIdentityRouter = protectedIdentityBase.openapi(meRoute, async (c) => {
  const sessionToken = getCookie(c, IDENTITY_SESSION_COOKIE_NAME);
  if (sessionToken) {
    const user = await IdentityService.getMeFromSessionToken(sessionToken);
    return c.json({ user }, 200);
  }

  const user = c.get('user');
  if (!user) {
    throw new AuthError('Unauthorized');
  }

  return c.json(
    {
      user: {
        id: user.userId,
        email: user.email,
        emailVerified: false,
        ...(user.idpSubject ? { idpSubject: user.idpSubject } : {}),
        capabilities: {
          canUseDashboard: true,
          canCreateCreatorProfile: true,
          canManageOwnCreator: true,
          canModerateOwnContent: true,
          canAccessAdmin: false,
          canAccessTrustOperations: false,
          canManageContentSafety: false,
          canManagePayments: false,
        },
      },
    },
    200
  );
});

export const identityRouter = createOpenApiRouter()
  .route('/', publicIdentityRouter)
  .route('/', protectedIdentityRouter);
