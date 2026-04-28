# Favenora クリエイタープラットフォーム計画

  

## 1. プロダクト方針

  

Favenora は Patreon に近い会員制支援モデルを参考にしつつ、小説、映像、漫画、イラスト、配信などのクリエイティブ活動を支える OSS のクリエイター収益化プラットフォームを目指す。

  

対象クリエイター:

  

- 小説家、Web 小説作家

- 映像制作者、動画クリエイター

- 漫画家

- イラストレーター

- Streamer、ライブ配信者

  

提供価値:

  

- クリエイターは作品公開、支援者コミュニティ、会員プラン、投げ銭、制作管理をまとめて扱える。

- 支援者はクリエイターのフォロー、会員プラン加入、限定投稿の閲覧、配信中の投げ銭、コミュニティ参加ができる。

- アカウントを持つユーザーは fan sub を投稿・評価し、人気の字幕を選択して作品を楽しめる。

- インスタンス運営者はセルフホストし、決済、モデレーション、ストレージ、検索・発見性の方針を設定できる。

  

この計画では、現在のモノリシック構造を維持する。

  

- バックエンド: Hono routes、service layer、repository layer、Drizzle schema を持つ `api/`

- フロントエンド: TanStack Router、domain modules、shared API client を持つ `src/`

- 共有契約: frontend/backend 共通の Zod schema を置く `shared/schemas/`

- デザインシステム: プロダクト UI 全体で `designSystem/` を再利用

- 認証基盤: 将来的に `../gxp-idProvider` を OIDC/OAuth2 provider として使い、Favenora は client / resource server として連携する

  

## 2. プロダクトの柱

  

### クリエイター収益化

  

- 公開プロフィール、自己紹介、リンク、カテゴリ、ポートフォリオ表示

- 月額会員プラン、特典、公開範囲、人数制限

- 支援者のサブスクリプション

- 単発の投げ銭

- 有料投稿、ダウンロード可能な作品・素材

- 売上、手数料、返金、入金状況を確認できる収益ダッシュボード

  

### 作品公開

  

- テキスト、画像、動画、漫画ページ、添付ファイル、外部埋め込みに対応した投稿

- 公開範囲: 全体公開、フォロワー限定、会員プラン限定、単品購入、予約投稿

- 小説、漫画の章、映像シリーズなどの長期作品をまとめるシリーズ・プロジェクト

- 下書き、予約公開、改訂履歴、コンテンツ警告

- コメントスレッドと支援者向け議論

  

### fan sub

  

- アカウントを持つユーザーが、動画、配信アーカイブ、漫画、イラスト投稿、ノベル音声化などに字幕・翻訳・注釈を投稿できる。

- 作品ごとに複数の fan sub を保持し、人気順、言語、作成者、更新日で選択できる。

- 支援者・視聴者は再生画面や閲覧画面で好きな字幕を切り替えて利用できる。

- 投票、いいね、採用数、通報数、クリエイター承認状態をもとに「人気の字幕」を決める。

- OpenAI などの LLM を使い、字幕作成時に初回だけ自動初期翻訳を生成できる。ユーザーはその草案からニュアンスを調整して投稿する。

- クリエイターは公式採用、固定表示、非表示、編集依頼、削除依頼を行える。

- 攻撃的な単語・フレーズ、差別表現、嫌がらせ、スパムを投稿前と投稿後の両方で検査する。

- 将来的なモバイルアプリでも同じ字幕 API を使い、オフラインキャッシュや端末言語に応じた初期選択を可能にする。

  

### 制作支援

  

- 章、エピソード、シーン、コミッション、素材制作を管理するプロジェクトボード

- マイルストーンと制作進捗

- バックログと公開カレンダー

- 編集者、アシスタント、モデレーター、共同制作者などの協力者ロール

- 将来的な依頼・コミッション受付

  

### ライブ配信と投げ銭

  

- タイトル、予定時刻、配信状態、チャット、支援目標を持つ配信ページ

- メッセージ付きリアルタイム投げ銭

- 投げ銭目標とキャンペーンカウンター

- 配信アーカイブの投稿化

- 動画配信は最初から自前基盤を作らず、外部配信 URL / embed から始める。後から self-hosted または S3 互換メディア管理を追加する。

  

### OSS インスタンス運用

  

- 管理者向けモデレーションキュー

- クリエイター、投稿、コメント、配信、ユーザーへの通報対応

- インスタンス単位の決済プロバイダー設定

- ストレージプロバイダー設定

- 決済、モデレーション、管理操作の監査ログ

  

## 3. 既存アーキテクチャとの合わせ方

  

現在のドメイン単位の構造を継続する。

  

バックエンド module:

  

```text

api/modules/<domain>/<domain>.routes.ts

api/modules/<domain>/<domain>.service.ts

api/modules/<domain>/<domain>.repository.ts

```

  

フロントエンド module:

  

```text

src/modules/<domain>/<domain>.repository.ts

src/modules/<domain>/<domain>.service.ts

src/modules/<domain>/<domain>.routes.tsx

src/modules/<domain>/hooks/

src/modules/<domain>/components/

src/routes/<thin-route-wrapper>.tsx

```

  

共有 schema:

  

```text

shared/schemas/<domain>.schema.ts

```

shared schema の共通方針:

- `shared/schemas/<domain>.schema.ts` を各ドメインの Zod schema と型定義の Single Source of Truth にする。
- backend route validation、backend service input、frontend repository response、frontend form values は shared schema から `z.infer` した型を使う。
- DB table 型を API response や UI に直接漏らさない。
- public response、dashboard response、admin response、mutation input は schema を分ける。
- sanitize、normalize、文字数、URL、enum、discriminated union などの構造的 validation は shared schema に寄せる。
- owner 判定、公開可否、閲覧権限、外部 provider 送信可否などの business rule は service 層で追加検証する。

