# 機能ドメイン別ドキュメント

このディレクトリは、Favenora の実装計画を機能ドメインごとに分割したものです。

共通ルール:

- backend は `repository / service / route` の 3 層で実装する。
- frontend も `repository / service / route` の 3 層で実装する。
- frontend の API 通信は `src/lib/api.ts` の API client に集約する。
- React 側の API 通信は domain repository 経由にする。
- TanStack Query は domain hooks 内でだけ使う。
- `src/routes/` は TanStack Router の薄い wrapper とし、画面実体は `src/modules/<domain>/<domain>.routes.tsx` に置く。
- `shared/schemas/<domain>.schema.ts` を Zod schema と型定義の Single Source of Truth にする。
- backend route validation、backend service input、frontend repository response、frontend form values は shared schema から `z.infer` した型を使う。
- DB table 型をそのまま API response や UI に漏らさない。public response / dashboard response / mutation input を schema として分ける。
- sanitize、normalize、文字数、URL、enum、discriminated union などの構造的 validation は shared schema に寄せる。
- owner 判定、公開可否、外部 provider 送信可否などの business rule は service 層で追加検証する。

ドキュメント:

- [identity](./identity.md)
- [creators](./creators.md)
- [posts](./posts.md)
- [media](./media.md)
- [fansubs](./fansubs.md)
- [ai-assist](./ai-assist.md)
- [content-safety](./content-safety.md)
- [memberships](./memberships.md)
- [payments](./payments.md)
- [streams](./streams.md)
- [projects](./projects.md)
- [moderation](./moderation.md)
- [trust-operations](./trust-operations.md)
- [notifications](./notifications.md)
- [analytics](./analytics.md)

推奨される最初の縦スライス:

1. `identity`: `gxp-idProvider` token 検証と `me`
2. `creators`: creator profile 作成と公開 profile
3. `posts`: public / locked post viewer
4. `content-safety`: blocked terms / 多言語 safety check
5. `fansubs`: subtitle / annotation translation 作成と一覧
6. `ai-assist`: subtitle / annotation / comment translation draft 作成
