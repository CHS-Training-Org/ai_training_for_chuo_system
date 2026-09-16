# Code Quality Assessment

## Test Coverage

- **Overall**: Good（バックエンド）/ Fair（フロントエンド）
- **Unit Tests**:
  - バックエンド：Service 層3クラス（`ResourceServiceTest`・`ReservationServiceTest`・`ApprovalServiceTest`）が Mockito で検証されている。
  - フロントエンド：Server Actions の6ファイルが Vitest + MSW で検証されている。コンポーネント単体のテストは `pagination-nav.test.ts` など限定的。
- **Integration Tests**: Controller 層6クラスが MockMvc（`BaseControllerTest`・ロール別モックアノテーション）で検証されている。
- **E2E Tests**: Playwright は雛形（`example.spec.ts`）のみ。実機能の E2E は未整備であり、別のエンハンス課題（既存機能の E2E テスト追加）で扱われる。

## Code Quality Indicators

- **Linting**: 設定済み。バックエンドは Checkstyle、フロントエンドは oxlint。
- **Code Style**: 一貫している。Spotless（Java）と oxfmt（TypeScript）でフォーマットが強制される。
- **Documentation**: Good。バックエンドは Javadoc が仕様書のセクションを参照する形で書かれ、フロントエンドも主要コンポーネントに JSDoc がある。仕様書は `docs-next/docs/spec/` に集約されている。

## Technical Debt

- **`ResourceRepository` の派生クエリ組み合わせ爆発**：「ページネーション有無」×「カテゴリ有無」×「ADMIN 判定」で6メソッドを持つ。絞り込み条件が増えるたびにメソッド数が倍増する。本課題でキーワード条件を加えると12メソッドになりうる。
- **`listWithAvailabilityFilter` の手動ページネーション**：`from` / `to` 指定時に候補を全件メモリに載せてから Java 側で絞り込む。リソース件数が増えると劣化する。学習用リポジトリの規模では許容されている既知の割り切りである。
- **API 契約の二重管理**：バックエンドの DTO とフロントエンドの Zod スキーマが手書きで同期されている。ずれを機械的に検出する手段が無い。別のエンハンス課題（OpenAPI クライアント自動生成）で扱われる。
- **E2E テストの不足**：回帰検知がユニットテストと Controller テストに依存している。

## Patterns and Anti-patterns

### Good Patterns

- 4レイヤーアーキテクチャの厳守。業務ルールが application 層に集約されている。
- 認可の二重化。フロントエンドの表示制御に加え、バックエンドで `@PreAuthorize` とロール判定を行う。
- URL searchParams によるフィルタ状態管理。クライアント状態を増やさずに共有・再読込に耐える。
- Zod による応答検証。バックエンドの契約違反を BFF 層で早期に検出する。
- テスト命名規約（ADR-018 の `methodName_condition_expectedBehavior`）の徹底。

### Anti-patterns

- **条件分岐ごとのリポジトリメソッド増殖**（`ResourceRepository`）。動的条件を静的なメソッド名で表現しているため拡張に弱い。
- **`Mockito` strict stubs と分岐の多い Service の組み合わせ**（`ResourceServiceTest`）。一覧の内部経路を変更すると、使われなくなったスタブが `UnnecessaryStubbingException` を引き起こす。実装変更時にテスト側の追随が必須になる。
