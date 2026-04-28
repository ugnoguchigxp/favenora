# analytics ドメイン

## 目的

`analytics` は Favenora の統計システムを担当する。FAN の動向統計、クリエイター向け performance summary、実績解除、membership daily summary、異常検知、dashboard 用集計 read model を作る。

`notifications` は配信系、`analytics` は集計・判定系。`analytics` が「何を知らせるべきか」を作り、`notifications` が「誰にどの channel で届けるか」を決める。

## 非責務

- notification delivery
- in-app unread count
- email / push provider
- raw payment provider event の解釈
- post viewer の access 判定
- moderation staff decision
- creator fan note
- search / recommendation engine 本体

上記は `notifications`, `payments`, `posts`, `memberships`, `moderation`, `trust-operations` 側に寄せる。

## 責務

- domain event ingestion
- fan activity event 正規化
- creator dashboard metrics
- fan trend statistics
- membership daily summary
- supporter cohort summary
- achievement definition
- achievement unlock 判定
- anomaly / alert candidate 生成
- digest item 作成
- time-series aggregate
- analytics read model
- notification candidate の作成

## 統計対象

fan activity:

- profile view
- post view
- post like / bookmark
- comment
- translation / subtitle submitted / selected / voted
- follow / unfollow
- membership joined / canceled / expired
- tier changed
- tip sent
- stream joined
- stream chat activity
- project roadmap viewed

creator performance:

- new followers
- active supporters
- new paid members
- canceled members
- net membership change
- revenue summary reference
- post engagement
- translation contribution count
- stream attendance
- project update engagement

system / trust:

- content-safety holds count
- review case opened / closed
- report count
- appeal count
- policy notice count

## 他ドメインとの境界

`analytics` は source of truth ではなく集計 read model を作る。

- `posts`: publish、view、like、bookmark、comment event を提供する。
- `memberships`: subscription / entitlement / supporter event を提供する。
- `payments`: revenue summary 用の正規化済み internal event を提供する。provider raw payload は読まない。
- `fansubs`: translation / subtitle submission、approval、vote、selected count を提供する。
- `streams`: live attendance、chat count、archive ready を提供する。
- `projects`: roadmap view、project update engagement を提供する。
- `moderation`: creator-visible moderation event summary を提供する。
- `trust-operations`: system-wide report / review summary を提供する。
- `notifications`: analytics が作った digest / achievement / alert request を配信する。

接続ルール:

- analytics は他ドメイン table に複雑な join を散らさず、domain event または専用 read API から取り込む。
- 集計値は eventual consistency を許容する。
- billing / entitlement の authoritative 判定に analytics table を使わない。
- 個人を特定する詳細ログは必要最小限にする。dashboard では aggregate を基本にする。

## Event Ingestion

domain event 形式:

- `eventId`
- `sourceDomain`
- `eventType`
- `actorUserId`
- `creatorId`
- `targetType`
- `targetId`
- `occurredAt`
- `metadata`
- `idempotencyKey`

ingestion 方針:

- 同じ `idempotencyKey` を二重処理しない。
- raw event は短期保持、集計後は保持期間を制限する。
- metadata は provider raw payload を含めない。
- analytics 用 event は PII を避け、必要なら userId reference に留める。

## FAN 動向統計

creator dashboard で見たい FAN 動向:

- 新規 follower 数
- 再訪 fan 数
- 初回支援者数
- paid member 転換率
- tier 別加入 / 解約
- post から membership への conversion
- 翻訳 / 字幕 contribution 貢献者数
- comment / like / bookmark の伸び
- active supporter 数
- churn risk 候補
- high-value supporter activity

fan trend は個別 surveillance ではなく、creator が活動改善や支援者対応に使える範囲に丸める。個別ファン timeline は `moderation` / `memberships` 側の scope で扱う。

## Membership Daily Summary

Daily summary は creator timezone ごとに 1 日 1 回作る。

summary item:

- date
- creatorId
- newFollowers
- newFreeMembers
- newPaidMembers
- canceledMembers
- expiredMembers
- netPaidMembers
- activeSupporters
- topTierChanges
- revenueSummaryRef
- notableSupporterEvents
- churnSignals
- achievementUnlocks

通知:

- summary が作成されたら `notifications` に `daily_membership_summary` request を送る。
- email 本文は `analytics` が summary content を作り、`notifications` は channel delivery を行う。
- 0 件の日も weekly summary に含めるため aggregate は作る。通知するかは preference と threshold で判断する。

## 実績解除システム

achievement は creator / fan を主対象にする。system / trust 系の内部 metric は実績解除とは分け、必要なら `trust-operations` や admin analytics で扱う。

creator achievements:

- first post published
- first paid member
- 10 paid members
- 100 followers
- first project completed
- first translation approved
- monthly streak

fan achievements:

- first comment
- first translation contribution
- subtitle selected by creator
- 3 months supporter
- first tip

system achievements:

- MVP では作らない。trust / safety には使わず、運営内部 metric は achievement と分ける。

achievement definition:

- key
- scope: `creator` / `fan`
- title
- description
- conditionType
- conditionConfig
- repeatability
- visibility
- enabled

unlock 方針:

- achievement 判定は idempotent。
- 同じ achievement は repeatable でない限り 1 回だけ unlock。
- unlock したら `notifications` に `achievement_unlocked` request を送る。
- fan achievement の public 表示は本人設定を尊重する。

## Alert Candidate

analytics は通知すべき候補を作るが、配信判断は `notifications` が行う。

