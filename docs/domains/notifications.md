# notifications ドメイン

## 目的

`notifications` はユーザー、クリエイター、運営スタッフに対する通知の生成・配信・既読管理・通知設定を担当する。in-app notification を中心に、email、mobile push、将来の webhook / digest 配信へ拡張できるようにする。

統計集計、FAN 動向分析、実績解除判定、Daily membership summary の集計本文生成は `analytics` ドメインに分ける。`notifications` は `analytics` から渡された notification request / digest payload を、ユーザー設定と channel capability に従って届ける。

## 非責務

- fan activity の統計集計
- KPI / dashboard metrics の計算
- achievement unlock 条件の判定
- daily / weekly digest の本文生成
- payment / membership の source event 解釈
- content moderation decision
- email provider / push provider 固有 SDK の business logic 露出
- marketing campaign automation

上記は `analytics`, `memberships`, `payments`, `trust-operations`, `content-safety` 側に寄せる。`notifications` は delivery orchestration と user preference を担当する。

## 責務

- in-app notification
- unread count
- mark read / archive
- notification preferences
- channel preference
- quiet hours / digest preference
- notification template
- event-to-notification mapping
- delivery provider abstraction
- email notification
- mobile push notification
- digest delivery
- delivery retry / failure tracking
- idempotent notification creation
- user / creator / staff audience resolution

## 通知種別

product notifications:

- post published
- post comment
- translation / subtitle submitted
- translation / subtitle approved / rejected
- project update
- stream scheduled / live / archive ready
- creator reply
- mention

membership notifications:

- membership joined
- membership canceled
- payment failed
- complimentary membership granted
- tier benefit changed
- daily membership summary ready

analytics notifications:

- fan activity spike
- supporter milestone reached
- achievement unlocked
- daily creator summary
- weekly performance summary
- unusual churn alert
- high-value supporter activity

system notifications:

- content-safety hold
- review case update
- appeal decision
- policy notice
- account / session security notice
- admin / staff assignment

## analytics との境界

`analytics` が行う:

- raw domain event の集計
- fan activity trend の計算
- achievement unlock 判定
- Daily membership summary の作成
- notification candidate の重要度計算
- digest item の grouping / ranking

`notifications` が行う:

- candidate を notification として保存するか判断する
- user preference / channel preference を適用する
- immediate / digest / muted を判定する
- in-app / email / push に delivery する
- read / unread / archived を管理する
- delivery failure を記録する

接続ルール:

- `analytics` は `NotificationService.enqueueNotificationRequest` に structured payload を渡す。
- `notifications` は analytics DB table を直接読んで集計しない。
- `notifications` の payload は表示・遷移に必要な summary と target reference に限定する。
- digest 本文や統計値の authoritative source は `analytics` に残す。

## Channel 方針

channel:

- `in_app`: MVP の中心。DB に通知を保存し、web UI で表示する。
- `email`: 重要通知、digest、system notice。
- `push`: mobile push。payload は短く、詳細は app が API で取得する。
- `webhook`: 将来の creator automation 用。MVP では作らない。

delivery mode:

- `immediate`: すぐ送る。
- `digest_daily`: Daily digest にまとめる。
- `digest_weekly`: Weekly digest にまとめる。
- `silent`: in-app list には残すが外部送信しない。
- `muted`: 保存も送信もしない。ただし system critical は preference を上書きできる。

重要通知:

- account security
- payment failed
- content removed / restored
- review case action required
- policy notice

重要通知は preference で完全 off にできない場合がある。その場合も email / push の channel はユーザー設定を尊重し、最低限 in-app に残す。

## データモデル

- `notifications`: id, userId, notificationType, priority, title, body, payload, targetType, targetId, sourceDomain, sourceEventId, createdAt, readAt, archivedAt
- `notification_requests`: id, recipientUserId, audienceType, notificationType, priority, payload, sourceDomain, sourceEventId, idempotencyKey, requestedAt, processedAt, status
- `notification_deliveries`: id, notificationId, channel, providerKey, status, attemptCount, lastAttemptAt, deliveredAt, failureReason
- `notification_preferences`: userId, notificationType, channel, deliveryMode, enabled
- `notification_digest_preferences`: userId, digestType, enabled, timezone, deliveryHour, channels
- `notification_templates`: id, notificationType, locale, channel, titleTemplate, bodyTemplate, version, status
- `notification_devices`: id, userId, platform, providerKey, tokenCiphertext, status, lastSeenAt

`sourceDomain + sourceEventId + notificationType + userId` は idempotency key にする。同じ domain event の再送で重複通知を作らない。

## Payload 設計