フロントエンドの 3 層構造:

- repository: `src/lib/api.ts` の Hono RPC client を使う API 通信だけを担当する。
- service: repository の結果を画面用 view model に整形し、複数 repository をまたぐ UI 向けロジックを担当する。
- route: 画面単位の composition を担当する。TanStack Router の file route は `src/routes/` に薄い wrapper として置き、実体は `src/modules/<domain>/<domain>.routes.tsx` に寄せる。

React 側の API 利用ルール:

- API client は `src/lib/api.ts` に集約する。コンポーネントや route から `fetch` や Hono client を直接呼ばない。
- API 通信は必ず domain repository 経由にする。
- TanStack Query は domain hooks で使う。route / component は hooks を呼ぶだけにする。
- mutation 後の cache invalidation も hooks に閉じ込める。
- component は表示と入力イベントに集中し、API response の shape を直接知らないようにする。
- shared schema の型を repository / service / hooks で再利用し、画面ごとの重複 type 定義を避ける。

  

追加を推奨するドメイン:

  

| ドメイン | 役割 |

| --- | --- |

| `creators` | クリエイタープロフィール、slug、公開ページ、カテゴリ |

| `posts` | 作品投稿、下書き、アクセス制御、予約投稿 |

| `media` | アップロードメタデータ、添付ファイル、サムネイル、処理状態 |

| `memberships` | 会員プラン、特典、サブスクリプション、閲覧権限 |

| `payments` | 投げ銭、請求、決済 provider event、入金 |

| `streams` | 配信ルーム、配信状態、チャット、投げ銭目標 |

| `fansubs` | 字幕投稿、言語、タイムコード、投票、人気順、採用状態 |

| `ai-assist` | LLM provider abstraction、自動初期翻訳、生成履歴、利用量制限 |

| `projects` | 制作管理、マイルストーン、公開計画 |

| `moderation` | クリエイター向け行動履歴、監査、fan 関係記録、審査関係記録 |

| `trust-operations` | 運営側管理メニュー、通報 queue、case 管理、system audit |

| `content-safety` | NGワード・攻撃的フレーズ検査、辞書管理、判定ログ |

| `notifications` | アプリ内通知、メール通知、push、digest 配信 |

| `analytics` | FAN 動向統計、実績解除、membership daily summary、creator metrics |

  

既存の `bbs` module は初期開発中のサンプル・コミュニティ機能として残せる。ただし本番向けのコミュニティ機能は、最終的に `posts` のコメント機能か、専用の `communities` module へ寄せる。

  

### `gxp-idProvider` 連携

  

Favenora は既存の local / OAuth 認証を持っているが、fan sub、モバイルアプリ、複数サービス連携を考えると、認証基盤は `../gxp-idProvider` を優先する方針に寄せる。

  

連携方針:

  

- `gxp-idProvider` を OIDC issuer として扱い、Favenora frontend は Authorization Code + PKCE でログインする。

- Favenora backend は access token の issuer、audience、署名、期限、scope を検証する resource server になる。

- Favenora 側の `users` は IdP の subject を外部 ID として持つ local profile table として扱う。

- fan sub 投稿は「ログイン済みアカウントなら利用可能」を基本条件にする。会員プラン加入は不要。

- クリエイター管理、moderation、admin は IdP の RBAC / entitlement check を利用できるようにする。

- モバイルアプリは `gxp-idProvider` の OIDC flow と Kotlin / Swift SDK を使う前提で、Favenora API は bearer token でも cookie session でも動けるようにする。

  

移行上の注意:

  

- 既存 `api/routes/auth.ts` はすぐに削除せず、開発用 local auth として残すか、IdP client 実装完了後に段階的に置き換える。

- `user_external_accounts` は IdP subject 連携用に再整理する。

- web と mobile の両方で同じ account identity を使うため、user id の source of truth を早めに決める。

  

## 4. データモデルのロードマップ

  

### 基盤

  

- `users`: 既存のアカウントテーブル

- `creator_profiles`: まずは 1 ユーザー 1 クリエイター identity

- `user_identities`: Favenora user と `gxp-idProvider` subject の対応

- `creator_categories`: 小説、漫画、映像、イラスト、配信など

- `follows`: 無料フォロー関係

  

### 作品公開

  

- `posts`: title、body、status、access type、creator id、publish time

- `post_blocks`: テキスト、画像、動画、漫画ページなどの構造化ブロック

- `post_attachments`: ダウンロード可能なファイルやメディア参照

- `comments`: 既存 BBS comments model を一般化して利用可能

- `series`: 作品シリーズ

- `series_entries`: 投稿、章、エピソードの順序管理

  

### fan sub

  

- `subtitle_tracks`: 投稿・配信・メディアに紐づく字幕トラック。language、title、status、source type、creator approval state を持つ。

- `subtitle_cues`: 開始時刻、終了時刻、本文、位置指定などの字幕行。WebVTT / SRT import を見据える。

- `subtitle_votes`: ユーザーの vote / like / helpful 評価。人気順算出に使う。

- `subtitle_usage_stats`: 選択回数、視聴完了率、採用率などの集計。

- `subtitle_reports`: 字幕単位・cue 単位の通報。

- `subtitle_revisions`: 編集履歴。攻撃的表現の修正やクリエイター承認の監査に使う。

- `subtitle_ai_drafts`: LLM が初回生成した字幕草案。provider、model、source language、target language、prompt version、生成時刻を持つ。

- `subtitle_ai_usage`: ユーザー・作品・インスタンス単位の LLM 利用量と rate limit 管理。

  

### 収益化

  

- `membership_tiers`: クリエイターが所有する会員プラン

- `tier_benefits`: 表示用の特典一覧

- `subscriptions`: 支援者と会員プランの関係

