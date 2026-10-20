# Build and Test Summary — csv-export

## Build Status

- **Build Tool**: Gradle（backend） / pnpm（frontend） / npm（docs-next）
- **Build Status**: Success（`./gradlew build`、`pnpm build`、`npm run build` いずれも成功）
- **Build Artifacts**: `backend/build/libs/bookflow-0.0.1-SNAPSHOT.jar`、`frontend/.next/`（`ƒ /admin/reports`・`ƒ /api/reports/reservations/csv` を含む）
- **Build Time**: backend 約 8 秒（キャッシュあり）、frontend 約 40 秒（コンパイル）

## Test Execution Summary

### Unit Tests

- **Total Tests**: backend 197 件（本ユニットの新規 63 件を含む）、frontend 113 件（13 ファイル）
- **Passed**: 全件
- **Failed**: 0
- **Coverage**: 計測なし（カバレッジ計測ツールは未導入）
- **Status**: Pass
- **静的検査**: `spotlessCheck`・Checkstyle（既存と同種の警告のみ）・`pnpm lint`・`pnpm format:check`・`tsc --noEmit` いずれも問題なし

### Integration Tests

- **Test Scenarios**: 自動 21 件（`ReportControllerTest`・H2）+ 手動 2 シナリオ（実 PostgreSQL・実 BE・実 FE）
- **Passed**: 全件
- **Failed**: 0（ただし下記「発見した問題」の 1 件を、手動確認で見つけてその場で修正した）
- **Status**: Pass

### Performance Tests

目安の記録のみ（合否なし）。詳細は `performance-test-instructions.md`。

- **20,000 件**: 約 5 MB、約 3〜4.5 秒。6 回連続でも BE の RSS は 408〜419 MB で増えない
- **300,000 件**: 約 74 MB、約 300 秒で完走。メモリは増えない（HWM 419 MB のまま）
- **`request-timeout`**: 未設定（既定）では約 30 秒で途中切断（30 万件で 33,500 行）。`300s` 設定で 30 万件まで完走。**明示設定は必要**で、`300s` を確定する
- **Status**: 目安として記録（Pass/Fail なし）

### Additional Tests

- **Contract Tests**: N/A（単一リポジトリ内の単一 API）
- **Security Tests**: Pass（`security-test-instructions.md`。SECURITY-05 / 08 / 15 / 03 / 11 compliant、04 は Partial（既知のギャップ）、non-compliant 0）
- **E2E Tests**: N/A（Playwright は本ユニットのスコープ外）
- **手動確認（Excel）**: Pass（V-02。学習者が実施。#1〜#9 すべて ○。2026-10-20）
- **手動確認（ブラウザ）**: Pass（報告された範囲。学習者が実施。ADMIN での画面表示・条件なしのダウンロード・不正な期間の警告とリダイレクト後の URL（`0.0.0.0` にならない）・MEMBER の 403 とサイドナビ非表示。2026-10-20）。一部の任意項目は未報告（下記「未報告の項目」）。FE 結合は `curl` と cookie でも実機確認済み

## 発見した問題

1. **303 リダイレクトの `Location` が内部ホスト（`http://0.0.0.0:3000/...`）になっていた**（実機確認で発見。単体テストは pass していた）。`Location` を相対パスにして修正し、単体テストに相対パスの検証を追加、`curl` での実機確認に加え、ブラウザでも `http://localhost:3000/...` になることを学習者が確認した。詳細は `integration-test-instructions.md`。
2. **処理時間が件数に対して線形でない**。30 万件で約 300 秒となり、`request-timeout`（300 秒）にほぼ一致した。深いオフセットで並べ替えが重くなるため（`start_at` にインデックスなし）。現状の規模では問題ないが、実用上の上限は約 30 万件。改善案はキーセット方式またはインデックス追加。

## 設計判断の結果（V-01〜V-05）

| # | 内容 | 結果 |
|---|---|---|
| V-01 | 実 PostgreSQL で `findForReport` の全組み合わせ | ✅ 全ケース成功。`CAST` 方式を確定（番兵値方式は不要） |
| V-02 | Excel で CSV を開く | ✅ 学習者が実施、#1〜#9 すべて ○（2026-10-20。→ `manual-test-instructions.md`）。数式注入対策と BOM 付き UTF-8 が Excel で実際に効くことを確認 |
| V-03 | 大量件数・メモリ | ✅ 完走・メモリ増加なし（目安） |
| V-04 | `request-timeout` の挙動 | ✅ 既定は約 30 秒で切断、`300s` で 30 万件まで完走。`300s` を確定 |
| V-05 | 自動テスト対象外の明記 | ✅ `manual-test-instructions.md` |

## 残余リスク・既知の制約

1. **途中切断をクライアントが検知できない**: タイムアウトや DB エラーで CSV が欠けても、HTTP 応答は正常終了に見える（`curl` の終了コード 0）。WARN ログで事後に追跡するのみ。対策（末尾の件数行など）は別課題。
2. タイムアウト時に `GlobalExceptionHandler` が `Unexpected error` を ERROR（スタックトレース付き）で 1 件出す。応答は確定済みで影響はないが、ログのノイズになる。
3. オフセット方式による、出力中の更新での行の重複・欠落（まれ）。
4. ADMIN アカウントの侵害による一括持ち出しは防止しない（実行ログは検知の材料）。
5. SECURITY-04 のアプリ全体のヘッダ（CSP / HSTS / `X-Frame-Options`）は未設定（別課題）。
6. **未報告の項目**（ブラウザ確認のうち、報告がなく確認済みとは扱わないもの。いずれも自動テストまたは `curl` では確認済み。なお、リダイレクト後のアドレス欄が `http://localhost:3000/admin/reports?error=VALIDATION_ERROR` になり `0.0.0.0` にならないこと、MEMBER のサイドナビに「帳票出力」が出ないことは、追加の報告で確認済み）:
   - ステータスで絞り込んだダウンロード（任意項目）
   - 帳票出力画面の個別の UI 要素（入力欄・5 つのチェックボックス・ボタン）

## Overall Status

- **Build**: Success
- **All Tests**: Pass（自動 + 手動）。Excel 確認（V-02）は全項目 ○。ブラウザ確認は報告された範囲で ○（未報告の項目あり。上記「残余リスク・既知の制約」6）
- **Ready for Operations**: Yes

## Next Steps

BookFlow では Operations は CI 品質ゲート（`CI Backend` / `CI Frontend`）が相当する。コードと成果物をコミットして PR を作成し、CI の成功を確認する。PR 文面には、AI 活用箇所と、手動確認（V-02 の Excel 確認・ブラウザ確認）の結果と、未報告の項目があることを明記する。
