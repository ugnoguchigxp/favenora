import { randomBytes } from 'node:crypto';
import {
  createJwtVerifier,
  createServerSdkClient,
  type ServerSdkClient,
  type SessionIdentity,
  type TokenSet,
  type VerifiedServiceAccessToken,
} from '@idp/server-sdk';
import type { AuthCapabilities, IdentityUser } from '../../../shared/schemas/identity.schema';
import { config } from '../../config';
import { type DbTransaction, db } from '../../db/client';
import { AuthError, ValidationError } from '../../lib/errors';
import type { JWTPayload } from '../../lib/types';
import { decryptSecret, encryptSecret, hashClaims, hashToken } from './identity.crypto';
import * as IdentityRepository from './identity.repository';

const provider = 'gxp-idProvider';
const oidcStateTtlMs = 10 * 60 * 1000;

type RequestMeta = {
  userAgent?: string;
  ipHash?: string;
};

const nowPlusSeconds = (seconds: number): Date => new Date(Date.now() + seconds * 1000);

const randomToken = (): string => randomBytes(32).toString('base64url');

const ensureEnabled = () => {
  if (
    !config.GXP_IDP_ENABLED ||
    !config.GXP_IDP_ISSUER ||
    !config.GXP_IDP_CLIENT_ID ||
    !config.GXP_IDP_CLIENT_SECRET ||
    !config.GXP_IDP_REDIRECT_URI ||
    !config.GXP_IDP_AUDIENCE
  ) {
    throw new ValidationError('gxp-idProvider is not configured');
  }
};

let sdkClient: ServerSdkClient | undefined;
const getSdkClient = () => {
  ensureEnabled();
  sdkClient ??= createServerSdkClient({
    issuer: config.GXP_IDP_ISSUER as string,
    clientId: config.GXP_IDP_CLIENT_ID as string,
    clientSecret: config.GXP_IDP_CLIENT_SECRET as string,
    timeoutMs: config.GXP_IDP_TIMEOUT_MS,
  });
  return sdkClient;
};

let jwtVerifier: ReturnType<typeof createJwtVerifier> | undefined;
const getJwtVerifier = () => {
  ensureEnabled();
  jwtVerifier ??= createJwtVerifier({
    issuer: config.GXP_IDP_ISSUER as string,
    audience: config.GXP_IDP_AUDIENCE as string,
    timeoutMs: config.GXP_IDP_TIMEOUT_MS,
  });
  return jwtVerifier;
};

const safeReturnTo = (returnTo?: string): string => {
  if (!returnTo) return '/';
  if (!returnTo.startsWith('/') || returnTo.startsWith('//')) return '/';
  if (returnTo.startsWith('/api/')) return '/';
  return returnTo;
};

const fallbackEmailForSubject = (subject: string): string => {
  const suffix = hashToken(subject).slice(0, 16);
  return `identity-${suffix}@idp.local`;
};

const displayNameFromClaims = (
  identity: Pick<SessionIdentity, 'email' | 'claims'> & { userId: string }
): string => {
  const name = identity.claims.name;
  if (typeof name === 'string' && name.trim()) return name.trim();
  const preferredUsername = identity.claims.preferred_username;
  if (typeof preferredUsername === 'string' && preferredUsername.trim()) {
    return preferredUsername.trim();
  }
  return identity.email ?? `user-${identity.userId.slice(0, 8)}`;
};

