# Code Summary: csv-export

**作成日時**: 2026-10-26T05:53:48+00:00
**計画**: `Docs/spec/aidlc-docs/construction/plans/csv-export-code-generation-plan.md`（全 24 ステップ）
**設計**: `Docs/spec/aidlc-docs/inception/application-design/csv-export/`

コミットはしていない（push と PR は学習者）。`pnpm build` と docs のビルドは実行していない。

## 変更・作成したファイル

### 仕様（docs-next/docs/spec/）
| 区分 | ファイル | 内容 |
|---|---|---|
| 変更 | `api-spec.md` | 設計方針の「レスポンス形式」に CSV の例外を追記。エンドポイント一覧に「帳票出力」を追加。§帳票出力（`{#reports}`）を新設し `GET /api/reports/reservations/csv`（パラメータ、期間の判定、列、書式規則、エラー）を記載 |
| 変更 | `screen-spec.md` | 画面一覧に #12 `/admin/reports`、サイドナビ表に「帳票出力」、§帳票出力 の `/admin/reports` の節（UI 要素、動作、エラー時の動作、バリデーション）を追加。description の「全 10 画面」を 12 に修正 |
| 変更 | `index.md` | 管理ファイル一覧の「全 10 画面」を 12 に修正 |
| 変更 | `requirements.md` | API 権限マトリクスに `GET /api/reports/reservations/csv`（ADMIN のみ）、画面アクセス権限表に `/admin/reports`（ADMIN のみ）を各 1 行追加。UC 一覧、UC の節、対象外の表は変更していない |

いずれも `last_updated` を更新した。画面遷移図（`screen-spec-navigation.drawio` と `.drawio.svg`）は、学習者の判断どおり更新していない。

### backend
| 区分 | ファイル |
|---|---|
| 変更 | `domain/ReservationRepository.java`（`JpaSpecificationExecutor<Reservation>` を継承に追加。既存メソッドは変更なし） |
| 作成 | `domain/ReservationSpecifications.java`（`fetchResourceAndRequester` / `startAtFrom` / `startAtBefore` / `statusIn`） |
| 作成 | `application/ReservationCsvRow.java`（record） |
| 作成 | `application/ReservationReportService.java`（検証、期間の組み立て、取得、行への詰め替え） |
| 作成 | `presentation/csv/ReservationCsvWriter.java`（BOM、ヘッダ、書式、ラベル、インジェクション対策、RFC 4180、CRLF） |
| 作成 | `presentation/ReportController.java`（`GET /api/reports/reservations/csv`、ADMIN 限定） |
| 作成（テスト） | `presentation/csv/ReservationCsvWriterTest.java`、`application/ReservationReportServiceTest.java`、`presentation/ReportControllerTest.java` |

### frontend
| 区分 | ファイル |
|---|---|
| 変更 | `src/lib/api-client.ts`（`getRaw` を追加。既存メソッドは変更なし） |
| 変更 | `src/components/layout/nav-items.ts`（ADMIN 専用項目に「帳票出力」） |
| 作成 | `src/app/api/reports/reservations/csv/route.ts`（Route Handler） |
| 作成 | `src/app/(authenticated)/admin/reports/page.tsx`、`ReservationCsvExportForm.tsx` |
| 変更（テスト） | `tests/unit/layout/nav-items.test.ts` |
| 作成（テスト） | `tests/unit/lib/api-client.test.ts`、`tests/unit/app/api/reports/csv-route.test.ts`、`tests/unit/app/admin/reports/ReservationCsvExportForm.test.tsx`、`tests/unit/app/admin/reports/page.test.tsx` |

`git status` で `*_modified.*` などの重複ファイルがないことを確認した。

## 設計方針からの差分

- **Specification の API の確認方法（Step 5）**：計画では `javap` で jar を確認するとしたが、実行に承認が要り使えなかった。代わりに `./gradlew compileJava --offline` が通ることで、`Specification.allOf(...)`、ラムダ形式の `toPredicate`、`findAll(spec, sort)` が Spring Data JPA 4.0.5 に存在することを確認した。`javap` による仕様の細部（非推奨の有無など）は見ていない。
- **Route Handler のトークン取得**：設計は `createApiClient(getAccessToken)` だったが、トークンなしのときに backend を呼ばずに `/auth/signin` へ返すため、先に `getAccessToken()` を呼んで `null` を判定し、`createApiClient(async () => token)` に渡した（`getAccessToken` を二重に呼ばない）。挙動は設計と同じ。
- **`export const dynamic = "force-dynamic"`** を Route Handler に追加した（リクエストごとに必ず実行されることを明示するため）。設計書にはない。
- **リダイレクト**は `Response.redirect(new URL(path, request.url), 303)`。
- **条件なしの述語**は `cb.conjunction()`（設計どおり）。`Specification` 自体に `null` を返す書き方は使っていない。

