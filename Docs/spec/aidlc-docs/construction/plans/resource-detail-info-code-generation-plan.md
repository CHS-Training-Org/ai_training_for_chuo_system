---
title: Code Generation Plan — resource-detail-info
description: Construction フェーズ Code Generation の実行計画（バックエンド → フロントエンド → テスト）
---

# Code Generation Plan — resource-detail-info

## Unit Context

- **対象ユニット**: `resource-detail-info`（単一ユニット）
- **受入条件（requirements.md より）**:
  - 管理者がリソース登録・編集画面から設備情報・利用上の注意を入力・更新できる
  - リソース詳細画面に設備情報・利用上の注意が表示される（未登録時は非表示でよい）
  - Flyway マイグレーションが正常に実行され、既存データへの影響がない（`NULL` 許容）
  - `GET /api/resources/{id}` のレスポンスに新フィールドが含まれる
  - バックエンドの既存テストが引き続き pass する
  - 新フィールドを含む API 動作のテストを追加する
- **依存関係**: なし（単一ユニット、既存 `resources` ドメインの拡張のみ）
- **所有するデータベースエンティティ**: `resources`（既存テーブルへのカラム追加のみ、新規テーブルなし）
- **サービス境界**: 既存 `ResourceService` / `ResourceController` の責務範囲内（新規コンポーネントなし）
- **前提**: Spec-first 更新（`docs-next/docs/spec/{requirements.md, er-diagram.md, er-diagram.drawio, api-spec.md, screen-spec.md}`）は完了済み

---

## Step 1: Spec-first 更新

- [x] `docs-next/docs/spec/requirements.md` §RES-04・RES-05 更新
- [x] `docs-next/docs/spec/er-diagram.md` §`resources` テーブル更新
- [x] `docs-next/static/diagrams/spec/er-diagram.drawio` 更新（SVG 再エクスポートは学習者による VSCode 拡張での手動対応待ち）
- [x] `docs-next/docs/spec/api-spec.md` §リソース関連エンドポイント更新
- [x] `docs-next/docs/spec/screen-spec.md` §`/resources/{id}` §`/admin/resources` 更新

---

## Step 2: バックエンド — Flyway マイグレーション

- [x] `backend/src/main/resources/db/migration/V002__add_resource_equipment_and_notes.sql` を新規作成
  ```sql
  ALTER TABLE resources ADD COLUMN equipment TEXT;
  ALTER TABLE resources ADD COLUMN notes TEXT;
  ```

## Step 3: バックエンド — `Resource` エンティティ

- [x] `backend/src/main/java/com/example/bookflow/domain/Resource.java`
  - `description` フィールドの後・`createdAt` フィールドの前に `equipment`・`notes`（`@Column(columnDefinition = "TEXT")`、型 `String`）を追加（`er-diagram.md` のカラム順と一致させる）
  - `create()` ファクトリの引数末尾（`description` の後）に `equipment, notes` を追加し、フィールドに設定
  - `update()` の引数・処理にも同様に追加
  - `getEquipment()` / `getNotes()` ゲッターを追加

## Step 4: バックエンド — DTO

- [x] `backend/src/main/java/com/example/bookflow/presentation/dto/ResourceResponse.java`
  - record のフィールドリストで `description` の後・`createdAt` の前に `String equipment, String notes` を追加
  - `from()` ファクトリに `resource.getEquipment(), resource.getNotes()` を追加
- [x] `backend/src/main/java/com/example/bookflow/presentation/dto/CreateResourceRequest.java`
  - `description` フィールドの後に `String equipment, String notes` を追加（Bean Validation 制約なし。文字数上限を設けない方針どおり）
- [x] `backend/src/main/java/com/example/bookflow/presentation/dto/UpdateResourceRequest.java`
  - 同上（`CreateResourceRequest` と同一構成を維持）

## Step 5: バックエンド — Service 層の呼び出し更新

- [x] `backend/src/main/java/com/example/bookflow/application/ResourceService.java`
  - `create()` 内の `Resource.create(...)` 呼び出しに `req.equipment(), req.notes()` を追加
  - `update()` 内の `resource.update(...)` 呼び出しに同様に追加
- [x] `ResourceController` は DTO を透過的に受け渡すのみのため変更不要（確認のみ）

## Step 6: バックエンド — テスト追加・回帰確認

- [x] `backend/src/test/java/com/example/bookflow/presentation/ResourceControllerTest.java`
  - `POST /api/resources` に `equipment`/`notes` を含む新規テスト（登録レスポンスに反映されることを検証）
  - `PUT /api/resources/{id}` に `equipment`/`notes` を含む新規テスト（更新レスポンスに反映されることを検証）
  - `GET /api/resources/{id}` のテストに `equipment`/`notes` が `null`（未設定シードデータ）でもレスポンスが 200 で返ることを確認するアサーションを追加（既存シードは値なしのため、非表示相当＝`null` の確認）
- [x] `backend/src/test/java/com/example/bookflow/application/ResourceServiceTest.java`
  - 既存テストは `description` 系フィールドを直接検証していないため、`create`/`update` シグネチャ変更に伴うコンパイル影響のみ確認（大きな変更は不要）

---

## Step 7: フロントエンド — 型・Zod スキーマ

- [x] `frontend/src/lib/types/api.ts` の `ResourceResponseSchema` に `equipment: z.string().nullable()` / `notes: z.string().nullable()` を `description` の後・`createdAt` の前に追加
- [x] `frontend/src/lib/schemas/resource.ts` の `CreateResourceSchema` に `equipment: z.string().optional().nullable()` / `notes: z.string().optional().nullable()` を `description` の後に追加（`UpdateResourceSchema` は `CreateResourceSchema` のエイリアスのため自動反映）

## Step 8: フロントエンド — リソース詳細画面

- [x] `frontend/src/app/(authenticated)/resources/[id]/page.tsx`
  - 既存の `description` 表示ブロック（`CardContent` 内）の後に「設備一覧」「利用上の注意」を同じ段落表示パターンで追加
  - 値が `null`・空文字の場合は当該ブロックごと非表示（既存の `description` と同じ条件分岐パターンを踏襲）

## Step 9: フロントエンド — 管理画面フォーム

- [x] `frontend/src/app/(authenticated)/admin/resources/ResourceManagementClient.tsx`
  - `ResourceForm` の `defaultValues` に `equipment: null, notes: null` を追加
  - 有効（`isActive`）チェックボックスの後に「設備一覧」「利用上の注意」の `Textarea` フィールドを追加（`description` の `FormField` と同じパターン）
  - 編集ダイアログの `defaultValues` に `equipment: editTarget.equipment, notes: editTarget.notes` を追加

## Step 10: フロントエンド — テスト用モック更新・回帰確認

- [x] `frontend/tests/unit/msw/handlers.ts` の `MOCK_RESOURCE_RESPONSE` に `equipment`/`notes` を追加（`ResourceResponseSchema` の必須化に伴う整合性確保）
- [x] `frontend/tests/unit/server/actions/resources.test.ts` は特定フィールドを個別検証していないため大きな変更は不要（回帰確認のみ）

---

## Step 11: Build and Test（次ステージで実行）

- [ ] `cd backend && ./gradlew test`
- [ ] `cd backend && ./gradlew spotlessApply`
- [ ] `cd backend && ./gradlew checkstyleMain`
- [ ] `cd frontend && pnpm test`
- [ ] `cd frontend && pnpm lint`
