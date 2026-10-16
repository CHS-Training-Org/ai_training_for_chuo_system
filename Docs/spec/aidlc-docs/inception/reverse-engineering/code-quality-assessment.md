# Code Quality Assessment

## Test Coverage
- **Overall**: Fair（カバレッジ数値は未計測）
- **Unit Tests**: ResourceServiceTest、ResourceControllerTest、resources.test.ts あり
- **Integration Tests**: ControllerTest が Spring コンテキストを使う

## Code Quality Indicators
- **Linting**: oxlint / oxfmt、Spotless / Checkstyle を設定済み
- **Code Style**: 一貫している
- **Documentation**: Javadoc あり（Good）

## Technical Debt
- `ResourceRepository` の派生クエリが組合せ爆発している。keyword 追加時は Specification か `@Query` への集約を検討する。
- `ResourceFilterForm` の `useCallback` 依存配列に未使用の `searchParams` がある。
- `defaultFrom?.replace("T", "T")` は無意味な置換。

## Patterns and Anti-patterns
- **Good Patterns**: 4 レイヤー、Server Components 優先、Javadoc
- **Anti-patterns**: 上記の組合せ爆発
