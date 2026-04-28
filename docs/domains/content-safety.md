# content-safety ドメイン

## 目的

`content-safety` は、投稿本文、コメント、字幕、翻訳注釈、配信チャット、プロフィール、AI 生成草案に含まれる攻撃的な単語・フレーズ、差別表現、嫌がらせ、スパム、危険誘導を検査する共通ドメイン。

このドメインは「何を許可・保留・拒否するか」を判定する。翻訳生成、字幕保存、コメント保存、moderation case 運用は持たない。

## 責務

- blocked term 辞書
- phrase match
- regex / exact / normalized match
- text normalization
- language detection 補助
- locale 別 policy
- blocked terms 入り語句の自動判定
- 投稿前チェック
- 投稿後再スキャン
- AI draft 後段検査
- match log
- safety decision
- review item 生成と trust-operations case 連携
- appeal / manual allow / manual block の入力
- rule version 管理

## 責務外

- 翻訳生成
- subtitle / annotation / comment の保存
- UI 文言の i18n catalog
- staff moderation case の全体運用
- user ban / suspension の最終判断
- media file の malware scan

上記は `ai-assist`, `fansubs`, `posts`, `trust-operations`, `moderation`, `media` 側に寄せる。

## 対象

`targetType`:

- `post_title`
- `post_body`
- `post_comment`
- `creator_profile`
- `subtitle_track_title`
- `subtitle_cue`
- `translation_annotation`
- `translation_note`
- `stream_chat`
- `tip_message`
- `project_update`
- `ai_draft`
- `report_reason`

各呼び出し元は targetType, targetId, actorId, language hint, visibility, source を渡す。`content-safety` は保存可否と review 要否を返す。

## decision

判定結果:

- `allow`: 保存・公開可。
- `warn`: 保存可。ただし frontend に警告を返す。
- `hold`: 保存はできるが公開不可。review 待ち。
- `block`: 保存拒否または修正要求。
- `shadow_limit`: spam などで表示範囲を制限。MVP では後回し。

severity:

- `info`
- `low`
- `medium`
- `high`
- `critical`

呼び出し元は decision を domain 状態に mapping する。例: fan translation では `hold` を `submitted` review 待ち、comment では `pending_review` にする。

## 多言語 normalization

安全判定は多言語前提にする。単純な lowercase だけでは不十分。

normalization step:

- Unicode normalization
- case folding
- 全角半角変換
- ひらがな / カタカナ揺れ補正
- common leetspeak 変換
- zero-width / invisible character 除去
- 記号・空白挿入の正規化
- repeated character 圧縮
- emoji / variation selector の扱い
- URL / mention / hashtag 抽出
- script detection
- language hint と detected language の比較

正規化後 text は判定用であり、公開本文として返さない。match log には過剰な本文保存を避け、必要最小限の matched span と hash を持つ。

## blocked terms

`blocked_terms` は locale / language / category / severity を持つ。

field:

- `id`
- `language`
- `locale`
- `script`
- `category`: `hate`, `harassment`, `sexual`, `violence`, `self_harm`, `spam`, `scam`, `personal_info`, `spoiler`, `custom`
- `pattern`
- `normalizedPattern`
- `matchType`: `exact`, `word`, `phrase`, `regex`, `normalized`, `fuzzy`
- `severity`
- `decision`
- `contextPolicy`: `always`, `allow_quote`, `allow_educational`, `allow_self_reference`
- `enabled`
- `createdByUserId`
- `updatedAt`

辞書の raw pattern は admin / staff 以外に返さない。一般 frontend には decision とユーザー向け message key だけ返す。

## allowlist / context

blocked terms だけでは誤判定が多い。allowlist と context rule を持つ。

- `allowed_terms`: 医療、教育、批評、引用で許可する語。
- `context_rules`: 対象 targetType や visibility によって decision を変える。
- `creator_custom_terms`: creator が自分のコメント欄や配信チャットで追加できる軽量 rule。MVP では後回し。

例:

- 小説本文では `hold`、コメントでは `block`。
- 引用符内や翻訳注釈では `warn` に落とす。
- R-18 content の本文では許可するが、未成年向け投稿では block。

## 翻訳と安全判定

翻訳機能では、原文と訳文の両方を判定する。

対象:

- 人間が投稿した subtitle cue
- 人間が投稿した translation annotation
- AI が生成した draft
- AI draft を人間が編集して公開する revision
- comment の機械翻訳 cache

ルール:

- AI draft 生成直後に `ai_draft` として検査する。
- 公開保存時に最終文面を再検査する。
- 原文が安全でも訳文で危険表現が増える場合があるため、targetLanguage の辞書も見る。
- 危険語句を翻訳・引用・批評している文脈では contextPolicy を使い、即 block ではなく hold にできる。
- 自動翻訳結果を public cache として保存する場合も公開前 safety check を通す。

## データモデル

