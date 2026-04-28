# creators ドメイン

## 目的

`creators` は、Favenora 上で公開される「クリエイターとしての人格」と、そのプロフィール表現を担当するドメイン。ログイン、メールアドレス、本人確認、氏名、住所、電話番号などの個人情報は `gxp-idProvider` 側の責務とし、Favenora 側では扱わない。

このドメインが持つのは、ペンネーム、活動名、紹介文、過去の制作物、ジャンル、リンク、支援導線、公開設定など、公開・運用プロフィール情報に限定する。

## 非責務

- メールアドレス、法的氏名、住所、電話番号、生年月日などの個人情報管理
- パスワード、MFA、Passkey、OAuth account link
- 本人確認、KYC、payout 用の身元情報
- 決済口座情報

上記は `identity`, `payments`, `gxp-idProvider` 側に寄せる。`creators` は必要に応じて `userId` や `creatorId` だけを参照する。

## 責務

- クリエイタープロフィール作成・編集
- ペンネーム / 表示名 / slug 管理
- 公開プロフィールページ
- ジャンル、活動領域、属性タグ
- 過去の制作物、代表作、ポートフォリオ
- 外部リンク
- 支援ページ用の紹介文、支援者向けメッセージ
- クリエイターの公開状態
- follower / follow state
- dashboard profile editor

## プロフィールで表現したい情報

公開クリエイターページとして、以下を表現できるようにする。

基本情報:

- ペンネーム / 活動名
- URL slug
- 短い tagline
- 長い biography
- avatar
- cover / banner
- 活動言語
- 主な制作カテゴリ
- 所在国・地域の公開表示。ただし法的住所ではなく任意の表示用 text として扱う。

創作属性:

- 小説、映像、漫画、イラスト、配信、音声、ゲーム、音楽などのカテゴリ
- ジャンルタグ。例: fantasy, sci-fi, romance, essay, VTuber, indie animation
- 対象年齢・コンテンツ警告の公開表示
- 使用言語、翻訳対応言語
- 翻訳 / 字幕 contribution 受付可否
- commission / request 受付可否

実績・制作物:

- 代表作
- 過去の制作物
- 外部公開作品へのリンク
- 受賞歴、掲載歴、参加プロジェクト
- 制作中プロジェクトの概要

支援導線:

- 支援者向け greeting
- 支援によって実現したい goal
- 会員プランへの導線
- 無料フォロー導線
- 固定表示した投稿・作品

## PII 境界

Favenora 側で保持しないもの:

- email
- legal name
- phone number
- address
- government id
- bank account
- tax id
- birthday

Favenora 側で保持してよいもの:

- `userId`: Favenora 内部 user への参照
- `displayName`: ペンネームまたは活動名
- `slug`: 公開 URL 用識別子
- `bio`, `tagline`, `profileSections`
- `publicLocationLabel`: 任意の表示用地域。例: `Tokyo`, `Japan`, `Online`
- `links`: 公開リンク
- `portfolioItems`: 公開制作物

注意:

- `publicLocationLabel` は free text だが、住所として使わない UI にする。
- profile editor に email や法的氏名の入力欄を作らない。
- IdP 由来の email を creator response に混ぜない。

## データモデル

### `creator_profiles`

中心テーブル。

- `id`
- `userId`
- `slug`
- `displayName`
- `tagline`
- `bio`
- `avatarMediaId`
- `bannerMediaId`
- `publicLocationLabel`
- `primaryLanguage`
- `translationContributionsEnabled`
- `commissionEnabled`
- `status`: `draft`, `published`, `suspended`
- `publishedAt`
- `createdAt`
- `updatedAt`

制約:

- `userId` は原則 1 user 1 creator profile から始める。
- `slug` は unique。
- `slug` は reserved word を拒否。
- `status = published` 以外は public listing に出さない。

### `creator_categories`

カテゴリ master。

- `id`
- `key`: `novel`, `video`, `manga`, `illustration`, `streaming`, `music`, `game`, `voice`
- `label`
- `sortOrder`
- `isActive`

### `creator_profile_categories`

creator と category の join。