const stringList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  if (typeof value === 'string') {
    return value
      .split(' ')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const buildCapabilities = (permissions: string[], isActive: boolean): AuthCapabilities => {
  const has = (permission: string) => permissions.includes(permission);
  const hasAny = (...values: string[]) => values.some(has);

  return {
    canUseDashboard: isActive,
    canCreateCreatorProfile: isActive,
    canManageOwnCreator: isActive,
    canModerateOwnContent: isActive,
    canAccessAdmin: isActive && hasAny('admin', 'favenora:admin'),
    canAccessTrustOperations: isActive && hasAny('trust:operate', 'favenora:trust-operations'),
    canManageContentSafety: isActive && hasAny('content-safety:manage', 'favenora:content-safety'),
    canManagePayments: isActive && hasAny('payments:manage', 'favenora:payments'),
  };
};

const toIdentityUser = (input: {
  user: IdentityRepository.IdentityUserRow;
  idpSubject?: string;
  permissions?: string[];
}): IdentityUser => {
  const permissions = input.permissions ?? [];
  return {
    id: input.user.id,
    email: input.user.email,
    emailVerified: input.user.emailVerified,
    ...(input.idpSubject ? { idpSubject: input.idpSubject } : {}),
    capabilities: buildCapabilities(permissions, input.user.isActive),
  };
};

const tokenSetExpiresAt = (tokens: Pick<TokenSet, 'expiresIn'>): Date => {
  const minimumSessionSeconds = tokens.expiresIn;
  const refreshSessionSeconds =
    tokens.expiresIn < 24 * 60 * 60 ? 7 * 24 * 60 * 60 : tokens.expiresIn;
  return nowPlusSeconds(Math.max(minimumSessionSeconds, refreshSessionSeconds));
};

const upsertUserForIdentity = async (
  identity: Pick<SessionIdentity, 'userId' | 'email' | 'emailVerified' | 'permissions' | 'claims'>,
  tx?: DbTransaction
) => {
  const subject = identity.userId;
  const email = identity.email ?? fallbackEmailForSubject(subject);
  const emailVerified = identity.emailVerified ?? false;
  const claimsHash = hashClaims(identity.claims);
  const existingIdentity = await IdentityRepository.findIdentityByProviderSubject(
    provider,
    subject,
    tx
  );

  if (existingIdentity) {
    const user =
      (await IdentityRepository.updateUserLoginSnapshot(
        existingIdentity.userId,
        { email, emailVerified, lastLoginAt: new Date() },
        tx
      )) ?? existingIdentity.user;
    await IdentityRepository.updateIdentityLastSeen(
      existingIdentity.id,
      { email, emailVerified, claimsHash, lastSeenAt: new Date() },
      tx
    );
    return { user, subject, permissions: identity.permissions ?? [] };
  }

  const existingUser = identity.email
    ? await IdentityRepository.findUserByEmail(identity.email, tx)
    : undefined;
  const user =
    existingUser ??
    (await IdentityRepository.createUser(
      {
        email,
        emailVerified,
        name: displayNameFromClaims(identity),
        lastLoginAt: new Date(),
      },
      tx
    ));

  await IdentityRepository.linkIdentityToUser(
    {
      userId: user.id,
      provider,
      subject,
      email: identity.email,
      emailVerified,
      claimsHash,
    },
    tx
  );

  return { user, subject, permissions: identity.permissions ?? [] };
};

export const createLoginUrl = async (returnTo?: string) => {
  const client = getSdkClient();
  const result = await client.createAuthorizationUrl({
    redirectUri: config.GXP_IDP_REDIRECT_URI as string,
    scope: config.GXP_IDP_SCOPE_LIST,
  });

  await IdentityRepository.createLoginState({
    stateHash: hashToken(result.state),
    nonceCiphertext: encryptSecret(result.nonce),
    codeVerifierCiphertext: encryptSecret(result.codeVerifier),
    redirectUri: config.GXP_IDP_REDIRECT_URI as string,
    returnTo: safeReturnTo(returnTo),
    expiresAt: new Date(Date.now() + oidcStateTtlMs),
  });

  return { url: result.url };
};

export const completeCallback = async (
  input: { code?: string | null; state?: string | null; error?: string | null },
  meta: RequestMeta = {}
) => {
  if (input.error) {
    throw new AuthError('Identity provider rejected the login request');
  }
  if (!input.state) {
    throw new AuthError('Missing identity login state');
  }

  const state = await IdentityRepository.consumeLoginState(hashToken(input.state));
  if (!state) {
    throw new AuthError('Invalid or expired identity login state');
  }

  const client = getSdkClient();
  const callbackResult = await client.completeAuthorizationCodeCallback({
    code: input.code,
    state: input.state,
    expectedState: input.state,
    expectedNonce: decryptSecret(state.nonceCiphertext),
    redirectUri: state.redirectUri,
    codeVerifier: decryptSecret(state.codeVerifierCiphertext),
    fetchUserInfo: true,
  });

  return db.transaction(async (tx) => {
    const provisioned = await upsertUserForIdentity(callbackResult.sessionIdentity, tx);
    const sessionToken = randomToken();
    const expiresAt = tokenSetExpiresAt(callbackResult.tokens);
    await IdentityRepository.createSession(
      {
        userId: provisioned.user.id,
        sessionTokenHash: hashToken(sessionToken),
        refreshTokenCiphertext: callbackResult.tokens.refreshToken
          ? encryptSecret(callbackResult.tokens.refreshToken)
          : undefined,
        accessTokenCiphertext: encryptSecret(callbackResult.tokens.accessToken),
        idTokenCiphertext: encryptSecret(callbackResult.tokens.idToken),
        expiresAt,
        userAgent: meta.userAgent,
        ipHash: meta.ipHash,
      },
      tx
    );
    await IdentityRepository.appendAuthEvent(
      {
        userId: provisioned.user.id,
        provider,
        eventType: 'login_callback',
        result: 'success',
        userAgent: meta.userAgent,
        ipHash: meta.ipHash,
      },
      tx
    );

    return {
      sessionToken,
      expiresAt,
      returnTo: state.returnTo,
      user: toIdentityUser({
        user: provisioned.user,
        idpSubject: provisioned.subject,
        permissions: callbackResult.sessionIdentity.permissions,
      }),
    };
  });
};

export const authenticateSessionToken = async (sessionToken: string): Promise<JWTPayload> => {
  const session = await IdentityRepository.findActiveSessionByTokenHash(hashToken(sessionToken));
  if (!session?.user.isActive) {
    throw new AuthError('Invalid or expired identity session');
  }

  return {
    userId: session.user.id,
    email: session.user.email,
    type: 'access',
    tokenSource: 'identity-session',
    capabilities: buildCapabilities([], session.user.isActive),
  };
};

export const getMeFromSessionToken = async (sessionToken: string): Promise<IdentityUser> => {
  const session = await IdentityRepository.findActiveSessionByTokenHash(hashToken(sessionToken));
  if (!session?.user.isActive) {
    throw new AuthError('Invalid or expired identity session');
  }
  return toIdentityUser({ user: session.user });
};

const claimsToSessionIdentity = (verified: VerifiedServiceAccessToken): SessionIdentity => {
  const email = typeof verified.claims.email === 'string' ? verified.claims.email : undefined;
  const emailVerified =
    typeof verified.claims.email_verified === 'boolean'
      ? verified.claims.email_verified
      : undefined;
  const permissions = [
    ...stringList(verified.claims.permissions),
    ...stringList(verified.claims.permission),
  ];
  return {
    userId: verified.sub ?? '',
    ...(email ? { email } : {}),
    ...(emailVerified !== undefined ? { emailVerified } : {}),
    permissions,
    entitlements: {},
    claims: verified.claims,
  };
};

export const authenticateBearerToken = async (token: string): Promise<JWTPayload> => {
  const verified = await getJwtVerifier().verifyAccessToken(token);
  if (!verified.sub) {
    throw new AuthError('Identity provider token is missing subject');
  }

  const provisioned = await upsertUserForIdentity(claimsToSessionIdentity(verified));
  return {
    userId: provisioned.user.id,
    email: provisioned.user.email,
    type: 'access',
    idpSubject: provisioned.subject,
    scopes: verified.scope,
    tokenSource: 'bearer',
    capabilities: buildCapabilities(provisioned.permissions, provisioned.user.isActive),
  };
};

export const refreshSession = async (sessionToken: string): Promise<{ user: IdentityUser }> => {
  const session = await IdentityRepository.findActiveSessionByTokenHash(hashToken(sessionToken));
  if (!session?.refreshTokenCiphertext) {
    throw new AuthError('Identity session cannot be refreshed');
  }

  try {
    const result = await getSdkClient().refreshTokens({
      refreshToken: decryptSecret(session.refreshTokenCiphertext),
      scope: config.GXP_IDP_SCOPE_LIST,
    });
    await IdentityRepository.updateSessionTokens(session.id, {
      accessTokenCiphertext: encryptSecret(result.accessToken),
      ...(result.refreshToken
        ? { refreshTokenCiphertext: encryptSecret(result.refreshToken) }
        : {}),
      ...(result.idToken ? { idTokenCiphertext: encryptSecret(result.idToken) } : {}),
      expiresAt: nowPlusSeconds(Math.max(result.expiresIn, 7 * 24 * 60 * 60)),
      refreshedAt: new Date(),
    });
    return { user: toIdentityUser({ user: session.user }) };
  } catch (error) {
    await IdentityRepository.revokeSession(hashToken(sessionToken));
    throw error;
  }
};

export const logout = async (
  sessionToken: string | undefined,
  mode: 'local' | 'global'
): Promise<{ logoutUrl?: string; warnings: string[] }> => {
  if (!sessionToken) return { warnings: [] };

  const session = await IdentityRepository.findActiveSessionByTokenHash(hashToken(sessionToken));
  if (!session) return { warnings: [] };

  const client = getSdkClient();
  const result = await client.logout({
    mode,
    refreshToken: session.refreshTokenCiphertext
      ? decryptSecret(session.refreshTokenCiphertext)
      : undefined,
    accessToken: decryptSecret(session.accessTokenCiphertext),
    idTokenHint: decryptSecret(session.idTokenCiphertext),
    postLogoutRedirectUri: config.GXP_IDP_POST_LOGOUT_REDIRECT_URI,
    clearLocalSession: async () => {
      await IdentityRepository.revokeSession(hashToken(sessionToken));
    },
  });

  return { logoutUrl: result.logoutUrl, warnings: result.warnings };
};

export const isIdentityProviderEnabled = () => config.GXP_IDP_ENABLED;