- `entitlements`: 会員プラン、単品購入、招待付与などの閲覧権限

- `tips`: 投稿や配信に紐づけ可能な単発投げ銭

- `payment_events`: 決済 provider webhook の台帳

- `payout_accounts`: クリエイターの入金設定状態

- `refunds`: 返金管理

  

### 配信

  

- `streams`: 予約済み、配信中、終了済みの配信ルーム

- `stream_chat_messages`: チャット履歴

- `stream_tip_goals`: 配信中の支援目標

- `stream_events`: 配信状態変更やモデレーションイベント

  

### 制作管理

  

- `projects`: クリエイターの制作ワークスペース

- `project_milestones`: 制作マイルストーン

- `project_tasks`: タスクボード項目

- `project_updates`: 支援者向け制作進捗

  

### 信頼性と安全性

  

- `reports`: ユーザーからの通報

- `moderation_actions`: 管理者・クリエイターによるモデレーション操作

- `audit_logs`: 機微な変更、決済、モデレーション操作の監査ログ

- `blocked_terms`: 攻撃的な単語・フレーズ、差別表現、スパム語句の辞書

- `blocked_term_matches`: 投稿、コメント、fan sub、チャットで検出された一致ログ

- `content_safety_reviews`: 自動ブロック後の再審査、異議申し立て、手動許可の記録

  

## 5. fan sub 設計

  

fan sub は「アカウントがあれば参加できる共同字幕機能」として設計する。収益化機能から独立させ、会員プラン加入を必須にしない。

  

対象コンテンツ:

  

- 動画投稿

- 配信アーカイブ

- 音声付き作品

- 漫画・イラストへの翻訳注釈

- 小説や長文作品の翻訳・注釈

  

字幕フォーマット:

  

- 初期は WebVTT を第一候補にする。

- import/export は WebVTT と SRT を優先する。

- 漫画・イラスト向けには時刻ではなくページ番号、領域座標、吹き出し単位を扱える拡張 model を用意する。

  

人気字幕の選択:

  

- デフォルト表示は language、creator approval、vote score、report rate、recent activity を組み合わせる。

- クリエイターが公式採用した字幕は優先表示する。

- 通報率が高い字幕、content safety に引っかかった字幕、未レビューの危険判定字幕は人気順から除外する。

- ユーザーは字幕トラックを手動で切り替えられる。

  

投稿・編集ルール:

  

- 投稿にはログイン済みアカウントが必要。

- 会員プラン加入は不要。ただしクリエイターが作品単位で fan sub を無効化できる。

- LLM による自動初期翻訳は、字幕トラック作成時の最初の草案生成として提供する。同じ字幕トラックで何度も無制限に再生成する機能にはしない。

- ユーザーは LLM 草案をそのまま公開するのではなく、ニュアンス、口調、固有名詞、文化的表現を編集してから投稿する。

- LLM 草案と人間が編集した字幕は別 revision として記録し、人気順や採用状態では最終的な人間編集済み字幕を評価対象にする。

- 投稿時に NGワード・攻撃的フレーズ検査を行う。

- 検査に引っかかった場合は即時公開せず、修正要求または `trust-operations` queue に送る。

- 編集履歴を残し、悪用時はアカウント単位で字幕投稿制限を行う。

  

LLM 自動初期翻訳:

  

- provider は OpenAI 固定にせず、`ai-assist` domain で provider abstraction を置く。

- 初期 provider 候補は OpenAI。将来的にローカル LLM、他社 API、インスタンス独自 provider を追加できるようにする。

- LLM へ送る入力は必要最小限にし、限定公開コンテンツでは作品本文や未公開情報の扱いを設定で制御する。

- 出力は即公開せず、`draft` 状態で保存する。

- 自動初期翻訳後も content safety check を行い、攻撃的表現や危険フレーズが含まれる場合は公開前にブロックまたは修正要求する。

- prompt version、provider、model、入力言語、出力言語、生成者、生成日時を保存し、後から品質改善と監査ができるようにする。

- インスタンス運営者は LLM 機能の有効/無効、月間利用上限、ユーザー単位の利用上限、対象言語を設定できる。

  

モバイル前提:

  

- 字幕一覧 API はページング、language filter、popular sort を必須にする。

- 字幕本文はコンテンツごとに差分取得できるようにする。

- モバイルではユーザーの端末言語に近い字幕を初期選択する。

- オフライン再生・閲覧を考え、字幕トラックはキャッシュしやすい JSON / WebVTT 形式で返せるようにする。

  

## 6. アクセス制御モデル

  

閲覧権限の判定は route handler に散らさず、entitlement service に集約する。

  

アクセス種別:

  

- `public`: 誰でも閲覧可能

- `authenticated`: ログインユーザーのみ閲覧可能

- `followers`: 無料フォロワーのみ閲覧可能

- `tier`: 指定された会員プラン加入者のみ閲覧可能

- `paid_unlock`: 単品購入したユーザーのみ閲覧可能

- `creator_only`: 下書きや制作管理など、クリエイター本人のみ閲覧可能

  

バックエンドのルール:

  

- routes は `EntitlementService.canViewPost(userId, postId)` のような service を呼ぶ。

- repositories はデータ取得に専念し、ビジネス上の閲覧可否を判断しない。

- frontend は locked UI を表示できるが、最終的な権限判定は backend が行う。

- fan sub の投稿権限は「ログイン済み」を基本にし、作品の閲覧権限がある場合のみ対象コンテンツへ字幕を追加できる。

- 限定公開コンテンツの字幕は、そのコンテンツを閲覧できるユーザーだけが見られる。

  

## 7. content safety / NGワード方針

  

攻撃的な単語・フレーズのブロックは fan sub、コメント、配信チャット、プロフィール、投稿本文で共通に使う。

  

基本方針:

  

