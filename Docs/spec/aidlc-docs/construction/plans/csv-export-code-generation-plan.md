# Code Generation Plan: csv-export（Issue #29）

この計画は Code Generation の唯一の正である。Part 2 は本計画の番号順に実行し、完了した手順はその場でチェックボックスを `[x]` にする。計画にない変更はしない。

## ユニットの文脈

- **ユニット**: `csv-export`（単一。Units Generation はスキップ済み）
- **種別**: Brownfield（既存ファイルは直接変更する。`*_modified` のような複製は作らない）
- **ワークスペースルート**: `/workspace`。アプリケーションコードは `backend/` と `frontend/` に置き、`Docs/spec/aidlc-docs/` には置かない
- **入力**: `application-design/` 配下 5 ファイル、`user-stories/stories.md`（受入条件 18 件）、`requirements.md`（RPT-01〜05、仮定 A1〜A3）、更新済みの `api-spec.md` §帳票出力 と `screen-spec.md` §`/reservations`（CSV ダウンロードダイアログ）
- **依存**: FE は BE の API 契約（`GET /api/reports/reservations/csv`）に依存するため、BE を先に完成させる。DB スキーマ・Flyway・`build.gradle.kts`（依存追加）は変更しない
- **対象外**: PDF 帳票、申請者での絞り込み、集計レポート、CSV インジェクション対策（D7）、件数上限・ストリーミング（Q2）、OpenAPI クライアント自動生成、E2E テスト（後続課題）、`.claude/` 配下の変更（したがって `agent-config.md` の同期も不要）

## ストーリーとの対応（実装順）

`stories.md` の「US-1 を土台に US-2〜4 を足す」方針に従い、BE は US-1（エンドポイントと CSV 生成）を先に作り、同じ Controller・Service に US-2〜4 の条件を足していく。

| ストーリー | 要件 | 主な手順 |
|---|---|---|
| US-1 全件を CSV でダウンロード | RPT-01, 02, 05 | Step 3〜10, 12〜15 |
| US-2 期間で絞り込む | RPT-03（期間） | Step 2, 4, 6, 9, 14 |
| US-3 ステータスで絞り込む | RPT-03（ステータス） | Step 2, 4, 6, 9, 14 |
| US-4 ADMIN 以外は使えない | RPT-04, 05 | Step 6, 9, 16 |

## 設計との差分・承認時に確認してほしい点

1. **Repository 層テストの方式**: 前ワークフロー（#23）と同じく、`@DataJpaTest` ではなく `@SpringBootTest` + `@ActiveProfiles("test")` + `@Transactional`（H2）を使う（`ResourceRepositoryTest` の前例。Spring Boot 4 で `@DataJpaTest` が別モジュールに分離され、依存を足さないため）。Application Design の「テストの方向性」に「実クエリのテスト（H2）」とあるのと矛盾しない。
2. **共有 DB を前提にした検証**: テスト用 H2 は同じ JVM のほかのテストクラスと共有される。`reservations` を全件取得するテストは、ほかのテストの残存データを含みうる。そのため件数の完全一致を使わず、自分が投入した行の ID（または一意なトークンを含む目的・名称）を基準に検証する。API 結合テスト（Step 9）は、応答の CSV から自分の投入行だけを取り出して検証する。
3. **ユーティリティクラスの規約**: `ReservationCsvWriter` と `ReservationSpecifications` は `public final class` + private コンストラクタ（`ResourceSpecifications` の前例。`checkstyle.xml` に `FinalClass` / `HideUtilityClassConstructor` は含まれない）。
4. **`from` / `to` の型変換**: `ResourceController` が `LocalDateTime` の `@RequestParam` を受ける様式（`@DateTimeFormat` の有無を含む）に合わせる。オフセット付きが `MethodArgumentTypeMismatchException`（`GlobalExceptionHandler` で 400 `VALIDATION_ERROR`）になることを Step 9 のテストで確認する。期待どおりにならない場合は、実装を進める前に報告して方針を相談する。
5. **`DRAFT` の表示名**: `ReservationCsvWriter` の対応表には 5 値すべて（`DRAFT` ドラフト / `PENDING` 承認待ち / `APPROVED` 承認済み / `REJECTED` 却下 / `CANCELLED` キャンセル済み）を持つ（`api-spec.md` §帳票出力 の表のとおり。画面のダイアログの選択肢は 4 種）。
6. **FE のコンポーネントテスト**: `CsvExportDialog` は Radix の `Dialog`（Portal）を使う。jsdom で動かない場合は `tests/unit/setup.ts` への最小限の polyfill 追加が必要になる。必要になった場合は、追加前に理由を報告する（#23 の Step 14 と同じ扱い）。
7. **`page.tsx`（Server Component）のテスト**: `isAdmin` で `CsvExportDialog` を出し分ける処理は、async Server Component のため Vitest での直接描画は行わない。AC-4.1 は「`page.tsx` の変更が 1 か所の条件分岐だけであること」のコード確認と、Part 2 の動作確認（開発専用ロール別ログインで ADMIN / MEMBER / APPROVER の表示を確認）で担保する。この確認は Part 2 の完了報告に結果を記載する。

