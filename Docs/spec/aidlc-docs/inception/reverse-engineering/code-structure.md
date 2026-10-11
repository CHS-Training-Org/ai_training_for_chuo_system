# Code Structure

## Build System
- **Type**: Gradle Kotlin DSL（backend）/ pnpm（frontend）
- **Configuration**: `backend/build.gradle.kts`（Spotless・Checkstyle・springdoc）、`frontend/package.json`

## Key Classes/Modules

### Existing Files Inventory（本課題で変更候補）
- `backend/.../presentation/ResourceController.java` - 一覧エンドポイント。`keyword` の受け取り追加候補
- `backend/.../application/ResourceService.java` - `list` / `listPaginated` / `listWithAvailabilityFilter` / `fetchAllCandidates`
- `backend/.../domain/ResourceRepository.java` - 一覧取得 8 通り（派生クエリ 6 本 + `JpaRepository` 継承の `findAll` 2 本。`JpaRepository` のみ継承、`JpaSpecificationExecutor` 未継承）
- `backend/.../domain/Resource.java` - `name`(VARCHAR 100, NOT NULL) / `description`(TEXT, NULL 可)
- `backend/src/test/.../application/ResourceServiceTest.java` - Mockito 単体（17 テスト）
- `backend/src/test/.../presentation/ResourceControllerTest.java` - Controller テスト（21 テスト）
- `frontend/src/app/(authenticated)/resources/page.tsx` - Server Component。`SearchParams` に category/from/to/page
- `frontend/src/app/(authenticated)/resources/ResourceFilterForm.tsx` - Client Component。FormData から searchParams を組み立て
- `frontend/src/server/actions/resources.ts` - `listResourcesAction`（`ListResourcesParams`）
- `frontend/tests/unit/server/actions/resources.test.ts` - Vitest + MSW
- `docs-next/docs/spec/api-spec.md` §`GET /api/resources`、`screen-spec.md` §`/resources` - 更新対象 spec

## Design Patterns

### Layered Architecture
- **Location**: backend 全体
- **Purpose**: 責務分離（Controller は薄く、業務ルールは Service）

### Server Component + URL 状態
- **Location**: `resources/page.tsx` と `ResourceFilterForm.tsx`
- **Purpose**: フィルタ状態を URL に保持し、Server Component で再取得（Zustand は不使用）

## Critical Dependencies
- Spring Boot 4.0 / Java 25 / Spring Data JPA - 永続化
- Next.js 15 / React 19 / Zod - UI と型検証
