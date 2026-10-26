# Build and Test Summary（csv-export）

実行日時: 2026-10-26。ブランチ: `feature/CHS-ANAN-MASAAKI/29-csv-export`。コミット・push は未実施。

## Build Status
- **Build Tool**: Gradle（BE）、pnpm（FE）
- **Build Status**:
  - BE: 成功（`./gradlew clean build --offline`。コンパイル、bootJar、spotlessCheck、checkstyle、全テストを含む）
  - FE: `pnpm build` は dev サーバーと `.next` を共有して壊れるため**実行していない**。代わりに `pnpm test`、`pnpm lint`、`pnpm format:check`、`pnpm exec tsc --noEmit` を実行し、いずれも成功。Next.js のプロダクションビルドは PR の CI（`CI Frontend`）で確認される。
- **Build Artifacts**: `backend/build/libs/bookflow-0.0.1-SNAPSHOT.jar`（と `-plain.jar`）
- **Build Time**: BE 27 秒

## Test Execution Summary

### Unit Tests
- **BE**: 214 件、成功 214、失敗 0（前回ワークフロー時点の 148 件より 66 件増。本課題の追加は `ReservationCsvWriterTest` 36 件、`ReportControllerTest` 22 件、`ReservationReportServiceTest` 8 件）
- **FE**: 130 件、成功 130、失敗 0（前回時点の 93 件より 37 件増。本課題の追加は Route Handler 12 件、フォーム 12 件、ページ 8 件、`api-client` 4 件、`nav-items` 2 件）
- **Coverage**: 計測未設定のため数値なし
- **変異確認**: BE 3 種（期間の境界、並び順の ID、インジェクション対策の `@`）、FE 3 種（`getAll("status")`、日付の前後チェック、`nav-items` の追加）で、いずれもテストが失敗することを確認して元に戻した（`unit-test-instructions.md`）。
- **Status**: Pass

### Static Checks
- `spotlessCheck`、`pnpm lint`、`pnpm format:check`: 指摘なし
- `checkstyleMain`: 警告 2 件（既存の `ReservationRepository` のメソッド名。新しい指摘なし）
- `checkstyleTest`: 警告 203 件（前回の 151 件から 52 件増。増えた分はすべて新しいテストメソッドの `MethodName` で、ADR-018 の `method_condition_expected` 命名によるもの。既存の 151 件と同じ種類）
- `pnpm exec tsc --noEmit`: 型エラーなし

### Integration Tests
- **BE 結合（H2、`ReportControllerTest`）**: 22 件、成功 22、失敗 0
- **FE Route Handler（MSW）**: 12 件、成功 12、失敗 0
- **PostgreSQL 上の API とブラウザでのダウンロード（一部実施。2026-10-26、AI（Claude）が実施し、学習者が結果を共有）**: 実施した項目はすべて期待どおり。
  - PostgreSQL の `curl`: ADMIN の全件（`200`、`text/csv;charset=UTF-8`、`Content-Disposition`、先頭 BOM、ヘッダ＋2 件の昇順）、`status=APPROVED` で 1 件、`status=PENDING&status=APPROVED` で 2 件、`from` > `to` で `400` `VALIDATION_ERROR`、0 件の期間で BOM とヘッダのみ、MEMBER で `403` `FORBIDDEN`、未認証で `401`
  - ブラウザ（Playwright、開発用ログイン）: ADMIN のサイドナビに「帳票出力」、`/admin/reports` で「CSV ダウンロード」を押すと 376 バイトの CSV がダウンロードされ BOM あり（内容は上と同じ）、`from` > `to` で送信されずメッセージが出る、MEMBER はナビに出ず `/admin/reports` を直接開くと 403 画面
- **未確認**: Excel での表示、backend 停止時のエラーメッセージ、期間の境界（`to` の日を含む）の PostgreSQL 上での確認、期間とステータスの AND、不正な `from` / `status` / 日時の `400`、APPROVER の `403`、ステータスの複数選択を画面から指定したダウンロード、MEMBER による `/api/reports/reservations/csv` の直接アクセス。詳細は `integration-test-instructions.md` の「実施結果」
- **Status**: H2 と MSW まで Pass。PostgreSQL とブラウザは主要な経路を確認済みで、上記が未確認

