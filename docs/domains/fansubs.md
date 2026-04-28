# fansubs ドメイン

## 目的

`fansubs` は、ユーザーが投稿・編集する翻訳、字幕、注釈、補足説明を扱う共同翻訳ドメイン。動画字幕だけでなく、漫画ページ、イラスト、長文作品、音声 transcript、配信アーカイブに対する翻訳・注釈を同じ考え方で扱う。

このドメインが持つのは「人間が公開物として投稿する翻訳成果物」。機械翻訳の生成、NG語句辞書、UI 文言のローカライズは持たない。

## 責務

- subtitle track / cue / revision
- translation note / annotation
- page anchor / text anchor / timecode anchor
- translation / subtitle contribution 投稿
- 翻訳・注釈の言語 metadata
- WebVTT / SRT import/export
- 人気字幕・注釈の選択
- vote / report
- creator approval
- revision history
- mobile subtitle cache 前提の API
- post entitlement check
- content-safety check の呼び出し
- ai-assist draft の受け入れと人間編集 revision 化

## 責務外

- LLM provider 呼び出し
- 自動翻訳 prompt / model 管理
- NG語句辞書、blocked terms、判定ロジック
- UI 文言の i18n catalog
- 原文 post の本文管理
- comment 本体の CRUD
- moderation staff queue

上記はそれぞれ `ai-assist`, `content-safety`, `posts`, `moderation`, `trust-operations` 側に寄せる。

## 翻訳対象

対象 content:

- `video`: timecode subtitle。
- `audio`: transcript / subtitle。
- `stream_archive`: 配信アーカイブ字幕。
- `manga`: ページ単位の翻訳注釈、吹き出し anchor、コマ anchor。
- `illustration`: 画像内テキストや作品説明への注釈。
- `novel`: 段落・章・選択範囲への翻訳や訳注。
- `article`: 本文 block への翻訳補足。

MVP は `video`, `stream_archive`, `manga`, `novel` を優先する。コメント翻訳は公開翻訳成果物ではなく、表示補助として `ai-assist` の translation cache / draft に寄せる。

## 成果物の種類

`contributionType`:

- `subtitle_track`: 動画・音声向けの字幕トラック。
- `transcript`: 音声内容の文字起こし。
- `translation_note`: 原文や画像内テキストへの翻訳注釈。
- `context_note`: 文化的背景、用語、固有名詞の説明。
- `correction`: 既存翻訳への修正提案。

公開一覧では `subtitle_track` と `translation_note` を分ける。字幕は再生 UI に直接重ねるが、注釈はページ viewer / novel viewer の補助パネルや inline marker で表示する。

## 言語と i18n

`fansubs` は UI の i18n ではなく、ユーザー生成 content の language metadata を持つ。

field:

- `sourceLanguage`
- `targetLanguage`
- `locale`
- `script`: `latn`, `jpan`, `hans`, `hant`, `hang`, etc.
- `direction`: `ltr`, `rtl`, `vertical`
- `translationKind`: `direct`, `localized`, `literal`, `commentary`

ルール:

- language tag は BCP 47 互換の文字列に寄せる。
- `ja`, `ja-JP`, `zh-Hans`, `zh-Hant`, `pt-BR` のような locale 差分を保持できるようにする。
- viewer の初期選択は user locale、content language、creator recommended、popular score を組み合わせる。
- UI 文言の翻訳ファイルや routing locale は `fansubs` に置かない。

## anchor model

翻訳・注釈は content のどこに紐づくかを明確にする。

anchor:

- `time_range`: startMs, endMs
- `page_region`: pageNumber, x, y, width, height
- `text_range`: blockId, startOffset, endOffset
- `chapter`: chapterId
- `whole_work`: post 全体

漫画や小説の翻訳注釈は本文差し替えではなく anchor 付き note として保存する。原文 post の改訂で anchor がずれた場合は `anchorStatus: stale` にし、再確認 queue に出せるようにする。

## データモデル

- `fan_translation_tracks`: postId, authorId, contributionType, sourceLanguage, targetLanguage, locale, title, status, approvalState, visibility
- `subtitle_cues`: trackId, startMs, endMs, text, position, style
- `translation_annotations`: trackId, anchorType, anchorData, originalText, translatedText, note, confidence, status
- `translation_revisions`: trackId, editorId, revisionNo, sourceType, summary, snapshotRef, createdAt
- `translation_votes`: trackId, userId, value, reason
- `translation_reports`: trackId, annotationId, cueId, reporterId, reason, status
- `translation_usage_stats`: trackId, selectedCount, completionRate, lastSelectedAt
- `creator_translation_approvals`: trackId, creatorId, approvalState, note, decidedAt
- `translation_import_jobs`: postId, authorId, format, status, error, createdAt

`sourceType`:

- `human`
- `ai_draft_applied`
- `imported`
- `migration`

AI 草案を適用した場合も、公開対象は `human` または `ai_draft_applied` revision として `fansubs` が保持する。provider raw response は保持しない。

## 状態

track status:

- `draft`: author のみ。
- `submitted`: content-safety / validation 待ち。
- `published`: 閲覧可能。
- `needs_revision`: 修正要求。
- `hidden`: creator または moderation により非表示。
- `removed`: 削除・凍結。

approval state:

- `unreviewed`
- `creator_approved`
- `creator_rejected`
- `official`

content-safety result が `hold` の場合は `submitted` のまま review 待ちにする。`block` の場合は公開不可で `needs_revision` にする。

## 人気順と選択

人気字幕は単純な vote 数だけで決めない。

score 要素:

- vote score
- creator approval
- official flag
- selected count
- completion rate
- report rate
- content-safety state
- recency
- user locale match

