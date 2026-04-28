import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';

dotenvConfig(); // ensure env is loaded in Node.js, Bun might auto-load

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string(),
    JWT_SECRET: z.string().min(32),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
    AUTH_MODE: z.enum(['local', 'oauth', 'both']).default('both'),
    GXP_IDP_ISSUER: z.string().url().optional(),
    GXP_IDP_CLIENT_ID: z.string().trim().optional(),
    GXP_IDP_CLIENT_SECRET: z.string().trim().optional(),
    GXP_IDP_REDIRECT_URI: z.string().url().optional(),
    GXP_IDP_POST_LOGOUT_REDIRECT_URI: z.string().url().optional(),
    GXP_IDP_AUDIENCE: z.string().trim().optional(),
    GXP_IDP_SCOPES: z.string().default('openid profile email'),
    GXP_IDP_TIMEOUT_MS: z.coerce.number().int().positive().default(3000),
    STRIPE_SECRET_KEY: z.string().trim().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().trim().optional(),
    STRIPE_SUCCESS_URL: z.string().url().optional(),
    STRIPE_CANCEL_URL: z.string().url().optional(),
    STRIPE_BILLING_PORTAL_RETURN_URL: z.string().url().optional(),
    GOOGLE_CLIENT_ID: z.string().trim().optional(),
    GOOGLE_CLIENT_SECRET: z.string().trim().optional(),
    GITHUB_CLIENT_ID: z.string().trim().optional(),
    GITHUB_CLIENT_SECRET: z.string().trim().optional(),
    APP_URL: z.string().url().optional(),
    CORS_ORIGIN: z.string().default('http://localhost:5173'),
    COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    TRUST_PROXY: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    LOG_LEVEL: z.string().default('info'),
  })
  .superRefine((env, ctx) => {
    const hasGoogleId = Boolean(env.GOOGLE_CLIENT_ID);
    const hasGoogleSecret = Boolean(env.GOOGLE_CLIENT_SECRET);
    const hasGithubId = Boolean(env.GITHUB_CLIENT_ID);
    const hasGithubSecret = Boolean(env.GITHUB_CLIENT_SECRET);
    const hasGxpIssuer = Boolean(env.GXP_IDP_ISSUER);
    const hasGxpClientId = Boolean(env.GXP_IDP_CLIENT_ID);
    const hasGxpClientSecret = Boolean(env.GXP_IDP_CLIENT_SECRET);
    const hasGxpRedirectUri = Boolean(env.GXP_IDP_REDIRECT_URI);

    if (hasGoogleId !== hasGoogleSecret) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [hasGoogleId ? 'GOOGLE_CLIENT_SECRET' : 'GOOGLE_CLIENT_ID'],
        message: 'Set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET together.',
      });
    }

    if (hasGithubId !== hasGithubSecret) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [hasGithubId ? 'GITHUB_CLIENT_SECRET' : 'GITHUB_CLIENT_ID'],
        message: 'Set both GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET together.',
      });
    }

    const gxpIdpConfigured =
      hasGxpIssuer && hasGxpClientId && hasGxpClientSecret && hasGxpRedirectUri;
    const gxpIdpPartiallyConfigured =
      hasGxpIssuer || hasGxpClientId || hasGxpClientSecret || hasGxpRedirectUri;

    if (gxpIdpPartiallyConfigured && !gxpIdpConfigured) {
      for (const [key, present] of [
        ['GXP_IDP_ISSUER', hasGxpIssuer],
        ['GXP_IDP_CLIENT_ID', hasGxpClientId],
        ['GXP_IDP_CLIENT_SECRET', hasGxpClientSecret],
        ['GXP_IDP_REDIRECT_URI', hasGxpRedirectUri],
      ] as const) {
        if (!present) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message:
              'Set GXP_IDP_ISSUER, GXP_IDP_CLIENT_ID, GXP_IDP_CLIENT_SECRET, and GXP_IDP_REDIRECT_URI together.',
          });
        }
      }
    }

    const oauthProviderCount =
      Number(hasGoogleId && hasGoogleSecret) + Number(hasGithubId && hasGithubSecret);
    const oauthEnabled = env.AUTH_MODE === 'oauth' || env.AUTH_MODE === 'both';

    if (oauthEnabled && !env.APP_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['APP_URL'],
        message: 'APP_URL is required when AUTH_MODE is oauth or both.',
      });
    }

    if (env.AUTH_MODE === 'oauth' && oauthProviderCount === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['AUTH_MODE'],
        message:
          'AUTH_MODE is oauth, but no OAuth provider is configured. Set Google or GitHub client ID/secret.',
      });
    }

    const secureCookie =
      env.NODE_ENV === 'production' || Boolean(env.APP_URL?.toLowerCase().startsWith('https://'));
    if (env.COOKIE_SAME_SITE === 'none' && !secureCookie) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['COOKIE_SAME_SITE'],
        message:
          'COOKIE_SAME_SITE=none requires secure cookies. Use HTTPS APP_URL or set NODE_ENV=production.',
      });
    }
  });

const result = envSchema.safeParse(process.env);
if (!result.success) {
  console.error('❌ Invalid environment variables:');
  console.error(result.error.format());
  process.exit(1);
}

const corsOrigins = result.data.CORS_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

if (corsOrigins.length === 0 || corsOrigins.includes('*')) {
  console.error('❌ Invalid CORS_ORIGIN: wildcard (*) is not allowed. Use explicit origin list.');
  process.exit(1);
}

export const config = {
  ...result.data,
  CORS_ORIGINS: corsOrigins,
  GXP_IDP_ENABLED: Boolean(
    result.data.GXP_IDP_ISSUER &&
      result.data.GXP_IDP_CLIENT_ID &&
      result.data.GXP_IDP_CLIENT_SECRET &&
      result.data.GXP_IDP_REDIRECT_URI
  ),
  GXP_IDP_SCOPE_LIST: result.data.GXP_IDP_SCOPES.split(/\s+/)
    .map((scope) => scope.trim())
    .filter((scope) => scope.length > 0),
  GXP_IDP_AUDIENCE: result.data.GXP_IDP_AUDIENCE || result.data.GXP_IDP_CLIENT_ID,
  STRIPE_ENABLED: Boolean(result.data.STRIPE_SECRET_KEY),
};
