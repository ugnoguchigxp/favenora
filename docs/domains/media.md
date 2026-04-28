# media ドメイン

## 目的

`media` は投稿、プロフィール、プロジェクト、配信、翻訳 / 字幕 contribution に紐づく画像・動画・音声・ファイル・外部 media metadata を扱う。実ファイル保存、署名 URL、配信 URL、変換 job、削除処理は provider abstraction に閉じ込め、他ドメインに storage / CDN の実装詳細を漏らさない。

このドメインの最重要方針は vendor lock-in を避けること。特定クラウド、特定 object storage、特定 CDN、特定 image transformation service を前提にしない。MVP でも adapter interface を先に定義し、開発環境は local provider、本番環境は設定で選ぶ provider を使う。

## 非責務

- post の本文 block、viewer response、locked response の最終判定
- post attachment の読者向け access rule
- creator profile の項目管理
- project roadmap の公開可否
- subtitle cue の本文管理
- stream lifecycle や live chat
- 決済、entitlement、membership tier 判定
- moderation policy の最終判断

上記は `posts`, `creators`, `projects`, `fansubs`, `streams`, `memberships`, `content-safety` 側の責務とする。`media` は media asset の所有者、用途、状態、変換物、配信に必要な短命 URL を返す。

## 責務

- upload intent の発行
- upload completion の確定
- media asset metadata 管理
- MIME type / file size / extension / checksum validation
- image / video / audio / document / archive の種別判定
- thumbnail / resized image / transcoded video / waveform / poster などの variant 管理
- private asset と public asset の配信 URL 発行
- external media URL / embed metadata 管理
- provider abstraction
- owner validation
- usage reference の管理
- orphan asset cleanup
- content-safety scan request の起点
- virus / malware scan request の起点
- dashboard media library

## 他ドメインとの境界

`media` は「ファイルと派生物」を管理し、他ドメインは `media_assets.id` を参照する。

- `posts`: post media pages、novel cover、video/audio media、attachment は media id を参照する。post access と locked response は `posts` が解決する。
- `creators`: avatar、banner、portfolio image は media id を参照する。creator schema に raw object key や provider URL を持たせない。
- `projects`: cover media、related media は media id を参照する。public roadmap で private media URL を返さない判断は `projects` が行う。
- `streams`: external embed は stream 側で持てるが、archive file や poster は media id を参照する。
- `fansubs`: subtitle export file を保存する場合は media id を参照できる。ただし cue 本文は `fansubs` の責務。
- `content-safety`: scan job と結果を受け取り、media asset の safety state に反映する。

接続ルール:

- 他ドメインの public response に raw provider key、storage container 名、origin URL、署名 URL 作成用情報を含めない。
- 他ドメインは必要な用途を指定して `media` service から delivery URL を取得する。
- media asset の visibility は配信 URL 発行の上限を示すだけで、post / project / membership の権限を上書きしない。
- asset 削除は参照関係を確認して soft delete から始める。物理削除は cleanup job に寄せる。

## Provider 抽象化

storage と delivery は分けて考える。

`StorageProvider` が担当する:

- upload intent 作成
- upload 完了確認
- object metadata 取得
- object 読み取り stream
- object 削除
- object copy / move

`DeliveryProvider` が担当する:

- public URL 作成
- private signed URL 作成
- variant URL 作成
- URL の TTL / cache control 指定

`TransformProvider` が担当する:

- image resize
- thumbnail 生成
- video transcode
- audio waveform 生成
- poster frame 生成

provider interface は capability based にする。例えば `supportsDirectUpload`, `supportsSignedUrl`, `supportsRangeRequest`, `supportsImageTransform`, `supportsVideoTranscode` のように機能で分岐し、provider 名で business logic を分岐しない。

provider の例:

- `local`: 開発・テスト用。filesystem に保存し、local route 経由で配信する。
- `object_storage`: object storage adapter。設定で endpoint / credentials / namespace / path strategy などを差し替える。
- `remote_url`: 外部 URL / embed metadata のみを保持し、ファイル本体を保存しない。
- `managed_media`: 将来の media processing service 用。実装は adapter 内に閉じ込める。

禁止事項:

- DB schema や public schema に vendor 固有の container / distribution / region 名を authoritative field として持たせる。
- posts / creators / projects から provider SDK を直接呼ばない。
- provider の署名 URL を長期保存する。
- CDN URL を canonical identifier として扱う。

## Upload Workflow

基本 flow:

