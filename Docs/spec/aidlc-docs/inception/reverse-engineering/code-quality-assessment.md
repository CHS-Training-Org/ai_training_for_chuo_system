# Code Quality Assessment

## Test Coverage
- **Overall**: Fair（定量カバレッジ未計測）
- **Unit Tests**:
  - backend Service（Mockito）：ReservationServiceTest 19 / ResourceServiceTest 19 / ApprovalServiceTest 17
  - backend Specification：ResourceSpecificationsTest 7
  - frontend（Vitest + MSW）：Server Actions 6 ファイル（reservations 13 / resources 15 / approvals 12 / users 4 / auth 3 / dev-auth 4）、nav-items 12、pagination-nav 10、session 7、resource-filter-form 8
- **Integration Tests**:
  - backend Controller（`BaseControllerTest` + MockMvc + H2）：ReservationControllerTest 19 / ResourceControllerTest 31 / ApprovalControllerTest 16 / UserControllerTest 5 / AuthControllerTest 4 / DepartmentControllerTest 4
  - backend Repository（H2 実クエリ）：ResourceRepositoryTest 13（PR #146 で追加）。ReservationRepository の実クエリテストはない
  - E2E：`example.spec.ts` のみ（業務シナリオなし）
- 件数は `@Test` / `it(` の出現数による概数

## Code Quality Indicators
- **Linting**: Spotless + Checkstyle / oxlint + oxfmt 設定済み、CI で実行
- **Code Style**: 一貫（Javadoc・JSDoc が充実し、仕様書の節番号を参照）
- **Documentation**: Good

## Technical Debt
- `ReservationRepository` の一覧取得は「本人／全件 × ステータス有無」の `@Query` 4 本で、条件（期間など）を足すたびに組み合わせが倍増する。PR #146 前の `ResourceRepository` と同じ構造
- 一覧系メソッドはすべて Pageable 前提で、全件をページングなしで取得するメソッドはない
- `api-client.ts` は JSON 専用で、`Content-Type: application/json` を常時付与。非 JSON レスポンスを扱えない
- 日時はすべて `LocalDateTime`（DB は `TIMESTAMP` タイムゾーンなし）。FE は `new Date(...).toLocaleString("ja-JP")` で表示しており、タイムゾーンの扱いが暗黙
- `reservations.start_at` にインデックスがない（期間で絞り込む場合の検索性能。現状のデータ量では問題化していない）

## Patterns and Anti-patterns
- **Good Patterns**: 4 層分離、`@PreAuthorize` によるエンドポイント単位のロール制御と Service 内の行レベル判定の分離、JOIN FETCH による N+1 回避、ロール別テスト用アノテーション（`@WithMockAdmin` ほか）、Specification による動的条件（`ResourceSpecifications`）、表示ラベルの一元管理（`labels.ts`）
- **Anti-patterns**: 上記の `@Query` 組み合わせ増加。`ReservationService` が presentation 層の DTO を返す（既存の慣習としてプロジェクト全体で一貫しているため、本課題で変える対象ではない）
