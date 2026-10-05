# Code Quality Assessment

## Test Coverage

- **Overall**: Good（リソース関連は Service・Controller・Server Actions 全層にテストあり）
- **Unit Tests**: `ResourceServiceTest`（Mockito、`List_` ネストクラスにロール別・空き判定のテスト）、`resources.test.ts`（Vitest + MSW）
- **Integration Tests**: `ResourceControllerTest`（MockMvc）

## Code Quality Indicators

- **Linting**: 設定済み（backend: Spotless + Checkstyle、frontend: oxlint + oxfmt）
- **Code Style**: 一貫している（Javadoc コメント・命名規約 `methodName_condition_expectedBehavior` が ADR-018 で規定され遵守されている）
- **Documentation**: Good（各クラス・メソッドに Javadoc あり、`api-spec.md`・`er-diagram.md` 等の仕様書が最新に保たれている）

## Technical Debt

- `ResourceRepository` の派生クエリメソッド名方式は、条件が 1 つ増えるごとに組み合わせが倍増する構造的な制約を持つ（`code-structure.md` 参照）。Issue #23 で keyword を追加する際、この方式のまま拡張するか `@Query`/`Specification` に切り替えるかが設計判断点になる。

## Patterns and Anti-patterns

- **Good Patterns**:
  - 「未指定時は既存パラメータを付与しない」を FE（`ResourceFilterForm.tsx`）・BFF（`resources.ts`）両方で一貫させている
  - Service 層のテストで境界値（隣接時間帯の非重複判定等）を明示的に検証している
- **Anti-patterns**:
  - なし（Issue #23 のスコープ内で明確な技術的負債は上記の派生クエリ組み合わせ増加のみ）
