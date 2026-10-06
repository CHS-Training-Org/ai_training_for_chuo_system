# Code Generation Plan — ユニット: resource-detail-info（リソース詳細画面の情報拡充）

## Unit Context

- **Stories implemented**: US-01, US-02, US-03（`Docs/spec/aidlc-docs/inception/user-stories/stories.md`）
- **Dependencies**: なし（前提課題なし）
- **Database entities owned**: `Resource`（`resources` テーブルに `equipment`・`notes` の2列を追加、既存7フィールドは無変更）
- **Service boundaries**: backend の `domain`/`application`/`presentation` 層内、frontend の `resources`/`admin/resources` 画面・BFF 層内に閉じる

## 技術判断（Functional Design を SKIP したため、本計画で直接規定する）

- **データ格納**: `resources` テーブルへの列追加（Requirements Analysis で確定済み）。`equipment TEXT`・`notes TEXT`、ともに `NULL` 許容
- **Bean Validation**: 既存の `description` と同じ方針（必須制約・文字数制限なし、自由記述）
- **エンティティ拡張**: `Resource.create`/`Resource#update` の位置引数の末尾に `equipment`・`notes` を追加する（既存7引数の構造を踏襲。RE調査 `code-structure.md` で指摘済みの連動変更箇所）
- **フロントエンド表示**: `description` と同じ条件表示パターン（`null` の場合は非表示）。改行を保持するため `whitespace-pre-line` クラスを適用する
- **フロントエンド入力**: `description` と同じ `Textarea` コンポーネントを使用する

## 実行ステップ

> **注意（実行順序）**：`er-diagram.md` の正は Flyway マイグレーションであり、`update-spec` スキルの規約（「先に Flyway マイグレーションを書き、それに合わせる」）に従い、Step 1（Database Migration）を Step 2（仕様書更新）より先に実行する。Spec-first 原則（実装より先に仕様を更新する）とは、同一 PR 内で仕様が実装に先行することを指し、このマイグレーション作成はスキーマ決定行為であって実装そのものではないため矛盾しない。

- [x] **Step 1: Database Migration**
  - `backend/src/main/resources/db/migration/V002__add_resource_equipment_and_notes.sql` を新規作成（`ALTER TABLE resources ADD COLUMN equipment TEXT; ALTER TABLE resources ADD COLUMN notes TEXT;`、両列 `NULL` 許容のためデフォルト値不要）
  - Story mapping: US-01, US-02, US-03（前提となるスキーマ変更）

- [x] **Step 2: 仕様書更新（Spec-first）**
  - `/update-spec` スキルで `docs-next/docs/spec/er-diagram.md`（§`resources` テーブルに新カラム追記、Step 1 のマイグレーションに合わせる。Mermaid ではなく drawio 図のため `static/diagrams/spec/er-diagram.drawio`/`.svg` も更新）・`docs-next/docs/spec/api-spec.md`（§`GET /api/resources/{id}` / §`POST /api/resources` / §`PUT /api/resources/{id}` に新フィールド追記）・`docs-next/docs/spec/screen-spec.md`（§`/resources/{id}` に表示追記、§`/admin/resources` に入力欄追記）・`docs-next/docs/spec/requirements.md`（UC-02 の RES-04・UC-08 の RES-05 を新フィールド込みの記述に更新）を更新する
  - Story mapping: 全ストーリー（仕様の前提となるドキュメント更新）

- [ ] **Step 3: Domain 層生成**
  - `backend/src/main/java/com/example/bookflow/domain/Resource.java`:
    - フィールド追加（`@Column(columnDefinition = "TEXT") private String equipment;` / `private String notes;`、`description` と同じ注釈パターン）
    - `create` ファクトリメソッドの引数末尾に `equipment, notes` を追加
    - `update` メソッドの引数末尾に `equipment, notes` を追加（代入処理も追加）
    - `getEquipment()`/`getNotes()` の getter を追加
  - Story mapping: US-01, US-02, US-03

- [ ] **Step 4: API 層（DTO）生成**
  - `backend/src/main/java/com/example/bookflow/presentation/dto/ResourceResponse.java`: record のフィールド末尾に `equipment, notes` を追加、`from(Resource)` に反映
  - `backend/src/main/java/com/example/bookflow/presentation/dto/CreateResourceRequest.java`: record のフィールド末尾に `equipment, notes` を追加（Bean Validation 注釈なし、`description` と同じ）
  - `backend/src/main/java/com/example/bookflow/presentation/dto/UpdateResourceRequest.java`: 同上
  - Story mapping: US-01, US-02