## 実装手順

### A. Backend（domain → application → presentation の順。FE が依存する API 契約を先に確定する）

- [x] **Step 1: 影響範囲の確認（読み取りのみ）**
  - `ReservationRepository` の継承変更が既存の呼び出し元に影響しないことを確認する（メソッドの追加のみ）
  - `ResourceController` の `from` / `to` の受け取り方、`ValidationException` の使い方、`GlobalExceptionHandler` の 400 / 403 の応答形式を確認する
  - `@PreAuthorize` が `ADMIN` 以外で 403 `FORBIDDEN` になる経路（`RestAccessDeniedHandler`）を確認する
  - 想定外の事実があれば、実装に入る前に報告して計画を修正する

- [x] **Step 2: `ReservationSpecifications` を新規作成**（domain、US-2・US-3）
  - ファイル: `backend/src/main/java/com/example/bookflow/domain/ReservationSpecifications.java`
  - `public final class`、private コンストラクタ、日本語 Javadoc（`ResourceSpecifications` の記述密度に合わせる）
  - `startAtFrom(LocalDateTime from)`: `startAt >= from`
  - `startAtBefore(LocalDateTime to)`: `startAt < to`
  - `statusIn(Collection<ReservationStatus> statuses)`: `status IN (...)`
  - `fetchResourceAndRequester()`: `resource` と `requester` の JOIN FETCH。件数クエリでは使わない（`Specification` の `query.getResultType()` が `Long` でないときだけ fetch する、または設計どおりページングしない全件取得でのみ使うことを Javadoc に明記する。Part 2 で `ResourceSpecifications` と同じ作法かを確認して選ぶ）
  - 属性名は `Reservation` のフィールド名（`startAt` / `status` / `resource` / `requester`）に合わせる

- [x] **Step 3: `ReservationRepository` を変更**（domain）
  - ファイル: `backend/src/main/java/com/example/bookflow/domain/ReservationRepository.java`
  - `JpaSpecificationExecutor<Reservation>` を継承に追加し、クラス Javadoc に一文足す。既存のメソッドは変更しない
  - 追加する import（`JpaSpecificationExecutor`）は Spotless / Checkstyle の import 規約に合わせる

- [x] **Step 4: `ReservationCsvWriter` を新規作成**（application、US-1）
  - ファイル: `backend/src/main/java/com/example/bookflow/application/ReservationCsvWriter.java`
  - `public final class`、private コンストラクタ。Spring に依存しない純粋なクラス
  - `public static byte[] write(List<Reservation> reservations)`: UTF-8 の BOM（`EF BB BF`）、ヘッダ行「予約ID,リソース名,申請者名,開始日時,終了日時,目的,承認状態」、1 予約 1 行、改行は CRLF（最終行の後ろにも CRLF を付ける。`api-spec.md` の例と一致させる）
  - 日時は `DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm")`（ゼロ埋め、秒なし）
  - 承認状態の表示名の対応表は非公開メンバー（5 値すべて）
  - エスケープ（非公開メソッド）: `,` `"` `\r` `\n` のいずれかを含む値はダブルクォートで囲み、中の `"` を `""` にする。それ以外は加工しない。`null` は空文字として出力する
  - 日本語 Javadoc