- `creatorId`
- `categoryId`
- `sortOrder`

### `creator_tags`

creator ごとの自由タグ。

- `id`
- `creatorId`
- `label`
- `normalizedLabel`

### `creator_links`

公開リンク。

- `id`
- `creatorId`
- `kind`: `website`, `x`, `youtube`, `twitch`, `pixiv`, `github`, `store`, `other`
- `label`
- `url`
- `sortOrder`

### `creator_portfolio_items`

過去の制作物・代表作。

- `id`
- `creatorId`
- `title`
- `description`
- `url`
- `mediaId`
- `role`
- `completedAt`
- `sortOrder`
- `visibility`: `public`, `supporters`, `private`

### `creator_profile_sections`

プロフィール本文ブロック。

- `id`
- `creatorId`
- `kind`: `about`, `goals`, `works`, `supportMessage`, `custom`
- `title`
- `body`
- `sortOrder`
- `visibility`

### `follows`

無料フォロー関係。

- `id`
- `creatorId`
- `userId`
- `createdAt`

制約:

- `(creatorId, userId)` unique
- 自分自身の follow は拒否してもよい

## Zod schema を Single Source of Truth にする

`shared/schemas/creators.schema.ts` を唯一の schema 定義元にする。backend route validation、backend service input type、frontend repository response type、frontend form type はここから import する。

方針:

- DB table 型をそのまま UI に漏らさない。
- public response schema と dashboard response schema を分ける。
- create / update input schema は sanitize と normalize を含める。
- slug、URL、タグ、bio length などの validation は shared schema に寄せる。
- service 層では Zod で通った型を前提に business rule を追加検証する。

推奨 schema:

```typescript
export const creatorSlugSchema = z
  .string()
  .min(3)
  .max(40)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/);

export const creatorStatusSchema = z.enum(['draft', 'published', 'suspended']);

export const creatorLinkKindSchema = z.enum([
  'website',
  'x',
  'youtube',
  'twitch',
  'pixiv',
  'github',
  'store',
  'other',
]);

export const creatorCategoryKeySchema = z.enum([
  'novel',
  'video',
  'manga',
  'illustration',
  'streaming',
  'music',
  'game',
  'voice',
]);

export const creatorLinkSchema = z.object({
  id: z.string().uuid(),
  kind: creatorLinkKindSchema,
  label: z.string().min(1).max(40),
  url: z.string().url(),
  sortOrder: z.number().int().min(0),
});

export const creatorPortfolioItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(120),
  description: z.string().max(1000).nullable(),
  url: z.string().url().nullable(),
  mediaId: z.string().uuid().nullable(),
  role: z.string().max(80).nullable(),
  completedAt: z.string().nullable(),
  sortOrder: z.number().int().min(0),
  visibility: z.enum(['public', 'supporters', 'private']),
});

export const publicCreatorProfileSchema = z.object({
  id: z.string().uuid(),
  slug: creatorSlugSchema,
  displayName: z.string().min(1).max(80),
  tagline: z.string().max(160).nullable(),
  bio: z.string().max(5000).nullable(),
  avatarMediaId: z.string().uuid().nullable(),
  bannerMediaId: z.string().uuid().nullable(),
  publicLocationLabel: z.string().max(80).nullable(),
  primaryLanguage: z.string().max(16).nullable(),
  translationContributionsEnabled: z.boolean(),
  commissionEnabled: z.boolean(),
  categories: z.array(creatorCategoryKeySchema),
  tags: z.array(z.string().min(1).max(40)),
  links: z.array(creatorLinkSchema),
  portfolioItems: z.array(creatorPortfolioItemSchema),
  followerCount: z.number().int().min(0),
  isFollowing: z.boolean().optional(),
});

export const dashboardCreatorProfileSchema = publicCreatorProfileSchema.extend({
  status: creatorStatusSchema,
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createCreatorProfileSchema = z.object({
  slug: creatorSlugSchema,
  displayName: z.string().min(1).max(80),
});

export const updateCreatorProfileSchema = z.object({
  displayName: z.string().min(1).max(80).optional(),
  tagline: z.string().max(160).nullable().optional(),
  bio: z.string().max(5000).nullable().optional(),
  avatarMediaId: z.string().uuid().nullable().optional(),
  bannerMediaId: z.string().uuid().nullable().optional(),
  publicLocationLabel: z.string().max(80).nullable().optional(),
  primaryLanguage: z.string().max(16).nullable().optional(),
  translationContributionsEnabled: z.boolean().optional(),
  commissionEnabled: z.boolean().optional(),
  categories: z.array(creatorCategoryKeySchema).max(5).optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).optional(),
});
```

