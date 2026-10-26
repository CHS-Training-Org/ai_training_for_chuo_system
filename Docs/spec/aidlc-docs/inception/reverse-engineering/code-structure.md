# Code Structure

## Build System
- **Type**: Gradle（Kotlin DSL、BE）/ pnpm（FE）
- **Configuration**: `backend/build.gradle.kts`、`frontend/package.json`

## Existing Files Inventory（本課題の変更候補・参照対象）
- `backend/src/main/java/com/example/bookflow/presentation/ResourceController.java` - `GET /api/resources`。`category/from/to/pageable` を受ける（変更候補）
- `backend/src/main/java/com/example/bookflow/application/ResourceService.java` - `list` が `listPaginated` と `listWithAvailabilityFilter` に分岐（変更候補）
- `backend/src/main/java/com/example/bookflow/domain/ResourceRepository.java` - `findByCategory` / `findByIsActiveTrue` 等の派生クエリが、ページあり・なしで並ぶ（変更候補）
- `backend/src/main/java/com/example/bookflow/domain/Resource.java` - エンティティ。`name`・`description` を持つ（参照）
- `backend/src/test/java/com/example/bookflow/application/ResourceServiceTest.java` - `list_*` 4 テスト（Mockito、追加先候補）
- `backend/src/test/java/com/example/bookflow/presentation/ResourceControllerTest.java` - Controller テスト（追加先候補）
- `frontend/src/app/(authenticated)/resources/ResourceFilterForm.tsx` - フィルタフォーム（変更候補）
- `frontend/src/app/(authenticated)/resources/page.tsx` - SearchParams 型と Action 呼び出し（変更候補）
- `frontend/src/server/actions/resources.ts` - `listResourcesAction`、クエリパラメータ組み立て（変更候補）
- `docs-next/docs/spec/api-spec.md` §`GET /api/resources`、`docs-next/docs/spec/screen-spec.md` §`/resources` - Spec-first の更新対象

## Design Patterns
### 条件の組み合わせ
- **Location**: `ResourceService.listPaginated` / `fetchAllCandidates`
- **Purpose**: category の有無と isAdmin の組み合わせで Repository メソッドを選ぶ。
- **Implementation**: 三項演算子で 4 通りに分岐。条件を 1 つ足すと分岐が 8 通りに増える。

## Critical Dependencies
- Spring Data JPA（派生クエリ・`@Query`）、Spring Boot 4.0 / Java 25。フィルタフォームは React Hook Form を使わず素の `FormData` を使う。
