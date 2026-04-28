# trust-operations ドメイン

## 目的

`trust-operations` は運営側の管理メニューを担当する。運営とクリエイター間の審査、ファン間・ユーザー間の通報対応、システム監査、staff action の記録、管理者向け queue をまとめる。

`moderation` が creator-facing な記録と対応履歴を扱うのに対し、`trust-operations` は staff / admin が横断的に状況を見て判断するための operational domain とする。

## 非責務

- creator dashboard に出す redacted timeline の表示設計
- post viewer response
- content-safety の辞書・検査 engine 本体
- payment ledger の source of truth
- IdP の認証ログ source of truth
- media storage provider 管理

上記はそれぞれ `moderation`, `posts`, `content-safety`, `payments`, `identity`, `media` 側に置く。`trust-operations` は横断 case、queue、staff action、system audit projection を扱う。

## 責務

- admin / staff management menu
- report intake と triage
- trust / moderation queue
- creator review case 管理
- fan / user report case 管理
- staff action
- staff internal note
- system audit log projection
- policy decision record
- appeal handling
- escalation / assignment
- SLA / priority / severity 管理
- creator-visible projection の発行

## 管理メニュー

admin routes:

- `/admin/trust`
- `/admin/trust/reports`
- `/admin/trust/cases`
- `/admin/trust/cases/$caseId`
- `/admin/trust/creators/$creatorId`
- `/admin/trust/users/$userId`
- `/admin/trust/audit-logs`
- `/admin/trust/staff-actions`
- `/admin/trust/appeals`

menu groups:

- reports: ユーザー通報、creator 通報、translation / subtitle report、stream chat report。
- creator reviews: 投稿保留、creator profile review、policy warning、appeal。
- user relations: fan harassment、spam、block evasion、payment-related support summary。
- system audit: admin action、sensitive setting change、provider webhook handling summary。
- staff workbench: assigned cases、pending decisions、escalations、recent actions。

## moderation との境界

`trust-operations` が持つ:

- instance-wide report queue
- staff assignment
- staff internal notes
- risk score
- raw evidence reference
- reporter identity
- policy rule reference
- admin / staff action source event
- system-wide audit search
- content-safety review の staff workflow

`moderation` に渡す:

- creator-visible case status
- creator に要求する action
- creator に見せてよい decision summary
- appeal 可否
- restored / restricted / removed などの結果

渡さない:

- reporter identity
- staff internal notes
- risk score
- 検知 rule の詳細
- 他 creator / 他 user の調査情報

## Case 種別

case type:

- `content_report`: 投稿、コメント、翻訳 / 字幕 contribution、stream chat への通報。
- `creator_review`: creator profile、投稿、支援ページ、project roadmap の審査。
- `user_safety`: harassment、spam、impersonation、block evasion。
- `payment_risk`: chargeback、refund abuse、fraud suspicion の trust view。
- `content_safety_review`: 自動判定から手動審査に回ったもの。
- `appeal`: creator または user からの異議申し立て。
- `system_audit`: 管理操作や provider event の確認。

case status:

- `open`
- `triaged`
- `assigned`
- `waiting_for_creator`
- `waiting_for_user`
- `under_review`
- `escalated`
- `decision_ready`
- `closed`

severity:

- `low`
- `medium`
- `high`
- `critical`

staff action type:

- `assign_case`
- `request_creator_edit`
- `publish_decision`
- `hide_content`
- `restore_content`
- `restrict_creator`
- `restrict_user`
- `close_report`
- `escalate_case`
- `merge_cases`
- `add_internal_note`

## System Audit

system audit は append-only projection として扱う。source of truth は各ドメインに置き、`trust-operations` は横断検索と管理 UI に必要な形へ正規化する。

対象:

- admin / staff login capability change
- creator restriction
- user restriction
- content removal / restoration
- payment refund execution summary
- entitlement grant / revoke by admin
- content-safety dictionary change
- AI provider setting change
- media provider setting change
- webhook processing result summary

原則:

- audit event は削除しない。
- correction が必要な場合は correction event を追加する。
- secret、token、raw payment payload、PII は audit response に出さない。
- admin export は権限を分ける。

## データモデル