型 export:

```typescript
export type PublicCreatorProfile = z.infer<typeof publicCreatorProfileSchema>;
export type DashboardCreatorProfile = z.infer<typeof dashboardCreatorProfileSchema>;
export type CreateCreatorProfileInput = z.infer<typeof createCreatorProfileSchema>;
export type UpdateCreatorProfileInput = z.infer<typeof updateCreatorProfileSchema>;
```

## backend 3 層

### repository

ファイル:

```text
api/modules/creators/creators.repository.ts
```

責務:

- DB query のみを担当する。
- public/private の出し分けや owner 判定をしない。
- transaction が必要な profile update をまとめる。

関数例:

- `findCreatorBySlug(slug)`
- `findCreatorById(id)`
- `findCreatorByUserId(userId)`
- `insertCreatorProfile(input, userId)`
- `updateCreatorProfile(creatorId, patch)`
- `replaceCreatorCategories(creatorId, categoryKeys)`
- `replaceCreatorTags(creatorId, tags)`
- `listCreatorLinks(creatorId)`
- `upsertCreatorLinks(creatorId, links)`
- `listPortfolioItems(creatorId)`
- `insertFollow(creatorId, userId)`
- `deleteFollow(creatorId, userId)`
- `countFollowers(creatorId)`

### service

ファイル:

```text
api/modules/creators/creators.service.ts
```

責務:

- owner-only update
- slug reserved word validation
- profile publish validation
- public response と dashboard response の構築
- follow idempotency
- content-safety check の呼び出し
- links / tags の normalize

主な business rule:

- `displayName` はペンネームであり、法的氏名を要求しない。
- `slug` は作成後の変更を MVP では禁止する。
- `bio`, `tagline`, `portfolio` は保存前に content-safety check を通す。
- `published` にするには `displayName`, `slug`, `bio` または `tagline` の最低限が必要。
- suspended creator は public profile に出さない。

### route

ファイル:

```text
api/modules/creators/creators.routes.ts
```

route:

- `GET /api/creators`
- `GET /api/creators/:slug`
- `GET /api/creators/me`
- `POST /api/creators/me`
- `PATCH /api/creators/me`
- `POST /api/creators/me/publish`
- `POST /api/creators/:id/follow`
- `DELETE /api/creators/:id/follow`
- `GET /api/creators/:id/portfolio`
- `PUT /api/creators/me/portfolio`
- `PUT /api/creators/me/links`

route rule:

- request body は `shared/schemas/creators.schema.ts` の schema で validate する。
- response も schema に合わせる。
- `GET /api/creators/:slug` は public schema だけを返す。
- `GET /api/creators/me` は dashboard schema を返す。

## frontend 3 層

### repository

ファイル:

```text
src/modules/creators/creators.repository.ts
```

責務:

- `src/lib/api.ts` の `client` だけを使う。
- API response を shared schema type として返す。
- `fetch` を直接使わない。

関数例:

- `getCreatorBySlug(slug): Promise<PublicCreatorProfile>`
- `getMyCreatorProfile(): Promise<DashboardCreatorProfile>`
- `createCreatorProfile(input): Promise<DashboardCreatorProfile>`
- `updateCreatorProfile(input): Promise<DashboardCreatorProfile>`
- `followCreator(id): Promise<void>`
- `unfollowCreator(id): Promise<void>`

### service

ファイル:

```text
src/modules/creators/creators.service.ts
```

責務:

- public profile view model
- dashboard form initial values
- profile completion checklist
- follow button state
- portfolio display grouping

例:

