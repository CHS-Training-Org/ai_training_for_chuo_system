# Code Quality Assessment

## Test Coverage
- **Overall**: Fair（カバレッジ計測値は未確認）
- **Unit Tests**: backend は `ResourceServiceTest`（Mockito）が一覧・詳細・空き照会を検証。frontend は `tests/unit/server/actions` に Server Action のテストがある（`resources` 向けの有無は Code Generation で確認する）
- **Integration Tests**: `ResourceControllerTest`（H2 + MockMvc）が一覧のロール別・`from`/`to` 絞り込みを検証。E2E は `example.spec.ts` のみ

## Code Quality Indicators
- **Linting**: 設定済み（Spotless / Checkstyle / oxlint / oxfmt）
- **Code Style**: 一貫している（Javadoc は日本語、4 層構成を遵守）
- **Documentation**: Good（API・画面仕様が `docs-next/docs/spec/` にある）

## Technical Debt
- `ResourceService.listWithAvailabilityFilter` は候補を全件取得して Java で絞り込み、手動でページングする。リソース数が増えると非効率だが、本課題の対象外
- `ResourceRepository` は「ADMIN か否か × カテゴリの有無 × ページング有無」の組み合わせごとに派生クエリがあり、条件を 1 つ足すと組み合わせが倍になる
- `ResourceFilterForm.tsx` の `defaultFrom?.replace("T", "T")` は無意味な置換（本課題の対象外）

## Patterns and Anti-patterns
- **Good Patterns**: Controller は薄く Service に業務ルールを集約、DTO と Zod スキーマの同一フィールド構成、テスト命名規約 `methodName_condition_expectedBehavior`
- **Anti-patterns**: 上記の派生クエリの組み合わせ爆発（`ResourceRepository`）
