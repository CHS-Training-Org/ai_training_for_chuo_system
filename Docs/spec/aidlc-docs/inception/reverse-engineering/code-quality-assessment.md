# Code Quality Assessment

## Test Coverage

- **Overall**: Good（backend）／Fair（frontend、E2Eが薄い）
- **Unit Tests**:
  - backend: `application/*ServiceTest.java`（`@Mock` 使用、Reservation 554行・Approval 469行・Resource 372行）が主要業務ロジックを網羅。`DepartmentService`・`UserService` には専用単体テストがない。
  - frontend: `tests/unit/server/actions/*.test.ts` が全 Server Action ドメイン（auth/dev-auth/reservations/resources/approvals/users）をMSWスタブで網羅。純関数（`navItemsForRole`, `buildHref`）にも専用テストあり。
- **Integration Tests**:
  - backend: `presentation/*ControllerTest.java` は `@WebMvcTest` ではなく `@SpringBootTest` + `@ActiveProfiles("test")`（H2実DB・フルコンテキスト）で構成されており、実質的に Service・Repository・JPQL・スキーマ生成まで通しで検証する統合テストになっている。
  - frontend: `tests/e2e/example.spec.ts` はトップページ表示確認1件のみ。予約申請・承認・キャンセル等の主要フローのE2Eは未整備。

## Code Quality Indicators

- **Linting**:
  - frontend: oxlint 設定あり（`oxlint.json`、`no-unused-vars: error`, `no-console: warn`）。
  - backend: Checkstyle 設定あり（`config/checkstyle/checkstyle.xml`、Google Java Styleベース、`isIgnoreFailures = false` でビルド失敗扱い）。
- **Code Style**: Consistent（backend は Spotless + googleJavaFormat で自動整形、frontend は oxfmt で自動整形）。
- **Documentation**: Good（backend の Service/Controller は要件コード（例: APRV-04）参照付き Javadoc が充実。frontend はコード内コメントで設計判断の理由が随所に明記されている）。

## Technical Debt

- **backend: application 層が presentation 層の DTO に直接依存**（`ReservationService` → `ReservationResponse` 等）。CLAUDE.md が定める4層アーキテクチャの一方向依存という理想形と実態が乖離している。詳細は `architecture.md` の「アーキテクチャ上の注記」を参照。
- **backend: `infrastructure` に永続化実装が存在しない**。JPA エンティティ・Repositoryはすべて `domain` に配置され、パッケージ名から連想される責務と実態が異なる。
- **backend: 同一リクエスト内でのユーザー解決クエリの重複実行**（`RegisteredUserInterceptor` と `CurrentUserArgumentResolver` がともに `findByCognitoSub` を呼ぶ）。
- **backend: `ReservationService`/`ApprovalService`/`ResourceService` の重複判定・空き照会がアプリケーション側フィルタ**（時間帯条件をSQLに持たせず全件取得後にJavaでフィルタ）。データ量が増えた場合にスケールしない設計（コード内コメントで「件数が少ない前提」と明記）。
- **backend: `ResourceService` 内に未使用の疑いがある package-private メソッド**（`static boolean overlaps(Reservation, LocalDateTime, LocalDateTime)` オーバーロード）。
- **backend: Javadoc とコードの不整合**（`ReservationService` に「【カテゴリ6 TODO】承認ステップ生成」という記述が残るが実装は既に対応済み）。
- **backend: 本番/テストでスキーマ管理方式が異なる**（本番: `ddl-auto: validate` + Flyway、テスト: `ddl-auto: create-drop` + Flyway無効）。Flyway マイグレーション（`V001`）の変更漏れをテストで検知できないリスクがある。
- **frontend: `zustand` が依存関係にあるがコード内で未使用**（CLAUDE.md は「状態管理: Zustand（クライアント最小限）」と定めるが、実装は現状 Server Components + Server Actions のみで完結している）。
- **frontend: `next-themes` も依存関係にあるが未使用**（`globals.css` のコメントに「ThemeProvider未導入」と明記）。
- **frontend: `api-client.ts` の `getAccessToken` に型安全でない `as any` キャストとTODOコメントが残っている**。
- **frontend: E2Eテストカバレッジが薄い**（選択課題「既存機能のE2Eテスト追加」として別課題化されている）。

## Patterns and Anti-patterns

- **Good Patterns**:
  - backend: ファクトリメソッド＋状態遷移メソッドによるドメインモデルのカプセル化（setterなし）。
  - backend: 悲観ロック（`findByIdForUpdate`）による並行予約操作のレース防止。
  - backend: 業務例外階層 + `@RestControllerAdvice` による一貫したエラーハンドリング。
  - frontend: Server Actions のユニットテストが MSW で充実しており、各ドメインを網羅している。
  - frontend: 純関数分離（`navItemsForRole`, `buildHref`）によるテスト容易性の確保。
  - frontend: 開発専用認証バイパス（`session.ts`）に本番混入を防ぐ明示的なセキュリティ回帰テストがある。
- **Anti-patterns**:
  - backend: レイヤー間の循環的依存（`application ⇄ presentation`）。
  - backend: 同一クエリの重複実行（インターセプター + ArgumentResolver）。
  - backend: アプリケーション側フィルタによるスケーラビリティの懸念（重複判定・空き照会）。
  - frontend: 未使用依存関係（`zustand`, `next-themes`）の放置。

## 今回のエンハンス課題（Issue #23）への影響

`GET /api/resources` へのキーワード検索追加は、`ResourceService`/`ResourceRepository` の既存パターン（Repository パターン、手書きDTOマッピング）に沿って実装すれば上記の技術的負債を悪化させない。ただし「アプリケーション側フィルタ」の既存パターンに倣うと `name`/`description` の部分一致判定も全件取得後のJavaフィルタになりかねないため、`ILIKE` を使った DB 側の絞り込み（`@Query` または `Specification`）を選ぶことが望ましい（エンハンス要求シートの「AI活用ポイント」にも同様の設計判断が明記されている）。