- `toCreatorHeaderView(profile)`
- `toCreatorProfileFormValues(profile)`
- `getProfileCompletion(profile)`
- `toPortfolioGridItems(profile.portfolioItems)`

### route

ファイル:

```text
src/modules/creators/creators.routes.tsx
```

責務:

- domain hooks を呼び、components に props を渡す。
- API 通信を直接行わない。
- TanStack Router の loader で API を直接呼ばない。必要なら query prefetch helper を hooks/service 側に寄せる。

画面:

- `CreatorsIndexRoute`
- `CreatorPublicProfileRoute`
- `CreatorDashboardProfileRoute`

### hooks

ファイル:

```text
src/modules/creators/hooks/creators.hooks.ts
```

hooks:

- `useCreatorProfile(slug)`
- `useMyCreatorProfile()`
- `useCreateCreatorProfile()`
- `useUpdateCreatorProfile()`
- `usePublishCreatorProfile()`
- `useFollowCreator(creatorId)`

TanStack Query key:

```typescript
export const creatorQueryKeys = {
  all: ['creators'] as const,
  bySlug: (slug: string) => [...creatorQueryKeys.all, 'slug', slug] as const,
  me: () => [...creatorQueryKeys.all, 'me'] as const,
};
```

mutation invalidation:

- profile update: `creatorQueryKeys.me()` と該当 slug の query を invalidate
- follow/unfollow: public profile と creator list を invalidate

## components

推奨 component:

- `CreatorProfileHeader`
- `CreatorBioSection`
- `CreatorCategoryList`
- `CreatorLinkList`
- `CreatorPortfolioGrid`
- `CreatorFollowButton`
- `CreatorProfileForm`
- `CreatorPortfolioEditor`
- `CreatorLinksEditor`
- `CreatorProfileCompletion`

component rule:

- API 型を直接編集しない。
- form values は service で作る。
- submit は hooks の command 関数を呼ぶ。

## content-safety 連携

対象:

- `displayName`
- `tagline`
- `bio`
- `tags`
- `links.label`
- `portfolioItems.title`
- `portfolioItems.description`
- `profileSections.body`

方針:

- backend 保存時に必ず検査する。
- frontend は任意で即時 check を行い、警告を表示する。
- block 判定なら保存しない。
- hold 判定なら dashboard では保存できても public 反映を止める設計も可能。

## media 連携

- avatar / banner / portfolio image は `media` domain の `media_assets.id` を参照する。
- creators domain は file upload を担当しない。
- frontend profile editor は media hook で upload し、得た `mediaId` を creator update に渡す。

## posts / memberships 連携

public creator profile には以下を合成表示できる。

- pinned posts
- recent public posts
- membership tiers summary
- supporter count
- translation contributions enabled indicator

ただし `creators` repository が posts / memberships table を直接複雑に join しすぎない。composition は service 層か専用 read model で扱う。

## テスト

schema tests:

- slug validation
- URL validation
- tags max count
- public schema に PII field が存在しない
- dashboard schema と public schema の差分

backend tests:

- slug 重複拒否
- reserved slug 拒否
- owner-only update
- suspended profile 非公開
- content-safety block 時に保存拒否
- follow/unfollow idempotency

frontend tests:

- repository が `client` 経由で API を呼ぶ
- hooks の query key / invalidation
- service の view model 変換
- profile form が PII 入力欄を持たない

e2e:

- login
- creator profile 作成
- profile 公開
- public profile 表示
- follow / unfollow
- portfolio item 表示

## 実装ファイル一覧

backend:

```text
api/modules/creators/creators.repository.ts
api/modules/creators/creators.service.ts
api/modules/creators/creators.routes.ts
```

frontend:

```text
src/modules/creators/creators.repository.ts
src/modules/creators/creators.service.ts
src/modules/creators/creators.routes.tsx
src/modules/creators/hooks/creators.hooks.ts
src/modules/creators/components/
```

shared:

```text
shared/schemas/creators.schema.ts
```

routes wrapper:

```text
src/routes/creators/index.tsx
src/routes/creators/$slug.tsx
src/routes/dashboard/profile.tsx
```
