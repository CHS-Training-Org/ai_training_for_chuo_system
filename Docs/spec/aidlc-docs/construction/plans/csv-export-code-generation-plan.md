# Code Generation Plan — Unit: csv-export（Issue #29）

このプランが Code Generation の唯一の実行根拠（single source of truth）である。各ステップ完了時にチェックボックスを `[x]` にする。

## ユニットコンテキスト

- **対象要件**: RPT-01〜05（`docs-next/docs/spec/enhancements/intermediate/csv-export.md`）
- **参照設計**: `Docs/spec/aidlc-docs/inception/application-design/`（Application Design）、`Docs/spec/aidlc-docs/construction/csv-export/functional-design/`（Functional Design）
- **依存**: 他ユニットへの依存なし（単一ユニット）。既存の `Reservation`/`Resource`/`User` エンティティを読み取り専用で参照
- **本ユニットが所有するデータベースエンティティ**: なし（新規テーブル・カラム追加なし）
- **既存コードとの境界**: `ReservationController`/`ReservationService`/`ResourceController` 等の既存ファイルは変更しない（読み取り専用の新規並行コンポーネントを追加するのみ）。`ReservationRepository`・`api-client.ts`・`/reservations` ページのみ既存ファイルを直接編集する。

## Application Code の配置（ワークスペースルート基準）

- バックエンド: `backend/src/main/java/com/example/bookflow/`
- バックエンドテスト: `backend/src/test/java/com/example/bookflow/`
- フロントエンド: `frontend/src/`
- フロントエンドテスト: `frontend/tests/unit/`

---

## Step 1: Repository 層拡張（Business Logic の前提）

- [ ] `backend/src/main/java/com/example/bookflow/domain/ReservationRepository.java` を編集し、`findByPeriodFetch(from, to, pageable)` と `findByPeriodAndStatusInFetch(from, to, statuses, pageable)` を追加する（`component-methods.md`・`business-rules.md` の期間フィルタ意味論・`ORDER BY r.startAt ASC` に従う）
- **対応要件**: RPT-03

## Step 2: Business Logic 生成（ReportService）

- [ ] `backend/src/main/java/com/example/bookflow/application/ReportService.java` を新規作成する
  - `generateReservationsCsv(Collection<ReservationStatus>, LocalDateTime, LocalDateTime): byte[]`
  - `private String buildCsv(List<Reservation>)`（列マッピング・エスケープ・CRLF、`business-rules.md` 準拠）
  - `private static final Map<ReservationStatus, String> STATUS_LABELS`（日本語ラベル）
  - UTF-8 BOM 付与処理
- **対応要件**: RPT-01, RPT-02, RPT-03

## Step 3: Business Logic ユニットテスト

- [ ] `backend/src/test/java/com/example/bookflow/application/ReportServiceTest.java` を新規作成する（Mockito、`ReservationServiceTest` と同じ規約）
  - CSV ヘッダ行・データ行の列順、日本語ステータスラベル、日時フォーマットの検証
  - カンマ・改行・ダブルクォートを含む値のエスケープ検証
  - 期間指定あり/なし・ステータス指定あり/なしの4分岐それぞれで正しいリポジトリメソッドが呼ばれることの検証
  - 対象0件時にヘッダ行のみが返ることの検証
  - UTF-8 BOM が先頭に付与されることの検証
- **対応要件**: 受入条件「バックエンドに CSV 生成ロジックのユニットテストを追加する」

## Step 4: API 層生成（ReportController）

- [ ] `backend/src/main/java/com/example/bookflow/presentation/ReportController.java` を新規作成する
  - `GET /api/reports/reservations/csv`、`@PreAuthorize("hasRole('ADMIN')")`
  - `from`/`to` 同時指定チェック（`ResourceController` と同じ `ValidationException` パターン）
  - `Content-Type: text/csv; charset=UTF-8`・`Content-Disposition: attachment; filename="reservations.csv"` ヘッダ
- **対応要件**: RPT-01, RPT-03, RPT-04

## Step 5: API 層ユニットテスト

