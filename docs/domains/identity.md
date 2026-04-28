# identity ドメイン

## 目的

`identity` は Favenora のログイン、ユーザー同定、セッション、権限入口を担当する。`../gxp-idProvider` を OIDC/OAuth2 provider として使い、Favenora は web BFF client かつ resource server として動く。

Favenora は password、MFA、Passkey、外部ソーシャル連携、法的本人確認を持たない。これらは `gxp-idProvider` 側の責務。Favenora は IdP の `sub` を local `users.id` に対応付け、creator profile、posts、memberships、payments などの外部キーには Favenora local user id を使う。

## gxp-idProvider 前提

`../gxp-idProvider` 側で確認済みの契約:

- OIDC issuer: local 既定は `http://localhost:3001`
- Discovery: `GET /.well-known/openid-configuration`
- JWKS: `GET /.well-known/jwks.json`
- OAuth token: `POST /oauth/token`
- Introspection: `POST /oauth/introspection`
- Revocation: `POST /oauth/revocation`
- UserInfo: discovery の `userinfo_endpoint`
- End session: discovery の `end_session_endpoint`
- Node/BFF SDK: `@idp/server-sdk`
- wrapper SDK: `@idp/oidc-client-sdk`
- Authorization Code + PKCE が標準 flow
- SDK が `createAuthorizationUrl`, `completeAuthorizationCodeCallback`, `refreshTokens`, `createJwtVerifier().verifyAccessToken`, `introspectToken`, `revokeToken`, `logout` を提供する

Favenora 側では、まず Node backend で `@idp/server-sdk` を使う。browser に client secret を置かない。mobile は `gxp-idProvider` の mobile SDK で取得した access token を Favenora API に Bearer token として渡す。

## 非責務

- password 認証
- password reset
- MFA / Passkey / recovery code
- Google など外部 IdP 連携
- email verification
- legal name、住所、電話番号、生年月日、政府 ID
- IdP 側 session 一覧・失効 UI
- IdP admin client registry の管理
- payment / creator KYC

上記は `gxp-idProvider`, `payments`, 外部 provider 側に寄せる。Favenora の `identity` は local user provisioning、Favenora session、token verification、capability mapping に集中する。

## 責務

- OIDC login start
- OIDC callback
- PKCE state / nonce / codeVerifier の一時保存
- IdP token exchange
- ID Token 検証
- access token 検証
- refresh token による web session 更新
- local user provisioning
- `provider + subject` と local user の link
- web cookie session
- mobile bearer token auth
- `me` response
- Favenora capability mapping
- logout local / global
- auth error normalization
- legacy local auth からの移行境界

## 認証方式

### Web

Web は BFF 型にする。

1. frontend が `GET /api/identity/login-url` を呼ぶ。
2. backend が `@idp/server-sdk.createAuthorizationUrl` で authorization URL, state, nonce, codeVerifier を生成する。
3. backend が state / nonce / codeVerifier を短命 httpOnly cookie または server-side `auth_login_states` に保存する。
4. frontend または backend redirect で IdP authorization endpoint へ遷移する。
5. IdP callback が backend の `/api/identity/callback` に戻る。
6. backend が state を照合し、`completeAuthorizationCodeCallback` で code exchange、ID Token 検証、UserInfo 取得を行う。
7. `provider = gxp-idProvider`, `subject = idToken.sub` で local user を解決または作成する。
8. Favenora web session を作り、httpOnly cookie を発行する。
9. backend が保存済み `returnTo` へ redirect する。
10. frontend は `/api/identity/me` で user / capability を取得する。

browser には refresh token / access token を直接保存しない。Favenora backend が web session に紐づけて server-side に保持する。

### Mobile

Mobile は Bearer token 型にする。

1. mobile app が `gxp-idProvider` の OIDC flow / Kotlin / Swift SDK で login する。
2. mobile app が Favenora API に `Authorization: Bearer <access_token>` を付ける。
3. Favenora backend が `createJwtVerifier().verifyAccessToken` で issuer, audience, signature, exp, scope を検証する。
4. `sub` から local user を解決または作成する。
5. request context に `userId`, `idpSubject`, `scopes`, `capabilities` を載せる。

