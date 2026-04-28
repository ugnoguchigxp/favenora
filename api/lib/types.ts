import type { Logger } from 'pino';

import { z } from 'zod';

export const jwtPayloadSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  type: z.enum(['access', 'refresh']),
  idpSubject: z.string().optional(),
  scopes: z.array(z.string()).optional(),
  tokenSource: z.enum(['local-jwt', 'identity-session', 'bearer']).optional(),
  capabilities: z
    .object({
      canAccessTrustOperations: z.boolean().optional(),
      canManageContentSafety: z.boolean().optional(),
      canManagePayments: z.boolean().optional(),
    })
    .optional(),
});

export type JWTPayload = z.infer<typeof jwtPayloadSchema>;

export type AppVariables = {
  logger: Logger;
  user?: JWTPayload;
};

export type AppEnv = {
  Variables: AppVariables;
};
