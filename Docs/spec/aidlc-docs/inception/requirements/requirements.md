# Requirements — resource-detail-info（リソース詳細画面の情報拡充）

## Intent Analysis Summary

- **User Request**: GitHub Issue #25「リソース詳細画面の情報拡充」。ビジネス要求シート `docs-next/docs/spec/enhancements/beginner/resource-detail-info.md` に基づく。
- **Request Type**: Enhancement（既存 Resource ドメインへのフィールド追加）
- **Scope Estimate**: Multiple Components（DB マイグレーション・エンティティ・DTO・Service・Controller・frontend 2画面）
- **Complexity Estimate**: Simple〜Moderate（新規ロジックは無く、既存の7フィールドパターンに2フィールドを追加する定型拡張。シート記載の推定工数は3〜4時間）

## 背景

BookFlow の `resources` テーブルには予約前に確認したい設備情報・利用上の注意を格納するフィールドが存在しない。これらをリソースごとに登録・表示できるようにし、利用者が予約前に必要な情報を確認できるようにする（UC-02「リソース一覧・空き確認」の拡張）。

## 機能要件

| # | 要件 |
|---|------|
| RES-01 | `resources` テーブルに `equipment TEXT`（設備一覧）・`notes TEXT`（利用上の注意）を Flyway マイグレーション（`V002__add_resource_equipment_and_notes.sql`）で追加する。両列とも `NULL` 許容（既存データへの影響なし） |
| RES-02 | `Resource` エンティティ・`ResourceResponse` DTO に `equipment`・`notes` を追加し、`GET /api/resources/{id}` のレスポンスに含める |
| RES-03 | `CreateResourceRequest` / `UpdateResourceRequest` に `equipment`・`notes` の入力を追加し、管理者が登録・編集できるようにする（Bean Validation は既存の `description` と同様、必須制約・文字数制限なし） |
| RES-04 | リソース詳細画面（`/resources/{id}`）に `equipment`・`notes` の表示を追加する。値が未登録（`null`）の場合は非表示とする（既存の `location`/`capacity`/`description` と同じ条件表示パターン） |
| RES-05 | `GET /api/resources` の一覧レスポンスは `ResourceResponse` を共用するため自然に新フィールドを含むが、一覧画面（`/resources`）の表示・挙動は変更しない（一覧カードへの新フィールド表示は本課題のスコープ外） |

## データ設計の決定（確認質問の回答）

`equipment`・`notes` は **`resources` テーブルへの列追加**とする（別テーブル `resource_attributes` への分離は不採用）。

- **理由**: 既存の `Resource` エンティティは全フィールドをファクトリメソッド（`create`）・更新メソッド（`update`）の位置引数で列挙する設計であり、`description` と同じ NULL 許容 TEXT 列として追加するのが最も既存パターンと整合する。1:1 の新規関連テーブルを導入すると JOIN が必要になり、本課題（Beginner・3〜4時間）の規模に対して過剰な複雑化となる。

## 非機能要件

- **後方互換性**: 既存データに `equipment`・`notes` は存在しないため、マイグレーションは両列を `NULL` 許容で追加する。既存の `GET /api/resources`・`GET /api/resources/{id}` を呼び出す既存クライアント・既存テストに影響を与えない。
- **バリデーション**: `description` と同様、文字数制限・必須制約は設けない（自由記述のテキストフィールドとして扱う）。
- **表示整合性**: フロントエンドの `equipment`・`notes` は改行を保持して表示する（複数行の入力を想定し、`description` 同様の `Textarea` 入力・改行保持表示とする）。

## 受入条件（ビジネス要求シートより）

- [ ] 管理者がリソース登録・編集画面から設備情報・利用上の注意を入力・更新できる
- [ ] リソース詳細画面に設備情報・利用上の注意が表示される（未登録時は非表示でよい）
- [ ] Flyway マイグレーションが正常に実行され、既存データへの影響がない（`NULL` 許容）
- [ ] `GET /api/resources/{id}` のレスポンスに新フィールドが含まれる
- [ ] バックエンドの既存テストが引き続き pass する
- [ ] 新フィールドを含む API 動作のテストを追加する

## 影響範囲

- **対象レイヤー**: 両方（backend・frontend）
- **更新が必要な spec**（Spec-first、Code Generation 前に `/update-spec` で反映）:
  - `er-diagram.md` §`resources` テーブル：新カラムを追記
  - `api-spec.md` §`GET /api/resources/{id}` / §`POST /api/resources` / §`PUT /api/resources/{id}`：新フィールドをリクエスト・レスポンスに追記
  - `screen-spec.md` §`/resources/{id}`：新フィールドの表示を追記；§`/admin/resources`：入力欄を追記
- **変更対象ファイル**（RE 調査 `code-structure.md` 参照）: `V002` マイグレーション（新規）・`Resource.java`・`ResourceResponse.java`・`CreateResourceRequest.java`・`UpdateResourceRequest.java`・`ResourceService.java`・`ResourceControllerTest.java`・`ResourceServiceTest.java`（backend）、`api.ts`（`ResourceResponseSchema`）・`schemas/resource.ts`（`CreateResourceSchema`）・`ResourceManagementClient.tsx`・`resources/[id]/page.tsx`（frontend）

## 依存関係・競合課題（注意）

- 前提課題：なし
- 競合課題：`resource-image-upload`（同じく `resources` テーブルへの Flyway マイグレーション・`GET /api/resources/{id}` レスポンス・`/admin/resources` 編集画面を変更するため並行着手非推奨）・`calendar-view`（リソース詳細画面を共有）。現時点ではいずれも未着手（マイグレーションは `V001` のみ）であることを確認済み。

## スコープ外

- E2E テスト追加（後続課題 `e2e-test-coverage` のスコープ）
- 一覧画面（`/resources`）での新フィールド表示（RES-05 により対象外）