- `content-safety` domain を独立させ、辞書、検査、判定ログ、再審査をまとめる。

- 初期はルールベース辞書で始め、後から ML / 外部 moderation API を provider として追加できるようにする。

- 完全な自動削除ではなく、危険度に応じて「ブロック」「公開保留」「警告付き許可」「通報優先度上げ」を分ける。

- 言語ごとに辞書を分け、日本語、英語、韓国語、中国語などの fan sub 利用を見据える。

- 単語だけでなく phrase、正規化表記、伏せ字、スペース挿入、記号混入に対応する。

- LLM が生成した初期翻訳も、人間が投稿した字幕と同じ基準で検査する。

  

検査タイミング:

  

- 投稿前: 入力確定前の即時検査

- 投稿時: backend で authoritative check

- 投稿後: 辞書更新時の再スキャン

- 通報時: `trust-operations` queue の優先度算出

  

API 方針:

  

- frontend の即時フィードバック用に軽量な `/api/content-safety/check` を用意する。

- backend は fan sub / comment / chat / post 保存時に必ず service 経由で検査する。

- 検査結果は監査可能にするが、攻撃的フレーズ辞書そのものは一般ユーザーに公開しない。

  

## 8. 決済方針

  

OSS インスタンスごとに provider を選べるよう、最初から決済 provider abstraction を用意する。

  

初期 provider 候補:

  

- Stripe: カード決済、サブスクリプション、単発投げ銭、webhook、返金、利用可能地域での Connect 風 payout に対応しやすい。

  

Provider 境界:

  

```text

api/services/payments/provider.ts

api/services/payments/stripe.ts

api/modules/payments/

```

  

重要な制約:

  

- カード情報は保存しない。

- 決済完了は webhook を source of truth として扱う。

- `payment_events` は append-only に近い台帳として扱い、idempotency と監査性を確保する。

- platform ledger と provider event payload は分離する。

- クリエイターの本人確認が必要になるため、payout onboarding は非同期フローとして設計する。

  

## 9. MVP スコープ

  

MVP では、配信や高度な制作管理より先に、クリエイター収益化と fan sub の縦スライスを成立させる。

  

### MVP バックエンド

  

- `gxp-idProvider` OIDC login の設計と最小連携

- クリエイタープロフィール CRUD

- slug による公開クリエイターページ取得

- 下書き、全体公開、会員限定に対応した投稿 CRUD

- fan sub 投稿、一覧、人気順取得、選択

- LLM による fan sub 初回自動翻訳 draft 生成

- fan sub 投稿時の content safety check

- 会員プラン CRUD

- クリエイターのフォロー

- provider checkout 経由の会員プラン加入

- subscription active/canceled を反映する webhook handling

- 単発投げ銭

- 限定投稿の entitlement check

  

### MVP フロントエンド

  

- ホームまたは簡易 discovery

- `gxp-idProvider` を使うログイン導線

- クリエイター公開プロフィールページ

- クリエイターダッシュボード

- 投稿エディタ

- fan sub 一覧、投稿フォーム、人気順選択 UI

- LLM 初期翻訳を作成してから編集できる字幕エディタ

- 会員プラン管理画面

- 支援者向け checkout flow

- locked post UI

- 支援者向け library / feed

  

### MVP テスト

  

- schema、entitlement rule、payment webhook idempotency の unit test

- fan sub schema、人気順 sort、NGワード検査の unit test

- LLM 初回翻訳 draft、provider abstraction、利用量制限の unit test

- `gxp-idProvider` token 検証まわりの integration test

- creator profiles、posts、tiers、tips の route test

- E2E smoke path: login、creator profile 作成、tier 作成、locked post 公開、locked/unlocked state 確認

- E2E fan sub path: login、LLM 初期翻訳 draft 作成、字幕編集、NGワードブロック、人気字幕選択

  

## 10. 機能ドメイン別実装計画

フェーズ番号で進めるのではなく、機能ドメインごとに backend / frontend / shared schema / tests を揃えて実装する。各ドメインは縦に完結させ、route だけ先に増やす、DB だけ先に増やす、といった半端な状態を避ける。

共通の実装単位:

- DB schema と migration
- `shared/schemas/<domain>.schema.ts`
- backend 3 層: `api/modules/<domain>/<domain>.repository.ts`, `<domain>.service.ts`, `<domain>.routes.ts`
- frontend 3 層: `src/modules/<domain>/<domain>.repository.ts`, `<domain>.service.ts`, `<domain>.routes.tsx`
- frontend hooks: `src/modules/<domain>/hooks/<domain>.hooks.ts`
- UI components: `src/modules/<domain>/components/`
- TanStack Router wrapper: `src/routes/...`
- unit / route / e2e tests

実装時の依存ルール:

- `identity` は多くのドメインの前提になるため最初に整える。
- `creators` は `posts`, `memberships`, `streams`, `projects` の owner 境界になる。
- `posts` と `media` は `fansubs`, `memberships`, `content-safety` と結合する。
- `content-safety` は fan sub、comment、chat、profile、post 保存時に共通利用する。
- `payments` は外部 provider の責務を閉じ込め、`memberships` と `tips` から直接 provider SDK を呼ばない。
- React 側は hooks 以外で API 通信を開始しない。画面からの操作は hook の command 関数を呼ぶ。

### `identity` ドメイン

責務:

- `gxp-idProvider` との OIDC / OAuth2 連携
- Favenora local user と IdP subject の対応
- web / mobile 共通の token 検証
- admin / creator / moderator 権限の入口

バックエンド:

- repository: `user_identities`, `users`, session mapping の読み書き
- service: issuer / audience / JWKS / scope 検証、local user provisioning、RBAC / entitlement delegation
- route: login callback、me、logout、token introspection 補助、mobile bearer token 検証用 endpoint

フロントエンド:

- repository: `src/lib/api.ts` の client 経由で `me`, logout, session refresh を呼ぶ
- service: auth state を view model 化し、role / capability を画面向けに整形
- route: login callback、認証必須 layout、権限不足画面
- hooks: `useAuthSession`, `useRequireAuth`, `useLogout`

shared schema:

- `identityUserSchema`
- `sessionSchema`
- `authCapabilitiesSchema`

テスト:

- token 検証
- IdP subject と local user の紐付け
- expired / invalid issuer / invalid audience
- mobile bearer token path

### `creators` ドメイン

責務:

- クリエイタープロフィール
- slug
- 公開ページ
- creator dashboard profile editor

バックエンド:

- repository: `creator_profiles`, `creator_categories`, `follows`
- service: slug validation、reserved slug、owner-only update、public profile composition
- route: creator list、slug lookup、my creator profile create/update、follow/unfollow

フロントエンド:

- repository: creator API 呼び出し
- service: profile header、portfolio、follow state の view model 作成
- route: `/creators`, `/creators/$slug`, `/dashboard/profile`
- hooks: `useCreatorProfile`, `useCreatorDashboardProfile`, `useFollowCreator`

shared schema:

- `creatorProfileSchema`
- `createCreatorProfileSchema`
- `updateCreatorProfileSchema`
- `followCreatorSchema`

テスト:

- slug uniqueness
- owner-only update
- public/private field separation
- follow/unfollow idempotency

### `posts` ドメイン

責務:

- 作品投稿
- 下書き、公開、予約投稿
- アクセス種別
- コメント
- series との接続

バックエンド:

- repository: `posts`, `post_blocks`, `comments`, `series`, `series_entries`
- service: publish workflow、access type validation、comment creation、content-safety check 呼び出し
- route: post CRUD、viewer endpoint、comments、series listing

フロントエンド:

- repository: post API 呼び出し
- service: post viewer、locked state、editor initial values、comment tree view model
- route: `/creators/$slug/posts/$postId`, `/dashboard/posts`, `/dashboard/posts/new`
- hooks: `usePostViewer`, `usePostEditor`, `useCreatorPosts`, `usePostComments`

shared schema:

- `postSchema`
- `postViewerSchema`
- `createPostSchema`
- `updatePostSchema`
- `commentSchema`

テスト:

- draft は owner のみ閲覧
- scheduled post の公開境界
- locked post response で本文を返さない
- comment NGワード検査

### `media` ドメイン

責務:

- 投稿・配信・字幕に紐づくファイル metadata
- thumbnail
- 外部 embed URL
- 将来の S3 互換 storage provider

バックエンド:

- repository: `media_assets`, `media_variants`, `post_attachments`
- service: upload intent、storage provider abstraction、media ownership validation
- route: upload intent、asset detail、attachment attach/detach

フロントエンド:

- repository: media API 呼び出し
- service: upload state、preview model、attachment list
- route: media picker / dashboard upload surface
- hooks: `useUploadIntent`, `useMediaAsset`, `useAttachMedia`

shared schema:

- `mediaAssetSchema`
- `createUploadIntentSchema`
- `attachMediaSchema`

テスト:

- owner validation
- content type validation
- storage provider error handling

### `fansubs` ドメイン

責務:

- fan sub 投稿
- subtitle track / cue / revision
- 人気字幕選択
- vote / report / creator approval
- WebVTT / SRT import/export

バックエンド:

- repository: `subtitle_tracks`, `subtitle_cues`, `subtitle_votes`, `subtitle_reports`, `subtitle_revisions`, `subtitle_usage_stats`
- service: subtitle parse/serialize、popular score、revision creation、content-safety check、post entitlement check
- route: subtitle list、create/update、cue fetch、vote、report、approve、import/export

フロントエンド:

- repository: subtitle API 呼び出し
- service: subtitle selector model、editor cue model、popular sort display、import/export state
- route: `/creators/$slug/posts/$postId/subtitles`, `/subtitles/contributions`, `/dashboard/subtitles`
- hooks: `usePostSubtitles`, `useSubtitleEditor`, `useVoteSubtitle`, `useReportSubtitle`, `useApproveSubtitle`

shared schema:

- `subtitleTrackSchema`
- `subtitleCueSchema`
- `createSubtitleTrackSchema`
- `updateSubtitleCueSchema`
- `subtitleVoteSchema`
- `subtitleImportSchema`

テスト:

- ログイン済みなら投稿可能
- 閲覧権限がない投稿には subtitle を作れない
- 人気順 score
- report rate が高い字幕の除外
- WebVTT / SRT import/export

### `ai-assist` ドメイン

責務:

- OpenAI などの LLM provider abstraction
- fan sub 初回自動翻訳 draft
- prompt version
- 生成履歴
- 利用量制限

バックエンド:

- repository: `subtitle_ai_drafts`, `subtitle_ai_usage`, `ai_provider_configs`
- service: provider selection、prompt build、rate limit、draft generation、content-safety check、限定公開コンテンツの送信可否判定
- route: AI draft create/get/apply、provider list、usage

フロントエンド:

- repository: AI assist API 呼び出し
- service: draft editor model、usage warning、language pair selection
- route: subtitle editor 内の AI draft panel、`/admin/ai-assist`
- hooks: `useCreateSubtitleAiDraft`, `useSubtitleAiDraft`, `useApplySubtitleAiDraft`, `useAiAssistUsage`

shared schema:

- `subtitleAiDraftSchema`
- `createSubtitleAiDraftSchema`
- `applySubtitleAiDraftSchema`
- `aiAssistUsageSchema`

テスト:

- 初回生成制限
- provider failure
- rate limit
- content safety 後段検査
- 限定公開コンテンツの外部 provider 送信制御

### `content-safety` ドメイン

責務:

- 攻撃的な単語・フレーズの検査
- NGワード辞書
- 投稿前チェック
- 投稿後再スキャン
- `trust-operations` queue 連携

バックエンド:

- repository: `blocked_terms`, `blocked_term_matches`, `content_safety_reviews`
- service: text normalization、phrase match、severity 判定、review creation、rescan
- route: check、blocked terms CRUD、review queue、manual allow/block

フロントエンド:

- repository: content safety API 呼び出し
- service: inline warning model、admin dictionary editor model、review status model
- route: `/admin/content-safety`
- hooks: `useContentSafetyCheck`, `useBlockedTerms`, `useContentSafetyReviews`

shared schema:

- `contentSafetyCheckSchema`
- `blockedTermSchema`
- `contentSafetyResultSchema`
- `contentSafetyReviewSchema`

テスト:

- 日本語/英語 phrase match
- 伏せ字・記号混入の正規化
- severity ごとの block / hold / allow
- fan sub / comment / chat / post からの共通利用

### `memberships` ドメイン

責務:

- 会員プラン
- subscription
- entitlement
- locked content 判定

バックエンド:

- repository: `membership_tiers`, `tier_benefits`, `subscriptions`, `entitlements`
- service: tier CRUD、subscription state、canViewPost、supporter list
- route: tiers、subscriptions、entitlement check、supporter management

フロントエンド:

- repository: membership API 呼び出し
- service: tier cards、locked UI、supporter management view model
- route: `/dashboard/tiers`, `/dashboard/supporters`, `/subscriptions`
- hooks: `useCreatorTiers`, `useTierEditor`, `useEntitlement`, `useSupporters`

shared schema:

- `membershipTierSchema`
- `subscriptionSchema`
- `entitlementSchema`
- `createTierSchema`

テスト:

- tier-only post access
- canceled subscription
- creator owner-only tier update
- entitlement cache invalidation

### `payments` ドメイン

責務:

- subscription checkout
- one-time tip
- webhook
- refund
- payout onboarding
- revenue dashboard

バックエンド:

- repository: `payment_events`, `tips`, `refunds`, `payout_accounts`
- service: payment provider abstraction、checkout session、webhook idempotency、ledger creation、refund handling
- route: checkout、tip、webhook、revenue summary、payout account status

フロントエンド:

- repository: payment API 呼び出し
- service: checkout redirect model、tip form model、revenue chart model
- route: checkout result、tip modal、`/dashboard/revenue`
- hooks: `useCreateSubscriptionCheckout`, `useCreateTipCheckout`, `useRevenueSummary`, `usePayoutStatus`

shared schema:

- `checkoutSessionSchema`
- `tipSchema`
- `paymentEventSchema`
- `revenueSummarySchema`

テスト:

- webhook idempotency
- duplicate event
- failed payment
- refund
- provider error

### `streams` ドメイン

責務:

- 配信ページ
- 外部 embed
- live status
- chat
- tip goal
- archive-to-post

バックエンド:

- repository: `streams`, `stream_chat_messages`, `stream_tip_goals`, `stream_events`
- service: stream lifecycle、chat moderation、tip goal update、archive post creation
- route: stream CRUD、live status、chat、tip goal、archive

フロントエンド:

- repository: stream API 呼び出し
- service: live room view model、chat timeline、tip goal state
- route: `/streams/$streamId`, `/dashboard/streams`
- hooks: `useStreamRoom`, `useStreamChat`, `useStreamTipGoal`, `useStreamDashboard`

shared schema:

- `streamSchema`
- `streamChatMessageSchema`
- `streamTipGoalSchema`

テスト:

- scheduled/live/ended state
- chat content safety
- archive-to-post
- stream tip association

### `projects` ドメイン

責務:

- 制作プロジェクト
- milestone
- task board
- supporter-visible production update

バックエンド:

- repository: `projects`, `project_milestones`, `project_tasks`, `project_updates`
- service: project owner validation、milestone progress、public update publishing
- route: project CRUD、milestones、tasks、updates

フロントエンド:

- repository: project API 呼び出し
- service: board columns、milestone progress view model、public roadmap model
- route: `/dashboard/projects`
- hooks: `useProjects`, `useProjectBoard`, `useProjectUpdates`

shared schema:

- `projectSchema`
- `projectTaskSchema`
- `projectMilestoneSchema`
- `projectUpdateSchema`

テスト:

- owner-only project update
- supporter-visible update filtering
- task ordering

### `moderation` ドメイン

責務:

- クリエイター向け activity history
- creator scope の audit trail
- fan / supporter との関係記録
- 運営審査 case の creator-visible timeline
- 異議申し立て、再審査依頼、運営返信の記録

バックエンド:

- repository: `creator_moderation_events`, `creator_audit_events`, `creator_fan_relationship_events`, `creator_review_cases`
- service: creator scope permission、creator-visible projection、fan relationship timeline、review case filtering、redaction
- route: creator moderation events、fan timeline、review cases、appeals、creator actions

フロントエンド:

- repository: moderation API 呼び出し
- service: activity timeline model、fan relationship timeline model、review case status model、appeal form model
- route: `/dashboard/moderation`, `/dashboard/moderation/review-cases`
- hooks: `useCreatorModerationEvents`, `useFanRelationshipTimeline`, `useCreatorReviewCases`, `useSubmitCreatorAppeal`

shared schema:

- `creatorModerationEventSchema`
- `creatorAuditEventSchema`
- `fanRelationshipEventSchema`
- `creatorReviewCaseSchema`
- `createCreatorAppealSchema`

テスト:

- creator scope restriction
- creator response redaction
- audit event append-only
- review case status transition
- appeal submission

### `trust-operations` ドメイン

責務:

- 運営側管理メニュー
- report intake と triage
- moderation queue
- creator review case 管理
- fan / user report case 管理
- staff action と internal note
- system audit log projection
- creator-visible projection の発行

