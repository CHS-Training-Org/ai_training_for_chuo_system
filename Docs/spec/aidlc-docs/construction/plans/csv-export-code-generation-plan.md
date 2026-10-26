# Code Generation Plan: csv-export

この計画が Code Generation の唯一の正である。承認後はステップの順に実行し、完了したステップを直ちに `[x]` にする。計画から外れる必要が出たときは、実装を止めて計画の変更を提示する。

**作成日時**: 2026-10-26T01:43:43+00:00

## Unit Context
- **Unit**: `csv-export`（Units Generation はスキップ。Issue #29 の単一の縦切り）
- **Stories**: User Stories はスキップ。トレーサビリティは要件 ID（`Docs/spec/aidlc-docs/inception/requirements/csv-export/requirements.md` の FR-1〜9、NFR-1〜7）とシートの受入条件 5 件で取る。
- **設計の正**: `Docs/spec/aidlc-docs/inception/application-design/csv-export/`（`application-design.md` の第 5 節「Code Generation への引き継ぎ事項」を含む）。名前やシグネチャは `component-methods.md` に従い、責務の分担は変えない。
- **Workspace Root**: `/workspace`（Brownfield。既存ファイルはすべてその場で修正し、コピーを作らない）
- **Dependencies**: 他ユニットなし。DB スキーマと Flyway マイグレーションは変更しない。依存ライブラリは追加しない（D-2 = 自前実装）。
- **Interface**: `GET /api/reports/reservations/csv?from=&to=&status=`（ADMIN のみ）、`GET /api/reports/reservations/csv`（FE の Route Handler。同じクエリを受け、backend へ中継）、画面 `/admin/reports`
- **Entities**: `Reservation`（読み取りのみ。変更なし）
- **Local build の制約**: `pnpm build` は dev サーバーと `.next` を共有して壊れるため実行しない。`docs-next` は docusaurus が未インストールのため `npm run build` を実行できず、docs のビルド確認は PR の CI（Docs Check / build）に任せる。push と PR の作成は学習者が行う。
- **文章規範**: `docs-next/docs/` の Markdown を書くときは `docs-next/CLAUDE.md` に従う（`spec/` はである調、表のセルは常体でよい。ダッシュ類と並列の中黒を地の文で使わない。リンクテキストにファイル名を書かない）。

## 設計方針（承認済みの設計の確認。承認の対象に含む）

| 項目 | 方針 |
|---|---|
| D-1 | backend は `ResponseEntity<byte[]>`。CSV 生成部は `OutputStream` に書く |
| D-2 | 自前実装（依存を追加しない） |
| D-3 | Route Handler + GET フォーム。エラー時は `/admin/reports?error=<code>` へリダイレクト、未認証は `/auth/signin` |
| 検索 | `ReservationRepository` に `JpaSpecificationExecutor` を追加し、`ReservationSpecifications` で組み立てる（開始日時の範囲、ステータス、JOIN FETCH） |
| 置き場所 | `ReservationCsvWriter` は `presentation/csv/`、`ReservationCsvRow` と `ReservationReportService` は `application/`、`ReservationSpecifications` は `domain/` |

次の点は実装時に実物で確かめてから書く（記憶で書かない）。

- Spring Boot 4.0.6 が解決する Spring Data JPA（キャッシュ上は 4.0.5）の `Specification` の合成 API。`javap` で jar を確認する（Step 5）。
- Jackson は Jackson 3 系だが、本機能は CSV を手書きするため JSON の扱いには影響しない。
- Vitest（jsdom）で Route Handler の `GET` を直接呼べること。既存の Server Action テストと同じく `getAccessToken` を `vi.mock` し、MSW で backend を返す。jsdom では `api-client.ts` が `/api/backend` の相対 URL を使う。

## 承認時の判断（決定済み）

以下は 2026-10-26T01:45:59+00:00 の承認時に学習者が決めた内容である（決定済み）。

1. **`requirements.md` の権限マトリクス（決定: 追加する）**：`/update-spec` のチェックリストに従い、`requirements.md` の API 権限マトリクスに `GET /api/reports/reservations/csv`（MEMBER ❌、APPROVER ❌、ADMIN ✅）、画面アクセス権限表に `/admin/reports`（同じ）の行を、それぞれ最小限（1 行ずつ）追加する。要件の Q2 = A の「`requirements.md` は変更しない」は、UC-07 の番号の食い違い（UC の追加や対象外の表の修正）についての判断であり、UC 一覧、UC の節、対象外の表（「CSV / PDF 帳票出力」）、UC の番号には触れない。
2. **画面遷移図（決定: 更新しない）**：`docs-next/static/diagrams/spec/screen-spec-navigation.drawio` と `.drawio.svg` は更新しない。図に `/admin/reports` がないことは、PR の任意メモに記載する。
3. **画面の総数表記（決定: 12 に直す）**：`screen-spec.md` の description と `index.md` の「全 10 画面」を、表の行数（追加後は 12）に合わせて 12 に直す。