- [x] **Step 5: `ReservationCsvWriterTest` を新規作成**（application、US-1。シートの受入条件「CSV 生成ロジックのユニットテスト」）
  - ファイル: `backend/src/test/java/com/example/bookflow/application/ReservationCsvWriterTest.java`（Mockito 不要。`Resource.create` / `User` / `Reservation.create` で組み立てる。`User` の生成方法は既存テスト（`ReservationServiceTest`）の前例に合わせる）
  - 検証項目（命名は ADR-018: `methodName_condition_expectedBehavior`）:
    - 先頭 3 バイトが BOM（AC-1.2）
    - ヘッダ行が「予約ID,リソース名,申請者名,開始日時,終了日時,目的,承認状態」（AC-1.2）
    - 0 件のとき BOM + ヘッダ行 + CRLF だけ（AC-1.6）
    - 日時が `2026/06/02 10:00`（ゼロ埋め・秒なし。1 桁の月日・時分のケースも）（AC-1.4）
    - 5 つのステータスがそれぞれの日本語表示名になる（AC-1.4）
    - 目的に `,` `"` 改行（`\n`・`\r\n`）を含む値が RFC 4180 でエスケープされる（AC-1.5）。リソース名・申請者名にカンマがある場合も同様
    - 行区切りが CRLF で、LF 単独が混ざらない（エスケープした値の中の改行を除く）
    - 入力のリストの順序が出力の順序になる（並び替えは呼び出し側の責務）
    - 全角文字（日本語）が UTF-8 で正しくエンコードされる

- [x] **Step 6: `ReservationReportService` を新規作成**（application、US-1〜3）
  - ファイル: `backend/src/main/java/com/example/bookflow/application/ReservationReportService.java`
  - `@Service`、`@Transactional(readOnly = true)`（`open-in-view: false` のため、`resource` / `requester` の JOIN FETCH と CSV 生成をトランザクション内で完結させる）
  - `public byte[] exportReservationsCsv(LocalDateTime from, LocalDateTime to, Collection<ReservationStatus> statuses)`
  - 条件のリストを組み立て（`from` と `to` が非 null のときだけ `startAtFrom` / `startAtBefore`、`statuses` が非 null かつ非空のときだけ `statusIn`、常に `fetchResourceAndRequester`）、`Specification.allOf(...)` で結合する（`where(null)` を使わない）
  - `reservationRepository.findAll(spec, Sort.by("startAt").ascending())` → `ReservationCsvWriter.write`
  - コンストラクタ注入（既存 Service の様式）

- [x] **Step 7: `ReservationReportServiceTest` を新規作成**（application、Mockito）
  - ファイル: `backend/src/test/java/com/example/bookflow/application/ReservationReportServiceTest.java`
  - `ReservationRepository` をモックし、`findAll(any(Specification.class), any(Sort.class))` が呼ばれること、渡された `Sort` が `startAt` 昇順であること、戻り値が `ReservationCsvWriter` の出力（BOM 付き・ヘッダ行を含む）になること、0 件でもヘッダ行付きで返ること、`statuses` が null / 空でも例外にならないことを検証する
  - `Specification` は不透明なため、条件の中身（期間・ステータス）は検証しない（設計どおり。Step 8 と Step 9 で担保する）
  - `any(Specification.class)` は型を明示する

