import type { Context } from 'hono';
import { deleteCookie, setCookie } from 'hono/cookie';
import { config } from '../../config';

export const IDENTITY_SESSION_COOKIE_NAME = 'favenora_session';

const isSecureCookie =
  config.NODE_ENV === 'production' || Boolean(config.APP_URL?.startsWith('https://'));

export const setIdentitySessionCookie = (c: Context, sessionToken: string, expiresAt: Date) => {
  setCookie(c, IDENTITY_SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: isSecureCookie,
    sameSite: config.COOKIE_SAME_SITE,
    path: '/',
    expires: expiresAt,
  });
};

export const clearIdentitySessionCookie = (c: Context) => {
  deleteCookie(c, IDENTITY_SESSION_COOKIE_NAME, { path: '/' });
};
