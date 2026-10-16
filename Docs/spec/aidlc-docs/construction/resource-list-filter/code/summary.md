# Code Generation Summary: resource-list-filter

## Modified
- `docs-next/docs/spec/api-spec.md`、`docs-next/docs/spec/screen-spec.md`
- `backend/.../application/ResourceService.java`（`list` に keyword、`fetchAllCandidates` と `listPaginated` を削除）
- `backend/.../domain/ResourceRepository.java`（`JpaSpecificationExecutor` 継承、派生クエリ 8 本を削除）
- `backend/.../presentation/ResourceController.java`（`keyword` 受付、`normalizeKeyword`）
- `backend/src/test/.../ResourceServiceTest.java`、`ResourceControllerTest.java`
- `frontend/src/server/actions/resources.ts`、`ResourceFilterForm.tsx`、`resources/page.tsx`
- `frontend/tests/unit/server/actions/resources.test.ts`

## Created
- `backend/.../domain/ResourceSpecifications.java`
- `backend/src/test/.../domain/ResourceSpecificationsTest.java`

## 自己確認の結果
- `./gradlew spotlessApply`、`checkstyleMain`（既存の `ReservationRepository` の警告 2 件のみ）、`test`: 成功。Resource 関連は Controller 33、Specifications 13、Service 20（Overlaps 7、List_ 7、Get 2、Availability 4）で失敗 0
- `pnpm lint`、`pnpm format:check`、`pnpm test`（82 件）、`tsc --noEmit`: 成功
- `docs-next` の `npm run build`: 成功（drawio SVG の読み取り警告は既存）

## 計画との差分
- なし（Step 13 に書いた未使用依存の整理は、計画どおり行っていない）