- [x] **Step 8: `ReservationSpecificationsTest` を新規作成**（domain、実クエリのテスト。US-2・US-3）
  - ファイル: `backend/src/test/java/com/example/bookflow/domain/ReservationSpecificationsTest.java`
  - 起動方式: `@SpringBootTest` + `@ActiveProfiles("test")` + `@Transactional`（`ResourceRepositoryTest` の前例）。`Resource` / `User` / `Department` / `Reservation` を投入して `ReservationRepository.findAll(spec, sort)` で検証する。`User` と `Department` の投入方法は既存テストの前例に合わせる
  - **共有 DB を前提にした検証方針**: 件数の完全一致を使わず、自分が投入した行の ID を基準に `contains` / `containsExactly` / `doesNotContain` で検証する。並び順は、自分が投入した行だけを抽出した後の順序で確認する
  - 検証項目:
    - 期間: `start_at` が `from` 以上・`to` 未満（AC-2.1。境界の 4 件: `from` の直前・`from` ちょうど・`to` の直前・`to` ちょうど）
    - 期間の前から続く予約（開始が `from` より前、終了が `from` より後）は含まれない（AC-2.2）
    - ステータス: 1 つ指定（AC-3.1）、複数指定（AC-3.2）
    - 期間とステータスの AND（AC-3.3）
    - 条件なし（`Specification.unrestricted()` と `fetchResourceAndRequester`）で、自分が投入した全ステータスの全行が返る（AC-1.3）
    - 開始日時の昇順（AC-1.3。投入順をわざと逆にしておく）
    - JOIN FETCH 済みで、トランザクション外でも `resource.name` / `requester.name` を読める、または `Hibernate.isInitialized` が true（N+1 を避ける設計の確認。テストが `@Transactional` のため後者で確認する）

- [x] **Step 9: `ReportController` を新規作成**（presentation、US-1〜4）
  - ファイル: `backend/src/main/java/com/example/bookflow/presentation/ReportController.java`
  - `@RestController`、`@RequestMapping("/api/reports")`、`@GetMapping("/reservations/csv")`、`@PreAuthorize("hasRole('ADMIN')")`（D3）
  - `downloadReservationsCsv(@RequestParam(required = false) LocalDateTime from, @RequestParam(required = false) LocalDateTime to, @RequestParam(required = false) List<ReservationStatus> status)`
  - 検証（D4）: `from` と `to` の片方だけは `ValidationException`、`from` が `to` と同じかそれより後も `ValidationException`（メッセージは既存の `ResourceController` の文言の様式に合わせる）
  - 応答: `ResponseEntity.ok()` に `Content-Type: text/csv; charset=UTF-8` と `Content-Disposition: attachment; filename="reservations_yyyyMMdd.csv"`（日付は `LocalDate.now()`、`DateTimeFormatter.BASIC_ISO_DATE`）を設定し、本文は `byte[]`
  - `status` に `DRAFT` が渡された場合の扱いは変更しない（`ReservationStatus` の全値を受け付ける。`GET /api/reservations` と同じ。仕様は `PENDING` / `APPROVED` / `REJECTED` / `CANCELLED` の 4 値を記載しているが、`DRAFT` を拒否する要件はない）
  - クラス Javadoc に `api-spec.md` §帳票出力 準拠と認可ルールを記載する

- [x] **Step 10: `ReportControllerTest` を新規作成**（presentation、US-1〜4。`UserControllerTest` の様式）
  - ファイル: `backend/src/test/java/com/example/bookflow/presentation/ReportControllerTest.java`（`BaseControllerTest` を継承、`JdbcTemplate` でシード、`@AfterEach` で後始末）
  - シード: `RegisteredUserInterceptor` のため `@WithMock*` の既定 sub（`test-admin-sub` / `test-member-sub` / `test-approver-sub`）に対応するユーザーを投入する（`UserControllerTest` の前例。固定 ID は他テストと衝突しないプレフィックスを使う）。予約・リソース・申請者は、このクラスが投入する行を一意なトークン（目的・名称）で識別する
  - **共有 DB を前提にした検証方針**: 応答の CSV を行に分解し、自分のトークンを含む行だけを取り出して検証する。応答全体の行数は検証しない
  - 検証項目:
    - 認可: ADMIN 200（AC-1.1）、MEMBER 403（AC-4.2）、APPROVER 403（AC-4.3）、未認証 401（AC-4.4）。403 の本文が JSON の `{code: "FORBIDDEN"}` であること
    - 応答ヘッダ: `Content-Type` が `text/csv; charset=UTF-8`（AC-1.1）、`Content-Disposition` が `attachment; filename="reservations_<今日の yyyyMMdd>.csv"`
    - 本文: 先頭が BOM、1 行目が日本語ヘッダ行（AC-1.2）、自分の投入行が日本語の承認状態・`yyyy/MM/dd HH:mm` で出る（AC-1.4）、カンマ・ダブルクォートを含む目的がエスケープされる（AC-1.5）
    - 全ユーザー・全ステータスの予約が出る（AC-1.3）。条件に合う予約がない場合（一意でありえない期間を指定）はヘッダ行だけ（AC-1.6）
    - 期間: `from` 以上・`to` 未満（AC-2.1）、期間の前から続く予約は出ない（AC-2.2）
    - 400: 片方だけ（`from` のみ・`to` のみ）（AC-2.3）、`from` = `to` と `from` > `to`（AC-2.4）、オフセット付き（`+09:00`）（AC-2.5）。いずれも `code` が `VALIDATION_ERROR`
    - ステータス: 1 つ（AC-3.1）、複数（AC-3.2）、期間との組み合わせ（AC-3.3）
  - 本文のデコードは `getContentAsByteArray()` を UTF-8 で読み、BOM を含めて検証する（`getContentAsString()` に任せない）

