# posts ドメイン

## 目的

`posts` は作品公開の中心ドメイン。イラスト、漫画、小説、動画、音声、制作近況、添付ファイル付き配布物を、公開・会員限定・単品購入・予約公開として扱う。

作品を探しやすく、読みやすく、支援者には段階的に届けられる投稿基盤を作る。作品ビューア、会員公開、単品購入、先行公開、シリーズ整理を同じ投稿モデルで支える。

## 必要な投稿機能

作品投稿として必要な要素:

- 投稿種別を明示する。`illustration`, `manga`, `novel`, `ugoira_like`, `video`, `audio`, `article`, `file` のように、表示 UI と validation が変わる単位を持つ。
- 漫画・画像投稿は複数ページを順序付きで保持し、サムネイルに使うページを選べる。
- 小説投稿は本文、章タイトル、改ページ、表紙、縦書き表示、背景色、挿絵差し込みを扱える。
- タグは必須または強く推奨し、検索、推薦、作者ページ内フィルタに使う。
- 年齢制限、センシティブ区分、AI 生成有無、オリジナル/二次創作区分を投稿時の明示項目にする。
- 作品の言語、シリーズ、キャプション、作品説明を持つ。

支援・収益化投稿として必要な要素:

- 投稿は全体公開、ログイン限定、フォロワー限定、無料メンバー限定、有料メンバー限定、指定プラン限定、単品購入のような audience / access を持つ。
- 有料投稿でも teaser / preview を出せる。locked response は本文や添付 URL を返さず、タイトル、サムネイル、抜粋、加入・購入 CTA に必要な情報だけ返す。
- 予約投稿、公開日時指定、下書き自動保存、公開後編集、複製 draft が必要。
- 先行公開が必要。特定 tier に先行公開し、指定日時に全体公開またはより広い audience へ開放する。
- コレクションとタグで投稿を整理する。series は読む順番がある作品群、collection はクリエイターが見せたい棚、tag は横断検索用として分ける。
- 画像、動画、音声、本文、ボタン、区切り、添付ファイルを 1 投稿内に混在できる。
- コメント設定、通知設定、メール送信設定、メディア preview 設定を投稿単位で持つ。

## 責務

- 投稿 CRUD
- draft / published / scheduled / archived
- 作品種別ごとの validation と viewer response
- public / authenticated / follower / free_member / paid_member / tier / paid_unlock
- 先行公開 / unlock schedule
- teaser / preview / locked post response
- rich text block、media block、manga page、novel body、attachment
- tag / collection / series entry
- comment thread と comment policy
- content safety、age gate、AI generated disclosure
- 翻訳 / 字幕 contribution 対象可否
- feed event / notification request 発行

## 投稿種別

`postType` は viewer と editor の分岐に使う。単なるカテゴリタグではなく、必須 field と表示体験が変わる。

- `illustration`: 単一または複数画像。画像 viewer、差分画像、caption、alt text。
- `manga`: 複数画像ページ。ページ順、右綴じ/左綴じ、見開き、縦スクロール、代表サムネイル。
- `novel`: 長文本文。章、改ページ、表紙、縦書き、背景テーマ、挿絵 block。
- `video`: 動画または外部 embed。字幕 / 翻訳 contribution の主対象。
- `audio`: 音声、podcast、音声作品。添付台本や字幕 transcript と接続。
- `article`: 近況、制作ログ、告知、支援者向け記事。
- `file`: zip、pdf、epub、素材、3D file などの配布物。単品購入や tier 特典に向く。
- `stream_archive`: `streams` から生成されるアーカイブ投稿。字幕 / 翻訳 contribution と comments を接続する。

MVP は `article`, `illustration`, `manga`, `novel`, `video` から始める。`file` は attachment と paid unlock が安定してから本格化する。

## 公開範囲

`accessType` は「誰が閲覧できるか」を表す。payment provider の状態を直接持たず、`memberships` の entitlement に問い合わせる。

- `public`: 未ログインを含む全員。
- `authenticated`: ログイン済みユーザー。
- `followers`: creator を follow しているユーザー。
- `free_members`: 無料 membership / free follow 相当のユーザー。
- `paid_members`: いずれかの有料 subscription を持つユーザー。
- `tiers`: 指定 tier の subscription を持つユーザー。
- `paid_unlock`: 単品購入 entitlement を持つユーザー。
- `creator_only`: draft、review、制作管理用。