## Steps

### Part A: 仕様書（Spec-first）
- [x] **Step 1**: `/update-spec` を起動し、更新対象を特定する。前提: 更新対象は `api-spec.md`、`screen-spec.md`、総数表記を含む `index.md` の 1 行、`requirements.md` の権限マトリクスと画面アクセス権限表（各 1 行）。`requirements.md` の UC 一覧、UC の節、対象外の表と、画面遷移図は変更しない。
- [x] **Step 2**: `docs-next/docs/spec/api-spec.md` を更新する。
  - 「API 設計方針」表の「レスポンス形式」に、`GET /api/reports/reservations/csv` は `text/csv` を返す例外であることを追記する。
  - 「エンドポイント一覧」に「帳票出力」の小節（メソッド、パス、概要、権限 ADMIN）を追加する。
  - §帳票出力 を新設し（見出しの位置は §ユーザー・部署の後、明示アンカー付き）、`GET /api/reports/reservations/csv` を記述する: リクエスト例、クエリパラメータ表（`from`、`to`、`status`。型、必須、説明）、期間の規則（開始日時で判定、`to` の日を含む、片方だけの指定も可、`from` > `to` は 400）、ステータスの規則（複数指定可、未指定は全ステータス）、レスポンス（`200`、`Content-Type: text/csv; charset=UTF-8`、`Content-Disposition`、BOM 付き UTF-8、CRLF）、CSV の列表（見出し、値、書式、承認状態のラベル）、RFC 4180 のエスケープと CSV インジェクション対策、並び順、0 件のときの扱い、エラー（400、401、403。いずれも JSON）。
  - FR-1〜FR-8 に対応する。
- [x] **Step 3**: `docs-next/docs/spec/screen-spec.md` と `docs-next/docs/spec/index.md` を更新する。
  - 画面一覧に `/admin/reports`（帳票出力、ADMIN のみ）を追加する。
  - サイドナビ表に「帳票出力」（ADMIN のみ表示）を追加する。
  - §帳票出力 に `/admin/reports` の節（アクセス制御、UI 要素、フォームの検証、エラー表示）を追加する。節の位置は §ユーザー・部署の `/admin/users` の後。
  - 「全 10 画面」を 12 に直す（`screen-spec.md` の description と本文、`index.md`。grep で漏れを確認する）。
  - FR-9 に対応する。
- [x] **Step 3b**: `docs-next/docs/spec/requirements.md` の API 権限マトリクスに `GET /api/reports/reservations/csv`（MEMBER ❌、APPROVER ❌、ADMIN ✅）を、画面アクセス権限表に `/admin/reports`（同じ）を、それぞれ 1 行追加する。UC 一覧、UC の節、対象外の表は変更しない。
- [x] **Step 4**: 更新した 4 ファイルの frontmatter（`last_updated` などの更新日の項目）、表と見出しとアンカーの整形、相互リンクを確認する。ローカルでの `npm run build` は行わない（CI の Docs Check / build で確認する）。

### Part B: バックエンド（Repository -> Specification -> Service -> CSV 生成 -> Controller）
- [x] **Step 5**: （`javap` は承認が要り使えなかったため、`./gradlew compileJava --offline` が通ることで確認した。使った API は `Specification.allOf(...)` とラムダ形式の `toPredicate`、`JpaSpecificationExecutor.findAll(spec, sort)`。いずれも 4.0.5 でコンパイルできた。JOIN FETCH と `count` の扱いは、`query.getResultType()` の判定で回避し、Step 14 の結合テストで実行確認する）Spring Data JPA の `Specification` の合成 API を確認する。Gradle キャッシュの `spring-data-jpa-4.0.5.jar` に `javap` を使い、`Specification` の `where`、`allOf`、`and`、`toPredicate` などの存在と、JOIN FETCH と `count` クエリの扱いを確かめる。結果を Step 7 の実装に反映し、要約に書く。
- [x] **Step 6**: `backend/src/main/java/com/example/bookflow/domain/ReservationRepository.java` を修正し、`JpaSpecificationExecutor<Reservation>` を継承に加える。既存メソッドは変更しない。
- [x] **Step 7**: `backend/src/main/java/com/example/bookflow/domain/ReservationSpecifications.java` を新規作成する。`fetchResourceAndRequester()`、`startAtFrom(LocalDateTime)`、`startAtBefore(LocalDateTime)`、`statusIn(Collection<ReservationStatus>)`。条件なしの述語は `cb.conjunction()`。JOIN FETCH は `Long` の結果型（件数取得）では付けない。ユーティリティクラス（`final`、private コンストラクタ）にする。
- [x] **Step 8**: `backend/src/main/java/com/example/bookflow/application/ReservationCsvRow.java`（record、`from(Reservation)`）と `ReservationReportService.java` を新規作成する。
  - `@Transactional(readOnly = true)`。`from` と `to` が両方あり `from` が `to` より後なら `ValidationException`（400）。
  - `from.atStartOfDay()` 以上、`to.plusDays(1).atStartOfDay()` 未満。`status` が null または空なら条件なし。
  - `findAll(spec, Sort.by(asc("startAt"), asc("id")))` で取得し、トランザクション内で `ReservationCsvRow` に詰め替える。