candidate:

- `fan_activity_spike`
- `membership_churn_spike`
- `daily_membership_summary`
- `achievement_unlocked`
- `supporter_milestone`
- `post_engagement_spike`
- `fan_sub_activity_spike`
- `stream_attendance_milestone`

priority:

- `low`: dashboard だけでよい。
- `normal`: in-app に出す。
- `high`: immediate notification 候補。
- `critical`: system notice 候補。analytics では原則作らず、trust / payments などが作る。

## データモデル

- `analytics_events`: id, sourceDomain, eventType, actorUserId, creatorId, targetType, targetId, occurredAt, metadata, idempotencyKey, ingestedAt
- `creator_daily_metrics`: creatorId, date, timezone, followersDelta, freeMembersDelta, paidMembersDelta, cancellations, activeSupporters, postViews, comments, translationSubmissions, streamAttendance, createdAt
- `creator_membership_daily_summaries`: id, creatorId, date, timezone, summary, metrics, notableEvents, notificationStatus, createdAt
- `fan_activity_daily_metrics`: creatorId, fanUserId, date, activityScore, eventCounts, lastActivityAt
- `achievement_definitions`: id, key, scope, title, description, conditionType, conditionConfig, repeatability, visibility, enabled
- `achievement_unlocks`: id, achievementId, scope, creatorId, userId, unlockedAt, sourceEventId, notificationStatus
- `analytics_alert_candidates`: id, creatorId, alertType, priority, payload, status, createdAt, processedAt
- `analytics_jobs`: id, jobType, targetDate, status, startedAt, finishedAt, error

## backend 3 層

repository:

- analytics event append
- daily metrics upsert
- membership daily summary CRUD
- fan activity metrics upsert
- achievement definition CRUD
- achievement unlock persistence
- alert candidate CRUD
- analytics job persistence

service:

- domain event ingestion
- event normalization
- daily rollup
- membership summary generation
- achievement condition evaluation
- alert candidate generation
- notification request dispatch
- dashboard read model composition
- retention cleanup

route:

- `GET /api/dashboard/analytics/overview`
- `GET /api/dashboard/analytics/fans`
- `GET /api/dashboard/analytics/memberships/daily`
- `GET /api/dashboard/analytics/achievements`
- `GET /api/dashboard/analytics/achievements/unlocks`
- `POST /api/internal/analytics/events`
- `POST /api/internal/analytics/jobs/daily-rollup`

admin route:

- `GET /api/admin/analytics/jobs`
- `POST /api/admin/analytics/jobs/:id/retry`
- `GET /api/admin/analytics/achievement-definitions`
- `POST /api/admin/analytics/achievement-definitions`
- `PATCH /api/admin/analytics/achievement-definitions/:id`

## frontend 3 層

repository:

- analytics API 呼び出し
- achievement API 呼び出し
- daily summary API 呼び出し

service:

- creator overview view model
- fan trend chart model
- membership daily summary model
- achievement list model
- alert badge model

route:

- `/dashboard/analytics`
- `/dashboard/analytics/fans`
- `/dashboard/analytics/memberships`
- `/dashboard/achievements`
- `/admin/analytics/jobs`
- `/admin/analytics/achievements`

hooks:

- `useCreatorAnalyticsOverview`
- `useFanTrendAnalytics`
- `useMembershipDailySummaries`
- `useCreatorAchievements`
- `useAchievementUnlocks`
- `useAnalyticsJobs`

## shared/schemas

`shared/schemas/analytics.schema.ts` を analytics ドメインの Zod schema と型定義の Single Source of Truth にする。

定義する schema:

- `analyticsEventSchema`
- `createAnalyticsEventSchema`
- `creatorDailyMetricsSchema`
- `fanActivityDailyMetricsSchema`
- `membershipDailySummarySchema`
- `achievementScopeSchema`
- `achievementDefinitionSchema`
- `achievementUnlockSchema`
- `analyticsAlertTypeSchema`
- `analyticsAlertCandidateSchema`
- `creatorAnalyticsOverviewSchema`
- `fanTrendAnalyticsSchema`
- `analyticsJobSchema`

運用ルール:

- dashboard response と internal event input は schema を分ける。
- raw provider event を analytics schema に混ぜない。
- user-level activity response は creator scope と privacy policy で丸める。
- notification payload に渡す summary schema を明確にする。

## 実装計画

1. analytics event schema と ingestion repository を作る。
2. posts / memberships / payments / fansubs / streams から minimum domain event を送る。
3. daily rollup job を作る。
4. creator overview metrics を作る。
5. membership daily summary を作る。
6. achievement definition / unlock 判定を作る。
7. alert candidate を作る。
8. `notifications` へ daily summary / achievement / alert request を送る。
9. dashboard analytics pages を作る。
10. retention / privacy cleanup を作る。

## MVP

最初に作る:

- analytics event ingestion
- creator daily metrics
- membership daily summary
- daily summary notification request
- basic achievement definitions
- achievement unlock notification request
- creator dashboard overview

後回し:

- churn risk scoring
- high-value supporter detection
- cohort analysis
- advanced charts
- weekly / monthly report
- admin achievement editor
- anomaly detection
- export

## テスト

- event ingestion idempotency
- daily rollup
- timezone boundary
- membership daily summary generation
- achievement unlock idempotency
- repeatable achievement unlock
- notification request dispatch
- dashboard response privacy
- raw provider payload が保存されない
- retention cleanup
