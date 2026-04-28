# Gnosis

## 2026-04-28: Streams / Fansubs / AI-Assist 実装レビュー教訓

### 1) 権限チェックは一覧と詳細で二重化する

- `list` で絞っても `:id` 直アクセスで漏れる。
- ルール: 詳細API（`getById`, `export`, `listChildren`）でも必ず同一の権限再検証を行う。

### 2) 非同期ジョブは終端状態まで更新する

- `queued` だけで止まると運用監視ができない。
- ルール: `queued -> processing -> completed|failed` を必須化し、`completedAt` と `error` を保持する。

### 3) apply系は「副作用完了」を成功条件にする

- 状態だけ `applied` にして反映先更新が無い実装を禁止。
- ルール: 反映先更新完了後に状態遷移。非対応 target は `ValidationError` を返す。

### 4) targetType 解決を標準化する

- `targetId` の意味がドメインごとに異なる（post/comment/track）。
- ルール: targetType ごとに parent resource を解決してから権限判定する。

### 5) content-safety targetType は先に合意してから使う

- 未定義 targetType の ad-hoc 追加は型・運用の不整合を生む。
- ルール: 新規ドメイン導入時に targetType マップを先に更新する。

### 6) API mount はドメインprefix固定

- `/api/*` 直下の汎用 mount は既存ルート干渉を起こしやすい。
- ルール: 新規ドメインは原則 `/api/<domain>` で公開する。

### 7) Migration 生成前に差分境界を確認する

- 未整理差分が多い状態で generate すると、無関係テーブルが1本に混ざる。
- ルール: 生成前に対象ドメインを確認し、必要なら migration を分割する。

### 8) ドメイン間イベントは契約先行

- 実装後にイベント名やpayloadを合わせると手戻りが大きい。
- ルール: `sourceDomain`, `eventType`, payload schema を実装前に確定する。

## 運用チェックリスト

- 詳細APIでの権限再検証があるか
- ジョブ状態に completed/failed があるか
- apply成功時に実データ反映を保証しているか
- targetType->parent解決が実装されているか
- content-safety targetType が既存定義と一致しているか
- 新規API path が `/api/<domain>` 配下か
- migration が対象ドメイン差分に閉じているか