- [x] **Step 9**: `backend/src/main/java/com/example/bookflow/presentation/csv/ReservationCsvWriter.java` を新規作成する（`@Component`）。`write(List<ReservationCsvRow>, OutputStream)`。
  - BOM（`EF BB BF`）、ヘッダ行（予約ID、リソース名、申請者名、開始日時、終了日時、目的、承認状態）、CRLF、`yyyy-MM-dd HH:mm:ss`、承認状態の日本語ラベル（`labels.ts` と同じ文言）。
  - セルの整形は、先頭が `=` `+` `-` `@`、タブ、CR のセルの先頭に `'` を付け、その後に RFC 4180 のエスケープ（カンマ、ダブルクォート、CR、LF を含むなら囲み、`"` は `""`）を適用する。`null` は空欄にする。
  - 出力ストリームは閉じない。
- [x] **Step 10**: `backend/src/main/java/com/example/bookflow/presentation/ReportController.java` を新規作成する。`@RestController`、`@RequestMapping("/api/reports")`、`GET /reservations/csv`、`@PreAuthorize("hasRole('ADMIN')")`、`from` と `to` に `@DateTimeFormat(iso = DateTimeFormat.ISO.DATE)`、`status` は `List<ReservationStatus>`。`produces` は付けない。`Content-Type: text/csv; charset=UTF-8` と `Content-Disposition: attachment; filename="reservations_yyyyMMdd_HHmmss.csv"` を `ResponseEntity<byte[]>` に設定する。Javadoc は既存の Controller に合わせる。
- [x] **Step 11**: `./gradlew spotlessApply` で整形し、`./gradlew compileJava` でコンパイルが通ることを確認する。

### Part C: バックエンドのテスト
- [x] **Step 12**: `backend/src/test/java/com/example/bookflow/presentation/csv/ReservationCsvWriterTest.java` を新規作成する（プレーンな JUnit 5。受入条件の「CSV 生成ロジックのユニットテスト」）。観点:
  - 先頭 3 バイトが BOM、ヘッダ行の文言と列順、行区切りが CRLF。
  - 日時が `yyyy-MM-dd HH:mm:ss`。承認状態のラベル 5 種（期待する文言をテストで固定する）。
  - カンマ、ダブルクォート、LF、CR を含むセルが囲まれ、`"` が `""` になる。
  - 先頭が `=` `+` `-` `@`、タブ、CR のセルに `'` が付く。対象外の先頭文字（英数字、日本語、空白）には付かない。`'` を付けた後に RFC 4180 のエスケープも適用される（例: `=a,b`）。
  - 0 件ならヘッダ行のみ（BOM 付き）。`null` の値が空欄になる。日本語が UTF-8 のバイト列で出る。
- [x] **Step 13**: `backend/src/test/java/com/example/bookflow/application/ReservationReportServiceTest.java` を新規作成する（Mockito）。観点:
  - `from` > `to` で `ValidationException`、同じ日付は許容される。
  - `findAll` に並び順（開始日時、予約 ID の昇順）が渡される。
  - 取得した `Reservation` が `ReservationCsvRow` に正しく詰め替えられる。
  - `from`、`to`、`status` がいずれも未指定でも動く。
  - 期間の境界（`to` の日を含む）の実際の挙動は、Step 14 の結合テスト（H2）で確かめる。
