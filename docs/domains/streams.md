# streams ドメイン

## 目的

`streams` は配信ページ、外部 embed、live chat、tip goal、配信アーカイブ導線を担当する。動画配信基盤そのものは MVP では持たず、外部配信 URL / embed を使い、Favenora は支援、チャット、通知、アーカイブ post 化、fan translation 接続に集中する。

## 非責務

- 動画配信 infrastructure
- 自前 transcoding / adaptive streaming
- payment checkout / webhook
- tip の支払い状態の source of truth
- post viewer / locked response
- archive media storage
- fan translation cue / annotation 本文
- content-safety 辞書・判定ロジック
- trust-operations case 管理

上記は `payments`, `posts`, `media`, `fansubs`, `content-safety`, `trust-operations` 側に寄せる。

## 責務

- scheduled / live / ended stream
- stream room metadata
- external embed URL / provider metadata
- live chat
- chat moderation action の domain event
- tip goal 表示と進捗反映
- stream lifecycle event
- archive-to-post request
- archive post / fan translation 接続
- stream dashboard
- stream notification request event
- stream analytics event

## 状態モデル

stream status:

- `draft`: creator dashboard で準備中。
- `scheduled`: 公開予定あり。
- `live`: 配信中。
- `ended`: 配信終了。archive 作成前。
- `archiving`: archive-to-post 処理中。
- `archived`: archive post への導線あり。
- `cancelled`: 中止。

chat message status:

- `visible`
- `held_for_review`
- `hidden_by_creator`
- `hidden_by_staff`
- `removed`

tip goal status:

- `draft`
- `active`
- `completed`
- `archived`

## 他ドメインとの境界

`payments`:

- tip checkout、webhook、refund、ledger は `payments` が管理する。
- `streams` は `tip_paid` / `tip_refunded` の正規化 event を受け取り、tip goal の `currentAmount` を再計算または反映する。
- checkout success redirect を stream tip goal 達成として信用しない。

`posts`:

- archive-to-post は `posts` に `postType=stream_archive` の作成を依頼する。
- archive post の viewer、comments、access rule、locked response は `posts` が管理する。
- `streams` は `archivePostId` を参照として持つ。

`media`:

- archive file、poster、thumbnail は media id を参照する。
- external embed URL の provider metadata は `media` の external source と共通化できるが、stream room の live embed 管理は `streams` が持つ。

`fansubs`:

- archive post が作成された後、translation / subtitle track は archive post に紐づく。
- stream live room に字幕投稿を直接持たせない。

`content-safety`:

- chat message と tip message の保存前に check する。
- `hold` は `held_for_review`、`block` は保存拒否または `removed` に mapping する。

`trust-operations` / `moderation`:

- creator の chat hide / timeout は `moderation` に creator-visible event を出す。
- staff review / user report / abuse case は `trust-operations` が扱う。

`analytics` / `notifications`:

- stream scheduled / live / ended / archived は domain event として出す。
- `analytics` は attendance や chat count を集計する。
- `notifications` は live 開始や archive ready を配信する。

## データモデル

- `streams`: id, creatorId, title, description, status, visibility, scheduledAt, startedAt, endedAt, embedUrl, embedProvider, posterMediaId, archivePostId, createdAt, updatedAt
- `stream_chat_messages`: id, streamId, authorId, message, status, safetyDecision, createdAt, hiddenAt
- `stream_chat_moderation_actions`: id, streamId, messageId, actorId, action, reason, createdAt
- `stream_tip_goals`: id, streamId, title, description, targetAmount, currentAmount, currency, status, sortOrder, createdAt, updatedAt
- `stream_tip_goal_events`: id, streamId, tipGoalId, paymentEventId, eventType, amount, currency, occurredAt
- `stream_events`: id, streamId, eventType, payload, occurredAt
- `stream_archive_requests`: id, streamId, requestedByUserId, status, archiveMediaId, archivePostId, error, createdAt, completedAt

`currentAmount` は表示用 cache。正確な金額は `payments` の ledger / tip event を source にする。

## backend 3 層

repository:

- stream CRUD
- chat persistence
- chat moderation action persistence
- tip goal CRUD
- tip goal event persistence
- stream event append
- archive request CRUD

service:

- stream lifecycle
- embed URL validation
- chat content-safety check
- chat moderation
- tip goal progress reflection
- archive-to-post orchestration
- stream event publishing
- creator ownership validation
- public / dashboard response generation

route:

- `GET /api/streams/:id`
- `GET /api/creators/:creatorId/streams`
- `POST /api/streams`
- `PATCH /api/streams/:id`
- `POST /api/streams/:id/schedule`
- `POST /api/streams/:id/start`
- `POST /api/streams/:id/end`
- `POST /api/streams/:id/chat`
- `POST /api/streams/:id/chat/:messageId/hide`
- `POST /api/streams/:id/tip-goals`
- `PATCH /api/streams/:id/tip-goals/:goalId`
- `POST /api/streams/:id/archive`
- `GET /api/dashboard/streams`

## frontend 3 層

repository:

- stream API 呼び出し
- chat API 呼び出し
- tip goal API 呼び出し

service:

- live room view model
- embed model
- chat timeline
- chat moderation action model
- tip goal state
- archive status model
- dashboard stream list model

route:

- `/streams/$streamId`
- `/dashboard/streams`
- `/dashboard/streams/new`
- `/dashboard/streams/$streamId`

hooks:

- `useStreamRoom`
- `useCreatorStreams`
- `useStreamChat`
- `useCreateStreamChatMessage`
- `useHideStreamChatMessage`
- `useStreamTipGoal`
- `useUpdateStreamTipGoal`
- `useArchiveStream`
- `useStreamDashboard`

## shared/schemas

`shared/schemas/streams.schema.ts` を streams ドメインの Zod schema と型定義の Single Source of Truth にする。

定義する schema:

- `streamStatusSchema`
- `streamVisibilitySchema`
- `streamSchema`
- `streamPublicSchema`
- `streamDashboardSchema`
- `createStreamSchema`
- `updateStreamSchema`
- `streamChatMessageStatusSchema`
- `streamChatMessageSchema`
- `createStreamChatMessageSchema`
- `streamChatModerationActionSchema`
- `streamTipGoalStatusSchema`
- `streamTipGoalSchema`
- `createStreamTipGoalSchema`
- `streamEventSchema`
- `archiveStreamSchema`
- `streamArchiveRequestSchema`

運用ルール:

- stream status、chat message status、tip goal status は shared schema の enum にする。
- external embed URL は URL schema と provider allowlist で validation する。
- chat の content-safety 判定、stream lifecycle 遷移、archive-to-post 可否は service 層で検証する。
- frontend の live room view model は shared schema 型から service で変換する。
- dashboard response と public response は分ける。

## 実装計画

1. stream / chat / tip goal / archive request schema を作る。
2. stream CRUD と dashboard list を作る。
3. scheduled / live / ended の lifecycle を作る。
4. external embed validation を作る。
5. chat message 保存と content-safety check を接続する。
6. chat hide action と moderation event を接続する。
7. tip goal CRUD を作り、payments の `tip_paid` / `tip_refunded` event で進捗を反映する。
8. archive-to-post request を作り、posts に `stream_archive` 作成を依頼する。
9. archive post へ fansubs の translation / subtitle を接続する。
10. analytics / notifications へ stream lifecycle event を送る。

## MVP

最初に作る:

- external embed stream
- scheduled / live / ended
- live room
- chat
- chat content-safety
- tip goal 表示
- payments tip event から tip goal 進捗反映
- archive-to-post
- archive post への fan translation 接続

後回し:

- native streaming
- realtime websocket 本格化
- chat slow mode
- staff moderation dashboard
- clip 作成
- multi-goal tip allocation
- stream analytics 詳細

## テスト

- scheduled/live/ended state
- invalid lifecycle transition
- embed URL validation
- chat content safety
- chat hide permission
- tip paid event updates goal
- refunded tip subtracts goal
- archive-to-post creates stream_archive post
- archive post can receive translation / subtitle
- public response と dashboard response の差分
