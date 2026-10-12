# Build and Test Summary（usage-report）

## スコープ判定（Adaptive Execution）

- **Unit Tests**: ALWAYS EXECUTE（Code Generation で生成済み、本ステージで fresh な実行により確認）
- **Integration Tests**: EXECUTE（`StatisticsControllerTest`（H2）、`server/actions/statistics.test.ts` と `admin-reports-page.test.tsx`（MSW とモック）。モノリス構成のためレイヤー間と frontend / backend の契約の統合として扱う）
- **E2E Tests**: SKIP（新規 E2E は計画のスコープ外。既存スイートは本変更で壊れる経路がなく、実行環境（PostgreSQL・cognito-local）も未稼働）。代わりに手動確認手順を `e2e-test-instructions.md` に記載（未実施）
- **Performance Tests**: SKIP — 性能要件（NFR Requirements）自体が本ユニットで SKIP 判定。全件取得によるメモリ使用量の増加は要件で受け入れ済み
- **Contract Tests**: SKIP — マイクロサービス分割なし（モノリス）のため対象外。ただし OpenAPI（Springdoc）への反映は `StatisticsControllerTest` で確認した
- **Security Tests**: SKIP — Security Baseline 拡張は不採用。ADMIN 限定は機能要件として `StatisticsControllerTest`（403・401）と `admin-layout.test.tsx`（403 画面）で検証済み

## Build Status

- **Build Tool**: Gradle 9.5.1（backend）/ pnpm + Next.js 15（frontend）/ Docusaurus（docs-next）
- **Build Status**: Success（3 つとも）
- **Build Artifacts**: `backend/build/libs/bookflow-0.0.1-SNAPSHOT.jar`、`frontend/.next/`、`docs-next/build/`
- **Build Time**: backend `clean build --max-workers=1` 約 26 秒、frontend（lint、format:check、test、build）約 76 秒

## Test Execution Summary

### Unit Tests

- **Total Tests**: 537（backend 304 + frontend 233）
- **Passed**: 537
- **Failed**: 0
- **本ユニットの新規**: 96 件（backend 43 + frontend 53）
- **Coverage**: 未計測（カバレッジ計測ツールは本リポジトリの既定で未導入）
- **Status**: Pass

### Integration Tests

- **Test Scenarios**: 2（`StatisticsControllerTest` 19 件、`statistics.test.ts` 7 件と `admin-reports-page.test.tsx` 12 件。いずれも Unit Tests の件数に含まれる）
- **Passed**: 全件
- **Failed**: 0
- **Status**: Pass

### Additional Tests

- **E2E Tests**: N/A（上記の判定）。PostgreSQL での実行とブラウザでの実機確認は未実施
- **Contract / Security / Performance Tests**: N/A

## 品質ゲート

- backend：`./gradlew clean build --max-workers=1` が成功（`spotlessCheck`・`checkstyleMain`・`test` を含む）。本ユニットの本体コードからの Checkstyle 警告は 0 件
- frontend：`pnpm lint` エラーなし、`pnpm format:check` は All matched files use the correct format、`pnpm build` は Compiled successfully で `ƒ /admin/reports` が動的ルートとして登録
- docs-next：`npm run build` が成功

## break-and-verify の記録

実装を一時的に壊し、該当テストが失敗することを確認してから復元した（Code Generation 時に実施）。

- backend（7 種類）：`@PreAuthorize` の削除、`from >= to` の検証の削除、集計の status を `APPROVED` 以外に変更、期間での切り詰めの無効化、無効なリソースの選別の削除、並び順の変更、Controller のパスの変更
- frontend（7 種類）：棒の幅の計算、時間の換算、フォームの `from >= to` の検証、`VALIDATION_ERROR` の捕捉、ナビ項目の削除、秒補完、`admin/layout.tsx` のガード

## 既知の制約

- **PostgreSQL での実行は未確認**：テストは H2（PostgreSQL 互換モード）のみで、JPQL の構築子式の PostgreSQL 上での実行は `e2e-test-instructions.md` の手順 A で PR 前に確認する
- **ブラウザでの実機確認は未実施**：棒グラフの見た目と期間フィルタの操作は、手順 B で確認する
- **画面遷移図は未更新**：`screen-spec-navigation.drawio.svg` に `/admin/reports` をまだ反映していない（screen-spec に注記済み）
- 件数上限なしの全件取得のため、大量データ時はメモリ使用量が増える（要件で受け入れ済み）

## Overall Status

- **Build**: Success
- **All Tests**: Pass（537 件。E2E は未実行）
- **Ready for Operations**: Yes（PostgreSQL とブラウザでの確認を除く）

## Next Steps

Operations フェーズ（BookFlow では CI 品質ゲート `CI Frontend` / `CI Backend` 相当）へ進む。その前に `e2e-test-instructions.md` の手動確認（特に PostgreSQL での実行）を行う。PR 作成は `/commit-push` でコミットを分割し、`/create-pr` で AI 活用箇所を明記する。
