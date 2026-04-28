# moderation ドメイン

## 目的

`moderation` はクリエイターが自分の活動領域で起きた出来事を追跡するための記録ドメイン。投稿、翻訳 / 字幕 contribution、コメント、stream chat、支援者対応、運営審査などについて、クリエイターが後から「何が起きたか」「誰がどの権限で対応したか」「現在どういう状態か」を確認できるようにする。

このドメインは運営全体の admin queue ではない。運営側の全体管理、ユーザー横断の通報処理、システム監査、管理者メニューは `trust-operations` ドメインに分ける。

## 非責務

- instance-wide な通報 queue
- admin / staff 向け全体 moderation action
- system-wide audit log
- content-safety 辞書や判定ロジックの管理
- payment ledger や返金監査
- IdP / login / security audit
- 運営内部メモ、通報者の秘匿情報、検知ロジックの詳細公開

上記は `trust-operations`, `content-safety`, `payments`, `identity` 側に寄せる。`moderation` は creator scope に安全に丸めた記録と、クリエイターが実行できる範囲の対応だけを扱う。

## 責務

- クリエイター向け activity history
- クリエイターが実行した moderation action の記録
- fan / supporter との関係記録
- 運営審査 case の creator-visible timeline
- content-safety review の creator-visible status
- 翻訳 / 字幕 approval / rejection の履歴
- comment / stream chat の hide / restore / pin / report 対応履歴
- creator scope の audit trail
- 異議申し立て、再審査依頼、運営返信の記録
- creator dashboard 用 moderation inbox

## 他ドメインとの境界

`moderation` は各ドメインの source of truth ではなく、creator-facing な履歴 projection を持つ。

- `posts`: post の publish、archive、removed、locked response は `posts` が管理する。`moderation` は creator に見せる審査・制限・復旧履歴を記録する。
- `fansubs`: translation track、subtitle cue、annotation、revision、vote は `fansubs` が管理する。creator approval / rejection の履歴と理由表示を `moderation` が扱う。
- `streams`: live chat の本文と配信状態は `streams` が管理する。chat hide / restore の creator action 記録を `moderation` が扱う。
- `memberships`: subscription / entitlement は `memberships` が管理する。fan relationship timeline では支援開始、停止、creator grant などの表示用 summary を参照する。
- `content-safety`: 自動判定は `content-safety`、review case は `trust-operations` が管理する。creator には status、要求された修正、決定結果、異議申し立て可否を出す。
- `trust-operations`: admin 向け queue、全体監査、staff action の source of truth を持つ。creator に見せてよい範囲だけ `moderation` に projection する。

接続ルール:

- creator-visible history は秘匿情報を含まない projection として作る。
- reporter identity は原則 creator に出さない。必要な場合も anonymized / aggregated にする。
- admin internal note、risk score、検知 rule id、他ユーザーの個人情報は creator response に含めない。
- creator action は対象 creator scope 内でのみ許可する。
- admin / system action が creator のコンテンツに影響した場合は、creator-visible event を作る。

## 記録したい履歴

### クリエイターの行動履歴

- 投稿を公開、予約、非公開、削除、復旧した。
- コメントを非表示、復旧、固定、削除依頼した。
- 翻訳 / 字幕 contribution を承認、却下、差し戻しした。
- stream chat を非表示、timeout、ban した。
- content-safety warning に対して修正、再提出、異議申し立てした。
- 支援者に complimentary membership を付与、取り消しした。

この履歴は creator dashboard の説明責任とチーム内確認のために使う。post revision や subtitle revision の詳細本文は各ドメインに置き、`moderation` では action summary と target reference を持つ。

### ファンとの関係記録

fan relationship は CRM ではなく、トラブル対応と支援者対応のための軽量な関係履歴として扱う。

記録対象:

- follow / unfollow
- membership start / cancel / expire
- creator grant / revoke
- creator note
- warning
- mute / block
- comment hidden / restored
- stream chat action
- refund / chargeback の creator-visible summary

扱わないもの:

- 決済 provider の raw payload
- 法的氏名、住所、メールアドレスなどの PII
- admin fraud score
- 他 creator 領域での行動

creator note は private note として扱い、fan 本人や他 creator には見せない。運営が閲覧できるかは `trust-operations` の policy で決める。

### 運営側との審査関係の記録

creator と運営のやり取りは case と timeline で扱う。

case の例:

- content-safety hold
- post removal review
- translation / subtitle report review
- stream chat incident
- account / creator profile review
- payout / payment risk review の creator-visible summary
- policy warning
- appeal

timeline に含める:

- case opened
- creator requested to edit
- creator submitted response
- staff decision published
- content restored
- content restricted
- case closed

timeline に含めない:

- staff internal discussion
- reporter identity
- detection rule details
- platform-wide investigation metadata

## 状態モデル

creator moderation event type:

- `creator_action`
- `fan_relationship`
- `content_review`
- `staff_decision`
- `system_notice`
- `appeal`

creator action type:

- `hide_comment`
- `restore_comment`
- `pin_comment`
- `approve_translation`
- `reject_translation`
- `hide_chat_message`
- `timeout_fan`
- `block_fan`
- `grant_membership`
- `revoke_membership`
- `submit_appeal`
- `acknowledge_notice`

review case status:

