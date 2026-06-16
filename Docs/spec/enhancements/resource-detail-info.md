# リソース詳細画面の情報拡充

> 対象読者：学習者・メンター
> 参照：[../requirements.md](../requirements.md) / [index.md](./index.md)

---

## 背景

BookFlow の `resources` テーブルが持つカラムは `name`・`category`・`capacity`・`location`・`requires_approval`・`is_active`・`description` です。リソース詳細画面（`/resources/{id}`）はこれらを表示していますが、予約前に確認したい情報（設備の一覧、利用上の注意など）を格納するフィールドが存在しません。

設備情報（プロジェクターの有無、ホワイトボード数など）や利用注意事項をリソースごとに登録・表示できるようにすることで、利用者が予約前に必要な情報を確認できるようになります。これはユースケース UC-02（リソース一覧・空き確認）の拡張にあたります。

## 要件

| # | 要件 |
|---|------|
| RES-01 | `resources` テーブルに情報拡充用のフィールド（例：`equipment TEXT`「設備一覧」・`notes TEXT`「利用上の注意」）を Flyway マイグレーション（新規 SQL ファイル）で追加する |
| RES-02 | `Resource` エンティティ・`ResourceResponse` DTO に新フィールドを追加し、`GET /api/resources/{id}` のレスポンスに含める |
| RES-03 | `CreateResourceRequest` / `UpdateResourceRequest` に新フィールドの入力を追加し、管理者が登録・編集できるようにする |
| RES-04 | リソース詳細画面（`/resources/{id}`）に新フィールドの表示を追加する |
| RES-05 | `GET /api/resources` の一覧レスポンスは従来どおり（`ResourceResponse` に含めてよい） |

## 受入条件

- [ ] 管理者がリソース登録・編集画面から設備情報・利用上の注意を入力・更新できる
- [ ] リソース詳細画面に設備情報・利用上の注意が表示される（未登録時は非表示でよい）
- [ ] Flyway マイグレーションが正常に実行され、既存データへの影響がない（`NULL` 許容）
- [ ] `GET /api/resources/{id}` のレスポンスに新フィールドが含まれる
- [ ] バックエンドの既存テストが引き続き pass する
- [ ] 新フィールドを含む API 動作のテストを追加する

## 影響範囲

- 対象レイヤー：両方
- 更新が必要な spec：
  - `er-diagram.md` §`resources` テーブル — 新カラムを追記
  - `api-spec.md` §`GET /api/resources/{id}` / §`POST /api/resources` / §`PUT /api/resources/{id}` — 新フィールドをリクエスト・レスポンスに追記
  - `screen-spec.md` §`/resources/{id}` — 新フィールドの表示を追記；§`/admin/resources` — 入力欄を追記

## AI 活用ポイント

- Spec-first で er-diagram.md / api-spec.md / screen-spec.md を先に更新してから実装する（`/update-spec` スキルを使う）
- plan mode で「フィールドを追加するか、別テーブル（`resource_attributes`）にするか」の設計トレードオフを相談する
- Flyway の命名規則（`V002__...sql`）を AI に確認させ、既存の `V001__create_initial_schema.sql` と番号が衝突しないようにする
