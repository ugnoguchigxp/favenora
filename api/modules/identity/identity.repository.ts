import { and, eq, gt, isNull } from 'drizzle-orm';
import { type DbTransaction, db } from '../../db/client';
import { authEvents, authLoginStates, userIdentities, userSessions, users } from '../../db/schema';

type Db = typeof db | DbTransaction;

const database = (tx?: DbTransaction): Db => tx || db;

export type IdentityUserRow = typeof users.$inferSelect;
export type UserIdentityRow = typeof userIdentities.$inferSelect;
export type UserSessionRow = typeof userSessions.$inferSelect;
export type LoginStateRow = typeof authLoginStates.$inferSelect;

export const findIdentityByProviderSubject = async (
  provider: string,
  subject: string,
  tx?: DbTransaction
): Promise<(UserIdentityRow & { user: IdentityUserRow }) | undefined> => {
  const [row] = await database(tx)
    .select({
      identity: userIdentities,
      user: users,
    })
    .from(userIdentities)
    .innerJoin(users, eq(users.id, userIdentities.userId))
    .where(and(eq(userIdentities.provider, provider), eq(userIdentities.subject, subject)));

  if (!row) return undefined;
  return { ...row.identity, user: row.user };
};

export const findUserByEmail = async (
  email: string,
  tx?: DbTransaction
): Promise<IdentityUserRow | undefined> => {
  const [user] = await database(tx).select().from(users).where(eq(users.email, email));
  return user;
};

export const findUserById = async (
  id: string,
  tx?: DbTransaction
): Promise<IdentityUserRow | undefined> => {
  const [user] = await database(tx).select().from(users).where(eq(users.id, id));
  return user;
};

export const createUser = async (
  data: {
    email: string;
    name: string;
    emailVerified: boolean;
    lastLoginAt?: Date;
  },
  tx?: DbTransaction
): Promise<IdentityUserRow> => {
  const [user] = await database(tx).insert(users).values(data).returning();
  return user;
};

export const updateUserLoginSnapshot = async (
  userId: string,
  data: { email: string; emailVerified: boolean; lastLoginAt: Date },
  tx?: DbTransaction
): Promise<IdentityUserRow | undefined> => {
  const [user] = await database(tx).update(users).set(data).where(eq(users.id, userId)).returning();
  return user;
};

export const linkIdentityToUser = async (
  data: {
    userId: string;
    provider: string;
    subject: string;
    email?: string;
    emailVerified: boolean;
    claimsHash: string;
  },
  tx?: DbTransaction
): Promise<UserIdentityRow> => {
  const [identity] = await database(tx).insert(userIdentities).values(data).returning();
  return identity;
};

export const updateIdentityLastSeen = async (
  id: string,
  data: { email?: string; emailVerified: boolean; claimsHash: string; lastSeenAt: Date },
  tx?: DbTransaction
): Promise<UserIdentityRow | undefined> => {
  const [identity] = await database(tx)
    .update(userIdentities)
    .set(data)
    .where(eq(userIdentities.id, id))
    .returning();
  return identity;
};

export const createLoginState = async (
  data: typeof authLoginStates.$inferInsert,
  tx?: DbTransaction
): Promise<LoginStateRow> => {
  const [state] = await database(tx).insert(authLoginStates).values(data).returning();
  return state;
};

export const consumeLoginState = async (
  stateHash: string,
  tx?: DbTransaction
): Promise<LoginStateRow | undefined> => {
  const [state] = await database(tx)
    .update(authLoginStates)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(authLoginStates.stateHash, stateHash),
        gt(authLoginStates.expiresAt, new Date()),
        isNull(authLoginStates.consumedAt)
      )
    )
    .returning();
  return state;
};

export const createSession = async (
  data: typeof userSessions.$inferInsert,
  tx?: DbTransaction
): Promise<UserSessionRow> => {
  const [session] = await database(tx).insert(userSessions).values(data).returning();
  return session;
};

export const findActiveSessionByTokenHash = async (
  sessionTokenHash: string,
  tx?: DbTransaction
): Promise<(UserSessionRow & { user: IdentityUserRow }) | undefined> => {
  const [row] = await database(tx)
    .select({
      session: userSessions,
      user: users,
    })
    .from(userSessions)
    .innerJoin(users, eq(users.id, userSessions.userId))
    .where(
      and(
        eq(userSessions.sessionTokenHash, sessionTokenHash),
        isNull(userSessions.revokedAt),
        gt(userSessions.expiresAt, new Date())
      )
    );

  if (!row) return undefined;
  return { ...row.session, user: row.user };
};

export const updateSessionTokens = async (
  id: string,
  data: {
    accessTokenCiphertext: string;
    refreshTokenCiphertext?: string;
    idTokenCiphertext?: string;
    expiresAt: Date;
    refreshedAt: Date;
  },
  tx?: DbTransaction
): Promise<UserSessionRow | undefined> => {
  const [session] = await database(tx)
    .update(userSessions)
    .set(data)
    .where(eq(userSessions.id, id))
    .returning();
  return session;
};

export const revokeSession = async (
  sessionTokenHash: string,
  tx?: DbTransaction
): Promise<UserSessionRow | undefined> => {
  const [session] = await database(tx)
    .update(userSessions)
    .set({ revokedAt: new Date() })
    .where(eq(userSessions.sessionTokenHash, sessionTokenHash))
    .returning();
  return session;
};

export const appendAuthEvent = async (
  data: typeof authEvents.$inferInsert,
  tx?: DbTransaction
): Promise<void> => {
  await database(tx).insert(authEvents).values(data);
};
