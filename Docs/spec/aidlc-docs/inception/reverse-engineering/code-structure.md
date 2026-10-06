# Code Structure

## Build System

- **Backend**: Gradle（Kotlin DSL）、Spring Boot 4.0.6、Java 25。Spotless（フォーマット）+ Checkstyle（静的解析）。
- **Frontend**: pnpm、Next.js 15.3.2（App Router）、React 19.1.0、TypeScript 5.8.3。oxlint + oxfmt。

## Resource ドメインの既存ファイル一覧（Issue #25 の変更対象候補）

### Backend

| ファイル | 役割 |
|---|---|
| `backend/src/main/resources/db/migration/V001__create_initial_schema.sql` | `resources` テーブルの DDL（現状 V001 のみ。本課題で `V002` を追加する） |
| `backend/src/main/java/com/example/bookflow/domain/Resource.java` | エンティティ。`create`/`update` ファクトリ・更新メソッドに全フィールドを列挙する設計（`ddl-auto: validate` のため DB と厳密一致が必須） |
| `backend/src/main/java/com/example/bookflow/domain/ResourceCategory.java` | `category` の enum（`ROOM`/`EQUIPMENT`/`VEHICLE`） |
| `backend/src/main/java/com/example/bookflow/domain/ResourceRepository.java` | Spring Data JPA リポジトリ（本課題では変更不要の見込み。新フィールドはカラム追加のみで検索条件に関与しない） |
| `backend/src/main/java/com/example/bookflow/application/ResourceService.java` | ユースケース Service。`create`/`update` が `Resource.create`/`resource.update` に全フィールドを位置引数で渡す構造（§設計パターン参照） |
| `backend/src/main/java/com/example/bookflow/presentation/ResourceController.java` | REST Controller（`GET/POST/PUT/PATCH /api/resources*`） |
| `backend/src/main/java/com/example/bookflow/presentation/dto/ResourceResponse.java` | レスポンス DTO（record）。`from(Resource)` ファクトリで全フィールドを詰め替える |
| `backend/src/main/java/com/example/bookflow/presentation/dto/CreateResourceRequest.java` | 登録リクエスト DTO（record、Bean Validation） |
| `backend/src/main/java/com/example/bookflow/presentation/dto/UpdateResourceRequest.java` | 更新リクエスト DTO（`CreateResourceRequest` と同一フィールド構成） |
| `backend/src/test/java/com/example/bookflow/application/ResourceServiceTest.java` | Service 層ユニットテスト（Mockito） |
| `backend/src/test/java/com/example/bookflow/presentation/ResourceControllerTest.java` | Controller 層結合テスト（MockMvc + H2 実データ） |

### Frontend

| ファイル | 役割 |
|---|---|
| `frontend/src/lib/types/api.ts`（`ResourceResponseSchema`） | レスポンス Zod スキーマ。BE の `ResourceResponse` と 1:1 対応させる既存規約 |
| `frontend/src/lib/schemas/resource.ts`（`CreateResourceSchema`） | フォーム入力 Zod スキーマ（登録・更新で共用） |
| `frontend/src/server/actions/resources.ts` | Server Actions（BFF 層）。`getResourceAction`/`createResourceAction`/`updateResourceAction` 等 |
| `frontend/src/app/(authenticated)/resources/[id]/page.tsx` | リソース詳細画面（Server Component）。新フィールドの表示先（RES-04） |
| `frontend/src/app/(authenticated)/admin/resources/ResourceManagementClient.tsx` | 管理画面のフォーム（`ResourceForm` 内部コンポーネント、`react-hook-form` + `zodResolver`）。新フィールドの入力先（RES-03） |
| `frontend/src/app/(authenticated)/admin/resources/page.tsx` | 管理画面の Server Component（一覧取得・`ResourceManagementClient` へ受け渡し） |

## Design Patterns

### 4 レイヤーアーキテクチャ（backend 全体の既存方針）

- **Location**: `domain`/`application`/`presentation`/`infrastructure`
- **Purpose**: 関心の分離。Controller は薄く、業務ロジックは Service に集約。
- **Implementation**: `Resource`（domain）→ `ResourceService`（application）→ `ResourceController` + DTO（presentation）。

### エンティティのファクトリ+全フィールド位置引数パターン（`Resource.java`）

- **Location**: `Resource.create(...)` / `Resource#update(...)`
- **Purpose**: `ddl-auto: validate` 環境でカラムとエンティティの対応を明示する。
- **Implementation**: 新フィールド追加時は、このファクトリメソッド・update メソッドの**両方**にパラメータを追加する必要がある（既存 7 フィールドがすべて位置引数で列挙されている）。`ResourceService#create`/`#update` の呼び出し側（`req.xxx()` の列挙）も連動して変更が必要。

### record DTO + 静的ファクトリ（`ResourceResponse.java` 等）

- **Location**: `presentation/dto/*.java`
- **Purpose**: イミュータブルなレスポンス/リクエスト表現。
- **Implementation**: `ResourceResponse.from(Resource)` がエンティティの全 getter を呼び出して詰め替える。新フィールド追加時はここにも追加が必要。

### フロントエンド: Zod スキーマの BE/FE 二重定義

- **Location**: `frontend/src/lib/types/api.ts`（レスポンス用）と `frontend/src/lib/schemas/resource.ts`（フォーム入力用）
- **Purpose**: レスポンス検証とフォームバリデーションを別スキーマで管理（後者は `'use server'` ファイルから export 不可なため分離）。
- **Implementation**: 新フィールドは両方のスキーマに追加が必要。`ResourceManagementClient.tsx` の `ResourceForm` にも入力 UI を追加する必要がある。

## Critical Dependencies

### Spring Data JPA（backend）

- **Usage**: `ResourceRepository` は標準の派生クエリメソッドのみで `@Query` 無し（本課題でも変更不要見込み）。

### react-hook-form + zodResolver（frontend）

- **Usage**: `ResourceManagementClient.tsx` の `ResourceForm` で使用。新フィールドは `FormField` を追加する定型パターン。
