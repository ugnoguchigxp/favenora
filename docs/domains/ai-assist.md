# ai-assist ドメイン

## 目的

`ai-assist` は LLM / 翻訳 provider を使い、字幕、翻訳注釈、コメント表示翻訳、本文補助翻訳の draft を生成する補助ドメイン。

このドメインが作るものは公開物ではなく、編集開始点または表示補助。公開保存、人気順、creator approval、NG語句判定はそれぞれ `fansubs` / `posts` / `content-safety` 側で行う。

## 責務

- AI / translation provider abstraction
- subtitle AI draft generation
- annotation AI draft generation
- comment translation cache / display translation
- glossary / terminology hint
- prompt version 管理
- language pair validation
- usage / rate limit
- provider policy
- 限定公開コンテンツの外部送信制御
- content-safety 後段検査の呼び出し
- generated draft audit

## 責務外

- subtitle / annotation の公開保存
- comment 本体の保存
- UI 文言の i18n catalog
- NG語句辞書・blocked terms 判定ロジック
- creator approval
- translation popularity score
- trust-operations queue / moderation case 運用

AI 生成物を公開可能な revision にする処理は、対象ドメインが担う。例: subtitle draft は `fansubs` が revision 化し、comment draft は `posts` / comments 側が保存する。

## 翻訳ユースケース

`ai-assist` が扱う翻訳支援:

- subtitle track の初期翻訳 draft
- subtitle cue の部分再翻訳
- manga / illustration annotation の翻訳 draft
- novel / article の選択範囲翻訳 draft
- comment の viewer locale 向け表示翻訳
- comment composer での翻訳補助 draft
- 用語集・キャラクター名・固有名詞の訳語候補

MVP は subtitle draft、annotation draft、comment display translation を優先する。

## draft と cache

AI 出力は用途で分ける。

`draft`:

- user が編集して公開物に変換する候補。
- subtitle / annotation / comment composer に使う。
- revision として公開されるまでは公開物ではない。
- content-safety で `hold` / `block` の場合は apply 不可。

`display_cache`:

- viewer の locale に合わせて表示補助する機械翻訳。
- 原文の代替 source of truth ではない。
- comment や短い説明文に使える。
- report / moderation の対象は原文と翻訳表示の両方を参照できるようにする。

`suggestion`:

- glossary、言い換え、敬体/常体調整などの補助候補。
- そのまま保存しない。

## i18n との境界

`ai-assist` は user-generated content の翻訳を扱う。UI 文言、navigation、form label、validation message の翻訳 catalog は扱わない。

必要な共通概念:

- BCP 47 language tag
- sourceLanguage
- targetLanguage
- locale
- script
- text direction
- user preferred locale

これらは shared schema / shared utility として使い回す。`ai-assist` は provider に渡す language pair と出力 metadata に利用する。

## provider abstraction

provider interface:

- `translateText(input)`
- `translateCues(input)`
- `translateAnnotations(input)`
- `suggestGlossary(input)`
- `detectLanguage(input)`
- `estimateUsage(input)`

provider response は正規化する。

normalized output:

- `sourceLanguage`
- `targetLanguage`
- `segments`
- `confidence`
- `warnings`
- `provider`
- `model`
- `promptVersion`
- `usage`

LLM provider の raw response は frontend に返さない。必要な場合は audit 用に restricted storage へ保存する。

## 外部送信制御

限定公開 content、会員限定 content、未公開 draft を外部 provider に送れるかは強い設計判断が必要。

policy:

- instance setting
- creator setting
- post setting
- target visibility
- user role
- provider data retention policy
- source text length / sensitivity

MVP:

- public content は許可。
- locked content は instance admin と creator が許可した場合のみ。
- draft / unpublished content はデフォルト禁止。
- user が閲覧権限を持たない content は翻訳要求不可。

`ai-assist` は policy check を行うが、post entitlement の実判定は `memberships` / `posts` service を呼ぶ。

## content-safety 連携

AI 出力は公開前に必ず `content-safety` に通す。

check timing:

- draft 生成直後
- draft apply 前
- display cache 作成前
- glossary suggestion 表示前

decision:

- `allow`: draft / cache 利用可。
- `warn`: UI に注意表示。
- `hold`: apply 不可。review か再生成要求。
- `block`: apply 不可。出力を表示しない。

AI 出力が危険判定を受けた場合、provider raw output を一般 response に含めない。必要な audit 情報だけ保存する。

## 用語集

翻訳品質のために creator / post / series 単位の glossary を扱う。

field:

- `id`
- `creatorId`
- `postId`
- `seriesId`
- `sourceText`
- `targetText`
- `sourceLanguage`
- `targetLanguage`
- `note`
- `caseSensitive`
- `createdByUserId`

glossary は provider prompt に渡す補助情報であり、公開翻訳の source of truth ではない。

## データモデル

- `ai_translation_drafts`: targetType, targetId, userId, creatorId, provider, model, sourceLanguage, targetLanguage, promptVersion, status, safetyDecision, createdAt
- `ai_translation_segments`: draftId, sourceTextHash, sourceTextPreview, translatedText, startMs, endMs, anchorData, sortOrder
- `ai_translation_cache`: targetType, targetId, sourceHash, sourceLanguage, targetLanguage, translatedText, provider, model, safetyDecision, expiresAt
- `ai_glossary_terms`: creatorId, postId, seriesId, sourceText, targetText, sourceLanguage, targetLanguage, note
- `ai_assist_usage`: userId, creatorId, postId, targetType, provider, model, inputTokens, outputTokens, estimatedCost, generatedAt
- `ai_provider_configs`: provider, enabled, allowedLanguages, monthlyTokenLimit, externalSendPolicy, dataRetentionLabel
- `ai_prompt_versions`: purpose, version, templateHash, enabled, createdAt
- `ai_external_send_audits`: userId, targetType, targetId, provider, policyDecision, reason, createdAt

