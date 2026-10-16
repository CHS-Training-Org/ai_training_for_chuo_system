# Code Structure

## Build System
- **Type**: Gradle（Kotlin DSL、backend）/ pnpm（frontend）

## Key Classes/Modules
### Existing Files Inventory（今回の変更候補）
- `backend/src/main/java/com/example/bookflow/presentation/ResourceController.java` - 一覧 API。category / from / to を受ける。keyword なし。
- `backend/src/main/java/com/example/bookflow/application/ResourceService.java` - `list` → `listPaginated` / `listWithAvailabilityFilter`。category と isAdmin の組合せで 4 通りに分岐。
- `backend/src/main/java/com/example/bookflow/domain/ResourceRepository.java` - 派生クエリ 8 本（Page 版と List 版）。
- `backend/src/main/java/com/example/bookflow/domain/Resource.java` - name（100）、description（TEXT）等。
- `backend/src/test/java/com/example/bookflow/application/ResourceServiceTest.java` - Service 単体テスト。
- `backend/src/test/java/com/example/bookflow/presentation/ResourceControllerTest.java` - Controller テスト。
- `frontend/src/app/(authenticated)/resources/page.tsx` - SearchParams は category / from / to / page。
- `frontend/src/app/(authenticated)/resources/ResourceFilterForm.tsx` - submit で URLSearchParams を組み立て。
- `frontend/src/server/actions/resources.ts` - `listResourcesAction`。ListResourcesParams に keyword なし。
- `frontend/tests/unit/server/actions/resources.test.ts` - MSW でのユニットテスト。
- `frontend/tests/unit/msw/handlers.ts` - モックデータ。
- `docs-next/docs/spec/api-spec.md`（§GET /api/resources）、`screen-spec.md`（§/resources）。

## Design Patterns
### 4 レイヤー + 派生クエリ
- **Location**: backend
- **Purpose**: 層の責務分離
- **Implementation**: 組合せ（category × isAdmin × ページング有無）ごとにメソッドを列挙している。keyword を足すと組合せが倍増する。

## Critical Dependencies
- Spring Data JPA、Zod（FE スキーマ）、MSW（FE テスト）