投稿は複数の access rule を持てるようにする。例: `paid_members` または `paid_unlock` のどちらかで閲覧可。MVP では `public`, `tiers`, `creator_only` を優先し、`paid_unlock` は schema と locked UI だけ先に用意する。

## 公開状態

`status`:

- `draft`: owner / collaborator のみ閲覧。自動保存対象。
- `scheduled`: `scheduledAt` までは creator dashboard のみ。公開 job で `published` に遷移。
- `published`: viewer と feed に出る。
- `archived`: creator は見られるが public listing から外す。
- `removed`: moderation または creator delete 後の tombstone。復旧・監査のため物理削除しない。

追加 field:

- `publishedAt`: 実際に公開された時刻。
- `scheduledAt`: 予約公開時刻。
- `backdatedAt`: 表示上の投稿日を過去日に寄せる場合。
- `editedAt`: 公開後編集表示用。
- `version`: 楽観ロックと revision 作成に使う。

## 早期アクセス

先行公開は access rule と unlock schedule の組み合わせで扱う。

- `earlyAccessUntil`: 先行公開が終わる時刻。
- `earlyAccessAudience`: 先行公開できる tier / paid member 条件。
- `afterEarlyAccessType`: public, authenticated, followers, free_members など開放後の audience。
- `notifyOnPublicUnlock`: 早期アクセス終了時に通知するか。

例:

```text
status=published
accessType=tiers
tierIds=[gold]
earlyAccessUntil=2026-05-10T10:00:00Z
afterEarlyAccessType=public
```

viewer は現在時刻で access rule を解決する。scheduler は時刻到達時に search index、feed event、notification request を更新する。

## 投稿本文と block

`posts.body` は summary / caption 程度に抑え、実本文は `post_blocks` と種別別 detail table に寄せる。

共通 block:

- `paragraph`
- `heading`
- `image`
- `gallery`
- `video`
- `audio`
- `embed`
- `divider`
- `button`
- `file_attachment`
- `poll`
- `callout`

block field:

- `id`
- `postId`
- `type`
- `sortOrder`
- `data`
- `visibility`: `same_as_post`, `public_preview`, `supporter_only`

`public_preview` block は locked response に含められる。`supporter_only` block は権限なし response で絶対に返さない。

## 種別別 detail

### image / manga

- `post_media_pages`: postId, mediaId, pageNumber, spreadGroup, altText, cropFocus, isCoverCandidate
- `thumbnailMediaId`: 一覧と locked response 用。
- `readingDirection`: `ltr`, `rtl`, `vertical_scroll`
- `pageMode`: `single`, `spread`, `toon_scroll`

漫画は画像 block の配列ではなく page table を持つ。順序変更、差し替え、サムネイル選択、翻訳注釈の page anchor を安定させるため。

### novel

- `post_novel_details`: postId, textFormat, body, coverMediaId, readingDirection, theme, wordCount
- `novel_sections`: postId, title, anchor, sortOrder
- `novel_illustrations`: postId, mediaId, insertAnchor

小説本文は revision と差分表示が重要。巨大本文を block JSON のみに閉じ込めず、全文検索や export しやすい保存形式を選ぶ。

### video / audio

- `post_media_details`: postId, mediaId, durationMs, transcriptStatus, waveformMediaId, posterMediaId
- `externalEmbedUrl` は `media` domain の provider abstraction に寄せる。
- 翻訳 / 字幕 contribution を許可するかは post 単位の `translationPolicy` で決める。

### file

- `post_attachments`: postId, mediaId, label, sortOrder, accessOverride, downloadable, licenseLabel
- attachment は locked response に URL を含めない。ファイル名、サイズ、形式、購入/加入 CTA に必要な metadata のみ返す。

## 整理機能

### tags

- `post_tags`: postId, normalizedName, displayName, locale, source
- 1 投稿あたり最大数を決める。MVP は最大 20、将来 50 まで拡張可にする。
- 大文字小文字、全角半角、表記ゆれの normalized key を持つ。
- age restriction や AI generated をタグだけで表現しない。専用 field を authoritative source にする。

### collections

- `collections`: creatorId, title, description, thumbnailMediaId, visibility, sortOrder
- `collection_entries`: collectionId, postId, sortOrder
- creator の公開ページで「支援者向け棚」「初めて読む人向け」「素材配布」などを表現する。

### series

