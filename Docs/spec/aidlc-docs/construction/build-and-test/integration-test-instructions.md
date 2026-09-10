# Integration Test Instructions — resource-list-filter（Issue #23）

## Purpose

BookFlow はモノリシック構成（単一の `backend` アプリケーション、単一の `frontend` アプリケーション）であり、マイクロサービス間の結合テストは存在しない。本課題における「統合テスト」は、`ResourceControllerTest`（`@SpringBootTest` + H2 インメモリDB）による **Controller → Service → Repository → DBスキーマ** の一気通貫の検証を指す（Reverse Engineering `code-structure.md` で確認済みの既存パターン）。

## Test Scenarios

### Scenario 1: `GET /api/resources?keyword=...` → ResourceController → ResourceService → ResourceRepository → H2

- **Description**: `keyword` クエリパラメータが Controller から Service に渡り、Java 側フィルタ（`listFiltered`/`matchesKeyword`）を経て、H2 に投入したシードデータに対して正しく絞り込まれることを確認する。
- **Setup**: `ResourceControllerTest.insertSeedData()`（`@BeforeEach`）でシードリソース（`description`＝「プロジェクター完備」を含む）を H2 に投入。
- **Test Steps**: `list_keywordMatchingName_returnsMatchingResource`／`list_keywordMatchingDescription_returnsMatchingResource`／`list_keywordNotMatching_returnsEmptyContent`／`list_keywordWithCategory_appliesAndCondition` を実行。
- **Expected Results**: name/description 一致時は対象リソースが `content` に含まれる。不一致時は空配列。カテゴリとのAND条件では両方満たす場合のみ含まれる。
- **Cleanup**: `deleteSeedData()`（`@AfterEach`）でシードデータを削除（既存の仕組みをそのまま使用）。

### Scenario 2: 既存フィルタ（`category`/`from`/`to`）との回帰確認

- **Description**: `keyword` 追加によって既存の `category`/`from`/`to` フィルタの挙動が変わっていないことを確認する。
- **Setup**: Scenario 1 と同じシードデータ。
- **Test Steps**: 既存テスト（`list_memberWithoutFilter_returnsActiveResourcesOnly`、`list_withTimeRangeOverlappingReservation_excludesOccupiedResource` 等）をそのまま再実行。
- **Expected Results**: 変更前と同じ結果（回帰なし）。
- **Cleanup**: 同上。

## Setup Integration Test Environment

### 1. Start Required Services

```bash
# H2 インメモリDBを使用するため、追加のDocker Composeサービス起動は不要
cd backend
```

### 2. Configure Service Endpoints

不要（`@SpringBootTest` がテスト用アプリケーションコンテキストを起動し、`src/test/resources/application-test.yml` の設定で H2 に接続する）。

## Run Integration Tests

### 1. Execute Integration Test Suite

```bash
cd backend && ./gradlew test --tests "*ResourceControllerTest"
```

### 2. Verify Service Interactions

- **Test Scenarios**: 上記 Scenario 1・2（計 9 件のリスト系テストケースのうち、今回追加した4件を含む）。
- **Expected Results**: すべて pass（このセッションで確認済み）。
- **Logs Location**: `backend/build/reports/tests/test/`（テストごとの詳細ログ・スタックトレース）。

### 3. Cleanup

```bash
# 特別な後片付けは不要（H2 はテストプロセス終了時に破棄される）
```
