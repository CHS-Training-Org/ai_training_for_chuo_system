# Code Generation Plan — csv-export

このファイルが Code Generation の唯一の正（single source of truth）である。Part 2 では、ここに書いたステップだけを上から順に実行し、完了したステップを直ちに `[x]` にする。

## ユニットコンテキスト

- **対象**: Issue #29「CSV 帳票出力」。ADMIN が予約一覧を CSV（UTF-8 BOM 付き）でダウンロードできるようにする。
- **ストーリー**: User Stories は SKIP（単一ペルソナ ADMIN）。トレーサビリティは要件 ID（FR-01〜18 / NFR-01〜07）と、仕様書の UC-09（CSV-01〜09）で取る。
- **依存**: 単一ユニット。Spec Integration は完了済み（`docs-next/docs/spec/` に UC-09・API・画面を反映済み）。コードは仕様に合わせる。
- **契約**: `GET /api/reports/reservations/csv`（`status` 複数可 / `from` / `to`、すべて任意）。仕様は `api-spec.md` §帳票。
- **所有エンティティ**: `Reservation`（読み取りのみ）。スキーマ変更・Flyway マイグレーションなし。
- **設計根拠**: `inception/application-design/`（C1〜C8）、`construction/csv-export/nfr-design/`（D-01〜D-07）、`nfr-requirements/`。
- **コードの置き場所**: ワークスペース直下（`backend/` と `frontend/`）。`Docs/spec/aidlc-docs/` にコードは置かない。
- **Brownfield**: 既存ファイルは直接修正し、複製（`*_new` 等）を作らない。Step 13 で重複がないことを確認する。
- **依存ライブラリ**: 追加しない（`build.gradle.kts` / `package.json` は変更しない）。

## 変更・作成するファイル

| 区分 | パス | 種別 |
|---|---|---|
| BE | `backend/src/main/java/com/example/bookflow/domain/ReservationRepository.java` | 変更（`findForReport` を追加） |
| BE | `backend/src/main/java/com/example/bookflow/application/ReservationCsvWriter.java` | 新規 |
| BE | `backend/src/main/java/com/example/bookflow/application/ReservationReportService.java` | 新規 |
| BE | `backend/src/main/java/com/example/bookflow/presentation/ReportController.java` | 新規 |
| BE | `backend/src/main/resources/application.yml` | 変更（`spring.mvc.async.request-timeout`） |
| BE テスト | `backend/src/test/java/com/example/bookflow/application/ReservationCsvWriterTest.java` | 新規 |
| BE テスト | `backend/src/test/java/com/example/bookflow/application/ReservationReportServiceTest.java` | 新規 |
| BE テスト | `backend/src/test/java/com/example/bookflow/presentation/ReportControllerTest.java` | 新規 |
| FE | `frontend/src/lib/datetime.ts` | 新規（`toIsoWithSeconds` を抽出） |
| FE | `frontend/src/server/actions/reservations.ts` | 変更（抽出した関数を import） |
| FE | `frontend/src/app/api/reports/reservations/csv/route.ts` | 新規（Route Handler） |
| FE | `frontend/src/app/(authenticated)/admin/reports/page.tsx` | 新規 |
| FE | `frontend/src/components/layout/nav-items.ts` | 変更（`ADMIN_ITEMS` に 1 件） |
| FE テスト | `frontend/tests/unit/lib/datetime.test.ts` | 新規 |
| FE テスト | `frontend/tests/unit/layout/nav-items.test.ts` | 変更 |
| FE テスト | `frontend/tests/unit/api/reports-csv-route.test.ts`（配置は既存の `tests/unit/` 構成に合わせて確定） | 新規 |
| FE テスト | `frontend/tests/unit/admin-reports-page.test.tsx`（同上） | 新規 |
| 記録 | `Docs/spec/aidlc-docs/construction/csv-export/code/summary.md` | 新規 |

## Step 1: Repository Layer Generation（C4 / FR-06,07,09,10 / NFR-03,04）

- [x] `ReservationRepository` に `findForReport(statuses, from, to, pageable): Slice<Reservation>` を追加する。`@Transactional(readOnly = true)`、`JOIN FETCH r.resource` / `r.requester`、`ORDER BY r.startAt ASC, r.id ASC`、`@Param` によるパラメータ化のみ（文字列連結なし）
- [x] 任意の `from` / `to` の null 判定は、H2 と PostgreSQL の両方で通る書き方にする。第一候補は `CAST(:from AS LocalDateTime) IS NULL` 形式。通らない場合は番兵値方式（Service が未指定側へ最小・最大値を渡す）に切り替え、理由を `summary.md` に残す
- [x] `Slice` を返すため `JOIN FETCH` と併用してもカウントクエリは発生しないことを確認する（`Page` は使わない）
- [x] Javadoc は既存のメソッドに合わせる

