# projects ドメイン

## 目的

`projects` はクリエイターの制作管理を担当する。dashboard 上の作業管理、制作ロードマップ、milestone 進捗、支援者向け production update をつなぐ。

`posts` が「公開された作品・記事・配布物そのもの」を扱うのに対し、`projects` は「制作中の単位と進捗管理」を扱う。完成物の viewer、本文 block、series、tag、comment、feed event は `posts` に寄せ、`projects` は制作計画、内部 task、公開してよい進捗 summary、関連投稿への参照を持つ。

## 非責務

- 作品 viewer response
- 投稿本文、rich text block、manga page、novel body、attachment download
- post の公開範囲、locked response、age gate
- post tag / collection / series の authoritative 管理
- comment thread
- feed event / notification delivery の主導線
- paid unlock や post entitlement の判定

上記は `posts`, `memberships`, `notifications` 側の責務とする。`projects` は project update や roadmap 変更の domain event を出せるが、通知の配信判断や channel selection は `notifications` に任せる。

## 責務

- project の作成・編集・状態管理
- milestone と due date
- task board と内部 task
- 制作進捗、ロードマップ、支援者向け production update
- project と posts / series / media の参照関係
- project collaborator の作業範囲
- dashboard 用 project overview
- creator profile / supporter page に出す公開ロードマップ
- 支援者に見せる update と private task の分離

## posts との境界

`projects` と `posts` はどちらも「制作近況」を扱えるが、責務を次のように分ける。

`projects` が持つ:

- 制作単位。例: 新作漫画 1 巻、ゲーム demo、連載準備、動画シリーズ制作。
- milestone。例: ネーム完了、作画 50%、編集完了、公開準備。
- task。例: ラフ 12p、背景素材整理、字幕確認。原則 private / collaborator 向け。
- update。例: 今週の進捗、遅延理由、次の milestone。短い status report として扱う。
- project timeline。進捗を時系列で追える dashboard / roadmap。
- related post links。完成物、告知記事、制作ログ投稿への参照。

`posts` が持つ:

- 公開作品。例: 漫画本編、小説本文、動画、音声、ファイル配布。
- 読者向け記事。制作ログを作品投稿として流通させたい場合は `postType=article` にする。
- post access rule、locked response、preview block。
- series / collection / tag による読者向け整理。
- comment、bookmark、feed、notification request の主導線。

接続ルール:

- project update は単独の軽量 update として保存できるが、作品として流通させたい長文・画像付き制作ログは post に昇格する。
- project は `relatedPostIds` を持てる。post 側は必要なら `projectId` を optional に持つが、viewer の主導線は post service が解決する。
- project milestone の完了は post publish を直接意味しない。post publish workflow は `posts` に残す。
- project visibility は roadmap / update の見え方だけを制御し、post access を上書きしない。
- project task は public response に含めない。支援者向けには milestone progress と update summary だけを返す。

## 状態モデル

project status:

- `draft`: creator dashboard 内で準備中。
- `active`: 制作中。dashboard と許可された roadmap に表示できる。
- `paused`: 一時停止。理由や再開予定を update として出せる。
- `completed`: 制作完了。関連 post / series への導線を表示する。
- `cancelled`: 中止。public には限定情報のみ出す。
- `archived`: dashboard の通常一覧から外す。

milestone status:

- `planned`
- `in_progress`
- `blocked`
- `completed`
- `skipped`

task status:

- `todo`
- `in_progress`
- `review`
- `done`
- `blocked`

update visibility:

- `private`: creator / collaborator のみ。
- `supporters`: 支援者全体。
- `tiers`: 指定 tier。
- `public`: 未ログインを含む公開。

MVP では project status は `draft`, `active`, `completed`, `archived`、update visibility は `private`, `supporters`, `public` から始める。

## 公開ロードマップ

公開ロードマップは post 一覧ではなく、制作予定と進捗の見える化として扱う。

public / supporter response に含めてよいもの:

- project title / summary
- cover media
- project status
- milestone title, status, due month 程度の粗い日付
- progress percentage
- latest visible update summary
- related published posts

含めないもの:

- private task title / checklist
- collaborator assignment
- exact internal due date
- unpublished post id
- private media URL
- blocked reason の詳細

支援者向け roadmap は `memberships` の entitlement check を使って update visibility を解決する。ただし `projects` 自体が subscription state を直接解釈しない。

## データモデル

- `projects`: creatorId, title, slug, summary, description, status, visibility, coverMediaId, startedAt, targetDate, completedAt
- `project_milestones`: projectId, title, description, dueDate, status, sortOrder, completedAt
- `project_tasks`: projectId, milestoneId, title, description, status, assigneeId, dueDate, sortOrder, completedAt
- `project_updates`: projectId, title, body, visibility, tierIds, publishedAt, createdBy
- `project_related_posts`: projectId, postId, relationType, sortOrder
- `project_related_media`: projectId, mediaId, relationType, visibility, sortOrder
- `project_collaborators`: projectId, userId, role

