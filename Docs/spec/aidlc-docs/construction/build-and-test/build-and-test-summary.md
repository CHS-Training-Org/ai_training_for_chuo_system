# Build and Test Summary — reservation-list-filter

## 適用範囲の判定

本ユニットは単一 Issue（#24）に対する brownfield の縦切り修正であり、Workflow Planning で NFR Requirements/Design・Infrastructure Design は SKIP 済み（新規 NFR・インフラ要求なし）。これに整合させ、Build and Test でも以下のとおり適用範囲を絞った（resource-search・resource-sort ユニットと同じ判定基準）。

| テスト種別 | 判定 | 理由 |
|---|---|---|
| Unit Test | 実施 | `ReservationServiceTest`（Mockito）・`reservations.test.ts`（Vitest + MSW）・`reservation-filter-form.test.tsx`（React Testing Library） |
| Integration Test | Unit Test に統合して実施 | `ReservationControllerTest`（H2 実データに対する MockMvc 結合テスト）が本リポジトリの唯一の結合テスト層であり、`./gradlew test` に含まれる。独立した Integration Test ステージは設けない |
| Performance Test | SKIP | NFR Requirements が SKIP 済み（性能要件なし） |
| Contract Test | SKIP | マイクロサービス構成ではない（モノレポ・単一 backend） |
| Security Test | SKIP | Security Baseline 拡張は Requirements Analysis で不採用と決定済み |
| E2E Test | SKIP | `requirements.md` のスコープ外として明記済み |

## Build Status

- **Backend**: `./gradlew build` → `BUILD SUCCESSFUL`（`build/libs/bookflow-0.0.1-SNAPSHOT.jar` 生成）
- **Frontend**: `pnpm build` → 成功（型チェック・全 13 ルートの静的生成含む、`/reservations` ルートを含む）

## Test Execution Summary

### Backend（`./gradlew test`）

- **Total Tests**: 176（resource-search・resource-sort ユニットまでの既存分 + reservation-list-filter ユニットの新規 19 件：`ReservationServiceTest$List_` 8 件・`ReservationControllerTest` 新規 11 件）
- **Passed**: 176
- **Failed**: 0
- **Status**: Pass

### Frontend（`pnpm test`）

- **Total Tests**: 109（resource-search・resource-sort ユニットまでの既存分 + reservation-list-filter ユニットの新規分：`reservations.test.ts` 拡張・新規 `reservation-filter-form.test.tsx` 7 件）
- **Passed**: 109
- **Failed**: 0
- **Status**: Pass

### Lint / Format

- `./gradlew spotlessApply checkstyleMain`：差分なし。Checkstyle 警告2件（`ReservationRepository.java` の既存メソッド名）は本ユニットと無関係
- `pnpm lint && pnpm format:check`：差分・エラーなし（オートフォーマッタで新規ファイル2件を一度整形済み）

## 自己検証（break-and-verify、reservation-list-filter ユニットで新規追加した全テスト対象）

Code Generation Part 2（Step 6・Step 9）で、過去ユニットの CI レビューで指摘された「対象コードを無効化しても pass してしまう弱いテスト」パターンを避けるため、新規テストすべてについて対象コードを一時的に無効化し、意図したテストのみが red になることを確認してから復元する自己検証を実施済み（詳細は `code/backend-summary.md`・`code/frontend-summary.md` を参照）。

## Overall Status

- **Build**: Success（backend・frontend 両方）
- **All Tests**: Pass（285 テスト全成功：backend 176 + frontend 109）
- **Ready for Operations**: Yes