バックエンド:

- repository: `trust_reports`, `trust_cases`, `trust_case_events`, `trust_staff_actions`, `trust_decisions`, `system_audit_events`
- service: report intake、case routing、staff assignment、decision publishing、audit normalization、sensitive data redaction
- route: report intake、admin trust reports、cases、actions、notes、decisions、appeals、audit logs

フロントエンド:

- repository: trust operations API 呼び出し
- service: queue item view model、case detail view model、staff action form model、audit search model
- route: `/admin/trust`, `/admin/trust/reports`, `/admin/trust/cases`, `/admin/trust/audit-logs`
- hooks: `useTrustReports`, `useTrustCases`, `useTrustCase`, `useTrustStaffAction`, `useSystemAuditEvents`

shared schema:

- `trustReportSchema`
- `trustCaseSchema`
- `trustStaffActionSchema`
- `trustDecisionSchema`
- `systemAuditEventSchema`

テスト:

- report creation
- admin permission check
- staff action creates audit event
- creator-visible projection redacts internal note
- system audit append-only

### `notifications` ドメイン

責務:

- in-app notification
- email notification
- mobile push の将来拡張
- notification preferences
- digest delivery
- delivery provider abstraction
- analytics 由来の daily summary / achievement / alert 通知

非責務:

- FAN 動向統計
- 実績解除判定
- membership daily summary の集計本文生成

バックエンド:

- repository: `notifications`, `notification_requests`, `notification_deliveries`, `notification_preferences`, `notification_digest_preferences`
- service: notification request enqueue、idempotency、preference filtering、template rendering、channel selection、delivery provider abstraction
- route: notification list、unread count、mark read、archive、preferences、digest preferences、device registration

フロントエンド:

- repository: notification API 呼び出し
- service: notification list grouping、unread count、preference form model、digest preference form model
- route: notification popover、notification center、`/settings/notifications`
- hooks: `useNotifications`, `useUnreadNotificationCount`, `useMarkNotificationRead`, `useNotificationPreferences`, `useNotificationDigestPreferences`

shared schema:

- `notificationSchema`
- `notificationRequestSchema`
- `notificationDeliverySchema`
- `notificationPreferenceSchema`
- `notificationDigestPreferenceSchema`

テスト:

- preference filtering
- idempotency
- mark read
- unread count
- analytics daily summary request creates notification

### `analytics` ドメイン

責務:

- FAN 動向統計
- creator dashboard metrics
- membership daily summary
- achievement definition / unlock 判定
- alert candidate 生成
- notification request dispatch

バックエンド:

- repository: `analytics_events`, `creator_daily_metrics`, `creator_membership_daily_summaries`, `achievement_definitions`, `achievement_unlocks`, `analytics_alert_candidates`
- service: event ingestion、daily rollup、membership summary generation、achievement evaluation、alert candidate generation、notification request dispatch
- route: creator analytics overview、fan trends、membership daily summaries、achievements、internal analytics events、daily rollup job

フロントエンド:

- repository: analytics API 呼び出し
- service: creator overview model、fan trend chart model、membership daily summary model、achievement list model
- route: `/dashboard/analytics`, `/dashboard/analytics/fans`, `/dashboard/analytics/memberships`, `/dashboard/achievements`
- hooks: `useCreatorAnalyticsOverview`, `useFanTrendAnalytics`, `useMembershipDailySummaries`, `useCreatorAchievements`

shared schema:

- `analyticsEventSchema`
- `creatorDailyMetricsSchema`
- `membershipDailySummarySchema`
- `achievementDefinitionSchema`
- `achievementUnlockSchema`
- `creatorAnalyticsOverviewSchema`

テスト:

- event ingestion idempotency
- daily rollup
- timezone boundary
- membership daily summary generation
- achievement unlock idempotency
- notification request dispatch

  

## 11. 画面ルート計画

  

公開 routes:

  

- `/`

- `/creators`

- `/creators/$slug`

- `/creators/$slug/posts/$postId`

- `/creators/$slug/series/$seriesId`

- `/creators/$slug/posts/$postId/subtitles`

- `/streams/$streamId`

  

ログイン済み支援者 routes:

  

- `/feed`

- `/library`

- `/subscriptions`

- `/subtitles/contributions`

- `/settings`

  

クリエイターダッシュボード routes:

  

- `/dashboard`

- `/dashboard/profile`

- `/dashboard/posts`

- `/dashboard/posts/new`

- `/dashboard/tiers`

- `/dashboard/supporters`

- `/dashboard/revenue`

- `/dashboard/projects`

- `/dashboard/streams`

- `/dashboard/subtitles`

  

管理者 routes:

  

- `/admin/trust/reports`

- `/admin/users`

- `/admin/payments`

- `/admin/trust/audit-logs`

- `/admin/content-safety`

- `/admin/subtitles`

- `/admin/ai-assist`

  

## 12. API 計画

  

初期は Hono RPC と相性のよい REST-style endpoints で進める。

  

- `GET /api/creators`

- `POST /api/creators/me`

- `GET /api/creators/:slug`

- `PATCH /api/creators/me`

- `POST /api/creators/:id/follow`

- `DELETE /api/creators/:id/follow`

- `GET /api/posts`

- `POST /api/posts`

- `GET /api/posts/:id`

- `PATCH /api/posts/:id`

- `DELETE /api/posts/:id`

- `POST /api/posts/:id/comments`

- `GET /api/posts/:id/subtitles`

- `POST /api/posts/:id/subtitles`

- `GET /api/subtitles/:id`

- `PATCH /api/subtitles/:id`

- `POST /api/subtitles/:id/vote`

- `POST /api/subtitles/:id/report`

- `POST /api/subtitles/:id/approve`