### Performance Tests
- **N/A**: 新しい性能要件がなく（`requirements.md` の NFR-4）、件数の少ない課題のため指示書を作成しない。ただし D-1 で `ResponseEntity<byte[]>` を選んだため、全件をメモリに載せてから返す。件数が大きく増える場合は、`StreamingResponseBody` への移行を検討する余地がある（CSV 生成部は `OutputStream` に書く形にしてあり、移行しやすい）。

### Additional Tests
- **Contract Tests**: N/A（単一のバックエンド）
- **Security Tests**: N/A（拡張機能は不適用）。ADMIN 限定の認可（`@PreAuthorize`）、CSV インジェクション対策、パラメータバインド（Criteria API）は自動テストで確認済み。
- **E2E Tests（Playwright）**: 未実行（要件の範囲外）
- **docs のビルド**: 未実行（ローカルでは実行不可）。PR の CI「Docs Check / build」で、リンクとアンカー（`#reports`、`#admin-reports`、`#datetime-format`、`#common-error`）の破損を確認する。

## 受入条件との対応

| # | 受入条件 | 確認状況 |
|---|---------|---------|
| 1 | 「CSV ダウンロード」ボタンで予約一覧が CSV としてダウンロードされる | Route Handler のテスト、フォームのテストで確認済み。ブラウザでも確認済み（376 バイトの CSV がダウンロードされ BOM あり） |
| 2 | 日本語ヘッダ行、UTF-8（BOM 付き） | `ReservationCsvWriterTest` と `ReportControllerTest` で確認済み。PostgreSQL の `curl` とブラウザのダウンロードでも先頭 BOM とヘッダを確認済み。**Excel での表示は未確認**（Scenario 3） |
| 3 | 期間・ステータスで絞り込んだ CSV をダウンロードできる | `ReportControllerTest`（H2。期間の境界、複数ステータス、AND）で確認済み。PostgreSQL ではステータスの絞り込みを確認済み。**期間の境界と AND は PostgreSQL 上で未確認** |
| 4 | MEMBER / APPROVER は 403 | `ReportControllerTest`（403 と JSON の `FORBIDDEN`）で確認済み。PostgreSQL の `curl` で MEMBER の 403 と未認証の 401、ブラウザで MEMBER の 403 画面を確認済み。APPROVER の実機確認は未実施 |
| 5 | BE に CSV 生成ロジックのユニットテストを追加 | `ReservationCsvWriterTest` 36 件を追加済み |

## Overall Status
- **Build**: Success（FE の `pnpm build` は指示により未実行）
- **All Tests（自動）**: Pass（BE 214 件、FE 130 件）
- **Ready for Operations**: 条件付き。次の 3 点を待つ。
  1. 未確認項目の確認（Excel での表示、期間の境界の PostgreSQL 上での確認など。`integration-test-instructions.md` の「実施結果」）
  2. PR の CI（`CI Frontend`、`CI Backend`、Docs Check / build）の通過
  3. PR の任意メモの記載（下記）

## PR の任意メモに書く点
- シートの「UC-07（CSV・帳票出力）」は、`requirements.md` の UC-07（予約一覧の確認・編集・キャンセル）と食い違っている。UC の番号と対象外の表は変更していない。権限マトリクスと画面アクセス権限表には、新しい API と画面を各 1 行追加した。
- 画面遷移図（`screen-spec-navigation.drawio` と `.drawio.svg`）に `/admin/reports` を追加していない。
- `index.md` と `screen-spec.md` の「全 10 画面」は、一覧表がすでに 11 行あったため、新しい画面を足して 12 に直した。
- `checkstyleTest` の警告が 52 件増えたのは、ADR-018 の命名規約に沿った新しいテストメソッドによる。
- ファイル名の日時はサーバー（コンテナ）のタイムゾーンの UTC になる（JST 15:01 に取得して `_060106`）。要件にタイムゾーンの定めがなく、今回は修正していない。
- 設計判断（D-1〜D-3、ほか）の比較表は `Docs/spec/aidlc-docs/inception/application-design/csv-export/application-design.md` の第 1 節（要約）と第 2 節（比較表）。

## Next Steps
- 未確認項目（`integration-test-instructions.md` の「実施結果」）を、必要に応じて学習者が確認して記録する。
- コミットは済ませる（push なし）。push と PR 作成は学習者が行う。PR 作成後に CI（`CI Frontend`、`CI Backend`、Docs Check / build）を確認する（Operations 相当）。