mobile の refresh token 保存や再認証 UX は mobile SDK 側の責務。Favenora API は refresh token を受け取らない。

## Session 方針

web session:

- cookie 名: `favenora_session`
- httpOnly
- secure
- sameSite `lax`
- session id はランダム opaque token
- DB には session id hash を保存する
- refresh token は暗号化して server-side に保存する
- access token / id token は必要最小限の TTL で保存する
- cookie には token 本体を入れない

login state:

- cookie 名: `favenora_oidc_state` または server-side table
- TTL は 5-10 分
- state, nonce, codeVerifier を保持
- callback 成功・失敗どちらでも消す
- replay を拒否する

session refresh:

- `POST /api/identity/session/refresh` は web session cookie 前提。
- session に紐づく refresh token で `@idp/server-sdk.refreshTokens` を呼ぶ。
- refresh token rotation があれば保存値を更新する。
- refresh 失敗が `invalid_grant` / `token_expired` 相当なら local session を破棄する。
- 一時的な `oidc_timeout`, `oidc_rate_limited`, 5xx は retry policy を持つ。

logout:

- local logout: Favenora session を破棄し、可能なら token revocation を試行する。
- global logout: local logout 後、IdP `end_session_endpoint` の logout URL を返す。
- revocation 失敗時も local session 削除を優先する。
- token 本体や revocation request body を log に出さない。

## 権限と Capability

IdP は authentication と coarse-grained な permission source。Favenora は application capability に変換して使う。投稿、会員プラン、単品購入などの content entitlement は `memberships` が source of truth になる。

IdP から見る情報:

- `sub`
- `email`
- `email_verified`
- `scope`
- `permissions`
- coarse-grained platform permissions
- `client_id` / `azp`

Favenora capability:

- `canUseDashboard`
- `canCreateCreatorProfile`
- `canManageOwnCreator`
- `canModerateOwnContent`
- `canAccessAdmin`
- `canAccessTrustOperations`
- `canManageContentSafety`
- `canManagePayments`

方針:

- route は raw permission string を直接見ない。
- `IdentityService.buildAuthContext` が IdP claims と Favenora DB 状態から capability を作る。
- admin / staff capability は IdP permission と Favenora side allowlist の両方を確認できるようにする。
- creator owner 判定は `creators` service が `userId` と `creatorId` で行う。IdP claim だけで creator owner とみなさない。

## データモデル

- `users`: id, status, displayEmail, emailVerified, lastLoginAt, createdAt, updatedAt
- `user_identities`: id, userId, provider, subject, email, emailVerified, claimsHash, linkedAt, lastSeenAt
- `user_sessions`: id, userId, sessionTokenHash, refreshTokenCiphertext, accessTokenCiphertext, idTokenCiphertext, expiresAt, refreshedAt, revokedAt, userAgent, ipHash, createdAt
- `auth_login_states`: id, stateHash, nonceCiphertext, codeVerifierCiphertext, redirectUri, returnTo, expiresAt, consumedAt, createdAt
- `auth_events`: id, userId, provider, eventType, result, reason, ipHash, userAgent, occurredAt

`users.displayEmail` は Favenora dashboard 表示や問い合わせに必要な最小情報として持つ。creator profile には混ぜない。IdP 側 email が変わった場合は login / refresh / me のタイミングで同期する。

`claimsHash` は claims 全体を保存しないための変更検知用。raw token payload を DB に長期保存しない。

## Auth Context

backend request context に載せる最小形:

```ts
type AuthContext = {
  kind: 'anonymous' | 'user' | 'service';
  userId?: string;
  idpSubject?: string;
  sessionId?: string;
  tokenSource?: 'cookie' | 'bearer';
  scopes: string[];
  capabilities: AuthCapabilities;
};
```

middleware:

- public route は anonymous を許可する。
- protected route は cookie session または bearer token を検証する。
- dashboard route は `canUseDashboard` を要求する。
- admin route は `canAccessAdmin` または domain-specific admin capability を要求する。
- service-to-service route は client credentials token を別 capability として扱う。

## backend 3 層