- [x] **Step 11: Backend のチェックポイント**
  - `cd backend && ./gradlew spotlessApply`、`./gradlew checkstyleMain`、`./gradlew test`
  - 失敗した場合は原因を調べて修正し、結果を報告する。テストを弱めて通すことはしない（アサーションの削除、期待値の緩和をしない）
  - Spotless が整形した差分は、意図した変更だけかを確認する。既存の BE テスト（`ReservationService` / `ReservationController` ほか）が変更なしで pass することを確認する

### B. Frontend（api-client → Server Action → ダイアログ → page → テストの順）

- [x] **Step 12: `api-client.ts` に `getText` を追加**（lib、US-1）
  - ファイル: `frontend/src/lib/api-client.ts`
  - `getText(path, params?): Promise<{ text: string; headers: Headers }>` を追加し、戻り値のオブジェクトに含めて公開する。既存メソッドの挙動は変えない
  - 本文は `new TextDecoder("utf-8", { ignoreBOM: true }).decode(await res.arrayBuffer())` でデコードし、BOM を文字列の先頭に残す（D11）
  - 非 2xx は既存の `request` 内の `assertOk` を通るため、`ApiClientError`（JSON の `{code, message}`）になる
  - 日本語 JSDoc（既存の記述密度に合わせる）

- [x] **Step 13: `reports.ts` を新規作成**（server/actions、US-1〜3）
  - ファイル: `frontend/src/server/actions/reports.ts`
  - `"use server"`、`exportReservationsCsvAction(params?)`。引数の型はファイル内の非公開の型（`reservations.ts` と同じ。`from?: string; to?: string; status?: string[]`）
  - `from` / `to` は `toIsoWithSeconds` と同じ処理で 16 文字を秒付きに正規化する（`reservations.ts` の非公開関数は公開されていないため、同じ処理をこのファイルに持つ。共通化は計画にないので行わない）
  - 空文字の `from` / `to` と空配列の `status` は付与しない
  - `createApiClient(getAccessToken).getText("/reports/reservations/csv", queryParams)` を呼び、`Content-Disposition` の `filename="..."` からファイル名を取り出して `{ filename, content }` を返す。取り出せなかった場合は `reservations.csv` をフォールバックとする
  - エラーは `ApiClientError` のまま投げる

