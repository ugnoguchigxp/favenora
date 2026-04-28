# Favenora

Favenora は、クリエイターの作品公開、会員制支援、fan sub、配信、制作管理、モデレーションを扱う OSS クリエイタープラットフォームです。

このリポジトリはテンプレートではなく、Favenora 用のフルスタックアプリケーションです。現状は Hono API、React/Vite フロントエンド、Drizzle/PostgreSQL、共有 Zod schema、ワークスペース内デザインシステムを同じリポジトリで扱うモジュラー・モノリス構成です。

## 現在の実装状況

- `api/` に Hono + Drizzle のバックエンドを実装しています。
- `shared/schemas/` に API/フロントエンドで共有する Zod schema と型を置いています。
- `src/` に React + Vite + TanStack Router のフロントエンドを置いています。
- `designSystem/` は `@repo/design-system` として参照されるワークスペース内 UI パッケージです。
- `docs/favenora.md` と `docs/domains/` にプロダクト方針、ドメイン設計、今後の実装計画をまとめています。

フロントエンドはまだ BBS、ログイン、showcase などの薄い画面が中心です。一方でバックエンドと共有 schema は、identity、creators、posts、media、fansubs、ai-assist、content-safety、memberships、payments、streams、projects、analytics、notifications、trust-operations などのドメインに広がっています。

## 技術スタック

### バックエンド

- Hono
- `@hono/node-server`
- `@hono/zod-openapi`
- Drizzle ORM
- PostgreSQL
- postgres.js
- Zod
- JWT / httpOnly Cookie
- Google/GitHub OAuth
- gxp-idProvider 連携用 OIDC 設定
- Stripe 連携用の支払いドメイン

### フロントエンド

- React 19
- Vite
- TanStack Router
- TanStack Query
- Hono RPC client
- Tailwind CSS
- `@repo/design-system`
- MSW

### テスト・品質管理

- Vitest
- Playwright
- Biome
- TypeScript
- Drizzle Kit

## セットアップ

### 前提条件

- Node.js 20+
- pnpm 10+
- Docker / Docker Compose

### 依存関係

```bash
pnpm install
```

### 環境変数

```bash
cp .env.example .env
```

最低限のローカル開発では、次の値を確認してください。

```env
APP_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://postgres:postgres@localhost:12345/favenora
JWT_SECRET=your-super-secret-jwt-key-change-in-production
AUTH_MODE=both
```

`AUTH_MODE` の意味は次の通りです。

- `local`: メールアドレス/パスワード認証を使います。
- `oauth`: Google/GitHub OAuth のどちらか一組以上の client id/secret が必要です。
- `both`: local 認証を使い、OAuth 設定がある場合は OAuth も有効になります。

`AUTH_MODE=oauth` または `AUTH_MODE=both` では `APP_URL` が必要です。`COOKIE_SAME_SITE=none` を使う場合は、HTTPS の `APP_URL` または `NODE_ENV=production` が必要です。

任意機能として、gxp-idProvider 連携、Stripe、MSW を `.env.example` のコメントに従って設定できます。

### データベース

```bash
docker-compose up -d
pnpm db:migrate
pnpm db:seed
```

ローカル PostgreSQL は `localhost:12345` で公開され、database 名は `favenora` です。

### 開発サーバー

```bash
pnpm dev
```

Vite dev server は `http://localhost:5173` で起動します。`vite.config.ts` の Hono dev server plugin により、`/api/*` だけが Hono API に転送され、それ以外の SPA route と asset は Vite が扱います。

主な URL:

- アプリ: `http://localhost:5173`
- API: `http://localhost:5173/api`
- OpenAPI JSON: `http://localhost:5173/api/doc`
- Swagger UI: `http://localhost:5173/api/ui`
- Health check: `http://localhost:5173/api/health/live`, `http://localhost:5173/api/health/ready`

## 主要コマンド

| コマンド | 説明 |
| --- | --- |
| `pnpm dev` | Vite + Hono dev server を起動 |
| `pnpm build` | フロントエンドとバックエンドをビルド |
| `pnpm start` | `dist-api/index.js` の本番サーバーを起動 |
| `pnpm typecheck` | TypeScript の型チェック |
| `pnpm lint` | Biome によるチェック |
| `pnpm format` | Biome による整形 |
| `pnpm test` | Vitest を起動 |
| `pnpm test:coverage` | Vitest coverage を生成 |
| `pnpm test:e2e` | Playwright E2E を実行 |
| `pnpm test:e2e:smoke` | `@smoke` タグ付き E2E を実行 |
| `pnpm test:e2e:regression` | `@regression` タグ付き E2E を実行 |
| `pnpm verify` | typecheck、lint、Vitest をまとめて実行 |
| `pnpm db:generate` | Drizzle migration を生成 |
| `pnpm db:migrate` | Drizzle migration を適用 |
| `pnpm db:push` | 開発用に schema を直接 DB へ反映 |
| `pnpm db:studio` | Drizzle Studio を起動 |
| `pnpm db:seed` | seed data を投入 |
| `pnpm design-system:storybook` | designSystem の Storybook を起動 |
| `pnpm design-system:storybook:build` | designSystem の Storybook をビルド |