- `blocked_terms`: language, locale, script, category, pattern, normalizedPattern, matchType, severity, decision, contextPolicy, enabled
- `allowed_terms`: language, locale, pattern, matchType, reason, enabled
- `content_safety_rules`: name, targetType, language, category, severity, decision, enabled, version
- `content_safety_checks`: targetType, targetId, actorId, language, decision, maxSeverity, ruleVersion, checkedAt
- `blocked_term_matches`: checkId, targetType, targetId, termId, matchedTextHash, matchedTextPreview, startOffset, endOffset, severity
- `content_safety_reviews`: targetType, targetId, checkId, status, trustCaseId, decision, reason, decidedAt
- `content_safety_appeals`: reviewId, requesterId, reason, status, decidedAt
- `content_safety_rescan_jobs`: scope, status, ruleVersionFrom, ruleVersionTo, startedAt, finishedAt

## backend 3 層

repository:

- blocked term CRUD
- allowed term CRUD
- rule CRUD
- check log persistence
- match log persistence
- review record CRUD
- appeal CRUD
- rescan job persistence

service:

- text normalization
- language / script detection helper
- phrase match
- regex match
- fuzzy match
- context evaluation
- severity 判定
- block / hold / allow decision
- check result redaction
- rescan
- review decision application

route:

- `POST /api/content-safety/check`
- `POST /api/content-safety/check-batch`
- `GET /api/content-safety/blocked-terms`
- `POST /api/content-safety/blocked-terms`
- `PATCH /api/content-safety/blocked-terms/:id`
- `GET /api/content-safety/allowed-terms`
- `POST /api/content-safety/allowed-terms`
- `GET /api/internal/content-safety/reviews`
- `POST /api/internal/content-safety/reviews/:id/decision`
- `POST /api/content-safety/reviews/:id/appeal`
- `POST /api/content-safety/rescan`

## frontend 3 層

repository:

- content safety API 呼び出し

service:

- inline warning model
- blocked reason display model
- admin dictionary editor model
- review status model
- appeal form model
- rescan job status model

route:

- `/admin/content-safety`
- `/admin/content-safety/dictionaries`

hooks:

- `useContentSafetyCheck`
- `useContentSafetyBatchCheck`
- `useBlockedTerms`
- `useAllowedTerms`
- `useContentSafetyDecision`
- `useContentSafetyRescan`

## shared/schemas

`shared/schemas/content-safety.schema.ts` を content-safety ドメインの Zod schema と型定義の Single Source of Truth にする。

定義する schema:

- `contentSafetyTargetTypeSchema`
- `contentSafetyDecisionSchema`
- `blockedTermSeveritySchema`
- `blockedTermMatchTypeSchema`
- `blockedTermCategorySchema`
- `blockedTermSchema`
- `allowedTermSchema`
- `createBlockedTermSchema`
- `createAllowedTermSchema`
- `contentSafetyCheckSchema`
- `contentSafetyBatchCheckSchema`
- `contentSafetyResultSchema`
- `contentSafetyMatchSchema`
- `contentSafetyReviewSchema`
- `contentSafetyReviewDecisionSchema`
- `contentSafetyAppealSchema`
- `contentSafetyRescanJobSchema`

運用ルール:

- check request/response は translation / subtitle、comment、chat、profile、post、AI draft で共通利用する。
- blocked term 辞書の raw pattern は admin response と public response を分ける。
- severity enum と decision enum は shared schema で固定する。
- 正規化、辞書照合、block/hold/allow の判断は service 層で行う。
- frontend 用 response では一致語句をそのまま返しすぎない。message key と修正方針を返す。

## ドメイン連携

`fansubs`:

- subtitle cue / annotation / revision summary の保存前に check。
- `hold` なら公開しない。

`posts`:

- post title / body / comment の保存前に check。
- comment は即時 UI feedback と backend authoritative check の両方を通す。

`ai-assist`:

- draft 生成後に check。
- `block` / `hold` の draft は apply できない。

`streams`:

- chat message と tip message を check。

`trust-operations`:

- staff queue、assignment、staff action、case close を管理する。
- content-safety は review item の元判定、対象、match summary、trustCaseId との対応を提供する。

## 深掘り

初期はルールベースでよいが、正規化を軽視しない。スペース挿入、記号混入、伏せ字、全角半角、ひらがな/カタカナ揺れに対応する余地を service に持たせる。

翻訳文は原文と別のリスクを持つ。原文にない攻撃的表現が訳文で追加される場合、または攻撃的表現を説明目的で引用する場合があるため、language、targetType、contextPolicy を組み合わせて decision を出す。

辞書更新後は過去 content の再スキャンが必要になる。再スキャンは対象範囲を絞れる job にし、既存公開物を即座に非公開にするのではなく、severity に応じて hold / review / notify を選ぶ。

## MVP

最初に作る:

- blocked terms
- allowed terms
- text normalization
- exact / phrase / normalized match
- allow / warn / hold / block decision
- translation / subtitle / comment / chat / post / AI draft 共通 check
- match log
- review item 生成と trust-operations case 連携
- dictionary rescan job の最小形

後回し:

- fuzzy match
- creator custom dictionary
- ML classifier
- shadow limit
- automatic appeal routing
- per-locale advanced policy

## テスト

- 日本語/英語 phrase match
- locale 別辞書
- 記号混入
- 伏せ字
- 全角半角
- ひらがな/カタカナ揺れ
- severity ごとの allow / warn / hold / block
- allowlist による誤判定回避
- AI draft 後段検査
- translation / subtitle / comment / chat / post 共通利用
- raw pattern を public response に返さない
- rescan job