1. frontend が `POST /api/media/upload-intents` に file metadata を送る。
2. service が owner、用途、MIME type、size、quota、許可拡張子を検証する。
3. service が `media_assets` を `pending_upload` で作成する。
4. `StorageProvider.createUploadIntent` が upload URL / fields / headers を返す。
5. frontend が provider 指定先へ upload する。local provider の場合は API 経由 upload でもよい。
6. frontend が `POST /api/media/:id/complete` を呼ぶ。
7. service が provider から object metadata / checksum を確認し、`uploaded` に遷移する。
8. scan / transform job を enqueue し、asset を `processing` にする。
9. 完了後に `ready` へ遷移する。失敗時は `failed` と reason を持つ。

MVP では `local` provider と `remote_url` provider を先に実装する。object storage は adapter interface と schema を先に用意し、実 provider は設定で差し替える。

## 配信 URL

media asset は用途別に URL を発行する。

- `thumbnail`: 一覧や card 用。公開可否は呼び出し元 domain が判断する。
- `preview`: locked / teaser 用に許可された低解像度または短尺版。
- `inline`: post viewer や profile 表示用。
- `download`: attachment download 用。原則短命 URL。
- `editor`: dashboard editor 用。owner / collaborator のみ。

public response に含める URL は `MediaDeliveryService` がその場で生成する。署名 URL は短命にし、DB には保存しない。URL ではなく `mediaId`, `variantId`, `purpose` を canonical にする。

## 状態モデル

media asset status:

- `pending_upload`: upload intent 発行済み。
- `uploaded`: provider 上に object が存在する。
- `processing`: scan / transform 実行中。
- `ready`: 利用可能。
- `failed`: upload / scan / transform が失敗。
- `quarantined`: safety / malware scan により隔離。
- `deleted`: soft delete 済み。

media kind:

- `image`
- `video`
- `audio`
- `document`
- `archive`
- `external_embed`
- `unknown`

asset visibility:

- `private`: owner / collaborator 用。public delivery URL を発行しない。
- `restricted`: post / membership / project など呼び出し元の権限判定後に URL を発行する。
- `public`: asset 単体として公開 URL を発行できる。

variant kind:

- `thumbnail`
- `preview_image`
- `resized_image`
- `poster`
- `transcoded_video`
- `audio_preview`
- `waveform`
- `download_original`

## データモデル

- `media_assets`: id, ownerId, ownerType, mediaKind, status, visibility, providerKey, storageHandle, originalFilename, mimeType, byteSize, checksum, width, height, durationMs, createdAt, updatedAt, deletedAt
- `media_variants`: id, mediaId, variantKind, status, providerKey, storageHandle, mimeType, byteSize, width, height, durationMs, transformPreset, createdAt
- `media_external_sources`: id, mediaId, sourceType, url, providerName, embedHtml, thumbnailUrl, metadata, lastFetchedAt
- `media_usages`: id, mediaId, usageType, targetType, targetId, createdAt
- `media_scan_results`: id, mediaId, scanType, status, verdict, details, scannedAt
- `media_upload_intents`: id, mediaId, providerKey, expiresAt, maxBytes, allowedMimeTypes, status

`providerKey` は `local`, `object_storage`, `remote_url` のような app 内の adapter key。`storageHandle` は provider adapter だけが解釈する opaque value とし、public response に出さない。

`post_attachments` は `posts` の責務。`media` では generic な `media_usages` で参照状態を追い、post attachment の並び順や access override は `posts` に置く。

## backend 3 層

repository:

- media asset CRUD
- variant CRUD
- external source CRUD
- upload intent CRUD
- usage reference CRUD
- scan result persistence

service:

- upload intent 生成
- upload completion 確定
- MIME type / size / checksum validation
- owner validation
- quota validation
- provider selection
- storage provider abstraction
- delivery provider abstraction
- transform job enqueue
- scan job enqueue
- variant readiness aggregation
- delivery URL 発行
- orphan cleanup 判定

route:

- `POST /api/media/upload-intents`
- `POST /api/media/:id/complete`
- `GET /api/media/:id`
- `GET /api/media/:id/delivery-url`
- `GET /api/media/:id/variants`
- `POST /api/media/external-sources`
- `PATCH /api/media/:id`
- `DELETE /api/media/:id`
- `GET /api/dashboard/media`

他ドメイン route から直接 attachment を扱う endpoint は各ドメインに置く。例: `POST /api/posts/:id/attachments` は `posts` service が media ownership と post access を確認してから media usage を登録する。

## frontend 3 層

repository:

- media API 呼び出し
- upload intent API 呼び出し
- upload completion API 呼び出し
- delivery URL API 呼び出し

service:

- upload state machine
- drag and drop validation
- preview model
- media picker model
- variant readiness model
- attachment candidate model
- external embed preview model
- retry / cancel state

route:

- post editor 内 media picker
- creator profile editor 内 media picker
- project editor 内 media picker
- dashboard media library

hooks:

- `useUploadIntent`
- `useMediaUpload`
- `useCompleteMediaUpload`
- `useMediaAsset`
- `useMediaDeliveryUrl`
- `useMediaVariants`
- `useDashboardMedia`
- `useExternalMediaSource`

