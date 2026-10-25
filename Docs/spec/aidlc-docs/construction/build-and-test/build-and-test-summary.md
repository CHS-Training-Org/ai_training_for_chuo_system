# Build and Test Summary

対象: Issue #29 CSV 帳票出力（`csv-export`）。実施日: 2026-10-24。

## 記録の出典

- Backend・Frontend のコマンドは、Build and Test ステージで現在のコードに対して再実行した結果（`--rerun-tasks` で Backend のテストとチェックスタイルを再実行）。
- 実画面確認は、ユーザーが実施した結果（`integration-test-instructions.md`）。
- 仕様書のリンク・アンカーは、`docusaurus` が未導入のため、grep と簡易スクリプトによる代替確認の結果。

## Build Status

- **Build Tool**: Gradle wrapper（Backend）/ pnpm（Frontend）
- **Build Status**: 成功（Backend のコンパイルは `./gradlew test` に含まれる。Frontend は `pnpm build` が成功）
- **Build Artifacts**: `frontend/.next/`（`.gitignore` 対象）、Backend のテストレポートは `backend/build/reports/tests/test/`
- **Build Time**: `./gradlew test`（`--rerun-tasks`）14 秒、`pnpm build` は Compiled 30.3 秒

## 実行結果

### A. Backend（`cd backend`）

| # | コマンド | 結果 |
|---|---|---|
| A1 | `./gradlew test --rerun-tasks` | 成功。25 クラス・200 件、failures 0、errors 0、skipped 0（結果 XML で集計） |
| A2 | `./gradlew spotlessCheck` | 成功（整形差分なし） |
| A3 | `./gradlew checkstyleMain --rerun-tasks` | 成功。警告 2 件のみ（`ReservationRepository.java` の既存メソッド名 `findByResource_IdAndStatusIn`〔37 行目〕、`findByResource_IdInAndStatusIn`〔49 行目〕。今回の変更前から存在） |

### B. Frontend（`cd frontend`）

| # | コマンド | 結果 |
|---|---|---|
| B1 | `pnpm lint` | 成功（終了コード 0、指摘なし） |
| B2 | `pnpm format:check` | 成功（85 ファイルすべて整形済み） |
| B3 | `pnpm test` | 成功。14 ファイル・112 件 pass、失敗なし |
| B4 | `npx tsc --noEmit` | 成功（終了コード 0、エラーなし） |
| B5 | `pnpm build` | 成功（終了コード 0。Next.js 15.5.18、Compiled successfully、静的ページ 11/11 を生成、`/reservations` を含む全ルートが生成された） |

#### `pnpm build` について

- 前ワークフロー（#23）では、ユーザーの報告で `next/font` により失敗していた（原因は未調査）。今回は同じ環境（devcontainer）で成功し、失敗は再現しなかった。
- 今回の変更に起因する失敗はない。#23 の失敗の原因は、今回も特定していない（再現しなかったため）。

### C. 結合・E2E・その他

| 項目 | 結果 |
|---|---|
| BE の結合テスト | A1 に含まれる。`ReportControllerTest` 20 件、`ReservationSpecificationsTest` 7 件はいずれも pass |
| 実画面での結合確認 | ユーザーが実施。ADMIN / MEMBER / APPROVER の確認結果はすべて期待どおり（詳細は `integration-test-instructions.md`） |
| E2E（Playwright） | 対象外。`frontend/tests/e2e/` には `example.spec.ts` しかなく、CI も実行しない。E2E の追加は課題のスコープ外（後続課題） |
| 性能テスト | 対象外。件数上限なし・一括返却の設計（Application Design Q2）で、専用の性能テストは課題の範囲外 |
| セキュリティテスト | 対象外。Security Baseline 拡張は無効。認可は `ReportControllerTest` で確認済み（403 / 401） |
| 契約テスト | 対象外。OpenAPI クライアント自動生成は後続課題 |

### D. 仕様書の代替確認（`docs-next/docs/spec/`）

`docusaurus` が未導入のため `npm run build` は実行していない（`npm ci` による依存導入は行わない方針）。代わりに、`api-spec.md`・`requirements.md`・`screen-spec.md` の内部リンクを機械的に確認した。

- 確認した内部リンク: 36 件
- 今回の変更で追加・変更した行にあるリンク: 壊れているものなし（新規アンカー `{#uc-09}`、`{#report-reservations-csv}` と、参照先 `{#datetime-format}`、`{#common-error}`、`{#auth-method}` の実在を確認）
- 変更していない行: スクリプト上は 8 件が未解決と判定されたが、いずれもサイト絶対パスの図（`/diagrams/spec/*.drawio.svg`）への参照で、`docs-next/static/diagrams/spec/` に 8 件すべてのファイルが存在することを確認した（実質的な破損なし）
- 3 ファイルの `last_updated` が更新されていることを確認した

この確認は、Docusaurus のビルド（リンク・アンカーの検証を含む）の代替にはならない。ビルドでの確認は、依存導入が可能な環境（CI の `docs-check.yml` など）に委ねる。

## 未実施項目とその理由

| 項目 | 理由 |
|---|---|
| `docs-next` の `npm run build` | `docusaurus` 未導入。`npm ci` による依存導入をしない方針のため |
| `pnpm install --frozen-lockfile` | 依存は導入済みで、変更していないため |
| 実画面での複数ステータス選択・期間境界の細部・エスケープ | 自動テストで確認済み。実画面では未確認 |
| ダウンロードした CSV を Excel で開いた表示 | 未確認（Excel での確認は行っていない） |
| 実 PostgreSQL に対する自動テスト | 自動テストは H2。実画面確認は実 Postgres で行った（予約 2 件） |
| カバレッジの計測 | 計測していない |
| E2E・性能・セキュリティ・契約テスト | 上記のとおり対象外 |

## 今回の変更に起因する未解決事項

なし。

## Overall Status

- **Build**: 成功
- **All Tests**: 成功（Backend 200 件、Frontend 112 件。失敗 0）
- **静的検査**: 成功（Backend の Checkstyle 警告 2 件は既存の未変更コード）
- **実画面確認**: 成功（ユーザー実施）
- **Ready for Operations**: Yes（CI 品質ゲート `CI Frontend` / `CI Backend` と同じコマンドがすべて成功している。残る確認は PR 作成後の CI の実行結果）

## Next Steps

Operations（BookFlow では CI 品質ゲートで運用）に進む準備ができている。次の手順は PR の作成（`/create-pr`、コミットの分割・push は `/commit-push`）。