- `GET /api/subtitles/:id/export`

- `POST /api/subtitles/import`

- `POST /api/subtitles/ai-drafts`

- `GET /api/subtitles/ai-drafts/:id`

- `POST /api/subtitles/ai-drafts/:id/apply`

- `GET /api/ai-assist/providers`

- `GET /api/ai-assist/usage`

- `POST /api/content-safety/check`

- `GET /api/content-safety/blocked-terms`

- `POST /api/content-safety/blocked-terms`

- `GET /api/memberships/creators/:creatorId/tiers`

- `POST /api/memberships/tiers`

- `PATCH /api/memberships/tiers/:id`

- `POST /api/payments/checkout/subscription`

- `POST /api/payments/checkout/tip`

- `POST /api/payments/webhooks/:provider`

  

Mobile API で特に安定させたいレスポンス:

  

- `GET /api/feed`

- `GET /api/library`

- `GET /api/posts/:id/viewer`

- `GET /api/posts/:id/subtitles?lang=ja&sort=popular`

- `GET /api/subtitles/:id/cues?sinceRevision=...`

  

## 13. 未決事項

  

実装前に決めたいこと:

  

- `gxp-idProvider` の利用を MVP から必須にするか、最初は current auth と併用するか。

- Favenora 側の user id は IdP subject を直接使うか、local user id と `user_identities` で対応させるか。

- 決済 provider は Stripe first でよいか。日本向けに KOMOJU / PayPay も初期から見るか。

- ライセンスは現在の MIT のままでよいか。ネットワーク利用時のソース共有を重視して AGPL も検討するか。

- 成人向け・センシティブ作品を許可、制限、禁止のどれにするか。

- ストレージは local development first にするか、MVP から S3 互換 storage を入れるか。

- 配信は外部 embed first にするか、将来的な self-hosted video / live infrastructure まで早めに見据えるか。

- rich editor は markdown first、block editor、または両対応のどれで始めるか。

- fan sub は完全自由投稿にするか、初回投稿だけ `trust-operations` queue に通すか。

- 「人気字幕」の計算式は vote 中心にするか、視聴利用率・通報率・クリエイター承認を強く反映するか。

- NGワード辞書はインスタンス管理者が持つか、共通 seed 辞書を OSS として配布するか。

- LLM provider は OpenAI first でよいか。ローカル LLM や他社 provider を MVP から provider abstraction だけ用意するか。

- LLM 初期翻訳を限定公開コンテンツにも許可するか。許可する場合、外部 API へ送るデータの同意と設定をどう扱うか。

- LLM 利用コストを誰が負担するか。インスタンス負担、クリエイター負担、支援者ごとの quota のどれにするか。

- federation / export は day one の重要機能にするか、後の OSS 差別化要素にするか。

  

## 14. ドメイン別の着手単位

実装はフェーズではなく、以下のドメイン単位で pull request / task を切る。各ドメインで backend 3 層、frontend 3 層、hooks、shared schema、tests を揃える。

`identity` 着手単位:

- `gxp-idProvider` OIDC 設定値を `.env.example` に追加する。
- backend に token 検証 service と `user_identities` repository を追加する。
- frontend に login callback route、auth repository、auth service、auth hooks を追加する。
- 既存 local auth を残す場合も、route / component から直接 auth API を呼ばない形に揃える。

`creators` 着手単位:

- `creator_profiles` の DB schema / migration / shared schema を追加する。
- backend に creator repository / service / route を追加する。
- frontend に creator repository / service / route / hooks を追加する。
- `/creators/$slug` と `/dashboard/profile` の `src/routes/` wrapper は薄く保つ。

`posts` 着手単位:

- 投稿、下書き、公開状態、アクセス種別の schema を追加する。
- backend service で publish workflow と access validation を持つ。
- frontend hooks で post viewer / editor の query と mutation を管理する。
- locked post UI は service の view model で表現する。

`fansubs` 着手単位:

- subtitle track / cue / revision / vote / report の schema を追加する。
- backend service で WebVTT / SRT、人気順、閲覧権限、content-safety 呼び出しを扱う。
- frontend service で subtitle selector と editor model を作る。
- hooks で subtitle list、editor save、vote、report、approve の API 通信を扱う。

`ai-assist` 着手単位:

- provider interface を先に定義し、OpenAI 実装は差し替え可能にする。
- LLM 初期翻訳 draft は subtitle track 作成時の補助として扱い、即公開しない。
- backend service で prompt version、利用量制限、限定公開コンテンツの外部送信可否を扱う。
- frontend hooks で draft 作成、取得、適用を扱い、字幕エディタから利用する。

`content-safety` 着手単位:

- NGワード辞書、match log、review の schema を追加する。
- backend service で正規化、phrase match、severity 判定を共通化する。
- fan sub、comment、chat、post、profile 保存時は必ず service 経由で検査する。
- frontend hooks で即時チェックと admin 辞書管理を扱う。

`memberships` / `payments` 着手単位:

- membership は entitlement 判定を中心に作り、payment provider SDK へ直接依存しない。
- payments は provider abstraction、checkout、webhook idempotency、ledger を担当する。
- frontend は checkout / revenue / subscription の通信を hooks に閉じ込める。

`streams` / `projects` / `moderation` / `trust-operations` / `notifications` / `analytics` 着手単位:

- streams は外部 embed と配信アーカイブへの fan sub 接続を前提にする。
- projects は creator dashboard の制作管理として posts / series と接続する。
- moderation は creator dashboard の行動履歴、fan 関係記録、審査 case timeline を扱う。
- trust-operations は reports、content-safety reviews、system audit logs を横断して扱う。
- notifications は fan sub approval、report、comment、subscription event、analytics summary request を受け取れる形にする。
- analytics は fan activity、membership daily summary、achievement unlock を集計して notifications へ request を送る。