- [x] **Step 14: `CsvExportDialog.tsx` を新規作成**（app、US-1〜3）
  - ファイル: `frontend/src/app/(authenticated)/reservations/CsvExportDialog.tsx`（`"use client"`）
  - `ApprovalTable` の `ApproveDialog` の様式（`Dialog` / `DialogTrigger` / `DialogContent` / `DialogHeader` / `DialogTitle`、`useState` + `useTransition`、`toast.error`）に合わせる
  - 文言（Application Design で承認済み）: 開く・実行のボタン「CSV ダウンロード」/「ダウンロード」、見出し「CSV ダウンロード」、ラベル「開始日時」「終了日時」「ステータス」、選択肢「承認待ち」「承認済み」「却下」「キャンセル済み」（`RESERVATION_STATUS_LABELS`）、閉じるボタン「キャンセル」、失敗時のトースト「CSV のダウンロードに失敗しました。」
  - 入力: 開始日時・終了日時は `datetime-local`（D5、`ResourceFilterForm` の前例）、ステータスはネイティブのチェックボックス 4 種（D9、未選択は全ステータス）。入力の検証は API 側（`screen-spec.md` のとおりクライアント側では行わない）
  - 実行: `exportReservationsCsvAction` の結果から Blob（`text/csv;charset=utf-8`、先頭の BOM を含む文字列をそのまま渡す）→ `URL.createObjectURL` → `<a download=filename>` のクリック → `URL.revokeObjectURL`。成功時にダイアログを閉じる
  - `data-testid`（`.aidlc-rule-details` の Automation Friendly Code Rules）: `csv-export-open-button`、`csv-export-from-input`、`csv-export-to-input`、`csv-export-status-{STATUS}-checkbox`、`csv-export-submit-button`、`csv-export-cancel-button`

- [x] **Step 15: `reservations/page.tsx` を変更**（app、US-4）
  - ファイル: `frontend/src/app/(authenticated)/reservations/page.tsx`
  - 見出し行の右側（既存の「リソースを探す」ボタンの隣）に、`isAdmin` のときだけ `<CsvExportDialog />` を置く。2 つのボタンを横並びにするため、既存の `Button` を 1 つの `div`（`flex gap-2`）でまとめる以外の変更はしない
  - ステータスタブ、テーブル、ページネーションは変更しない（AC-4.1 の「それ以外の画面表示は従来と変わらない」）

- [x] **Step 16: Frontend のテストを追加**（US-1〜4）
  - `frontend/tests/unit/server/actions/reports.test.ts`（新規）: `reservations.test.ts` の様式（`next/navigation`・`next/headers`・`@/lib/session` のモック、MSW の `server.use`）。検証項目は、CSV 本文の先頭に BOM が残る／`Content-Disposition` からファイル名を取り出す（取り出せないときのフォールバック）／`from` / `to` が秒付きに正規化される／`status` が繰り返しキーで付与される／未指定・空では付与されない／403 と 400 で `ApiClientError`（`code`・`status`）が投げられる。MSW のハンドラは `http.get("/api/backend/reports/reservations/csv", ...)`（既存テストの様式。サーバー側のパスは Part 2 で `reservations.test.ts` と合わせて確認する）
  - `frontend/tests/unit/lib/api-client.test.ts`（新規、または既存の同種テストがあればそこへ追記）: `getText` が BOM を残す／ヘッダを返す／非 2xx で `ApiClientError` を投げる
  - `frontend/tests/unit/reservations/csv-export-dialog.test.tsx`（新規）: `exportReservationsCsvAction` をモックし、ボタンでダイアログが開く／入力値とステータスが Action に渡る／未選択は `status` なし／成功で Blob が作られ `<a download>` がクリックされダイアログが閉じる（`URL.createObjectURL` / `revokeObjectURL` はスタブ）／失敗で `toast.error`（`sonner` をモック）が呼ばれダイアログは開いたまま／「キャンセル」で閉じる
  - リスク: 設計との差分 6 のとおり（Radix の jsdom 対応）

- [x] **Step 17: Frontend のチェックポイント**
  - `cd frontend && pnpm format`、`pnpm test`、`pnpm lint`、`pnpm format:check`、型チェック（`pnpm build` または `tsc --noEmit` のうち、`package.json` にあるもの）
  - 失敗した場合は Step 11 と同じ方針で対処する
  - 設計との差分 7 の動作確認（開発専用ロール別ログインで ADMIN / MEMBER / APPROVER の表示を確認）は、環境（Docker・DB・BE の起動）が使える場合に実施する。使えない場合はその旨と理由を完了報告に記載し、確認済みと書かない

### C. 記録

