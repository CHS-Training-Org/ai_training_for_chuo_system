# Unit Test Execution — resource-list-filter（Issue #23）

## Run Unit Tests

### 1. Execute All Unit Tests

```bash
# backend（JUnit5 + Mockito、H2）
cd backend && ./gradlew test

# frontend（Vitest）
cd frontend && pnpm test
```

対象のみ絞り込む場合:

```bash
cd backend && ./gradlew test --tests "*ResourceServiceTest" --tests "*ResourceControllerTest"
cd frontend && pnpm test resources
```

### 2. Review Test Results

- **Expected**: backend 133 tests pass, 0 failures（既存107件 + 今回追加分。`ResourceServiceTest` に `ListWithKeyword` ネストクラス6件、`ResourceControllerTest` に4件追加）。frontend 81 tests pass, 0 failures（既存80件 + 今回追加1件）。
- **Test Coverage**: 明示的なカバレッジ計測ツール（JaCoCo 等）はプロジェクトに未導入。受入条件に基づくケース網羅（正常系・境界値・0件・AND条件）で判断する。
- **Test Report Location**: backend `backend/build/reports/tests/test/index.html`。frontend は `vitest run` の標準出力（HTML レポートは未設定）。

### 3. Fix Failing Tests

If tests fail:

1. backend: `backend/build/reports/tests/test/index.html` で失敗クラス・メソッドを確認する。`ResourceService.list(...)` のシグネチャ変更に伴う呼び出し側の引数不整合が典型的な失敗要因。
2. frontend: `vitest run` の出力をそのまま確認する（失敗テストのアサーション差分が表示される）。
3. コードを修正し、該当テストのみ再実行して確認する。
4. 全体テスト（`./gradlew test` / `pnpm test`）を再実行し、他のテストに影響がないことを確認する。

## 今回のセッションでの実行結果

| コマンド | 結果 |
|---|---|
| `cd backend && ./gradlew test` | `BUILD SUCCESSFUL`（133 tests, 0 failures, 0 errors, 0 skipped） |
| `cd backend && ./gradlew spotlessCheck checkstyleMain` | `BUILD SUCCESSFUL`（Checkstyle警告2件はいずれも既存の `ReservationRepository` メソッド名に関するもので、今回の変更に起因しない） |
| `cd frontend && pnpm lint` | 警告・エラーなし |
| `cd frontend && pnpm test` | 10 files, 81 tests, 0 failures |
| `cd frontend && pnpm build` | `✓ Compiled successfully`、型エラーなし、11ルート生成 |