## Step 2: Business Logic Generation — CSV Writer（C3 / FR-02〜05,12,13 / NFR-01,05）

- [x] `ReservationCsvWriter`（Spring 非依存）を `application` 層に新規作成する。コンストラクタは `OutputStream` を受け取り、UTF-8 で書く
- [x] `writeBom()`（`EF BB BF`）、`writeHeader()`（7 列の日本語ヘッダ + CRLF）、`writeRows(List<Reservation>)`（1 件 = 1 行・CRLF）、`flush()` を実装する
- [x] パッケージプライベートの static 純粋関数を実装する: `toCell(String)`（数式注入の無害化 → RFC 4180 の順）、`formatDateTime(LocalDateTime)`（`yyyy-MM-dd HH:mm`）、`statusLabel(ReservationStatus)`（`switch` 式で 5 値を網羅。`DRAFT`=ドラフト）
- [x] 無害化の対象はリソース名・申請者名・利用目的のみ。予約 ID・日時・ラベルは対象外
- [x] ログは出さない（D-04。ログは Service に集約）

## Step 3: Business Logic Unit Testing — Writer（NFR-07 / M-03,M-04）

- [x] `ReservationCsvWriterTest`（DB・Spring なし）を ADR-018 の命名（`methodName_condition_expectedBehavior`）で作成する
- [x] `toCell`: 通常文字列、カンマ・改行（CR / LF）・`"` を含む値、`=` `+` `-` `@`・タブ・CR 始まり、**無害化と引用符の順序**（`=A,B` が `"'=A,B"` になる）、空文字列と null、日本語
- [x] `formatDateTime`: 秒が出ないこと、ゼロ埋め
- [x] `statusLabel`: 5 値すべて。FE の `RESERVATION_STATUS_LABELS` と同一表記であること（M-04）
- [x] `writeBom` / `writeHeader` / `writeRows`: BOM のバイト列、ヘッダ 7 列、CRLF、0 件でもヘッダのみが出る、複数行の順序

## Step 4: Business Logic Generation — Service（C2 / FR-08,11 / NFR-02 / D-01,02,04）

- [x] `ReservationReportService` を新規作成する（クラスに `@Transactional` を付けない）。`PAGE_SIZE = 500` を定数で持つ
- [x] `validate(from, to)`: 両方あり `from` >= `to` なら `ValidationException`。片方のみは許可
- [x] `writeReservationsCsv(userId, statuses, from, to, out)`: 冒頭で `validate` を再実行（fail closed）。`status` が null / 空なら `ReservationStatus` 全値に正規化。BOM → ヘッダ → ページごとに「`findForReport` → `writeRows` → `flush`」を `hasNext()` が false になるまで繰り返す。0 件でもヘッダのみで正常終了
- [x] 実行記録（D-04）: 読み出しループを `try / finally` で囲み、完了時に INFO `csv_export_completed`、未完了時に WARN `csv_export_aborted`（`failureType` = 例外クラスの単純名）を 1 行出す。`StructuredArguments.kv()` で `event` / `userId` / `statuses` / `from` / `to` / `rowCount` / `elapsedMs`（未完了は `failureType` も）。PII・例外メッセージ・スタックトレースは含めない。例外は握りつぶさず伝播させる
- [x] `userId` は引数で受け取る。ストリーミングスレッドで `SecurityContext` を参照しない

## Step 5: Business Logic Unit Testing — Service（NFR-07 / `logical-components.md` §5）

- [x] `ReservationReportServiceTest`（Mockito）を作成する
- [x] `validate`: `from` >= `to` で `ValidationException`、`from` = `to` も拒否、片方のみ・両方なし・正順は通る
- [x] ページ処理: 2 ページ以上（`hasNext()` が true → false）を全件書き出す、0 件でヘッダのみ、`status` 未指定が全 5 値に正規化されて Repository に渡る、ページ番号が 0 から増える
- [x] 実行記録: 完了時に INFO が 1 行で `event` / `userId` / `rowCount` 等が揃う。`OutputStream` の `IOException` や Repository の例外で WARN が 1 行出て例外が伝播する。ログに利用目的・申請者名が含まれない。ログの捕捉は既存のテスト手段を確認し、新しい依存は足さない（`ListAppender` は既存利用が見つからないため、Logback 標準の `ListAppender` を使う）

## Step 6: API Layer Generation（C1 / FR-01,14 / D-01,06）

