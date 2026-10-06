# Build and Test Summary — e2e-test-coverage

## 適用範囲の判定

本ユニットは単一 Issue（#26）に対する brownfield の E2E テスト追加であり、Workflow Planning で Functional Design・NFR Requirements/Design・Infrastructure Design は SKIP 済み。これに整合させ、Build and Test でも以下のとおり適用範囲を判定した（過去ユニットと異なり、本ユニットでは E2E を「実施」とする）。

| テスト種別 | 判定 | 理由 |
|---|---|---|
| Unit Test | 実施 | `ResourceServiceTest`・`ReservationServiceTest`（Mockito）・各 `*.test.ts`/`*.test.tsx`（Vitest + MSW）。本ユニットでの追加・変更はなし（回帰確認として実行） |
| Integration Test | Unit Test に統合して実施 | `ResourceControllerTest`・`ReservationControllerTest`（H2 実データに対する MockMvc 結合テスト）が本リポジトリの唯一の結合テスト層であり、`./gradlew test` に含まれる |
| Performance Test | SKIP | NFR Requirements が SKIP 済み（性能要件なし） |
| Contract Test | SKIP | マイクロサービス構成ではない（モノレポ・単一 backend） |
| Security Test | SKIP | Security Baseline 拡張は Requirements Analysis で不採用と決定済み |
| E2E Test | **実施（本ユニットの主眼）** | `docs-next/docs/spec/enhancements/beginner/e2e-test-coverage.md` の受入条件どおり、`pnpm test:e2e` でサインイン・サインアウト、リソース一覧・詳細閲覧、予約申請の一本化シナリオ、APPROVER の承認・却下操作を検証する |

## Build Status

- **Backend**: `./gradlew build` → `BUILD SUCCESSFUL`（コード変更なし、回帰確認）
- **Frontend**: `pnpm build` → 成功（型チェック・全13ルートの静的生成含む）

## Test Execution Summary

### Backend（`./gradlew test`）

- **Total Tests**: 188（本ユニットでの追加・変更なし）
- **Passed**: 188 / **Failed**: 0
- **Status**: Pass

### Frontend ユニット・コンポーネントテスト（`pnpm test`）

- **Total Tests**: 121（15ファイル、本ユニットでの追加・変更なし）
- **Passed**: 121 / **Failed**: 0
- **Status**: Pass

### Frontend E2E テスト（`pnpm test:e2e`、本ユニットの新規追加分）

- **Total Tests**: 8（既存 `example.spec.ts` 1件 + 新規 `auth.spec.ts`・`resources.spec.ts`・`reservation-flow.spec.ts`・`approval.spec.ts` 計7件）
- **Passed**: 8 / **Failed**: 0（`workers: 1` 固定のもとで連続3回実行し再現性を確認）
- **Status**: Pass

### Lint / Format

- `./gradlew spotlessApply checkstyleMain`：差分なし。Checkstyle 警告194件（すべて本ユニットより前から存在する `MethodName` パターン既知 WARN、severity=warning）
- `pnpm lint && pnpm format:check`：差分・エラーなし

## 自己検証（break-and-verify、本ユニットで新規追加した E2E テスト対象）

Code Generation Part 2（Step 6）で、過去ユニットの CI レビューで指摘された「対象コードを無効化しても pass してしまう弱いテスト」パターンを避けるため、サインアウト検証・承認確認の2点について対象コードを一時的に無効化し、意図したテストのみが red になることを確認してから復元する自己検証を実施済み（詳細は `construction/e2e-test-coverage/code/frontend-summary.md` を参照）。

## 低メモリ環境への対応（本ユニットで実施した設定変更）

学習者PCのメモリ制約への対応として、以下2点を環境を問わず常に適用する設定に変更した（詳細は `build-instructions.md` のトラブルシューティング参照）。

- `frontend/playwright.config.ts`：`workers` を常に `1` に固定
- `frontend/vitest.config.ts`：`poolOptions.threads.{max,min}Threads: 1` を追加（テスト分離は維持したまま並列度のみ1に絞る）

## Overall Status

- **Build**: Success（backend・frontend 両方）
- **All Tests**: Pass（317 テスト全成功：backend 188 + frontend unit 121 + frontend E2E 8）
- **Ready for Operations**: Yes