- `open`
- `waiting_for_creator`
- `under_review`
- `decision_published`
- `appealed`
- `closed`

review decision:

- `no_action`
- `warning`
- `edit_required`
- `visibility_limited`
- `removed`
- `restored`
- `account_restricted`

visibility:

- `creator_private`: creator / collaborator のみ。
- `creator_and_staff`: creator と運営。
- `staff_summary`: creator には丸めた summary だけを表示。

## データモデル

- `creator_moderation_events`: id, creatorId, eventType, actionType, actorType, actorId, targetType, targetId, summary, visibility, occurredAt
- `creator_audit_events`: id, creatorId, actorId, action, targetType, targetId, beforeSummary, afterSummary, reason, occurredAt
- `creator_fan_relationship_events`: id, creatorId, fanUserId, eventType, targetType, targetId, summary, createdBy, occurredAt
- `creator_fan_notes`: id, creatorId, fanUserId, body, visibility, createdBy, updatedAt
- `creator_review_cases`: id, creatorId, caseType, targetType, targetId, status, decision, openedAt, closedAt
- `creator_review_case_events`: id, caseId, actorType, actorId, eventType, message, visibleToCreator, occurredAt
- `creator_appeals`: id, caseId, creatorId, body, status, submittedAt, resolvedAt

`actorType` は `creator`, `collaborator`, `staff`, `system` を扱う。`staff` の個人名を creator に出すかは response schema で制御する。

## backend 3 層

repository:

- creator moderation event CRUD
- creator audit event append
- fan relationship event append
- fan note CRUD
- review case lookup
- review case event append
- appeal CRUD

service:

- creator scope permission check
- creator-visible projection 作成
- action append
- fan relationship timeline aggregation
- review case timeline filtering
- appeal submission validation
- staff decision summary ingestion
- sensitive metadata redaction

route:

- `GET /api/dashboard/moderation/events`
- `GET /api/dashboard/moderation/fans/:fanUserId/timeline`
- `POST /api/dashboard/moderation/fans/:fanUserId/notes`
- `PATCH /api/dashboard/moderation/fans/:fanUserId/notes/:noteId`
- `GET /api/dashboard/moderation/review-cases`
- `GET /api/dashboard/moderation/review-cases/:caseId`
- `POST /api/dashboard/moderation/review-cases/:caseId/appeals`
- `POST /api/dashboard/moderation/actions`

## frontend 3 層

repository:

- creator moderation API 呼び出し
- fan relationship API 呼び出し
- review case API 呼び出し

service:

- activity timeline view model
- fan relationship timeline model
- review case status model
- action form model
- appeal form model
- redacted staff decision display model

route:

- `/dashboard/moderation`
- `/dashboard/moderation/fans/$fanUserId`
- `/dashboard/moderation/review-cases`
- `/dashboard/moderation/review-cases/$caseId`

hooks:

- `useCreatorModerationEvents`
- `useFanRelationshipTimeline`
- `useFanNotes`
- `useCreatorReviewCases`
- `useCreatorReviewCase`
- `useSubmitCreatorAppeal`
- `useCreatorModerationAction`

## shared/schemas

`shared/schemas/moderation.schema.ts` を creator-facing moderation record の Zod schema と型定義の Single Source of Truth にする。

定義する schema:

- `creatorModerationEventTypeSchema`
- `creatorModerationActionTypeSchema`
- `creatorModerationEventSchema`
- `creatorAuditEventSchema`
- `fanRelationshipEventTypeSchema`
- `fanRelationshipEventSchema`
- `fanNoteSchema`
- `createFanNoteSchema`
- `reviewCaseTypeSchema`
- `reviewCaseStatusSchema`
- `reviewDecisionSchema`
- `creatorReviewCaseSchema`
- `creatorReviewCaseEventSchema`
- `createCreatorAppealSchema`
- `creatorModerationActionSchema`

運用ルール:

- creator dashboard response と staff source event は schema を分ける。
- creator response は redacted field だけを返す。
- audit event は append-only。修正が必要な場合は correction event を追加する。
- fan note は creator scope private data として扱う。
- target の閲覧権限、creator scope、collaborator scope は service 層で検証する。

## 実装計画

1. creator-visible な event / case / fan relationship schema を定義する。
2. `creator_moderation_events` と `creator_review_cases` を先に実装する。
3. posts / fansubs / streams / memberships から creator-visible event を append する service API を用意する。
4. creator dashboard の activity timeline を作る。
5. review case detail と appeal submission を作る。
6. fan relationship timeline と creator note を作る。
7. staff decision の projection 取り込みを `trust-operations` から接続する。
8. redaction test を追加し、staff internal data が creator response に混ざらないことを固定する。

## MVP

最初に作る:

- creator moderation event timeline
- 翻訳 / 字幕 approval / rejection 履歴
- comment hide / restore 履歴
- content-safety review case の creator-visible status
- appeal submission
- fan relationship timeline の read model

後回し:

- fan note
- stream chat moderation history
- membership grant / revoke history
- CSV export
- advanced filtering
- staff decision の多言語 explanation

## テスト

- creator scope restriction
- collaborator scope restriction
- creator response に reporter identity が含まれない
- creator response に staff internal note が含まれない
- audit event append-only
- review case status transition
- appeal submission
- fan relationship timeline aggregation
- post / translation / stream の target reference 解決
