import { z } from '@hono/zod-openapi';

export const authCapabilitiesSchema = z
  .object({
    canUseDashboard: z.boolean(),
    canCreateCreatorProfile: z.boolean(),
    canManageOwnCreator: z.boolean(),
    canModerateOwnContent: z.boolean(),
    canAccessAdmin: z.boolean(),
    canAccessTrustOperations: z.boolean(),
    canManageContentSafety: z.boolean(),
    canManagePayments: z.boolean(),
  })
  .openapi('AuthCapabilities');

export const identityUserSchema = z
  .object({
    id: z.string().uuid(),
    email: z.string().email(),
    emailVerified: z.boolean(),
    idpSubject: z.string().optional(),
    capabilities: authCapabilitiesSchema,
  })
  .openapi('IdentityUser');

export const loginUrlQuerySchema = z
  .object({
    returnTo: z.string().optional().openapi({ example: '/dashboard' }),
  })
  .openapi('IdentityLoginUrlQuery');

export const loginUrlResponseSchema = z
  .object({
    url: z.string().url(),
  })
  .openapi('IdentityLoginUrlResponse');

export const callbackQuerySchema = z
  .object({
    code: z.string().optional(),
    state: z.string().optional(),
    error: z.string().optional(),
    error_description: z.string().optional(),
  })
  .openapi('IdentityCallbackQuery');

export const identityMeResponseSchema = z
  .object({
    user: identityUserSchema,
  })
  .openapi('IdentityMeResponse');

export const sessionRefreshResponseSchema = z
  .object({
    user: identityUserSchema,
  })
  .openapi('IdentitySessionRefreshResponse');

export const logoutSchema = z
  .object({
    mode: z.enum(['local', 'global']).default('local'),
  })
  .openapi('IdentityLogoutInput');

export const logoutResponseSchema = z
  .object({
    success: z.boolean(),
    logoutUrl: z.string().url().optional(),
    warnings: z.array(z.string()).default([]),
  })
  .openapi('IdentityLogoutResponse');

export type AuthCapabilities = z.infer<typeof authCapabilitiesSchema>;
export type IdentityUser = z.infer<typeof identityUserSchema>;
export type LoginUrlQuery = z.infer<typeof loginUrlQuerySchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
