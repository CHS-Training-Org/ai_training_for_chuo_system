# Code Quality Assessment

## Test Coverage
- **Overall**: Fair（定量カバレッジ未計測）
- **Unit Tests**: ResourceServiceTest 17 / ResourceControllerTest 21 / FE `resources.test.ts`（一覧 3 ケース）
- **Integration Tests**: Repository 層（`@DataJpaTest` 等）のテストは存在しない。Service テストは Repository を Mockito でモックしているため、**実クエリの検索条件は既存テストで検証されない**

## Code Quality Indicators
- **Linting**: Spotless + Checkstyle / oxlint + oxfmt 設定済み
- **Code Style**: 一貫（Javadoc 充実）
- **Documentation**: Good

## Technical Debt
- `ResourceRepository` はページあり/なし×カテゴリ×active の一覧取得 8 通り（派生クエリ 6 本 + `JpaRepository` 継承の `findAll` 2 本）で、条件追加のたびに組合せが倍増する（keyword 追加で 16 本相当）
- `from`/`to` 指定時は全候補をメモリへ取得し手動ページング（件数増に弱い。本課題のスコープ外）
- `ResourceFilterForm.tsx` の `useCallback` 依存に未使用の `searchParams`、`defaultFrom?.replace("T", "T")` は無意味な置換

## Patterns and Anti-patterns
- **Good Patterns**: 4 層分離、Server Component 優先、フィルタ状態の URL 保持、`PaginationNav` が `query` を引き継ぐ
- **Anti-patterns**: 上記の派生クエリ爆発、全件メモリ取得