- [x] `ReportController`（`/api/reports`）を新規作成する。`GET /reservations/csv`、`@PreAuthorize("hasRole('ADMIN')")`
- [x] 引数: `@RequestParam(required = false) List<ReservationStatus> status`、`from` / `to`（`LocalDateTime`、`ResourceController` と同じ受け方）、`@CurrentUser User`
- [x] 処理順: (1) `service.validate` を同期で呼ぶ → (2) ファイル名 `reservations_yyyyMMdd_HHmmss.csv`（サーバー現在時刻）を組み立てる → (3) `out -> service.writeReservationsCsv(user.getId(), ...)` の `StreamingResponseBody` を返す。検証は lambda の外で行う
- [x] ヘッダ: `Content-Type: text/csv; charset=UTF-8`、`Content-Disposition: attachment; filename="..."`、`Cache-Control: no-store`
- [x] `application.yml` に `spring.mvc.async.request-timeout: 300s` を明示する（D-05。暫定値。Build and Test の V-04 で確認）
- [x] 新規の DTO・例外・`ErrorCode` は作らない

## Step 7: API Layer Unit Testing（NFR-07）

- [x] `ReportControllerTest`（`BaseControllerTest` 継承、H2）を作成する。StreamingResponseBody は非同期のため、`asyncStarted` → `asyncDispatch` で本文を検証する
- [x] 認可: ADMIN で 200、MEMBER / APPROVER で 403、未認証で 401
- [x] ヘッダ: `Content-Type`、`Content-Disposition` のファイル名パターン、`Cache-Control: no-store`
- [x] 本文: BOM、ヘッダ行、シード予約のデータ行、0 件でヘッダのみ
- [x] 絞り込み: `status` 単一・複数、`from` のみ・`to` のみ・両方（`to` ちょうどは含まない境界）、条件の AND 組み合わせ
- [x] 400: `from` >= `to`、日時形式不正、`status` が不正な値（いずれも `VALIDATION_ERROR`）
- [x] 数式注入: 利用目的が `=HYPERLINK(...)` の予約が `'=HYPERLINK(...)` で出る
- [x] テストデータは既存の seed と衝突しないように追加し、`@AfterEach` で削除する（`ResourceControllerTest` の方式を踏襲）

## Step 8: Frontend Library Generation（C8 / NFR-06）

- [x] `frontend/src/lib/datetime.ts` を新規作成し、`toIsoWithSeconds`（16 桁なら `:00` を補う。それ以外は無変更）を `export` する
- [x] `frontend/src/server/actions/reservations.ts` の非公開関数を削除し、`@/lib/datetime` から import する（挙動は変えない。既存テストで担保）
- [x] `frontend/tests/unit/lib/datetime.test.ts`: 16 桁、19 桁（無変更）、空文字列

## Step 9: Frontend Route Handler Generation（C5 / FR-17 / D-06 / NFR-06）

- [x] `frontend/src/app/api/reports/reservations/csv/route.ts` に `GET` を実装する
- [x] `getAccessToken()` で JWT を取得する。無ければ `/admin/reports?error=UNAUTHORIZED` へ 303
- [x] クエリ `status`（複数）・`from`・`to` を BE に転送する。空文字は送らない。`from` / `to` は `toIsoWithSeconds` で秒を補う。BE の URL は既存の `BACKEND_URL` の扱いに合わせる
- [x] BE が 200 のとき `res.body` をそのまま返す（ストリーミング中継）。`Content-Type` / `Content-Disposition` を引き継ぎ、`Cache-Control: no-store` と `X-Content-Type-Options: nosniff` を付ける
- [x] BE が 400 / 401 / 403 / 5xx のときは `/admin/reports?error=<code>` へ 303。`code` は BE の `{ code }`、JSON を読めなければ `HTTP_<status>`。接続失敗は `INTERNAL_SERVER_ERROR`
- [x] ADR-004 の例外である理由（Server Action はファイルのストリーミング配信に向かない）をファイル先頭のコメントに 1〜2 行で書く

## Step 10: Frontend Page & Navigation Generation（C6,C7 / FR-15,16）

- [x] `nav-items.ts` の `ADMIN_ITEMS` に `{ label: "帳票出力", href: "/admin/reports" }` を追加する
- [x] `/admin/reports` の `page.tsx`（Server Component）を作成する。`method="GET"` の通常フォーム（`action` は上記 Route Handler）。期間（`datetime-local` 2 つ、`label` を関連付け）、ステータス（チェックボックス。表示名は `RESERVATION_STATUS_LABELS`）、「CSV ダウンロード」ボタン。「終了日時は含みません（開始日時が期間内の予約を出力）」を併記する
- [x] `searchParams.error` は許可リスト（`VALIDATION_ERROR` / `UNAUTHORIZED` / `FORBIDDEN` / `INTERNAL_SERVER_ERROR`）にある値だけを日本語の警告に変換し、それ以外は汎用メッセージにする。任意の文字列を画面に出さない
- [x] 自動化向けに `data-testid` を付ける（例: `reports-form`、`reports-from-input`、`reports-to-input`、`reports-status-<値>`、`reports-download-button`、`reports-error-alert`）
- [x] ADMIN ガードは既存の `admin/layout.tsx` を使う（新規実装しない）。既存の UI コンポーネント（shadcn/ui）とスタイルの慣習に合わせる