payload は discriminated union にする。token、secret、provider raw payload、PII を含めない。

共通 field:

- `kind`
- `targetType`
- `targetId`
- `actorUserId`
- `creatorId`
- `summary`
- `ctaPath`
- `occurredAt`

例:

- `post_comment`: postId, commentId, commenterUserId, excerpt
- `translation_approved`: postId, trackId, contributionType, language
- `membership_joined`: creatorId, supporterUserId, tierId
- `daily_membership_summary`: creatorId, summaryId, date
- `achievement_unlocked`: creatorId, achievementId, unlockId
- `review_case_update`: caseId, status, actionRequired

## backend 3 層

repository:

- notification CRUD
- notification request persistence
- delivery persistence
- preference CRUD
- digest preference CRUD
- template lookup
- device CRUD

service:

- notification request enqueue
- idempotency check
- audience resolution
- event-to-notification mapping
- preference filtering
- template rendering
- channel selection
- delivery provider abstraction
- delivery retry
- unread count
- mark read / archive
- digest delivery scheduling

route:

- `GET /api/notifications`
- `GET /api/notifications/unread-count`
- `POST /api/notifications/:id/read`
- `POST /api/notifications/read-all`
- `POST /api/notifications/:id/archive`
- `GET /api/notifications/preferences`
- `PATCH /api/notifications/preferences`
- `GET /api/notifications/digest-preferences`
- `PATCH /api/notifications/digest-preferences`
- `POST /api/notifications/devices`
- `DELETE /api/notifications/devices/:id`

internal service API:

- `enqueueNotificationRequest(input)`
- `enqueueDigestNotification(input)`
- `recordDeliveryResult(input)`

他ドメインは notification table に直接 insert しない。

## frontend 3 層

repository:

- notification API 呼び出し
- preference API 呼び出し
- device registration API 呼び出し

service:

- notification list grouping
- unread count view model
- notification item action model
- preference form model
- digest preference form model
- mobile push registration state

route:

- notification popover
- notification center
- `/settings/notifications`
- `/dashboard/notifications`

hooks:

- `useNotifications`
- `useUnreadNotificationCount`
- `useMarkNotificationRead`
- `useArchiveNotification`
- `useNotificationPreferences`
- `useNotificationDigestPreferences`
- `useRegisterNotificationDevice`

## shared/schemas

`shared/schemas/notifications.schema.ts` を notifications ドメインの Zod schema と型定義の Single Source of Truth にする。

定義する schema:

- `notificationTypeSchema`
- `notificationPrioritySchema`
- `notificationChannelSchema`
- `notificationDeliveryModeSchema`
- `notificationPayloadSchema`
- `notificationSchema`
- `notificationRequestSchema`
- `createNotificationRequestSchema`
- `notificationDeliverySchema`
- `notificationPreferenceSchema`
- `updateNotificationPreferenceSchema`
- `notificationDigestPreferenceSchema`
- `updateNotificationDigestPreferenceSchema`
- `markNotificationReadSchema`
- `unreadNotificationCountSchema`
- `notificationDeviceSchema`

運用ルール:

- notification payload は type ごとの discriminated union にする。
- mobile push に使える payload shape を web in-app notification と共有する。
- user preference input と notification delivery result は schema を分ける。
- system critical notification は preference override 可能かを schema と service で明示する。
- delivery provider raw response は public schema に含めない。

## 実装計画

1. notification type、priority、channel、delivery mode、payload schema を定義する。
2. `notifications`, `notification_requests`, `notification_preferences`, `notification_deliveries` を追加する。
3. `NotificationService.enqueueNotificationRequest` を作る。
4. idempotency key で重複作成を防ぐ。
5. in-app notification list / unread count / mark read を実装する。
6. preference filtering を実装する。
7. `analytics` から daily summary / achievement notification request を受け取る。
8. email provider abstraction を stub で追加する。
9. mobile push device registration と provider abstraction を後続で追加する。
10. delivery retry job と failure tracking を追加する。

## MVP

最初に作る:

- in-app notifications
- unread count
- mark read / read all
- notification preferences
- idempotent notification request
- membership joined / canceled notification
- translation / subtitle approved / rejected notification
- review case update notification
- analytics daily summary ready notification
- achievement unlocked notification

後回し:

- email delivery
- mobile push
- webhook
- notification templates editor
- quiet hours
- weekly digest
- provider retry dashboard

## テスト

- preference filtering
- idempotency
- mark read
- read all
- unread count
- archive
- payload discriminated union
- system critical preference override
- analytics daily summary request creates notification
- achievement unlock request creates notification
- delivery failure retry
