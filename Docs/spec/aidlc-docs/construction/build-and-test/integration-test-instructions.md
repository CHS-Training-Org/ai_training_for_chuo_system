# Integration Test Instructions

## Purpose

BookFlow はモノリス構成（マイクロサービス分割なし）のため、ここでの「統合テスト」は以下2層を指す。

1. **Controller ↔ Service ↔ Repository（H2）統合**: `ReservationControllerTest`（JUnit 5 + MockMvc + H2）
2. **Frontend Server Action ↔ Backend API 統合**: Playwright E2E（`e2e-test-instructions.md` を参照、本ユニットでは既存スイートの回帰確認のみ実施）

## Test Scenarios

### Scenario 1: ReservationController → ReservationService → H2

- **Description**: HTTP リクエスト（JSON）から DB 永続化までを MockMvc + 組み込み H2 で検証する
- **Setup**: `./gradlew test` 実行時に Spring Boot Test コンテキストが自動起動（追加のサービス起動不要）
- **Test Steps**: `backend/src/test/java/com/example/bookflow/presentation/ReservationControllerTest.java` を参照。DRAFT 作成（201）・DRAFT 内容更新（200）・DRAFT 詳細アクセス制御（403）等、本ユニットで追加した9シナリオを含む
- **Expected Results**: 全シナリオでステータスコード・レスポンスボディが仕様（`docs-next/docs/spec/api-spec.md`）どおり
- **Cleanup**: `@Transactional` ロールバックにより自動クリーンアップ（手動操作不要）

## Setup Integration Test Environment

### 1. Start Required Services

```bash
# 不要（H2 インメモリDBを使用するため、PostgreSQL起動は不要）
```

### 2. Configure Service Endpoints

```bash
# 不要（Spring Boot Test が組み込みサーバーでコンテキストを起動）
```

## Run Integration Tests

### 1. Execute Integration Test Suite

```bash
cd backend && ./gradlew test --tests "*ReservationControllerTest"
```

### 2. Verify Service Interactions

- **Test Scenarios**: 9件（本ユニット新規分）。既存シナリオを含めた全体は `ReservationControllerTest` 全件（`./gradlew test` の一部として実行）
- **Expected Results**: 全件成功。201/200/403 のステータスコード検証を含む
- **Logs Location**: `backend/build/reports/tests/test/classes/com.example.bookflow.presentation.ReservationControllerTest.html`

### 3. Cleanup

```bash
# 不要（H2インメモリDBはテストプロセス終了時に破棄される）
```