`project_updates.body` は短い status report 用にする。rich text block、添付配布、作品本文が必要なら `posts` の article / file / media post を使い、`project_related_posts` で接続する。

## backend 3 層

repository:

- project CRUD
- milestone CRUD
- task CRUD
- update CRUD
- related post / media lookup
- collaborator lookup

service:

- owner validation
- collaborator permission validation
- milestone progress
- project status transition
- public / supporter roadmap response
- production update publishing
- supporter-visible filtering
- related post validation
- dashboard overview aggregation

route:

- `GET /api/projects`
- `GET /api/projects/:id`
- `POST /api/projects`
- `PATCH /api/projects/:id`
- `POST /api/projects/:id/archive`
- `POST /api/projects/:id/milestones`
- `PATCH /api/projects/:id/milestones/:milestoneId`
- `POST /api/projects/:id/tasks`
- `PATCH /api/projects/:id/tasks/:taskId`
- `POST /api/projects/:id/updates`
- `GET /api/projects/:id/updates`
- `PUT /api/projects/:id/related-posts`
- `GET /api/creators/:creatorId/roadmap`

## frontend 3 層

repository:

- project API 呼び出し
- roadmap API 呼び出し

service:

- board columns
- milestone progress view model
- project status badge model
- public roadmap model
- supporter update timeline model
- related post selector model

route:

- `/dashboard/projects`
- `/dashboard/projects/new`
- `/dashboard/projects/$projectId`
- `/dashboard/projects/$projectId/roadmap`
- `/creators/$slug/roadmap`

hooks:

- `useProjects`
- `useProject`
- `useProjectBoard`
- `useProjectUpdates`
- `useProjectRoadmap`
- `useUpdateProjectMilestone`
- `useUpdateProjectTask`

## shared/schemas

`shared/schemas/projects.schema.ts` を projects ドメインの Zod schema と型定義の Single Source of Truth にする。

定義する schema:

- `projectStatusSchema`
- `projectSchema`
- `projectVisibilitySchema`
- `createProjectSchema`
- `updateProjectSchema`
- `projectMilestoneSchema`
- `projectMilestoneStatusSchema`
- `projectTaskSchema`
- `projectTaskStatusSchema`
- `projectUpdateSchema`
- `projectUpdateVisibilitySchema`
- `projectRoadmapSchema`
- `projectDashboardSchema`
- `projectRelatedPostSchema`

運用ルール:

- project status、task status、update visibility、milestone status は shared schema の enum にする。
- dashboard 用 response、public roadmap response、supporter-visible response は schema を分ける。
- owner validation、supporter-visible filtering、task ordering の整合性は service 層で扱う。
- frontend board model は service で shared schema 型から変換する。
- related post は id と summary metadata だけを projects schema に含める。post viewer response は含めない。

## 深掘り

制作管理は支援者への価値にもなる。すべてを公開するのではなく、internal task と supporter-visible update を分ける。`project_updates.visibility` で public / supporters / tiers / private を扱えるようにする。

深掘りの順序:

1. posts との境界を固定する。project update は軽量 status report、post は作品・記事・配布物として定義し、変換や関連付けのルールを決める。
2. dashboard workflow を決める。project 一覧、detail、milestone、task board、update timeline を最小導線にする。
3. 公開ロードマップを決める。public / supporter で返す field、隠す field、milestone progress の丸め方を定義する。
4. collaborator を決める。owner, editor, viewer の権限と task assignment の扱いを定義する。
5. related posts を決める。完成物 post、告知 post、制作ログ post、series との関係種別を定義する。
6. update publishing を決める。project update のまま出すか、post に昇格するか、通知対象にするかを service 層で分岐する。
7. analytics を後続で決める。支援者が roadmap を見たか、update が読まれたかは MVP では持たない。

## MVP

最初に作る:

- project CRUD
- `draft`, `active`, `completed`, `archived`
- milestone CRUD と progress 集計
- task board
- private / public / supporters update
- dashboard project detail
- creator roadmap public response
- related published posts の表示

後回し:

- tier-specific project update
- collaborator role の細分化
- media attachment 付き project update
- update から post への昇格 UI
- project analytics
- Gantt / calendar view
- automation による milestone reminder

## テスト

- owner-only project update
- collaborator permission
- supporter-visible update filtering
- task ordering
- milestone progress
- public roadmap に private task が含まれない
- unpublished related post が public response に含まれない
- project status transition