- [ ] **Step 5: Business Logic 層生成**
  - `backend/src/main/java/com/example/bookflow/application/ResourceService.java`: `create`/`update` メソッド内の `Resource.create(...)`/`resource.update(...)` 呼び出しに `req.equipment()`/`req.notes()` を追加
  - Story mapping: US-01

- [x] **Step 6: Business Logic + API 層ユニットテスト**
  - `backend/src/test/java/com/example/bookflow/application/ResourceServiceTest.java`: 調査の結果、既存の `create`/`update` は本リポジトリでそもそも Service 層単体テストが無い（Controller 層の結合テストのみでカバーする既存方針）ため、本ユニットでも新規に追加しない（既存カバレッジ方針との整合を優先）
  - `backend/src/test/java/com/example/bookflow/presentation/ResourceControllerTest.java`: POST/PUT のリクエストボディに `equipment`/`notes` を含め、レスポンスに新フィールドが含まれることを検証する既存テストの拡張、GET 詳細取得で値ありのレスポンス・NULL（未登録）のレスポンスの両方を検証する結合テストを追加
  - 過去ユニット（resource-search/resource-sort/reservation-list-filter）の CI レビューで指摘された「対象コードを無効化しても pass してしまう弱いテスト」パターンを避けるため、各テストについて対象コードを一時的に無効化してテストが red になることを実装時に自己検証する
  - Story mapping: US-01, US-02, US-03

- [x] **Step 7: Backend 層サマリ**
  - backend 側の変更点を `Docs/spec/aidlc-docs/construction/resource-detail-info/code/backend-summary.md` に記録

- [x] **Step 8: Frontend Components 生成**
  - `frontend/src/lib/types/api.ts`: `ResourceResponseSchema` に `equipment: z.string().nullable()`・`notes: z.string().nullable()` を追加
  - `frontend/src/lib/schemas/resource.ts`: `CreateResourceSchema` に `equipment: z.string().optional().nullable()`・`notes: z.string().optional().nullable()` を追加
  - `frontend/src/app/(authenticated)/admin/resources/ResourceManagementClient.tsx`: `ResourceForm` に設備情報・利用上の注意の `Textarea` フィールドを追加（`description` の `FormField` と同じパターン）。`defaultValues`・編集時の `defaultValues={{ ... }}` 呼び出しにも追加
  - `frontend/src/app/(authenticated)/resources/[id]/page.tsx`: 設備情報・利用上の注意の条件表示を追加（`description` と同じ `{resource.xxx && (...)}` パターン、`whitespace-pre-line` で改行保持）
  - `data-testid`: 既存の `description` 関連フィールドに `data-testid` が無いため、本ユニットでも新規追加しない（既存パターンに合わせる）
  - Story mapping: US-01, US-02, US-03

- [x] **Step 9: Frontend Components ユニットテスト**
  - `frontend/tests/unit/server/actions/resources.test.ts`: `createResourceAction`/`updateResourceAction`/`getResourceAction` のテストに `equipment`/`notes` を含めた検証を追加（実際に送信されるリクエストボディ・レスポンスの値を検証する形式、過去ユニットのCIレビュー指摘を踏まえ最初から実装する）
  - Story mapping: US-01, US-02

- [x] **Step 10: Frontend 層サマリ**
  - frontend 側の変更点を `Docs/spec/aidlc-docs/construction/resource-detail-info/code/frontend-summary.md` に記録

## スコープ外（本プランに含めない）

- E2E テスト（既存方針を踏襲しスコープ外、後続課題 `e2e-test-coverage` の対象）
- 一覧画面（`/resources`）での新フィールド表示（RES-05 により対象外）
- `ResourceManagementClient`/詳細画面の新規コンポーネントテスト（既存の同画面に対する前例が無く、受入条件が「新フィールドを含むAPI動作のテスト」を要求しているため、Server Action（BFF）層のテストで代替する）

## 本プランが Code Generation の唯一の正とする

本ステップ順序・内容が Part 2（Generation）実行の単一の正とする。逸脱する場合は本ファイルを更新してから実行する。