repository:

- `findUserById`
- `findIdentityByProviderSubject`
- `createUser`
- `createUserForIdentity`
- `linkIdentityToUser`
- `updateIdentityLastSeen`
- `updateUserEmailSnapshot`
- `createSession`
- `findSessionByTokenHash`
- `updateSessionTokens`
- `revokeSession`
- `createLoginState`
- `consumeLoginState`
- `appendAuthEvent`

service:

- OIDC SDK client factory
- login URL generation
- callback completion
- state / nonce / PKCE verification
- local user provisioning
- web session issuing
- session refresh
- local / global logout
- bearer token verification
- auth context creation
- capability mapping
- token encryption / decryption
- auth error normalization
- legacy auth bridge

route:

- `GET /api/identity/login-url`
- `GET /api/identity/callback`
- `GET /api/identity/me`
- `POST /api/identity/session/refresh`
- `POST /api/identity/logout`
- `POST /api/identity/logout/global`
- `GET /api/identity/capabilities`
- `POST /api/identity/dev/local-login` は開発移行期間のみ

internal helper:

- `POST /api/identity/token/introspect` は原則 public に出さない。debug / integration test 用に必要なら admin-only にする。

## frontend 3 層

repository:

- `getLoginUrl`
- `getMe`
- `refreshSession`
- `logout`
- `globalLogout`
- `getCapabilities`

service:

- anonymous / authenticated / expired / forbidden の view model 化
- route guard model
- dashboard access model
- admin access model
- creator onboarding access model
- logout result handling
- auth error message mapping

route:

- `/login`
- `/auth/callback` は frontend callback を採用する場合のみ。BFF 方式では `/api/identity/callback` から redirect された後の loading / error 表示に限定する。
- `/logout/callback`
- authenticated layout
- dashboard layout
- admin layout
- permission denied

hooks:

- `useAuthSession`
- `useRequireAuth`
- `useRequireCapability`
- `useLogout`
- `useGlobalLogout`
- `useAuthCapabilities`
- `useRefreshSession`

## shared/schemas

`shared/schemas/identity.schema.ts` を identity ドメインの Zod schema と型定義の Single Source of Truth にする。

定義する schema:

- `identityProviderSchema`
- `identityUserStatusSchema`
- `identityUserSchema`
- `userIdentitySchema`
- `authCapabilitySchema`
- `authCapabilitiesSchema`
- `authSessionStateSchema`
- `authSessionSchema`
- `meResponseSchema`
- `loginUrlResponseSchema`
- `oidcCallbackQuerySchema`
- `refreshSessionResponseSchema`
- `logoutModeSchema`
- `logoutResponseSchema`
- `authErrorCodeSchema`
- `authErrorResponseSchema`

運用ルール:

- IdP から取得した token payload をそのまま frontend に返さない。
- `me` response は Favenora で使う最小限の user / capability に整形する。
- frontend に refresh token / access token / id token を返さない。
- email を response に含める場合は `me` / dashboard 用に限定し、creator public profile に混ぜない。
- backend route validation、service input、frontend repository return type、hooks の query result はこの schema から `z.infer` する。

## 環境変数

Favenora 側に追加する:

- `GXP_IDP_ISSUER`
- `GXP_IDP_CLIENT_ID`
- `GXP_IDP_CLIENT_SECRET`
- `GXP_IDP_REDIRECT_URI`
- `GXP_IDP_POST_LOGOUT_REDIRECT_URI`
- `GXP_IDP_AUDIENCE`
- `GXP_IDP_SCOPES`
- `GXP_IDP_TIMEOUT_MS`
- `FAVENORA_SESSION_COOKIE_NAME`
- `FAVENORA_SESSION_TTL_SECONDS`
- `FAVENORA_OIDC_STATE_TTL_SECONDS`
- `FAVENORA_TOKEN_ENCRYPTION_KEY`
- `FAVENORA_AUTH_COOKIE_SECURE`

local 例:

- `GXP_IDP_ISSUER=http://localhost:3001`
- `GXP_IDP_CLIENT_ID=local-client`
- `GXP_IDP_CLIENT_SECRET=local-client-secret`
- `GXP_IDP_REDIRECT_URI=http://localhost:3000/api/identity/callback`

