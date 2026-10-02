# Code Quality Assessment

## Test Coverage

- **Overall**: Good（主要ドメインに単体・結合テストが揃っている）
- **Unit Tests**: `ResourceServiceTest`（Mockito、`@Nested` で `Overlaps`/`List_`/`Get`/`Availability` に分割、命名規約 `methodName_condition_expectedBehavior` を遵守（ADR-018））
- **Integration Tests**: `ResourceControllerTest`（MockMvc + H2、`@WithMockMember`/`@WithMockAdmin` でロール切替してシードデータを検証）

## Code Quality Indicators

- **Linting**: Configured（backend: Checkstyle 13.4.2 + Spotless、`isIgnoreFailures=false` のため CI で強制。frontend: oxlint + oxfmt）
- **Code Style**: Consistent（4層アーキテクチャが厳守されており、ドメインごとに Controller/Service/Repository/Entity の配置が揃っている）
- **Documentation**: Good（`docs-next/docs/spec/` に API・ER・要件が整備され、本タスクのエンハンス課題シートも要件・受入条件を明記）

## Technical Debt

- `resources.name` / `resources.description` への検索用インデックスが未定義（`V001__create_initial_schema.sql`）。キーワード検索導入時にパフォーマンス上の考慮点になりうる（ただし本タスクの受入条件には含まれていないため、NFR 判断事項として Construction フェーズで扱う）
- `ResourceService.listWithAvailabilityFilter` は全候補を DB から取得してから Java 側でフィルタ・手動ページネーションする設計であり、キーワード条件を追加する際はこの実行順序（DB 側絞り込み→候補取得→Java 側占有除外→手動ページング）との整合を取る必要がある

## Patterns and Anti-patterns

- **Good Patterns**:
  - Repository を Spring Data の派生クエリメソッド命名規約に統一している（`JpaSpecificationExecutor` 不使用で一貫）
  - テスト命名規約（ADR-018）がドメイン横断で統一されている
  - Server Actions による BFF 集約で、クライアントへの認証トークン露出を防いでいる
- **Anti-patterns / 留意点**:
  - `ResourceRepository` の派生メソッドは `category × isActive` の2軸で既に4メソッドあり、`keyword` 軸を素朴に派生メソッドで追加すると組み合わせ爆発を起こす（`docs/spec/enhancements/.../resource-list-filter.md` の AI 活用ポイントが「`Specification` vs `@Query` カスタム JPQL」の設計判断を学習者に委ねているのはこのため）
  - 一覧フィルタフォーム（`ResourceFilterForm.tsx`）は Zod・React Hook Form 不使用で、登録・更新フォームとはバリデーション方針が異なる（意図的な使い分けであり、本タスクでもこのパターンを踏襲するのが自然）
