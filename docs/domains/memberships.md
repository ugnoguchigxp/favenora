# memberships ドメイン

## 目的

`memberships` は会員プラン、subscription、entitlement、locked content 判定を担当する。支払い provider そのものは扱わず、支援者が「どの creator の、どの benefit / post / project update / stream archive を見られるか」を一貫して判定する。

このドメインの中心は課金ではなく access control。決済成功、返金、支払い失敗、無料付与、単品購入などの結果を `entitlements` に正規化し、`posts`, `projects`, `fansubs`, `media`, `streams` から同じ API で参照できるようにする。

## 責務

- membership tier
- tier benefits
- tier visibility / archive
- subscription state
- billing cadence の表示用 metadata
- entitlement check
- locked content 判定
- supporter management
- free membership / complimentary membership
- plan upgrade / downgrade の intent 管理
- cancellation / grace period / access expiration
- creator dashboard 用 supporter list

## 責務外

- checkout session 作成
- webhook 署名検証
- provider raw event の保存
- 返金実行
- payout onboarding
- 売上台帳、手数料、税額計算

上記は `payments` 側の責務。`memberships` は `payments` から正規化済み event または command を受け取り、subscription と entitlement を更新する。

## 課金モデル

Favenora は最初から複数の課金モデルを混在させず、MVP では月額 subscription を基本にする。将来拡張できるよう、billing model は creator 単位の設定として持つ。

### MVP

- `subscription`: 加入時に支払い、以後は加入日基準で周期請求する。
- `free`: 無料メンバー。限定 feed、コメント、告知、無料メンバー向け投稿に使う。
- `complimentary`: creator または admin が期限付きで付与する無料 membership。

### 後続

- `annual`: 年額前払い。期間満了まで access を維持し、更新失敗時に grace period を経て失効する。
- `one_time_unlock`: 単品購入。subscription ではなく target 単位の entitlement として扱う。
- `trial`: 支払い方法を登録した期限付き trial。悪用防止のため user / payment method / creator 単位で利用済み制約を持つ。
- `per_creation`: 有料投稿ごとの請求。仕様と creator 運用が複雑なため MVP では作らない。

billing model は access 判定の source ではない。実際の閲覧可否は常に `entitlements` を見る。

## 会員プラン

`membership_tiers` は creator が公開する支援プラン。価格、説明、特典、公開状態、定員、並び順、対象年齢を持つ。

field:

- `id`
- `creatorId`
- `name`
- `description`
- `priceAmount`
- `currency`
- `billingInterval`: `month`, `year`
- `visibility`: `draft`, `published`, `unlisted`, `archived`
- `sortOrder`
- `coverMediaId`
- `maxMembers`
- `currentMemberCount`
- `ageRating`
- `isRecommended`
- `createdAt`
- `updatedAt`

ルール:

- published tier は price / currency / billingInterval を破壊的に変更しない。価格改定は新 price version を作る。
- archived tier は新規加入不可だが、既存 subscription の扱いは creator の migration policy に従う。
- `maxMembers` がある tier は checkout 前に availability を確認し、webhook 到達時にも再確認する。
- creator は tier の表示順とおすすめ表示を管理できる。

## 特典

`tier_benefits` は表示用の特典一覧。access control は benefit text ではなく entitlement rule で決める。

field:

- `id`
- `tierId`
- `kind`: `content_access`, `community`, `download`, `stream`, `credit`, `custom`
- `label`
- `description`
- `sortOrder`
- `deliveryHint`
- `isHighlighted`

特典例:

- 限定投稿の閲覧
- 先行公開投稿の閲覧
- 制作進捗 update の閲覧
- 配信アーカイブの閲覧
- 素材 download
- 支援者 credit

## subscription

`subscriptions` は user と creator / tier の継続関係。provider の subscription id は保持してよいが、provider 固有 status をそのまま公開 API に出さない。

status:

- `incomplete`: checkout 開始後、支払い確定前。
- `trialing`: trial 中。
- `active`: access あり。
- `past_due`: 支払い失敗中。grace period 中は access を維持できる。
- `paused`: creator または platform 都合で請求停止。access 延長ルールを持つ。
- `cancel_at_period_end`: 自動更新停止済み。period end までは access あり。
- `canceled`: subscription 終了。access は entitlement に従う。
- `expired`: access 期間終了。

field:

- `id`
- `userId`
- `creatorId`
- `tierId`
- `status`
- `billingModel`
- `billingInterval`
- `currentPeriodStart`
- `currentPeriodEnd`
- `cancelAtPeriodEnd`
- `canceledAt`
- `gracePeriodEndsAt`
- `provider`
- `providerCustomerId`
- `providerSubscriptionId`
- `priceVersionId`
- `createdAt`
- `updatedAt`

運用ルール:

- checkout 作成時点で `active` にしない。支払い確定 event 後に `active` と entitlement を作る。
- 支払い失敗時は `past_due` にし、grace period 内だけ access を維持する。
- cancel は即時失効と period end 失効を分ける。通常のユーザー cancel は period end 失効。
- full refund は subscription と entitlement を即時失効できる。partial refund は返金 policy に従い、残存 access を調整する。
- upgrade / downgrade は provider 側の proration 結果を `payments` が確定させた後、tier と entitlement を更新する。

## entitlement

`entitlements` は閲覧権限の source of truth。subscription、単品購入、無料付与、admin grant、refund adjustment を同じ形に正規化する。

target:

- `creator`: creator 全体のメンバー権限。
- `tier`: 指定 tier の benefit。
- `post`: 単品購入または個別付与。
- `series`: シリーズ単位の解放。
- `collection`: コレクション単位の解放。
- `project_update`: 制作進捗 update。
- `stream_archive`: 配信アーカイブ。
- `media_asset`: ダウンロード素材。

source:

- `subscription`
- `one_time_purchase`
- `complimentary`
- `trial`
- `manual_grant`
- `migration`
- `refund_adjustment`

field:

- `id`
- `userId`
- `creatorId`
- `targetType`
- `targetId`
- `sourceType`
- `sourceId`
- `startsAt`
- `expiresAt`
- `revokedAt`
- `revokeReason`
- `createdAt`
- `updatedAt`

判定:

- `startsAt <= now`
- `expiresAt is null or expiresAt > now`
- `revokedAt is null`
- target が post の場合は post access rule と tier relation を解決する。
- target が tier の場合は tier を要求する post / project / stream に継承できる。

## access resolver

`MembershipService` は以下の API を提供する。

- `canViewPost(userId, postId)`
- `canViewProjectUpdate(userId, updateId)`
- `canViewStreamArchive(userId, archivePostId)`
- `canDownloadMedia(userId, mediaAssetId, context)`
- `getLockedReason(userId, target)`
- `listViewerEntitlements(userId, creatorId)`
- `listSupporters(creatorId, filters)`

戻り値は boolean だけにしない。frontend locked UI と audit のために理由を返す。

例:

```ts
type EntitlementCheckResult =
  | { allowed: true; sourceType: string; expiresAt: string | null }
  | {
      allowed: false;
      reason:
        | 'login_required'
        | 'membership_required'
        | 'tier_required'
        | 'purchase_required'
        | 'age_restricted'
        | 'payment_past_due'
        | 'expired'
        | 'removed';
      requiredTierIds?: string[];
      purchaseOptionIds?: string[];
    };
```

## 支援者管理

creator dashboard は supporter を subscription と entitlement から合成して表示する。

必要な view:

- active supporters
- free members
- paid members
- trialing members
- past due members
- canceled but still active until period end
- expired members
- complimentary members
- high-value supporters

操作:

- supporter search
- tier filter
- status filter
- manual grant
- complimentary membership 発行
- supporter note
- export
- block / remove supporter

privacy:

- creator に email、住所、決済情報を出さない。
- payout / tax / KYC 情報は `payments` や外部 provider 側に閉じる。
- export には platform policy で許可された user profile fields だけを含める。

## plan change

plan change は provider checkout / billing portal と密接に関係するため、`memberships` だけで完結させない。

flow:

1. frontend が `payments` に plan change checkout / portal session を要求する。
2. provider 側で支払い、proration、次回請求額が確定する。
3. webhook を `payments` が検証、保存、正規化する。
4. `memberships` が subscription tier と entitlement を更新する。
5. `notifications` に subscription changed notification request を出す。

upgrade:

- 即時 access を上位 tier に切り替える。
- 差額請求が失敗した場合は元 tier を維持する。

downgrade:

- 通常は current period end で切り替える。
- creator / admin 強制変更は audit log を残す。

cancel:

- user cancel は `cancel_at_period_end` を基本にする。
- fraud / moderation / full refund は即時 revoke できる。

## データモデル

- `membership_tiers`: creatorId, name, description, priceAmount, currency, billingInterval, visibility, sortOrder, coverMediaId, maxMembers, ageRating
- `membership_tier_prices`: tierId, amount, currency, billingInterval, providerPriceId, effectiveFrom, effectiveTo
- `tier_benefits`: tierId, kind, label, description, sortOrder, deliveryHint, isHighlighted
- `subscriptions`: userId, creatorId, tierId, status, billingModel, billingInterval, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd, gracePeriodEndsAt, provider, providerCustomerId, providerSubscriptionId, priceVersionId
- `subscription_events`: subscriptionId, eventType, source, sourceEventId, occurredAt, metadata
- `entitlements`: userId, creatorId, targetType, targetId, sourceType, sourceId, startsAt, expiresAt, revokedAt, revokeReason
- `complimentary_memberships`: creatorId, grantedByUserId, userId, tierId, startsAt, expiresAt, reason, status
- `supporter_notes`: creatorId, supporterUserId, note, createdByUserId, updatedAt

## backend 3 層

repository:

- tier CRUD
- tier price version CRUD
- benefit CRUD
- subscription lookup / update
- subscription event persistence
- entitlement CRUD
- complimentary membership CRUD
- supporter list read model

service:

- tier validation
- creator owner-only tier update
- price version policy
- subscription state mapping
- subscription event application
- entitlement grant / revoke
- entitlement check
- locked reason generation
- supporter management
- plan change state reflection
- cancellation / grace period handling

route:

- `GET /api/memberships/creators/:creatorId/tiers`
- `POST /api/memberships/tiers`
- `PATCH /api/memberships/tiers/:id`
- `POST /api/memberships/tiers/:id/archive`
- `GET /api/memberships/subscriptions/me`
- `GET /api/memberships/subscriptions/:id`
- `POST /api/memberships/subscriptions/:id/cancel`
- `GET /api/memberships/entitlements/check`
- `GET /api/memberships/entitlements/me`
- `GET /api/memberships/supporters`
- `POST /api/memberships/complimentary`
- `DELETE /api/memberships/complimentary/:id`
- `POST /api/memberships/supporters/:userId/notes`

## frontend 3 層

repository:

- membership API 呼び出し

service:

- tier cards
- tier editor model
- locked UI model
- subscription management view model
- supporter management view model
- entitlement badge / expiry display

route:

- `/creators/$slug/membership`
- `/subscriptions`
- `/subscriptions/$subscriptionId`
- `/dashboard/tiers`
- `/dashboard/supporters`
- `/dashboard/supporters/$userId`

hooks:

- `useCreatorTiers`
- `useTierEditor`
- `useEntitlement`
- `useMySubscriptions`
- `useCancelSubscription`
- `useSupporters`
- `useGrantComplimentaryMembership`
- `useSupporterNotes`

## shared/schemas

`shared/schemas/memberships.schema.ts` を memberships ドメインの Zod schema と型定義の Single Source of Truth にする。

定義する schema:

- `membershipTierSchema`
- `membershipTierPriceSchema`
- `tierBenefitSchema`
- `createMembershipTierSchema`
- `updateMembershipTierSchema`
- `subscriptionStatusSchema`
- `billingModelSchema`
- `billingIntervalSchema`
- `subscriptionSchema`
- `subscriptionEventSchema`
- `entitlementTargetTypeSchema`
- `entitlementSourceTypeSchema`
- `entitlementSchema`
- `entitlementCheckResultSchema`
- `supporterSummarySchema`
- `complimentaryMembershipSchema`

運用ルール:

- 金額、通貨、tier visibility、subscription status は shared schema の enum / validation で固定する。
- `entitlementCheckResultSchema` は posts / fansubs / projects / media / frontend locked UI で共通利用する。
- 支払い provider の raw event payload は memberships schema に混ぜない。
- canViewPost などの権限判定は service 層で行う。

## payments 連携

`payments` から `memberships` へ渡す event は provider 非依存の internal event にする。

例:

- `subscription_checkout_completed`
- `subscription_renewed`
- `subscription_payment_failed`
- `subscription_canceled`
- `subscription_period_ended`
- `subscription_refunded_full`
- `subscription_refunded_partial`
- `one_time_purchase_completed`
- `one_time_purchase_refunded`

`memberships` は event を idempotent に処理する。`sourceEventId` を保存し、同じ event が再送されても subscription / entitlement を重複作成しない。

## 深掘り

entitlement check は post service や fansubs service から呼ばれる共有境界。DB query を散らすと漏れが出るため、`MembershipService.canViewPost(userId, postId)` のような明確な service API を作る。

subscription と entitlement を分けることが重要。subscription は「継続課金の状態」、entitlement は「今見られる権利」。無料付与、返金、単品購入、trial、manual grant が入ると、subscription だけでは閲覧可否を正しく表現できない。

支払い失敗時に即時ロックするか、猶予期間を置くかは creator / platform policy による。MVP では platform default の grace period を持ち、creator 単位のカスタムは後回しにする。

年額、trial、gift、per creation は売上・返金・失効ルールが複雑。MVP では schema 拡張余地だけ残し、月額 subscription と無料付与に絞る。

## MVP

最初に作る:

- published tier の作成・更新・archive
- monthly subscription
- free membership
- complimentary membership
- active / past_due / cancel_at_period_end / canceled
- entitlement grant / revoke
- post locked 判定
- supporter list
- subscription cancel
- payments からの正規化 event 適用

後回し:

- annual billing
- trial
- gift membership
- one-time unlock の本格 UI
- per creation billing
- tier price migration UI
- supporter export
- detailed revenue analytics

## テスト

- tier-only post access
- free member access
- complimentary membership expiration
- canceled subscription with remaining period
- past_due grace period
- full refund immediate revoke
- partial refund access adjustment
- duplicate payment event
- creator owner-only tier update
- archived tier cannot receive new checkout
- entitlement expiration
- locked UI 用 response
- supporter list status filter
