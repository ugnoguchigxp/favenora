import { getCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import { ACCESS_TOKEN_COOKIE_NAME } from '../lib/auth-cookies';
import { AuthError } from '../lib/errors';
import type { AppEnv } from '../lib/types';
import { IDENTITY_SESSION_COOKIE_NAME } from '../modules/identity/identity.cookies';
import * as IdentityService from '../modules/identity/identity.service';
import { verifyAccessToken } from '../services/token.service';

export const authMiddleware = () => {
  return createMiddleware<AppEnv>(async (c, next) => {
    const authHeader = c.req.header('Authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const cookieToken = getCookie(c, ACCESS_TOKEN_COOKIE_NAME);
    const identitySessionToken = getCookie(c, IDENTITY_SESSION_COOKIE_NAME);
    const token = bearerToken || cookieToken || identitySessionToken;

    if (!token) {
      throw new AuthError('Missing authentication token');
    }

    try {
      if (identitySessionToken && token === identitySessionToken) {
        const payload = await IdentityService.authenticateSessionToken(identitySessionToken);
        c.set('user', payload);
      } else {
        try {
          const payload = await verifyAccessToken(token);
          c.set('user', { ...payload, tokenSource: 'local-jwt' });
        } catch (error) {
          if (!bearerToken || !IdentityService.isIdentityProviderEnabled()) {
            throw error;
          }
          const payload = await IdentityService.authenticateBearerToken(bearerToken);
          c.set('user', payload);
        }
      }
    } catch {
      throw new AuthError('Invalid or expired token');
    }

    await next();
  });
};
