# Unit Test Execution — reservation-draft（Issue #30）

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
cd backend && ./gradlew test --tests "*ReservationServiceTest" --tests "*ReservationControllerTest"
cd frontend && pnpm test reservations
```

### 2. Review Test Results

- **Expected**: backend 157 tests pass, 0 failures（既存分 + 今回の`ReservationServiceTest`追加分。`Create`/`Get`/`Update`/`Cancel`の各ネストクラスにDRAFT関連ケースを追加、うち2件はセルフレビューで発覚した重複予約チェックの非対称性への対応）。frontend 85 tests pass, 0 failures（既存分 + `reservations.test.ts`への3ケース追加：draft作成・submit正式申請・422）。
- **Test Coverage**: 明示的なカバレッジ計測ツール（JaCoCo 等）はプロジェクトに未導入。受入条件（Story 1〜6・RSV-08〜11）に基づくケース網羅（正常系・境界値・権限違反・不正遷移）で判断する。
- **Test Report Location**: backend `backend/build/reports/tests/test/index.html`（ネストクラスごとに `TEST-...$Create.xml` 等が生成される）。frontend は `vitest run` の標準出力（HTML レポートは未設定）。

### 3. Fix Failing Tests

If tests fail:

1. backend: `backend/build/reports/tests/test/index.html` で失敗クラス・メソッドを確認する。`ReservationService.update()`/`create()`のdraft/submit分岐やステータスガードの変更に伴う想定外の分岐が典型的な失敗要因。
2. frontend: `vitest run` の出力をそのまま確認する（失敗テストのアサーション差分が表示される）。`tests/unit/msw/handlers.ts` の `draft`/`submit` 分岐がリクエストボディと噛み合っているか確認する。
3. コードを修正し、該当テストのみ再実行して確認する。
4. 全体テスト（`./gradlew test` / `pnpm test`）を再実行し、他のテストに影響がないことを確認する。

## 今回のセッションでの実行結果

| コマンド | 結果 |
|---|---|
| `cd backend && ./gradlew test` | `BUILD SUCCESSFUL`（157 tests, 0 failures, 0 errors, 0 skipped） |
| `cd backend && ./gradlew test --tests "*ReservationServiceTest"` | `BUILD SUCCESSFUL`（32 tests: Create 8・Get 7・Update 10・Cancel 7） |
| `cd backend && ./gradlew test --tests "*ReservationControllerTest"` | `BUILD SUCCESSFUL`（30 tests） |
| `cd backend && ./gradlew spotlessCheck checkstyleMain checkstyleTest` | `BUILD SUCCESSFUL`（Checkstyle警告2件はいずれも既存の `ReservationRepository` メソッド名（Spring Data命名規約）に関するもので、今回の変更に起因しない） |
| `cd frontend && pnpm lint` | 警告・エラーなし |
| `cd frontend && pnpm test` | 10 files, 85 tests, 0 failures |
| `cd frontend && node_modules/.bin/tsc --noEmit` | 型エラーなし |
| `cd frontend && pnpm build` | `✓ Compiled successfully in 10.9min`、11ルート生成成功（詳細は `build-instructions.md` 参照） |