通報率が高い翻訳、危険判定がある翻訳、未レビューの hold 翻訳は人気順から除外または順位を下げる。

## content-safety 連携

保存前に `content-safety` を呼ぶ対象:

- subtitle cue text
- annotation originalText / translatedText / note
- track title
- revision summary
- report reason

`fansubs` は判定結果を解釈して状態遷移するだけで、辞書や検出ロジックを持たない。

decision mapping:

- `allow`: 保存・公開可能。
- `warn`: author に警告を出して保存可能。
- `hold`: review 待ち。公開しない。
- `block`: 保存拒否または `needs_revision`。

## ai-assist 連携

`fansubs` は AI 草案の生成を行わない。

flow:

1. user が subtitle / annotation editor から AI draft を要求する。
2. `ai-assist` が provider を呼び、draft を保存する。
3. user が draft を編集する。
4. `fansubs` が編集済み内容を revision として保存する。
5. `content-safety` を通して publish / hold / block を決める。

同じ track で無制限再生成はしない。再生成は新 draft と usage record を作り、公開 revision とは分ける。

## entitlement

翻訳対象 post が locked の場合:

- post を閲覧できない user には track 一覧の詳細、cue、annotation 本文を返さない。
- locked response では言語、件数、creator approved の有無など、加入導線に必要な summary だけ返せる。
- 限定公開 content に紐づく翻訳は同じ entitlement を継承する。

## backend 3 層

repository:

- translation track CRUD
- subtitle cue CRUD
- annotation CRUD
- revision history
- vote / report persistence
- creator approval persistence
- usage stats
- import job persistence

service:

- post entitlement check
- language validation
- anchor validation
- subtitle parse / serialize
- revision creation
- popular score
- content-safety check 呼び出し
- creator approval
- report rate filtering
- stale anchor detection
- mobile cache response generation

route:

- `GET /api/posts/:id/translations`
- `POST /api/posts/:id/translations`
- `GET /api/translations/:id`
- `PATCH /api/translations/:id`
- `GET /api/translations/:id/cues`
- `PUT /api/translations/:id/cues`
- `GET /api/translations/:id/annotations`
- `PUT /api/translations/:id/annotations`
- `POST /api/translations/:id/vote`
- `POST /api/translations/:id/report`
- `POST /api/translations/:id/approve`
- `GET /api/translations/:id/export`
- `POST /api/translations/import`

既存互換として `/api/posts/:id/subtitles` は `subtitle_track` filter の alias にできる。

## frontend 3 層

repository:

- translation / subtitle API 呼び出し

service:

- subtitle selector model
- editor cue model
- annotation anchor model
- language selector model
- popular sort label
- import/export state
- locked translation summary model

route:

- `/creators/$slug/posts/$postId/subtitles`
- `/creators/$slug/posts/$postId/translations`
- `/translations/contributions`
- `/dashboard/translations`

hooks:

- `usePostTranslations`
- `usePostSubtitles`
- `useTranslationEditor`
- `useSubtitleEditor`
- `useVoteTranslation`
- `useReportTranslation`
- `useApproveTranslation`

## shared/schemas

`shared/schemas/fansubs.schema.ts` を fansubs ドメインの Zod schema と型定義の Single Source of Truth にする。

定義する schema:

- `languageTagSchema`
- `translationContributionTypeSchema`
- `translationTrackStatusSchema`
- `translationApprovalStateSchema`
- `translationAnchorSchema`
- `translationTrackSchema`
- `subtitleCueSchema`
- `translationAnnotationSchema`
- `translationRevisionSchema`
- `createTranslationTrackSchema`
- `updateTranslationTrackSchema`
- `updateSubtitleCueSchema`
- `updateTranslationAnnotationSchema`
- `translationVoteSchema`
- `translationReportSchema`
- `translationImportSchema`
- `translationExportSchema`

運用ルール:

- WebVTT / SRT import 後の正規化済み cue shape を shared schema で固定する。
- cue の `startMs < endMs` など構造 validation は schema または schema helper で保証する。
- anchorData は anchorType ごとの discriminated union にする。
- post 閲覧権限、creator approval、人気順計算、report rate filtering は service 層で扱う。
- mobile API の差分取得 response も shared schema に定義し、アプリ側と web 側で同じ型を使えるようにする。

## 深掘り

字幕、翻訳、注釈をすべて comment として扱うと、再生同期、ページ anchor、人気順、creator approval、export が崩れる。公開翻訳成果物は `fansubs` に寄せ、通常の会話 comment は `posts` / comments 側に残す。

翻訳は原文の派生物なので、原文 post の閲覧権限を必ず継承する。限定公開 post の翻訳だけが外から読める状態は作らない。

AI draft は便利だが、公開評価の対象は人間が確認した revision にする。機械生成のまま公開されたものは sourceType を残し、creator approval や人気順で扱いを調整できるようにする。

## MVP

最初に作る:

- subtitle track / cue
- manga / novel annotation
- language metadata
- revision
- content-safety check
- post entitlement check
- popular sort
- creator approval
- WebVTT / SRT import/export

後回し:

- stale anchor repair UI
- transcript auto alignment
- multi-editor collaboration
- glossary suggestion
- mobile offline diff sync
- official translation workflow

## テスト

- ログイン済みなら subtitle / annotation 作成可能
- post 閲覧権限がなければ本文付き translation は取得不可
- locked post の cues / annotations を返さない
- popular score
- report rate 除外
- creator approved 優先
- WebVTT / SRT import/export
- anchor validation
- AI draft applied revision
- content-safety hold / block で公開されない
- mobile 差分取得