- [x] **Step 14**: `backend/src/test/java/com/example/bookflow/presentation/ReportControllerTest.java` を新規作成する（`BaseControllerTest`、H2）。既存の `ReservationControllerTest` のデータ準備に倣う。観点:
  - ADMIN で 200、`Content-Type`、`Content-Disposition`（ファイル名の形式）、本文の先頭が BOM、ヘッダ行、全ユーザーの予約が含まれる。
  - MEMBER と APPROVER で 403（JSON の `FORBIDDEN`）、未認証で 401。
  - 期間の絞り込み: `from` の 0 時ちょうどに開始する予約が含まれる、`to` の日の 23 時台に開始する予約が含まれる、`to` の翌日 0 時ちょうどに開始する予約が含まれない、`from` より前は含まれない。終了日時が期間を越える予約は、開始日が期間内なら含まれる。
  - `status` の複数指定、未指定（全ステータス）、期間とステータスの AND。
  - 並び順（開始日時の昇順、同時刻は予約 ID の昇順）。0 件でヘッダ行のみ。
  - 不正な `from`（日付でない値）、未知の `status`、`from` > `to` で 400（`VALIDATION_ERROR`）。
  - CSV インジェクション対策が本文に効いている（目的が `=` で始まる予約）。
- [x] **Step 15**: `./gradlew test --tests "*ReservationCsvWriterTest"`、`--tests "*ReservationReportServiceTest"`、`--tests "*ReportControllerTest"` を順に実行し、続けて `./gradlew test`（全件）、`./gradlew spotlessCheck`、`./gradlew checkstyleMain` を実行する。失敗したら原因を調べて修正する。テストを緩めて通すことはしない。`checkstyleTest` の警告は既存分があるため、本変更分に新しい指摘がないかを確認する。

### Part D: フロントエンド
- [x] **Step 16**: `frontend/src/lib/api-client.ts` に `getRaw(path, params?)` を追加し、戻り値のオブジェクトに加える（`request` を再利用し、エラー時は既存どおり `ApiClientError`）。既存メソッドは変えない。
- [x] **Step 17**: `frontend/src/app/api/reports/reservations/csv/route.ts` を新規作成する。`GET(request)`: `searchParams` から `from`、`to`（`get`）と `status`（`getAll`）の空でない値だけを取り出し、`createApiClient(getAccessToken).getRaw("/reports/reservations/csv", params)` を呼ぶ。成功時は `res.body` と `Content-Type`、`Content-Disposition`、`Cache-Control: no-store` を中継する。失敗時は 303 で、トークンなし、または 401 は `/auth/signin`、`ApiClientError` のそれ以外と `ApiClientError` 以外の例外は `/admin/reports?error=<code>`（例外は `INTERNAL_SERVER_ERROR`、`code` は `encodeURIComponent`）。リダイレクト先は `new URL(path, request.url)`。
- [x] **Step 18**: 帳票出力ページを新規作成する。
  - `frontend/src/app/(authenticated)/admin/reports/page.tsx`（Server Component）: タイトル「帳票出力」、`searchParams.error` を既知のコード（`FORBIDDEN`、`VALIDATION_ERROR`、それ以外）のメッセージに変換して表示する。未知の値は画面に出さない。
  - `frontend/src/app/(authenticated)/admin/reports/ReservationCsvExportForm.tsx`（Client Component）: `<form method="get" action="/api/reports/reservations/csv">`、開始日と終了日（`type="date"`）、ステータスのチェックボックス 4 種（`RESERVATION_STATUS_LABELS` のラベル。`DRAFT` は出さない）、「CSV ダウンロード」ボタン、「未選択なら全ステータス」の説明。送信前に開始日が終了日より後なら `preventDefault()` してメッセージを表示する。`data-testid` を主要な要素に付ける（`report-form`、`report-from-input`、`report-to-input`、`report-status-<値>`、`report-submit-button`、`report-form-error`）。既存の UI コンポーネント（`Button`、`Input`、`Label` など）を使う。
