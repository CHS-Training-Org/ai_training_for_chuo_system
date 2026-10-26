# Code Quality Assessment

## Test Coverage
- **Overall**: Fair（`ResourceServiceTest` に一覧・詳細・空き照会・重複判定あり）
- **Unit Tests**: BE あり（Mockito）。FE は一覧画面向けのテストを確認できていない
- **Integration Tests**: `ResourceControllerTest` あり

## Code Quality Indicators
- **Linting**: 設定済み（oxlint / Spotless / Checkstyle）
- **Code Style**: 一貫している
- **Documentation**: Javadoc が充実

## Technical Debt
- `ResourceRepository` はページあり・なしの派生クエリが並び、条件追加で組み合わせが増える。
- `from`/`to` 指定時は全件取得して Java で絞り、手動ページネーションする。`keyword` をこの経路に載せるか DB 側で絞るかで性能特性が変わる。
- `ResourceFilterForm.handleSubmit` の `useCallback` 依存配列に未使用の `searchParams` が入っている（既存の軽微な冗長。本課題では触らない想定）。

## Patterns and Anti-patterns
- **Good Patterns**: 4 層分離、Server Components 優先、Zod による応答検証
- **Anti-patterns**: 上記の派生クエリの組み合わせ爆発
