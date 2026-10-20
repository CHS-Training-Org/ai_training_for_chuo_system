# Code Generation Summary — csv-export

Issue #29「CSV 帳票出力」。ADMIN が `/admin/reports` から予約一覧を CSV（UTF-8 BOM 付き）でダウンロードできる。計画: `plans/csv-export-code-generation-plan.md`（全 14 ステップ完了）。

## 変更・作成したファイル

**Modified**

| パス | 内容 |
|---|---|
| `backend/src/main/java/com/example/bookflow/domain/ReservationRepository.java` | `findForReport`（`Slice`・`JOIN FETCH`・`CAST` 付き任意パラメータ・`@Transactional(readOnly = true)`）を追加 |
| `backend/src/main/resources/application.yml` | `spring.mvc.async.request-timeout: 300s`（暫定） |
| `frontend/src/server/actions/reservations.ts` | 非公開の `toIsoWithSeconds` を削除し、`@/lib/datetime` から import（挙動は同じ） |
| `frontend/src/components/layout/nav-items.ts` | `ADMIN_ITEMS` に「帳票出力」を追加 |
| `frontend/tests/unit/layout/nav-items.test.ts` | `/admin/reports` を ADMIN のみ表示とする検証を追加 |

**Created**

| パス | 内容 |
|---|---|
| `backend/.../application/ReservationCsvWriter.java` | BOM・ヘッダ・行の書き出し。`toCell`（数式注入 → RFC 4180）・`formatDateTime`・`statusLabel`（5 値） |
| `backend/.../application/ReservationReportService.java` | `validate`、全ステータスへの正規化、500 件ページのループ、完了 INFO / 未完了 WARN の構造化ログ |
| `backend/.../presentation/ReportController.java` | `GET /api/reports/reservations/csv`。`@PreAuthorize("hasRole('ADMIN')")`、書き出し前の検証、`Cache-Control: no-store` |
| `backend/.../application/ReservationCsvWriterTest.java` | 26 件 |
| `backend/.../application/ReservationReportServiceTest.java` | 16 件 |
| `backend/.../presentation/ReportControllerTest.java` | 21 件（H2・結合） |
| `frontend/src/lib/datetime.ts` | `toIsoWithSeconds`（抽出） |
| `frontend/src/app/api/reports/reservations/csv/route.ts` | JWT を付与した BE へのストリーミング中継。失敗時は `/admin/reports?error=<code>` へ 303 |
| `frontend/src/app/(authenticated)/admin/reports/page.tsx` | 帳票出力ページ（GET フォーム・許可リスト方式のエラー表示） |
| `frontend/tests/unit/lib/datetime.test.ts` | 3 件 |
| `frontend/tests/unit/app/reports-csv-route.test.ts` | Route Handler（MSW） |
| `frontend/tests/unit/app/admin-reports-page.test.tsx` | ページの描画 |

依存ライブラリ・Flyway・インフラの変更はない（`build.gradle.kts` / `package.json` は未変更）。重複ファイル（`*_modified` 等）はない。

## 実行した検証（生成中の確認。正式な検証は Build and Test）

| 項目 | 結果 |
|---|---|
| BE `./gradlew test`（既存を含む全体） | BUILD SUCCESSFUL（197 件 pass） |
| BE `spotlessCheck` / `checkstyleMain` / `checkstyleTest` | 成功。警告は既存と同種のみ（テスト名のアンダースコアは ADR-018 の命名規約による既存の警告） |
| FE `pnpm test` | 113 件 pass（13 ファイル） |
| FE `pnpm lint` / `pnpm format:check` / `tsc --noEmit` | 問題なし |

## 設計からの逸脱・確定事項

1. **`CAST` の方式**: 計画の第一候補どおり `CAST(:from AS LocalDateTime) IS NULL OR r.startAt >= :from` で確定した。**H2 では通った**（自動テスト 21 件）。PostgreSQL での動作は未確認で、番兵値方式への切り替えは必要になった場合のみ（V-01 で判定）。
2. **FE テストの方式**: Server Component のページは `await AdminReportsPage({ searchParams })` で得た要素を `render` する方式にした（既存に前例なし）。Route Handler は標準の `Request` / `Response` で呼び、BE を MSW でスタブした。
3. **Route Handler の引数型**: `NextRequest` ではなく標準の `Request` を受ける（`NextRequest` は `Request` を継承しており、テストしやすいため）。
4. **BOM の検証**: `Response.text()` は UTF-8 の BOM を取り除くため、中継テストはバイト列（`EF BB BF`）で比較した。
5. **設計上の追加**: `Cache-Control: no-store`（BE・FE 両方）。FE には `X-Content-Type-Options: nosniff` も付与した。