## shared/schemas

`shared/schemas/media.schema.ts` を media ドメインの Zod schema と型定義の Single Source of Truth にする。

定義する schema:

- `mediaProviderKeySchema`
- `mediaKindSchema`
- `mediaAssetStatusSchema`
- `mediaAssetVisibilitySchema`
- `mediaAssetSchema`
- `mediaAssetDashboardSchema`
- `mediaAssetPublicSchema`
- `mediaVariantKindSchema`
- `mediaVariantStatusSchema`
- `mediaVariantSchema`
- `mediaDeliveryPurposeSchema`
- `createUploadIntentSchema`
- `uploadIntentResponseSchema`
- `completeUploadSchema`
- `mediaDeliveryUrlResponseSchema`
- `externalMediaSourceSchema`
- `createExternalMediaSourceSchema`
- `mediaUsageSchema`
- `mediaScanResultSchema`

運用ルール:

- MIME type、file size、checksum、provider key、asset status の構造 validation は shared schema に寄せる。
- provider の raw storage handle、署名生成材料、secret、origin URL は public schema に含めない。
- dashboard response と public response を分ける。
- delivery URL response は短命 URL と expiresAt を持つ。canonical data として扱わない。
- upload 権限、owner validation、quota、provider 障害時の扱いは service 層で検証する。
- frontend repository は shared schema から `z.infer` した response 型だけを返す。

## 実装計画

1. schema を作る。media kind、status、visibility、variant kind、delivery purpose、upload intent、dashboard/public response を定義する。
2. DB table を作る。`media_assets`, `media_variants`, `media_upload_intents`, `media_usages`, `media_external_sources`, `media_scan_results` を追加する。
3. provider interface を作る。`StorageProvider`, `DeliveryProvider`, `TransformProvider` と capability model を定義する。
4. local provider を実装する。開発環境で upload、complete、delivery URL、delete が通る状態にする。
5. remote_url provider を実装する。external embed URL と metadata を保存し、ファイル保存なしで posts / streams から使えるようにする。
6. media service を実装する。upload intent、complete、delivery URL、owner validation、usage tracking を service に閉じ込める。
7. backend route を実装する。route は schema validation と service 呼び出しだけにする。
8. frontend repository / hooks を実装する。upload state、complete、delivery URL 取得、media picker を共通化する。
9. posts / creators / projects を media id 参照に接続する。各 domain は provider を知らない形にする。
10. scan / transform job の stub を入れる。MVP では同期または no-op でもよいが、status 遷移は本番 job に置き換えられる形にする。
11. cleanup job を入れる。`pending_upload` の期限切れ、未参照 asset、deleted asset の物理削除を provider 経由で行う。

## MVP

最初に作る:

- local provider
- remote_url provider
- upload intent / complete
- image / video / audio / document / archive の metadata 保存
- thumbnail variant の schema と ready 判定
- dashboard media library
- media picker
- creator avatar / banner upload 連携
- post attachment 用 media id 選択
- delivery URL 発行

後回し:

- 本格 video transcode
- adaptive streaming
- image transformation service 連携
- large multipart upload
- resumable upload
- malware scan provider 連携
- quota billing
- CDN purge
- cross-region replication

## 深掘り

media は最初から「保存先」ではなく「media lifecycle」を中心に設計する。保存先を DB schema や他ドメインに漏らすと、provider 変更、CDN 変更、local 開発、本番環境の切り替えが難しくなる。

`storageHandle` は provider adapter だけが理解する opaque value にする。例えば object key、local path、remote source id のどれであっても、application service は `mediaId` と `variantId` で扱う。

delivery URL は short-lived な結果であり、権限判定済みの view model にだけ含める。post が locked の場合、`posts` service は `media` に download URL を要求しない。`media` service だけで membership access を決めない。

external embed は「URL 文字列をそのまま iframe に入れる」設計にしない。source type ごとの allowlist、metadata fetch、embed policy、thumbnail の扱いを service で正規化する。

## テスト

schema tests:

- MIME type validation
- file size validation
- checksum format validation
- dashboard schema に storageHandle が含まれない
- public schema に storageHandle / provider secret / origin URL が含まれない

backend tests:

- owner validation
- upload intent expiresAt
- complete upload checksum mismatch
- provider error handling
- delivery URL expiresAt
- deleted asset は delivery URL を発行しない
- private asset は public purpose の delivery URL を発行しない
- usage がある asset は即時物理削除しない
- remote_url provider は file upload を要求しない
- local provider で upload から delivery まで通る

integration tests:

- creator avatar upload
- post attachment 権限
- locked post では download URL が返らない
- project roadmap に private media URL が返らない
- external embed URL の allowlist