- `trust_reports`: id, reporterId, targetType, targetId, reason, description, status, priority, createdAt
- `trust_cases`: id, caseType, status, severity, priority, assignedStaffId, primaryTargetType, primaryTargetId, openedAt, closedAt
- `trust_case_reports`: caseId, reportId
- `trust_case_events`: id, caseId, eventType, actorType, actorId, message, metadata, createdAt
- `trust_staff_actions`: id, caseId, staffId, actionType, targetType, targetId, reason, metadata, createdAt
- `trust_internal_notes`: id, caseId, staffId, body, visibility, createdAt
- `trust_decisions`: id, caseId, decisionType, targetType, targetId, creatorVisibleSummary, userVisibleSummary, internalRationale, createdAt
- `trust_appeals`: id, caseId, appellantType, appellantId, body, status, resolvedBy, resolvedAt
- `system_audit_events`: id, sourceDomain, actorType, actorId, action, targetType, targetId, severity, metadata, occurredAt

## backend 3 層

repository:

- report CRUD
- case CRUD
- case event append
- staff action append
- internal note CRUD
- decision CRUD
- appeal CRUD
- system audit event append / search

service:

- report intake
- report deduplication / merge
- case routing
- priority / severity calculation
- permission check
- staff assignment
- action application
- policy decision publishing
- creator-visible projection publishing
- user-visible notice publishing
- audit event normalization
- sensitive data redaction

route:

- `POST /api/reports`
- `GET /api/admin/trust/reports`
- `GET /api/admin/trust/cases`
- `POST /api/admin/trust/cases`
- `GET /api/admin/trust/cases/:caseId`
- `PATCH /api/admin/trust/cases/:caseId`
- `POST /api/admin/trust/cases/:caseId/actions`
- `POST /api/admin/trust/cases/:caseId/notes`
- `POST /api/admin/trust/cases/:caseId/decisions`
- `GET /api/admin/trust/appeals`
- `POST /api/admin/trust/appeals/:appealId/resolve`
- `GET /api/admin/trust/audit-logs`

## frontend 3 層

repository:

- trust operations API 呼び出し
- report API 呼び出し
- audit API 呼び出し

service:

- queue item view model
- case detail view model
- staff action form model
- assignment model
- decision publishing model
- audit search model
- severity / priority badge model

route:

- `/admin/trust`
- `/admin/trust/reports`
- `/admin/trust/cases`
- `/admin/trust/cases/$caseId`
- `/admin/trust/appeals`
- `/admin/trust/audit-logs`

hooks:

- `useTrustReports`
- `useTrustCases`
- `useTrustCase`
- `useCreateTrustCase`
- `useTrustStaffAction`
- `useTrustInternalNotes`
- `usePublishTrustDecision`
- `useTrustAppeals`
- `useResolveTrustAppeal`
- `useSystemAuditEvents`

## shared/schemas

`shared/schemas/trust-operations.schema.ts` を admin / staff 向け trust operations の Zod schema と型定義の Single Source of Truth にする。

定義する schema:

- `trustReportSchema`
- `createTrustReportSchema`
- `trustCaseTypeSchema`
- `trustCaseStatusSchema`
- `trustCaseSeveritySchema`
- `trustCaseSchema`
- `trustCaseEventSchema`
- `trustStaffActionTypeSchema`
- `trustStaffActionSchema`
- `createTrustStaffActionSchema`
- `trustInternalNoteSchema`
- `trustDecisionSchema`
- `publishTrustDecisionSchema`
- `trustAppealSchema`
- `systemAuditEventSchema`
- `systemAuditSearchSchema`

運用ルール:

- public report input、creator-visible projection、admin response は schema を分ける。
- staff internal note は creator / public response に絶対に含めない。
- reporter identity は admin response のみに限定し、creator projection では匿名化する。
- system audit event は append-only。
- staff action は必ず case event と audit event を伴う。

## 実装計画

1. `trust-operations` schema と route namespace を作る。
2. public report intake を `trust_reports` に入れる。
3. admin case queue と case detail を実装する。
4. staff action と internal note を実装する。
5. decision publishing を実装し、`moderation` へ creator-visible projection を発行する。
6. appeal handling を実装する。
7. system audit event の横断 search を実装する。
8. content-safety / posts / fansubs / streams / payments から audit event と case event を接続する。

## MVP

最初に作る:

- report intake
- admin report queue
- trust case detail
- staff assignment
- internal note
- decision publishing
- creator-visible projection publishing
- system audit event append / list

後回し:

- report deduplication
- case merge
- SLA dashboard
- advanced audit export
- risk score
- automated priority scoring
- multi-staff approval workflow

## テスト

- report creation
- admin permission check
- staff action creates case event
- staff action creates audit event
- creator-visible projection redacts reporter identity
- creator-visible projection redacts internal note
- case status transition
- decision publishing
- appeal resolution
- system audit append-only