- `series`: creatorId, title, description, postType, visibility, coverMediaId
- `series_entries`: seriesId, postId, chapterNumber, volumeNumber, sortOrder, titleOverride
- 順番に読む作品群。漫画・小説・動画連載に使う。

collection は棚、series は連載順、tag は検索軸。混ぜない。

## content safety / 年齢制限

投稿時に明示する field:

- `ageRating`: `all_ages`, `sensitive`, `r18`, `r18g`
- `sensitiveFlags`: `sexual`, `violence`, `gore`, `self_harm`, `spoiler`, `flashing`, `other`
- `isAiGenerated`
- `aiGenerationLevel`: `none`, `assisted`, `generated`, `unknown`
- `copyrightCategory`: `original`, `fanwork`, `licensed`, `other`
- `language`
- `contentWarnings`: free text labels

閲覧時:

- 未ログイン、年齢未確認、R-18 非表示設定のユーザーには locked / gated response を返す。
- タグに `R-18` が含まれていても、権限制御は `ageRating` を見る。
- `content-safety` の投稿前 check と投稿後再スキャンを必ず通す。

## コメントと反応

`commentPolicy`:

- `enabled`
- `supporters_only`
- `members_only`
- `disabled`
- `approval_required`

投稿単位で reaction / like / bookmark を許可する。MVP は comment と bookmark まで。ランキングや recommendation は後続。

## 通知と feed

投稿公開時に domain event を発行する。通知の配信判断、channel selection、既読管理は `notifications` が担当する。

- `post.published`
- `post.scheduled`
- `post.updated`
- `post.early_access_unlocked`
- `post.comment_created`
- `post.locked_teaser_updated`

notification 設定:

- `notifyFollowers`
- `notifyMembers`
- `sendEmail`
- `sendPush`
- `silentPublish`

予約投稿では、下書き保存時ではなく公開 job 成功後に通知する。

## データモデル

- `posts`: id, creatorId, postType, title, slug, summary, status, accessType, ageRating, isAiGenerated, language, thumbnailMediaId, publishedAt, scheduledAt, backdatedAt, editedAt, version
- `post_access_rules`: postId, ruleType, tierId, priceId, startsAt, endsAt
- `post_unlock_schedules`: postId, earlyAccessUntil, afterEarlyAccessType, notifyOnUnlock
- `post_blocks`: postId, type, sortOrder, visibility, data
- `post_media_pages`: postId, mediaId, pageNumber, spreadGroup, altText, cropFocus
- `post_novel_details`: postId, textFormat, body, coverMediaId, readingDirection, theme, wordCount
- `novel_sections`: postId, title, anchor, sortOrder
- `post_media_details`: postId, mediaId, durationMs, posterMediaId, transcriptStatus
- `post_attachments`: postId, mediaId, label, sortOrder, downloadable, accessOverride
- `post_tags`: postId, normalizedName, displayName, locale
- `collections`: creatorId, title, description, thumbnailMediaId, visibility, sortOrder
- `collection_entries`: collectionId, postId, sortOrder
- `comments`: postId, authorId, parentId, body, status
- `series`: creatorId, title, description, postType, visibility, coverMediaId
- `series_entries`: seriesId, postId, chapterNumber, volumeNumber, sortOrder
- `post_revisions`: postId, editorId, version, changeSummary, snapshotRef, createdAt

## backend 3 層

repository:

- post CRUD
- post access rule CRUD
- block persistence
- media page / novel / attachment persistence
- tag / collection / series lookup
- comments CRUD
- revision snapshot lookup

service:

- create draft / autosave / duplicate draft
- publish workflow
- schedule publish workflow
- 先行公開 resolution
- access validation
- entitlement check 呼び出し
- age gate check
- content-safety check 呼び出し
- locked / gated / unlocked response 生成
- feed event / notification request 発行
- search indexing payload 作成

route:

- `GET /api/posts`
- `POST /api/posts`
- `GET /api/posts/:id`
- `GET /api/posts/:id/viewer`
- `PATCH /api/posts/:id`
- `DELETE /api/posts/:id`
- `POST /api/posts/:id/publish`
- `POST /api/posts/:id/schedule`
- `POST /api/posts/:id/duplicate`
- `GET /api/posts/:id/revisions`
- `POST /api/posts/:id/comments`
- `GET /api/creators/:creatorId/collections`
- `POST /api/collections`
- `PATCH /api/collections/:id`
- `PUT /api/collections/:id/posts`
- `GET /api/series/:id`
- `POST /api/series`
- `PUT /api/series/:id/posts`