## Security Baseline の判定

| ルール | 判定 | 根拠 |
|---|---|---|
| SECURITY-05 入力検証 | **compliant** | `status` は列挙型への変換、`from` / `to` は `LocalDateTime` への変換（失敗は 400。`ReportControllerTest` の 3 ケース）。前後関係は `ReservationReportService.validate`（L50）。DB は `@Param` のパラメータ化クエリのみ（`ReservationRepository` L135〜143、文字列連結なし）。CSV 出力値は `ReservationCsvWriter.toCell`（L82）で無害化してから RFC 4180 のエスケープ（順序をテストで固定）。FE は `error` を許可リストでのみ表示（`admin-reports-page.test.tsx`。`<script>`・`constructor` を含む） |
| SECURITY-08 アクセス制御 | **compliant** | BE の `@PreAuthorize("hasRole('ADMIN')")`（`ReportController` L51）が本体。MEMBER / APPROVER は 403、未認証は 401（`ReportControllerTest`）。FE の `admin/layout.tsx`・ナビの ADMIN 限定表示は多層防御の一層 |
| SECURITY-15 例外処理 | **compliant** | 認可と `validate` は `StreamingResponseBody` の外で完了（`ReportController` L58）。書き出し前の 400 は JSON エラーで内部情報なし（既存 `GlobalExceptionHandler`）。書き出し中の失敗は `ReservationReportService` の `catch` / `finally`（L98〜101）で WARN を 1 行出して伝播（握りつぶさない）。トランザクションはページ単位で、途中で切れても DB 接続は残らない |
| SECURITY-03 ログ | **compliant** | 完了 INFO / 未完了 WARN の 1 行に `userId`・条件・件数・所要時間のみ。利用目的・氏名・例外メッセージ・スタックトレースを含まないことをテストで検証（`ReservationReportServiceTest` の `ExecutionLog`） |
| SECURITY-04 HTTP ヘッダ | **partial（既知のギャップ）** | CSV の応答には `nosniff` と `no-store` を付与した。アプリ全体の CSP / HSTS / `X-Frame-Options` は未設定で、別課題（NFR Requirements の決定 4） |
| SECURITY-11 設計原則 | **compliant** | 多層防御（FE ガード + BE 認可 + 入力検証）。濫用シナリオ（ADMIN 侵害による一括持ち出し）は設計成果物に記述済みで、実行ログが検知の材料になる。レート制限は ADMIN 限定のため N/A |
| SECURITY-01 / 02 / 06 / 07 / 09 / 10 / 12 / 13 / 14 | **N/A** | 新規のデータストア・インフラ・認証方式・依存・シークレットの追加がない（NFR-01） |

non-compliant は 0 件。

## 既知の制約・残余リスク

1. 書き出し開始後の失敗（DB エラー・切断・タイムアウト）では CSV が途中で切れる。利用者への通知はなく、WARN ログで追跡する。
2. オフセット方式のため、出力中の予約の変更で行の重複・欠落がまれに起きうる。
3. ADMIN アカウントの侵害による一括持ち出しは防止しない（件数上限は Out of Scope）。
4. 同時実行の制限がないため、多数の同時ダウンロードでスレッドが占有されうる（D-07）。
5. `request-timeout` の 5 分は暫定値。
6. `labels.ts` と `ReservationCsvWriter.statusLabel` は同一表記を 2 か所で持つ。BE 側は 5 値のラベルを単体テストで固定したが、FE との一致を機械的に突き合わせるテストはない（変更時は両方を直す）。

## Build and Test への申し送り

| # | 内容 |
|---|---|
| V-01 | **実 PostgreSQL** で `findForReport` を実行し、`from` / `to` / `status` の未指定・単独・全指定でエラーが出ないことを確認する（`CAST` の確定。H2 では再現しないため必須） |
| V-02 | **Excel で CSV を開く**。文字化けしないこと、`=HYPERLINK(...)` が実行されないこと、カンマ・改行を含む利用目的が崩れないことを確認し、手順と結果を記録する |
| V-03 | 数千件を出力し、完走することとメモリが増え続けないことを手元で確認する（目安） |
| V-04 | `request-timeout` の既定値での挙動と、`300s` 設定後の挙動を確認して記録する |
| V-05 | 自動テスト（H2）の対象外（PostgreSQL 固有の挙動・Excel での見え方）を手順書に明記する |
| 追加 | ブラウザで `/admin/reports` を開き、実ダウンロード・各エラー（期間の前後逆転、未ログイン）での警告表示を確認する（ローカルのサインインは `dev-auth` の「開発専用ロール別ログインボタン」を使う） |
| 追加 | 画面遷移図（drawio）の描画を VSCode の drawio 拡張で目視確認する |
