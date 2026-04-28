# payments ドメイン

## 目的

`payments` は決済 provider との接続を閉じ込め、checkout、webhook、refund、ledger、payout、revenue dashboard を担当する。

このドメインは「お金の事実」を扱う。会員として何が見られるかは `memberships` の `entitlements` が決める。`payments` は支払い、請求、返金、入金、手数料、税、provider event を正規化し、必要な internal event を他ドメインへ渡す。

## 責務

- subscription checkout
- plan change checkout / billing portal
- one-time purchase checkout
- one-time tip
- webhook 署名検証
- webhook idempotency
- provider event persistence
- internal payment event 生成
- ledger
- invoice / receipt metadata
- failed payment tracking
- refund request / refund execution
- payout account onboarding
- payout status
- revenue summary
- tax / fee metadata の保存

## 責務外

- post access 判定
- tier benefit の解釈
- subscription status の public API 表現
- supporter list の生成
- locked UI の理由生成

上記は `memberships` 側の責務。`payments` は provider の状態を正規化して渡すだけにする。

## 課金ユースケース

MVP:

- monthly subscription checkout
- subscription cancel / resume の provider portal 連携
- one-time tip
- webhook から subscription active / failed / canceled を反映
- refund event の取り込み
- creator revenue summary
- payout account status

後続:

- annual subscription
- free trial
- one-time content unlock
- gift / complimentary checkout
- discount / coupon
- plan upgrade / downgrade with proration
- creator balance hold
- dispute / chargeback
- tax report export

## provider abstraction

provider SDK は `payments` の adapter に閉じ込める。

interface:

- `createSubscriptionCheckout(input)`
- `createPlanChangeSession(input)`
- `createOneTimeCheckout(input)`
- `createTipCheckout(input)`
- `createBillingPortalSession(input)`
- `verifyWebhook(signature, rawBody)`
- `parseWebhookEvent(rawEvent)`
- `createRefund(input)`
- `getPayoutAccountStatus(creatorId)`
- `createPayoutOnboardingLink(creatorId)`

service 層は provider 固有 payload を外へ出さない。repository に raw payload を保存する場合も、frontend response には含めない。

## checkout

checkout 作成時に支払いを成功扱いしない。checkout は `pending` な intent と provider session を作るだけ。

checkout purpose:

- `subscription_start`
- `subscription_change`
- `subscription_resume`
- `one_time_purchase`
- `tip`

field:

- `id`
- `provider`
- `purpose`
- `userId`
- `creatorId`
- `tierId`
- `postId`
- `streamId`
- `amount`
- `currency`
- `status`
- `providerCheckoutSessionId`
- `successUrl`
- `cancelUrl`
- `expiresAt`
- `createdAt`

rule:

- tier price は checkout 作成時に snapshot する。
- creator payout account が未設定または制限中の場合、paid checkout は作らない。
- age restricted creator / content への支払いは user age gate を確認する。
- checkout success redirect は信用しない。webhook 到達まで subscription / entitlement は確定しない。

## webhook

webhook は payment state の source of truth。

保存:

- raw body hash
- provider
- provider event id
- event type
- receivedAt
- processedAt
- processingStatus
- error
- payload

処理:

1. raw body と signature を検証する。
2. `payment_events(provider, providerEventId)` の unique constraint で重複を防ぐ。
3. raw payload を保存する。
4. provider event を internal event に正規化する。
5. ledger entry を作る。
6. 必要に応じて `memberships` へ internal event を渡す。
7. 失敗時は retry 可能な状態で error を保存する。

internal event:

- `subscription_checkout_completed`
- `subscription_renewed`
- `subscription_payment_failed`
- `subscription_canceled`
- `subscription_period_ended`
- `subscription_refunded_full`
- `subscription_refunded_partial`
- `one_time_purchase_completed`
- `one_time_purchase_refunded`
- `tip_paid`
- `tip_refunded`
- `payout_paid`
- `payout_failed`

## ledger

`payment_ledger_entries` は売上・返金・手数料・税・入金の監査用台帳。dashboard 集計は provider API を毎回叩かず、ledger から作る。

entry type:

- `charge`
- `refund`
- `fee`
- `tax`
- `creator_earning`
- `platform_fee`
- `payout`
- `payout_reversal`
- `dispute`
- `adjustment`

field:

- `id`
- `creatorId`
- `userId`
- `provider`
- `providerObjectId`
- `sourceType`
- `sourceId`
- `entryType`
- `amount`
- `currency`
- `occurredAt`
- `availableAt`
- `metadata`

money rule:

- amount は minor unit integer で保存する。
- currency を必ず持つ。
- 税込・税抜・手数料控除前後を entry type で分ける。
- creator revenue は gross / fees / refunds / net を同じ期間条件で集計する。

## subscription payment

subscription の意味解釈は `memberships` に寄せるが、請求 event は `payments` が保持する。

必要な処理:

- initial payment success
- recurring payment success
- recurring payment failed
- retry exhausted
- cancel scheduled
- cancel immediate
- period end
- plan changed
- annual renewal

支払い失敗:

- provider event を保存する。
- failed payment count と last failure reason を保存する。
- `memberships` に `subscription_payment_failed` を渡す。
- access を即時止めるかは `memberships` の grace period policy が決める。

## one-time tip

tip は access を発生させない支援。post / stream / creator に紐づけられる。

field:

- `id`
- `payerId`
- `creatorId`
- `postId`
- `streamId`
- `amount`
- `currency`
- `message`
- `visibility`: `public`, `creator_only`, `anonymous`
- `status`: `pending`, `paid`, `refunded`, `failed`
- `providerPaymentId`
- `createdAt`
- `paidAt`

rule:

- tip は checkout success redirect では paid にしない。
- content safety は message に対して実行する。
- refunded tip は stream tip goal や revenue summary から差し引く。

## one-time purchase

単品購入は `payments` が決済を扱い、`memberships` が `one_time_purchase` entitlement を作る。

対象:

- post
- series
- collection
- media asset

rule:

- purchase option は content owner が作る。
- 支払い成功 event 後に entitlement を作る。
- refund された場合は entitlement を revoke または期限短縮する。
- subscription entitlement と one-time entitlement は併存できる。

## refund

refund はお金の戻しと access の調整を分けて扱う。

status:

- `requested`
- `approved`
- `rejected`
- `processing`
- `succeeded`
- `failed`
- `canceled`

field:

- `id`
- `paymentId`
- `creatorId`
- `userId`
- `amount`
- `currency`
- `reason`
- `status`
- `requestedByUserId`
- `providerRefundId`
- `createdAt`
- `processedAt`

rule:

- full refund は `memberships` に immediate revoke を要求できる。
- partial refund は subscription term や entitlement expiresAt をどう調整するか policy を明示する。
- creator balance が不足している場合、refund は pending / rejected になり得る。
- refund request と refund execution を分け、audit log を残す。

## payout

payout は creator への入金。user checkout と独立した非同期フローとして扱う。

`payout_accounts`:

- `creatorId`
- `provider`
- `status`: `not_started`, `pending`, `active`, `restricted`, `rejected`, `disabled`
- `requirementsDue`
- `chargesEnabled`
- `payoutsEnabled`
- `dashboardUrl`
- `updatedAt`

`payouts`:

- `id`
- `creatorId`
- `provider`
- `providerPayoutId`
- `amount`
- `currency`
- `status`
- `arrivalDate`
- `createdAt`

rule:

- payout onboarding では KYC / tax / bank details を Favenora に保存しない。
- provider dashboard / onboarding link は短命 URL として発行する。
- payout が制限中の creator は paid tier / paid post を公開できない、または checkout を作れない。

## revenue dashboard

dashboard は ledger を source にする。

指標:

- gross revenue
- platform fee
- provider fee
- tax collected
- refunds
- net revenue
- active paid members
- new paid members
- canceled members
- past due members
- tips
- one-time purchases
- payout pending / paid

期間:

- day
- week
- month
- quarter
- year
- custom range

注意:

- revenue は accounting と analytics を混ぜない。
- payout 可能額と売上発生日は一致しない。
- refund / dispute / payout reversal は過去期間の再計算を発生させる。

## データモデル

- `payment_customers`: userId, provider, providerCustomerId, defaultCurrency
- `checkout_sessions`: provider, purpose, userId, creatorId, tierId, postId, streamId, amount, currency, status, providerCheckoutSessionId, expiresAt
- `payment_events`: provider, providerEventId, type, payload, rawBodyHash, processingStatus, receivedAt, processedAt, error
- `internal_payment_events`: paymentEventId, eventType, targetDomain, targetId, processedAt, payload
- `payments`: provider, providerPaymentId, payerId, creatorId, amount, currency, status, paidAt
- `invoices`: provider, providerInvoiceId, userId, creatorId, subscriptionId, amountDue, amountPaid, currency, status, periodStart, periodEnd
- `payment_ledger_entries`: creatorId, userId, provider, providerObjectId, sourceType, sourceId, entryType, amount, currency, occurredAt, availableAt, metadata
- `tips`: payerId, creatorId, postId, streamId, amount, currency, message, visibility, status, providerPaymentId, paidAt
- `purchase_options`: creatorId, targetType, targetId, amount, currency, status
- `purchases`: buyerId, creatorId, purchaseOptionId, paymentId, status, purchasedAt, refundedAt
- `refunds`: paymentId, creatorId, userId, amount, currency, reason, status, requestedByUserId, providerRefundId, processedAt
- `payout_accounts`: creatorId, provider, status, requirementsDue, chargesEnabled, payoutsEnabled, updatedAt
- `payouts`: creatorId, provider, providerPayoutId, amount, currency, status, arrivalDate

## backend 3 層

repository:

- customer lookup
- checkout session persistence
- payment event persistence
- internal event persistence
- payment / invoice lookup
- ledger append
- tip CRUD
- purchase option / purchase CRUD
- refund CRUD
- payout account lookup
- payout lookup

service:

- provider abstraction
- checkout session creation
- billing portal session creation
- webhook verification
- webhook idempotency
- provider event normalization
- ledger creation
- internal event dispatch
- refund request / execution
- payout onboarding
- revenue aggregation

route:

- `POST /api/payments/checkout/subscription`
- `POST /api/payments/checkout/plan-change`
- `POST /api/payments/checkout/one-time-purchase`
- `POST /api/payments/checkout/tip`
- `POST /api/payments/billing-portal`
- `POST /api/payments/webhooks/:provider`
- `GET /api/payments/revenue`
- `GET /api/payments/revenue/ledger`
- `GET /api/payments/payout-account`
- `POST /api/payments/payout-account/onboarding`
- `POST /api/payments/refunds`
- `GET /api/payments/refunds`
- `GET /api/payments/invoices`

## frontend 3 層

repository:

- payment API 呼び出し

service:

- checkout redirect model
- billing portal redirect model
- tip form model
- purchase button model
- refund request model
- revenue chart model
- payout onboarding model

route:

- checkout result
- billing portal result
- tip modal
- purchase modal
- `/dashboard/revenue`
- `/dashboard/payouts`
- `/dashboard/refunds`
- `/subscriptions`

hooks:

- `useCreateSubscriptionCheckout`
- `useCreatePlanChangeCheckout`
- `useCreateOneTimePurchaseCheckout`
- `useCreateTipCheckout`
- `useBillingPortal`
- `useRevenueSummary`
- `useLedgerEntries`
- `usePayoutStatus`
- `usePayoutOnboarding`
- `useRefunds`
- `useCreateRefund`

## shared/schemas

`shared/schemas/payments.schema.ts` を payments ドメインの Zod schema と型定義の Single Source of Truth にする。

定義する schema:

- `paymentProviderSchema`
- `moneySchema`
- `checkoutPurposeSchema`
- `checkoutSessionSchema`
- `createSubscriptionCheckoutSchema`
- `createPlanChangeCheckoutSchema`
- `createOneTimePurchaseCheckoutSchema`
- `createTipCheckoutSchema`
- `billingPortalSessionSchema`
- `tipSchema`
- `purchaseOptionSchema`
- `purchaseSchema`
- `paymentEventSchema`
- `internalPaymentEventSchema`
- `invoiceSchema`
- `ledgerEntrySchema`
- `refundSchema`
- `createRefundSchema`
- `payoutAccountStatusSchema`
- `payoutSchema`
- `revenueSummarySchema`

運用ルール:

- provider raw webhook payload は内部保存用とし、frontend response schema に出さない。
- money は minor unit integer amount と currency を明示した schema にする。
- checkout 作成 input と webhook processing input は schema を分ける。
- webhook idempotency、ledger 作成、refund 可否は service 層で検証する。
- `memberships` に渡す event payload は provider 非依存 schema にする。

## memberships 連携

`payments` は以下の internal event を `memberships` に渡す。

- `subscription_checkout_completed`
- `subscription_renewed`
- `subscription_payment_failed`
- `subscription_canceled`
- `subscription_period_ended`
- `subscription_refunded_full`
- `subscription_refunded_partial`
- `one_time_purchase_completed`
- `one_time_purchase_refunded`

連携ルール:

- provider event を直接 `memberships` に渡さない。
- 同じ internal event は idempotency key を持つ。
- membership 更新が失敗しても payment event は失わない。retry queue または replay command を用意する。
- checkout success redirect で subscription を active にしない。

## 深掘り

webhook を source of truth として扱う。checkout 作成時点で subscription を active にしない。`payment_events` は idempotency のため、provider event id に unique constraint を置く。

ledger は append-only に近い形にする。返金や dispute が起きた場合、過去 entry を書き換えるのではなく逆向き entry や adjustment entry を追加する。

provider の billing model と Favenora の membership model を直結させない。provider を変更しても `memberships` の subscription / entitlement 判定が壊れないよう、`payments` が正規化境界になる。

## MVP

最初に作る:

- subscription checkout
- tip checkout
- webhook verification / idempotency
- payment event persistence
- internal event dispatch to memberships
- ledger entry creation
- failed payment event handling
- refund event handling
- payout account status
- revenue summary

後回し:

- annual subscription
- free trial
- one-time purchase UI
- gift checkout
- discount / coupon
- plan change proration UI
- dispute / chargeback UI
- tax report export

## テスト

- duplicate webhook
- invalid webhook signature
- checkout session creation
- checkout success redirect without webhook does not unlock
- subscription payment success dispatches membership event
- failed payment dispatches membership event
- refund creates ledger adjustment
- full refund dispatches revoke event
- tip paid updates tip status
- refunded tip is excluded from active tip goal
- provider error
- payout account restricted blocks paid checkout
- revenue summary subtracts refunds and fees