`../gxp-idProvider` 側の OAuth client redirect URI と完全一致させる。

## セキュリティ要件

- client secret は backend env のみに置く。
- state / nonce / codeVerifier は callback 後に必ず破棄する。
- state mismatch は token endpoint を呼ぶ前に拒否する。
- access token / refresh token / id token を log に出さない。
- session cookie は httpOnly / secure / sameSite を適用する。
- CSRF が必要な mutation は app 全体の CSRF 方針と揃える。
- bearer token auth では cookie CSRF を要求しない。
- JWKS は cache するが、kid miss 時は再取得できるようにする。
- token verification は issuer / audience / exp / signature / scope を必ず確認する。
- admin capability は token claim だけでなく Favenora 側 status も確認する。
- disabled / suspended user は session が有効でも protected route を拒否する。

## legacy local auth 移行

現状 `shared/schemas/auth.schema.ts` に email/password 型がある。移行では即削除しない。

方針:

1. `identity` repository / service / hooks を新設する。
2. 既存 `useAuth` / local auth route を identity service 経由に寄せる。
3. 開発用 local login が必要なら `POST /api/identity/dev/local-login` に隔離する。
4. production build では dev local login を無効化する。
5. creator / posts / memberships などの owner 判定は local user id に統一する。
6. email/password login UI は IdP redirect login に置き換える。

## 実装計画

1. `@idp/server-sdk` を Favenora backend から参照できるようにする。workspace / path dependency / package publish のどれを使うかを決める。
2. `.env.example` に GXP IdP client 設定を追加する。
3. `shared/schemas/identity.schema.ts` を作る。
4. DB migration で `user_identities`, `user_sessions`, `auth_login_states`, `auth_events` を追加する。
5. `IdentityRepository` を作る。
6. `GxpIdpClient` wrapper を作る。SDK 例外を Favenora の `AuthError` に正規化する。
7. `IdentityService.startLogin` を作る。
8. `IdentityService.completeCallback` を作る。
9. `IdentityService.getOrProvisionUser` を作る。
10. `IdentityService.createWebSession` を作る。
11. auth middleware を cookie session / bearer token 両対応にする。
12. `GET /api/identity/me` を作る。
13. `POST /api/identity/session/refresh` を作る。
14. local / global logout route を作る。
15. frontend repository / hooks / route guard を作る。
16. 既存 local auth の呼び出し箇所を identity hooks へ寄せる。
17. creator / dashboard / admin routes に capability guard を入れる。
18. integration test で `../gxp-idProvider` local issuer と疎通する。

## MVP

最初に作る:

- OIDC login start
- OIDC callback
- local user provisioning
- web session cookie
- `GET /api/identity/me`
- bearer token verification middleware
- logout local
- creator dashboard guard
- admin guard の最小 capability

後回し:

- global logout UI
- refresh token rotation の高度な監査
- session 一覧
- revoke all sessions
- step-up MFA 要求の UI
- service-to-service token
- account link / unlink
- device management

## テスト

schema tests:

- `meResponseSchema` に token payload が含まれない
- capability response が boolean view model として安定する
- auth error code の分類

backend unit tests:

- login URL が state / nonce / codeVerifier を保存する
- callback state mismatch は token exchange 前に拒否する
- invalid issuer / audience / expired token は拒否する
- 初回ログインで user と identity が作成される
- 既存 identity では同じ user に解決される
- disabled user は session があっても拒否される
- refresh token 更新時に session token metadata が更新される
- logout は revocation 失敗時も local session を消す
- bearer token で protected route に入れる
- insufficient scope は 403 になる

integration tests:

- `../gxp-idProvider` local issuer の discovery を取得できる
- JWKS で access token を検証できる
- authorization code callback が local session を作る
- `/api/identity/me` が cookie session で返る
- `/api/identity/me` が bearer token で返る
- refresh 失敗時に再ログイン状態になる

E2E smoke:

- login
- creator dashboard 入室
- permission denied 表示
- logout local
- mobile bearer 相当の API request