## 実行したコマンドと結果

| コマンド | 結果 |
|---|---|
| `./gradlew spotlessApply compileJava --offline` | 成功 |
| `./gradlew test --offline`（全件） | 成功、失敗 0。214 件（前回ワークフローの時点の 148 件より 66 件増。内訳: `ReservationCsvWriterTest` 36、`ReportControllerTest` 22、`ReservationReportServiceTest` 8） |
| `./gradlew spotlessCheck` | 成功 |
| `./gradlew checkstyleMain` | 警告 2 件（既存の `ReservationRepository` の `findByResource_IdAndStatusIn` と `findByResource_IdInAndStatusIn` の `MethodName`。新しい指摘なし） |
| `./gradlew checkstyleTest` | 警告 203 件（前回の 151 件から 52 件増）。増えた分はすべて新しいテストメソッドの `MethodName`（ADR-018 の `method_condition_expected` 命名がパターン `^[a-z][a-zA-Z0-9]*$` に合わないため。既存の 151 件と同じ種類）。`BUILD SUCCESSFUL` |
| `pnpm test` | 16 ファイル、130 件成功（前回ワークフローの時点の 93 件より 37 件増） |
| `pnpm lint` | 指摘なし |
| `pnpm format:check` | 通過（`pnpm format` で整形済み） |
| `pnpm exec tsc --noEmit` | 型エラーなし |

## 変異確認（該当箇所を一時的に壊してテストの失敗を確かめ、元に戻した）

| 変異 | 結果 |
|---|---|
| BE: `to.plusDays(1)` を `to` に | `ReportControllerTest` 6 件が失敗 |
| BE: 並び順の `id` を昇順から降順に | `ReportControllerTest` 5 件と `ReservationReportServiceTest` 1 件が失敗 |
| BE: インジェクション対策の対象文字から `@` を除く | `ReservationCsvWriterTest` 1 件が失敗 |
| FE: Route Handler の `getAll("status")` を `get` に | `csv-route.test.ts` 2 件が失敗 |
| FE: フォームの `from > to` を `from < to` に | `ReservationCsvExportForm.test.tsx` 3 件が失敗 |
| FE: `nav-items` の「帳票出力」を削除 | `nav-items.test.ts` 2 件が失敗 |

変異は元に戻し、最終状態で全件成功を再確認した。ソースに変異の痕跡が残っていないことは、該当行の grep でも確認した。

## 確認できなかったこと（学習者が確認する項目）

- **PostgreSQL での動作**：結合テストは H2。期間の境界（`to` の日を含む、翌日 0 時ちょうどを含まない）、並び順（同時刻の予約 ID 順）、複数ステータスの `IN`、JOIN FETCH が PostgreSQL でも期待どおりか。
- **ブラウザでの実際のダウンロード**：`/admin/reports` からボタンを押してファイルが保存されること、ファイル名、サインインしていない状態で `/auth/signin` に遷移すること、MEMBER でのアクセスが 403 画面になること。開発用のロール別ログインボタンを使う。
- **Excel（または相当のアプリ）での文字化けがないこと**。BOM が付いていることはバイト列で確認したが、アプリ上での表示は見ていない。
- **Route Handler のリダイレクト先の絶対 URL**：`request.url` を基準にしているため、リバースプロキシやコンテナ越しにホスト名が変わる環境で Location が期待どおりになるかは、ローカルの `localhost:3000` 以外では見ていない。
- **docs のビルド**：ローカルで実行できないため、リンクとアンカー（`#reports`、`#admin-reports`、`#datetime-format`、`#common-error`）の破損は CI の Docs Check / build で確認する。
- **E2E（Playwright）**：要件の範囲外のため実行していない。
- **`Content-Type` の表記**：実際のヘッダは `text/csv;charset=UTF-8`（空白なし）で、api-spec の例は `text/csv; charset=UTF-8`（空白あり）。意味は同じで、テストは `containsString` で確認している。

## PR の任意メモに書く点

- シートの「UC-07（CSV・帳票出力）」は、`requirements.md` の UC-07（予約一覧の確認・編集・キャンセル）と食い違っている。UC の番号と対象外の表は変更していない。
- 画面遷移図（`screen-spec-navigation.drawio` と `.drawio.svg`）に `/admin/reports` を追加していない。
- `index.md` と `screen-spec.md` の「全 10 画面」は、一覧表がすでに 11 行あったため、新しい画面を足して 12 に直した。
- `checkstyleTest` の警告が 52 件増えたのは、ADR-018 の命名規約に沿った新しいテストメソッドによる。
- 設計判断（D-1〜D-3、ほか）の比較表は `Docs/spec/aidlc-docs/inception/application-design/csv-export/application-design.md` の第 1 節（要約）と第 2 節（比較表）。