- [ ] `backend/src/test/java/com/example/bookflow/presentation/ReportControllerTest.java` を新規作成する（`BaseControllerTest` 継承、`ResourceControllerTest` と同じ規約：`JdbcTemplate` でシードデータ投入）
  - `@WithMockAdmin` で 200・CSV ボディ・ヘッダを検証
  - `@WithMockMember`・`@WithMockApprover` で 403 を検証
  - `from`/`to` 片方のみ指定で 400（`VALIDATION_ERROR`）を検証
  - 期間・ステータスの絞り込みが反映されることを検証
- **対応要件**: RPT-04、受入条件「MEMBER / APPROVER ロールでアクセスすると 403 が返る」「期間・ステータスを絞り込んで対象データを限定した CSV をダウンロードできる」

## Step 6: Backend Summary

- [ ] Step 1〜5 の変更点を `Docs/spec/aidlc-docs/construction/csv-export/code/backend-summary.md` に記録する（変更/新規ファイル一覧、テスト観点の要約）

## Step 7: フロントエンド — api-client.ts 拡張

- [ ] `frontend/src/lib/api-client.ts` を編集し、`getRaw(path, params): Promise<Response>` を追加する（JSON パース・`assertOk` を行わない生レスポンス、`component-methods.md` 準拠）

## Step 8: フロントエンド — Route Handler 生成

- [ ] `frontend/src/app/api/reports/reservations/csv/route.ts` を新規作成する
  - `getSession()` によるセッション検証（未認証時は 401 相当のレスポンス）
  - `createApiClient(getAccessToken).getRaw(...)` でバックエンド呼び出し
  - レスポンスの `status`・`Content-Type`・`Content-Disposition`・ボディを透過転送

## Step 9: フロントエンド — CsvExportControls コンポーネント生成

- [ ] `frontend/src/app/(authenticated)/reservations/CsvExportControls.tsx` を新規作成する（`frontend-components.md` 準拠：`useState` による `from`/`to` 管理、両方入力/両方空のみボタン活性化、`downloadHref` 導出）
  - Automation-friendly: 開始日時入力に `data-testid="csv-export-from-input"`、終了日時入力に `data-testid="csv-export-to-input"`、ダウンロードリンクに `data-testid="csv-export-download-link"` を付与する

## Step 10: フロントエンド — page.tsx 統合

- [ ] `frontend/src/app/(authenticated)/reservations/page.tsx` を編集し、`isAdmin` ブロックに `CsvExportControls`（`searchParams` の `from`/`to`・現在の `status` を props で渡す）を追加する

## Step 11: フロントエンド ユニットテスト

- [ ] `frontend/tests/unit/app/reservations/CsvExportControls.test.tsx` を新規作成する（Vitest + Testing Library、リポジトリ初の component test）
  - 両方空の初期状態でダウンロードリンクが活性であること（全期間扱い）
  - 片方のみ入力時にボタンが `disabled` になること
  - 両方入力時に `downloadHref` に `from`/`to`/`status` が反映されること
- **対応要件**: 受入条件の UI からの実証可能性（期間絞り込み UI）

## Step 12: Frontend Summary

- [ ] Step 7〜11 の変更点を `Docs/spec/aidlc-docs/construction/csv-export/code/frontend-summary.md` に記録する

## Step 13: Database Migration Scripts — 対象外（スキップ）

- [ ] スキップ理由を明記する: 新規テーブル・カラムなし（既存 `reservations`/`resources`/`users` を読み取るのみ、Application Design/Requirements Analysis で確定済み）

## Step 14: Documentation Generation

- [ ] Step 6・Step 12 のサマリを本ステップで統合済みとし、追加のドキュメント生成は行わない（`docs-next/docs/spec/` への反映は Build and Test 完了後の `/update-spec` に委譲。Requirements Analysis で発見した UC-07 誤記・Application Design で発見した認証方式修正の反映もそこで行う）

## Step 15: Deployment Artifacts Generation — 対象外（スキップ）

- [ ] スキップ理由を明記する: インフラ変更・デプロイ構成変更なし（Application Design の Infrastructure Design 判断を踏襲）

---

## ストーリートレーサビリティ

Units Generation・User Stories は SKIP のため、本ユニットは要件（RPT-01〜05）を直接のトレーサビリティ単位とする。各ステップの「対応要件」を参照。