## アーキテクチャ

### バックエンド

`api/app.ts` が Hono application を組み立て、`api/index.ts` が Node server を起動します。API は `/api` 配下に mount されます。

主な構成:

- `api/modules/<domain>/<domain>.routes.ts`: OpenAPI route、入力 validation、HTTP response
- `api/modules/<domain>/<domain>.service.ts`: ビジネスルール
- `api/modules/<domain>/<domain>.repository.ts`: Drizzle による DB access
- `api/routes/`: auth、oauth、health などの共通 route
- `api/middleware/`: 認証、rate limit、logger、error handler
- `api/db/schema.ts`: PostgreSQL schema
- `api/lib/`: logger、OpenAPI helper、validation、password、sanitizer など

`api/app.ts` で確認できる主な API mount:

- `/api/identity`
- `/api/creators`
- `/api/media`
- `/api/dashboard`
- `/api/dashboard/analytics`
- `/api/internal/analytics`
- `/api/admin/analytics`
- `/api/payments`
- `/api/content-safety`
- `/api/reports`
- `/api/admin/trust`
- `/api/notifications`
- `/api/streams`
- `/api/fansubs`
- `/api/ai-assist`
- `/api/auth/oauth`
- `/api/auth`
- `/api/bbs`
- `/api/memberships`
- `/api/posts`
- `/api/projects`

### フロントエンド

`src/main.tsx` が React application を起動し、`src/routes/` が TanStack Router の file route になっています。`src/lib/api.ts` は `hc<AppType>('/api')` を使う Hono RPC client で、Cookie session の refresh retry もここに集約しています。

現状の domain frontend は `src/modules/bbs/` が中心です。より大きな Favenora ドメインの画面実装は、`docs/domains/README.md` にある方針通り、`src/modules/<domain>/` に repository、service、hooks、components を寄せる想定です。

### 共有 schema

`shared/schemas/<domain>.schema.ts` を API contract と UI validation の Single Source of Truth として使います。

原則:

- DB table 型を API response や UI に直接漏らさない。
- public、dashboard、admin、mutation input の schema を分ける。
- sanitize、normalize、文字数、URL、enum、discriminated union などの構造 validation は shared schema に寄せる。
- owner 判定、公開可否、閲覧権限、外部 provider 送信可否などの business rule は service 層で検証する。

### デザインシステム

`designSystem/` は pnpm workspace に含まれ、root package から `@repo/design-system` として参照されます。Storybook と component test を持つ独立パッケージです。

```bash
pnpm design-system:storybook
```

## セキュリティ・運用上の注意

- JWT access/refresh token は httpOnly Cookie に保存します。
- CSRF middleware は `/api/*` に適用されています。
- CORS は `CORS_ORIGIN` の明示 origin のみを許可し、`*` は起動時に拒否されます。
- API 全体に rate limit があり、login/register はより厳しい limit が設定されています。
- production では Hono が `dist/` の SPA asset と `index.html` を配信します。
- `TRUST_PROXY=true` は Nginx、Cloudflare などの reverse proxy 配下でのみ有効化してください。
- `pnpm db:push` は開発・検証用です。通常は `pnpm db:generate` で migration を生成し、SQL をレビューしてから `pnpm db:migrate` で適用します。

## ドキュメント

- [docs/favenora.md](docs/favenora.md): Favenora のプロダクト方針と全体計画
- [docs/domains/README.md](docs/domains/README.md): ドメイン別設計ドキュメントの入口
- [designSystem/README.md](designSystem/README.md): デザインシステム package の README

## 現在残っている旧テンプレート由来の痕跡

コードレビュー時点では、`package.json` の package name、初期画面の表示文言、OpenAPI title などに旧テンプレート由来の名前が残っています。README は Favenora の実態に合わせて更新していますが、プロダクト名の完全な置換は別途コード側で対応してください。

## ライセンス

MIT
