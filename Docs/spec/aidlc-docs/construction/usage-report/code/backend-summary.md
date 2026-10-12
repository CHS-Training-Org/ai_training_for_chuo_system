# Backend Summary — usage-report

`GET /api/statistics/resources`（ADMIN のみ）を実装した。設計は `functional-design/` を参照。

## 変更ファイル

- Created: `backend/src/main/java/com/example/bookflow/application/UsageCalculator.java`（予約の利用時間を期間で切り詰めた秒で返す純粋関数。負は 0）
- Created: `backend/src/main/java/com/example/bookflow/domain/ApprovedUsage.java`（JPQL の構築子射影 record）
- Created: `backend/src/main/java/com/example/bookflow/presentation/dto/UsageCondition.java`・`ResourceUsageResponse.java`（record）
- Created: `backend/src/main/java/com/example/bookflow/application/StatisticsService.java`（`APPROVED` のみ取得、リソース別に件数と秒を合算して分へ切り捨て、有効なリソースは常に・無効なリソースは実績があるときだけ残し、合計時間の降順・件数の降順・名前の昇順に並べる）
- Created: `backend/src/main/java/com/example/bookflow/presentation/StatisticsController.java`（`@PreAuthorize("hasRole('ADMIN')")`、`from`/`to` の同時指定と `from < to` の検証）
- Modified: `backend/src/main/java/com/example/bookflow/domain/ReservationRepository.java`（`findApprovedUsage`・`findApprovedUsageByPeriod` を末尾に追加。`PERIOD_MATCH` を再利用）
- Created（テスト）: `UsageCalculatorTest`（11 件）、`StatisticsServiceTest`（13 件）、`StatisticsControllerTest`（19 件。OpenAPI の確認 1 件を含む）

## 検証

- `./gradlew spotlessApply checkstyleMain test --max-workers=1`：BUILD SUCCESSFUL。テストは 304 件すべて成功（既存 261 件 + 新規 43 件）。本ユニットで追加した本体コードからの Checkstyle 警告はない
- OpenAPI：`GET /v3/api-docs` に `/api/statistics/resources` が載ることを `StatisticsControllerTest.apiDocs_includesStatisticsEndpoint` で確認した（受入条件「Springdoc に反映」）
- break-and-verify（実装を一時的に壊して失敗を確認後に復元、7 種類）：
  - `@PreAuthorize` の削除 → 403 のテスト 2 件が失敗
  - `from >= to` の検証の削除 → 400 のテスト 2 件が失敗
  - 集計の status を `APPROVED` から `PENDING` に変更 → 結合テスト 8 件以上が失敗
  - 期間での切り詰めの無効化 → Service のテスト 1 件と結合テスト 2 件が失敗
  - 無効なリソースの選別の削除 → Service のテスト 1 件と結合テスト 4 件が失敗
  - 並び順の変更 → Service の並び順のテストが失敗
  - Controller のパスの変更 → 結合テストが失敗

## ストーリー対応

- US-01：配列と 4 項目・合計時間の降順を `StatisticsControllerTest`、並び順 3 段を `StatisticsServiceTest` で検証
- US-02：期間重複・境界隣接・切り詰め（22:00〜02:00 を 0:00 起点で 120 分）・片方のみと `from >= to` の 400 を `StatisticsControllerTest`、切り詰めの各境界を `UsageCalculatorTest` で検証
- US-03：PENDING・REJECTED・CANCELLED・DRAFT の除外と過去・未来の算入を `StatisticsControllerTest`、`APPROVED` 指定を `StatisticsServiceTest` で検証
- US-04：有効で実績なし（0・0）・無効で実績あり・無効で実績なしを `StatisticsServiceTest` と `StatisticsControllerTest` で検証
- US-05：MEMBER・APPROVER の 403、未認証の 401 を `StatisticsControllerTest` で検証

## 設計との差異・補足

- 設計どおり。差異なし
- テストは H2（PostgreSQL 互換モード）のみで実行している。JPQL の構築子式 `SELECT new ...ApprovedUsage(r.resource.id, ...)` を PostgreSQL 上で実行した確認はしていない（DB 非依存の設計だが、本番相当の DB での実行確認は手動確認事項として Build and Test に記録する）
- `StatisticsControllerTest` は H2 を他の結合テストと共有するため、2030 年の予約と接頭辞 `利用実績テスト` のリソースで seed し、自分のリソースだけを取り出して検証している（全件数に依存しない）。UUID の先頭は `73`