既存の `subtitle_ai_drafts` は `ai_translation_drafts` の `targetType=subtitle_track` として統合できる。

## backend 3 層

repository:

- AI draft CRUD
- segment CRUD
- translation cache CRUD
- glossary CRUD
- usage record
- provider config lookup
- prompt version lookup
- external send audit persistence

service:

- provider selection
- language detection
- language pair validation
- prompt build
- glossary injection
- rate limit
- external provider 送信可否判定
- draft generation
- display translation cache generation
- content-safety check 呼び出し
- draft apply eligibility check
- usage aggregation

route:

- `POST /api/ai-assist/translation-drafts`
- `GET /api/ai-assist/translation-drafts/:id`
- `POST /api/ai-assist/translation-drafts/:id/apply`
- `POST /api/ai-assist/comment-translations`
- `GET /api/ai-assist/comment-translations`
- `POST /api/ai-assist/glossary`
- `GET /api/ai-assist/glossary`
- `GET /api/ai-assist/providers`
- `GET /api/ai-assist/usage`

互換 route:

- `POST /api/subtitles/ai-drafts`
- `GET /api/subtitles/ai-drafts/:id`
- `POST /api/subtitles/ai-drafts/:id/apply`

互換 route は内部的に `targetType=subtitle_track` を使う。

## frontend 3 層

repository:

- AI assist API 呼び出し

service:

- draft editor model
- usage warning
- language pair selection
- apply-to-subtitle model
- apply-to-annotation model
- comment translation display model
- glossary editor model
- provider availability model

route:

- subtitle editor 内 AI draft panel
- annotation editor 内 AI draft panel
- comment translation action
- `/admin/ai-assist`
- `/dashboard/glossary`

hooks:

- `useCreateTranslationDraft`
- `useTranslationDraft`
- `useApplyTranslationDraft`
- `useCommentTranslation`
- `useGlossaryTerms`
- `useUpdateGlossaryTerm`
- `useAiAssistUsage`
- `useAiAssistProviders`

## shared/schemas

`shared/schemas/ai-assist.schema.ts` を ai-assist ドメインの Zod schema と型定義の Single Source of Truth にする。

定義する schema:

- `aiProviderSchema`
- `aiModelSchema`
- `aiAssistTargetTypeSchema`
- `aiDraftPurposeSchema`
- `aiTranslationDraftStatusSchema`
- `aiTranslationDraftSchema`
- `aiTranslationSegmentSchema`
- `createTranslationDraftSchema`
- `applyTranslationDraftSchema`
- `commentTranslationRequestSchema`
- `commentTranslationSchema`
- `aiGlossaryTermSchema`
- `aiAssistUsageSchema`
- `aiProviderConfigSchema`
- `aiExternalSendPolicySchema`

運用ルール:

- provider/model/promptVersion は draft に必ず残す。
- LLM provider の raw response を frontend に返さない。
- draft の apply input/output は schema で固定し、公開 revision への変換処理は対象ドメイン service に置く。
- 限定公開コンテンツを外部 provider に送れるか、利用量上限を超えていないかは service 層で検証する。
- language tag schema は `fansubs` と共有できるよう shared utility に寄せる。

## ドメイン連携

`fansubs`:

- subtitle / annotation draft の apply 先。
- apply 時に human revision を作る。

`posts`:

- comment display translation の source。
- comment composer draft の apply 先。

`content-safety`:

- AI output の後段検査。
- `hold` / `block` の draft は apply 不可。

`memberships` / `posts`:

- locked content の閲覧権限と外部送信可否を確認する。

`notifications`:

- 長時間 job 完了通知を後続で扱える。

## 深掘り

LLM draft は公開物ではなく編集開始点。生成直後は `draft` として保存し、ユーザーがニュアンス、口調、固有名詞、文化的表現を編集してから subtitle / annotation / comment として投稿する。

comment display translation は便利だが、原文を置き換えるものではない。通報・監査では原文と翻訳表示の両方を追えるようにし、翻訳 cache は期限付きにする。

限定公開コンテンツを外部 provider に送るかは強い設計判断が必要。MVP では instance setting で無効化できるようにし、creator か instance admin の同意設定を持つ。

翻訳品質は prompt だけでなく glossary と revision feedback に依存する。MVP では glossary を simple key-value にし、後続で creator approved translation から候補を作る。

## MVP

最初に作る:

- subtitle initial draft
- annotation initial draft
- comment display translation
- provider abstraction
- prompt version
- usage / rate limit
- external send policy
- content-safety 後段検査
- glossary basic CRUD

後回し:

- full post translation
- automatic alignment
- creator approved glossary suggestion
- batch translation job
- user feedback based quality tuning
- multiple provider fallback

## テスト

- 初回生成制限
- rate limit
- provider failure
- language pair validation
- locked content external send forbidden
- content-safety 後段検査
- blocked draft cannot apply
- draft apply to subtitle
- draft apply to annotation
- comment translation cache
- glossary injection
- raw provider response を frontend に返さない