## Step 11: Frontend Unit Testing（NFR-07 / U-02,U-03）

- [x] `nav-items.test.ts`: ADMIN にのみ「帳票出力」が表示され、MEMBER / APPROVER / null には出ない
- [x] Route Handler のテスト（Vitest + MSW）: 成功時の中継（ヘッダ引き継ぎ、`nosniff` / `no-store`、本文のストリーミング）、400 / 401 / 403 / 5xx の 303 リダイレクト先、JWT なしの `UNAUTHORIZED`、空欄パラメータを BE に送らない、`from` / `to` の秒補完、`status` の複数転送
- [x] ページのテスト: ラベルと入力欄の関連付け、5 ステータスのチェックボックス、「終了日時は含みません」の説明、許可リストのコードだけが定型メッセージになり、許可外の値（`<script>` 等）は画面に出ない
- [x] 配置と実行方法は既存の `tests/unit/` の構成と Vitest 設定に合わせる。Server Component のテスト方式が既存にない場合は、描画関数の単体検証にとどめ、方式を `summary.md` に記録する

## Step 12: Security Baseline の確認記録（blocking: SECURITY-05 / 08 / 15）

- [x] 生成したコードに対して、SECURITY-05（入力検証・パラメータ化クエリ・出力の無害化）、SECURITY-08（BE の `@PreAuthorize` が本体）、SECURITY-15（書き出し前の事前検証・fail closed・エラー本文に内部情報なし）の compliant / non-compliant を判定し、根拠のファイルと行を `summary.md` に書く
- [x] SECURITY-03 / 04 / 11 の確認結果と、N/A とした項目（01 / 02 / 06 / 07 / 09 / 10 / 12 / 13 / 14）の理由を 1 行ずつ記録する
- [x] non-compliant があれば、完了メッセージの前に修正するか、残余リスクとして明記してユーザーに提示する

## Step 13: Documentation Generation

- [x] `Docs/spec/aidlc-docs/construction/csv-export/code/summary.md` に、変更・作成ファイル一覧（Modified / Created を区別）、設計からの逸脱（あれば理由）、`CAST` 方式の確定内容、Step 12 の判定、既知の制約、**Build and Test への申し送り**（V-01〜V-05）を書く
- [x] 重複ファイルの確認（`*_modified` / `*_new` / コピーが存在しない）
- [x] 仕様書との差分確認: 実装が `api-spec.md` §帳票・`screen-spec.md` `/admin/reports`・`requirements.md` UC-09 と一致していること。差異が出た場合は、コードを仕様に合わせるか、仕様を先に直す

## Step 14: Deployment Artifacts Generation

- [x] 該当なし（インフラ・デプロイ構成・Flyway・依存の変更なし。`logical-components.md` §3 で確認済み）

## 検証の扱い

- 本ステージでは、テストコードを生成するところまでを行う。自動テスト（H2）・lint・format の実行と実 PostgreSQL / Excel での手動確認（V-01〜V-05）は、**Build and Test** で行う。
- ただし生成中に文法・型の誤りを早く見つけるため、各レイヤーの完了時にコンパイル（`./gradlew compileJava compileTestJava`、`pnpm exec tsc --noEmit` 相当）は実行してよい。テストの合否判定は Build and Test に持ち越す。

## 要件との対応

| 要件 | ステップ |
|---|---|
| FR-01 / FR-14 / D-06 | 6, 7 |
| FR-02〜05 / FR-12 / FR-13 | 2, 3 |
| FR-06 / FR-07 / FR-09 / FR-10 | 1, 7 |
| FR-08 / FR-11 / NFR-02 | 4, 5, 6, 7 |
| FR-15 / FR-16 | 10, 11 |
| FR-17 / NFR-06 | 9, 11 |
| FR-18 | Spec Integration で完了済み（Step 13 で差分確認） |
| NFR-01 / M-01 | 全体（依存を追加しない） |
| NFR-03 / NFR-04 | 1（実 PostgreSQL での検証は Build and Test） |
| NFR-05 | 2, 4, 6 |
| NFR-07 | 3, 5, 7, 8, 11 |
| D-04 実行記録 | 4, 5 |
| D-05 タイムアウト | 6 |
| Security Baseline | 12 |