## frontend 3 層

repository:

- post API 呼び出し
- collection / series API 呼び出し

service:

- viewer view model
- locked UI model
- age gated UI model
- editor initial values
- post type specific validation
- block editor serializer
- manga page reorder model
- novel editor model
- comment tree model

route:

- `/creators/$slug/posts/$postId`
- `/creators/$slug/collections/$collectionId`
- `/creators/$slug/series/$seriesId`
- `/dashboard/posts`
- `/dashboard/posts/new`
- `/dashboard/posts/$postId/edit`
- `/dashboard/collections`
- `/dashboard/series`

hooks:

- `usePostViewer`
- `usePostEditor`
- `useCreatorPosts`
- `useCreatePost`
- `useUpdatePost`
- `usePublishPost`
- `useSchedulePost`
- `useDuplicatePost`
- `usePostComments`
- `useCreatorCollections`
- `useUpdateCollectionEntries`
- `useCreatorSeries`

## viewer response

`postViewerSchema` は discriminated union にする。

- `kind: "unlocked"`: 本文、block、media URL、attachment download URL、translation cue / annotation 参照を含む。
- `kind: "locked"`: 権限不足。本文や添付 URL は含めない。title、summary、thumbnail、creator、required tiers、purchase option、preview blocks のみ。
- `kind: "age_gated"`: 年齢確認・閲覧設定で制限。本文や添付 URL は含めない。
- `kind: "unavailable"`: 削除、停止、公開前、moderation removal。owner 以外には理由を限定する。

locked response は `memberships` と `payments` に必要以上に依存しない。CTA に必要な tier / price summary は service composition で合成する。

## shared schema 方針

`shared/schemas/posts.schema.ts` を唯一の schema 定義元にする。backend route validation、backend service input type、frontend repository response type、frontend form type はここから import する。

主要 schema:

- `postTypeSchema`
- `postStatusSchema`
- `postAccessTypeSchema`
- `postAgeRatingSchema`
- `postBlockSchema`
- `postAccessRuleSchema`
- `postViewerSchema`
- `createPostDraftSchema`
- `updatePostDraftSchema`
- `publishPostSchema`
- `schedulePostSchema`
- `collectionSchema`
- `seriesSchema`

## 深掘り

locked post response は慎重に設計する。閲覧権限がない場合、本文、添付ファイル URL、translation cue / annotation、支援者限定 block の data を返してはいけない。一方でタイトル、サムネイル、creator、summary、公開日、加入誘導に必要な tier 情報、単品購入価格は返す必要がある。

投稿種別ごとに table を分けすぎると一覧や feed がつらくなる。共通 metadata は `posts`、表示順のある本文は `post_blocks`、安定 ID が必要な漫画 page / novel / attachment は専用 table に置く。

comments は BBS の `comments` model を流用できるが、将来的に post comments と BBS comments を分けるか、generic comment にするかを決める必要がある。MVP では post comments に寄せる。

先行公開は単なる scheduled post ではない。投稿自体は公開済みだが audience が時間で広がるため、viewer、feed、notification、search index が同じ access resolver を使う必要がある。

検索タグは重要だが、R-18 や AI 生成のような compliance 項目をタグに任せると漏れる。投稿フォームではタグとは別の必須設定にする。

## MVP

最初に作る:

- `article`, `illustration`, `manga`, `novel`, `video`
- draft / published / scheduled
- public / tier / creator_only
- locked viewer response
- thumbnail / summary / preview blocks
- tags / series
- manga page reorder
- novel body + cover
- comments
- ageRating / isAiGenerated / content safety check

後回し:

- paid unlock
- free member audience
- 先行公開の notification request 自動発行
- collection editor の高度な並び替え
- poll / button block
- duplicate draft
- post revisions の UI

## テスト

- draft は owner のみ閲覧
- scheduled post は公開時刻前に一般公開されない
- 先行公開中は対象 tier だけ unlocked になる
- 先行公開終了後に after audience へ unlocked になる
- locked response に本文、attachment URL、translation cue / annotation が入らない
- age gated response に本文と media URL が入らない
- public preview block だけ locked response に含まれる
- manga page reorder 後も pageNumber が安定する
- novel update で revision が作られる
- comment 投稿時に content safety が動く
- owner 以外は post update 不可
- tag normalization が重複を防ぐ
- tier 変更後に entitlement check が最新状態を返す