- [x] **Step 19**: `frontend/src/components/layout/nav-items.ts` の `ADMIN_ITEMS` の末尾に `{ label: "帳票出力", href: "/admin/reports" }` を追加する。
- [x] **Step 20**: フロントエンドのテストを追加・更新する（Vitest）。
  - `frontend/tests/unit/layout/nav-items.test.ts` を更新する（ADMIN にだけ「帳票出力」が出る。MEMBER と APPROVER には出ない。既存の件数を確かめるテストがあれば修正する）。
  - `frontend/tests/unit/lib/api-client.test.ts`（新規または既存に追記）: `getRaw` が `Response` を返し、トークンを付け、非 2xx で `ApiClientError` を投げる。
  - `frontend/tests/unit/app/api/reports/csv-route.test.ts`（新規）: 成功時に本文と `Content-Type`、`Content-Disposition` が中継される。`from`、`to`、`status`（複数）が backend に渡り、空文字と余分なキーは渡らない。401 は `/auth/signin`、403 と 400 は `/admin/reports?error=...`、通信失敗は `error=INTERNAL_SERVER_ERROR`、トークンなしは `/auth/signin`。BOM のバイト列が保たれる。
  - `frontend/tests/unit/app/admin/reports/ReservationCsvExportForm.test.tsx`（新規。`ResourceFilterForm.test.tsx` の書き方に倣う）: `action` と `method`、日付とチェックボックスの `name`、`DRAFT` が出ない、開始日 > 終了日で送信が止まりメッセージが出る、同じ日付と片方だけの指定では止まらない。
  - `frontend/tests/unit/app/admin/reports/page.test.tsx`（新規。`resources/page.test.tsx` に倣う）: `error` の値ごとのメッセージ、未知の値は画面に出ない、`error` なしではメッセージがない。
  - 変異確認（該当行を一時的に壊して失敗を確かめ、元に戻す）を主要な 2〜3 か所で行う: Route Handler の `getAll`、フォームの日付の前後チェック、`nav-items` の追加。
- [x] **Step 21**: `pnpm format`（`oxfmt`）で整形し、`pnpm lint`、`pnpm test`、`pnpm format:check`、`pnpm exec tsc --noEmit` を実行する。`pnpm build` は実行しない。

### Part E: 要約と記録
- [x] **Step 22**: 重複ファイル（`*_modified.*` など）が作られていないことを確認する（`git status`）。コミットはしない。
- [x] **Step 23**: 実装の要約を `Docs/spec/aidlc-docs/construction/csv-export/code/code-summary.md` に作成する（変更・作成したファイル、設計からの差分、実行したコマンドと結果、確認できなかったこと、Step 5 の確認結果）。アプリケーションコードは置かない。
- [x] **Step 24**: `Docs/spec/aidlc-state.md` と `Docs/spec/aidlc-audit.md` を更新し、2 択の完了メッセージ（Request Changes / Continue to Build & Test）を提示して承認ゲートで止まる。

## 含めないもの
- Playwright の E2E テスト（要件の Q17 = B の範囲外）。
- 利用実績の集計 CSV、PDF 帳票、申請者やリソースでの絞り込み（要件の対象外）。
- DB マイグレーションとインデックスの追加（`start_at` のインデックスも含む。数値の性能目標がないため）。
- `requirements.md` の UC 一覧、UC の節、対象外の表の変更と、画面遷移図の更新（上記「承認時の判断」）。
- コミットと push、PR の作成。コミットは Build and Test の承認後に学習者の指示で行い、push と PR は学習者が行う。
- PostgreSQL と画面での確認、Excel での文字化けの確認（学習者が行う。Build and Test の手順書に確認項目を書く）。

## 要件との対応

| 要件・受入条件 | ステップ |
|---|---|
| FR-1（エンドポイント、ヘッダ） | 2、10、14 |
| FR-2（列）、FR-3（書式）、FR-4（インジェクション対策） | 2、9、12、14 |
| FR-5（絞り込み）、FR-6（並び順） | 2、7、8、13、14 |
| FR-7（ファイル名） | 2、10、14 |
| FR-8（認可） | 2、10、14 |
| FR-8（認可）の仕様側の反映、FR-9（管理者画面） | 3、3b、17〜20 |
| NFR-1〜3（認可、インジェクション対策、JWT の非露出） | 9、10、14、17、20 |
| NFR-4（N+1 回避） | 7、14 |
| NFR-5（文字化け防止、既存 API の互換） | 9、12、14、15 |
| NFR-6（4 レイヤー、CSV 生成の単体テスト） | 9、12 |
| 受入条件 1（ボタンでダウンロード） | 17、18、20 |
| 受入条件 2（日本語ヘッダ、BOM 付き UTF-8） | 9、12、14 |
| 受入条件 3（期間とステータスの絞り込み） | 8、14、18 |
| 受入条件 4（MEMBER / APPROVER は 403） | 10、14 |
| 受入条件 5（CSV 生成のユニットテスト） | 12 |

## Completion Criteria
- すべてのステップが `[x]` になっている。
- `./gradlew test`（全件）、`./gradlew spotlessCheck`、`./gradlew checkstyleMain`、`pnpm test`、`pnpm lint`、`pnpm format:check`、`pnpm exec tsc --noEmit` が通っている。実行できなかったものは、そのとおり要約に記載する。
- PostgreSQL での期間の境界と並び順、ブラウザでのダウンロード、Excel での文字化けは、学習者が確認する項目として要約に残す。実機で確認できなかったものを、確認したように書かない。