- [x] **Step 18: 変更サマリの作成と進捗の更新**
  - `Docs/spec/aidlc-docs/construction/csv-export/code/code-summary.md`（Markdown のみ）に、変更したファイル（Modified）と新規作成したファイル（Created）、受入条件 18 件とテストの対応、テスト結果、未実施の確認（あれば）を記録する
  - 全手順のチェックボックスを `[x]` にし、`Docs/spec/aidlc-state.md` を更新する
  - 重複ファイル（`*_modified` など）が作られていないことを確認する
  - 完了メッセージは 2 択（Request Changes / Continue to Next Stage）で、承認を待つ

## 変更・作成ファイル一覧（予定）

| 区分 | ファイル | Step |
|---|---|---|
| Created | `backend/src/main/java/com/example/bookflow/domain/ReservationSpecifications.java` | 2 |
| Modified | `backend/src/main/java/com/example/bookflow/domain/ReservationRepository.java` | 3 |
| Created | `backend/src/main/java/com/example/bookflow/application/ReservationCsvWriter.java` | 4 |
| Created | `backend/src/test/java/com/example/bookflow/application/ReservationCsvWriterTest.java` | 5 |
| Created | `backend/src/main/java/com/example/bookflow/application/ReservationReportService.java` | 6 |
| Created | `backend/src/test/java/com/example/bookflow/application/ReservationReportServiceTest.java` | 7 |
| Created | `backend/src/test/java/com/example/bookflow/domain/ReservationSpecificationsTest.java` | 8 |
| Created | `backend/src/main/java/com/example/bookflow/presentation/ReportController.java` | 9 |
| Created | `backend/src/test/java/com/example/bookflow/presentation/ReportControllerTest.java` | 10 |
| Modified | `frontend/src/lib/api-client.ts` | 12 |
| Created | `frontend/src/server/actions/reports.ts` | 13 |
| Created | `frontend/src/app/(authenticated)/reservations/CsvExportDialog.tsx` | 14 |
| Modified | `frontend/src/app/(authenticated)/reservations/page.tsx` | 15 |
| Created | `frontend/tests/unit/server/actions/reports.test.ts` | 16 |
| Created（または追記） | `frontend/tests/unit/lib/api-client.test.ts` | 16 |
| Created | `frontend/tests/unit/reservations/csv-export-dialog.test.tsx` | 16 |
| Created | `Docs/spec/aidlc-docs/construction/csv-export/code/code-summary.md` | 18 |

変更しないもの: `build.gradle.kts`（依存追加なし）、Flyway、`docs-next/docs/spec/`（Spec 更新 1・2 回目で承認済み。実装中に仕様との食い違いを見つけた場合は、実装側で吸収せず報告して指示を仰ぐ）、`.claude/` 配下、既存の `ReservationService` / `ReservationController`。

## 受入条件との対応

| 受入条件 | 対応する手順 |
|---|---|
| AC-1.1 ボタンからダウンロード・`text/csv` | Step 9, 10, 13, 14, 16 |
| AC-1.2 UTF-8 BOM・日本語ヘッダ | Step 4, 5, 10, 12, 16 |
| AC-1.3 全件・開始日時の昇順 | Step 6, 8, 10 |
| AC-1.4 値の表記 | Step 4, 5, 10 |
| AC-1.5 エスケープ | Step 4, 5, 10 |
| AC-1.6 0 件はヘッダだけ | Step 4, 5, 7, 10 |
| AC-2.1・2.2 開始日時での判定 | Step 2, 8, 10 |
| AC-2.3・2.4・2.5 400 | Step 9, 10 |
| AC-3.1〜3.3 ステータス・組み合わせ | Step 2, 8, 10 |
| AC-4.1 ADMIN 以外にボタンを出さない | Step 15, 17（動作確認） |
| AC-4.2〜4.4 403 / 403 / 401 | Step 9, 10 |
| シート：CSV 生成ロジックのユニットテスト | Step 5 |

## 規模

全 18 手順（BE 11、FE 6、記録 1）。新規ファイルは 14 件（本体 6、テスト 7、変更サマリ 1。`api-client.test.ts` を新規とした場合）、変更ファイルは 3 件。Part 2 の中間確認は、Step 11（BE）と Step 17（FE）の 2 か所に置く。
