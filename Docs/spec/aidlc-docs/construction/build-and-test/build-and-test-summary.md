# Build and Test Summary — calendar-view

## 適用範囲の判定

本ユニットは単一 Issue（#27）に対する brownfield の表示拡張であり、Workflow Planning で Application Design・Units Generation・NFR Requirements/Design・Infrastructure Design は SKIP 済み、Functional Design は EXECUTE 済み。これに整合させ、Build and Test でも以下のとおり適用範囲を判定した。

| テスト種別 | 判定 | 理由 |
|---|---|---|
| Unit Test | 実施（本ユニットの主眼） | `availability-calendar.test.tsx`（新規8件）・`reservation-form.test.tsx`（新規2件）・`resource-detail-page.test.tsx`（更新） |
| Integration Test | Unit Test に統合して実施（回帰確認） | `ResourceControllerTest`・`ReservationControllerTest` が本リポジトリの唯一の結合テスト層であり、`./gradlew test` に含まれる。本ユニットでの変更はない |
| E2E Test | 実施（回帰確認） | `resources/[id]/page.tsx`・`reservations/new/` 配下を改修しているため、e2e-test-coverage ユニットで追加した既存 E2E スイート（`pnpm test:e2e`）に回帰がないことを確認する |
| Performance Test | SKIP | NFR Requirements が SKIP 済み（性能要件なし） |
| Contract Test | SKIP | マイクロサービス構成ではない（モノレポ・単一 backend） |
| Security Test | SKIP | Security Baseline 拡張は Requirements Analysis で不採用と決定済み |

## Build Status

- **Backend**: `./gradlew build` → `BUILD SUCCESSFUL`（コード変更なし、回帰確認）
- **Frontend**: `pnpm build` → 成功（型チェック・全13ルートの静的生成含む）

## Test Execution Summary

### Backend（`./gradlew test`）

- **Total Tests**: 188（本ユニットでの追加・変更なし）
- **Passed**: 188 / **Failed**: 0
- **Status**: Pass

### Frontend ユニット・コンポーネントテスト（`pnpm test`）

- **Total Tests**: 132（17ファイル。既存121件 + 本ユニットの新規追加分：`availability-calendar.test.tsx` 8件・`reservation-form.test.tsx` 2件・`resource-detail-page.test.tsx` の更新分1件増）
- **Passed**: 132 / **Failed**: 0
- **Status**: Pass

### Frontend E2E テスト（`pnpm test:e2e`、回帰確認）

- **Total Tests**: 8（本ユニットでの追加・変更なし）
- **Passed**: 8 / **Failed**: 0（本ユニットで改修した `resources/[id]/page.tsx`・`reservations/new/` 配下に回帰がないことを確認）
- **Status**: Pass

### Lint / Format

- `./gradlew spotlessApply checkstyleMain`：差分なし。Checkstyle 警告194件（すべて本ユニットより前から存在する `MethodName` パターン既知 WARN、severity=warning）
- `pnpm lint && pnpm format:check`：差分・エラーなし

## 自己検証（break-and-verify）

`AvailabilityCalendar.tsx` の占有判定ロジック（`isOverlapping`）を一時的に無効化（常に `false` を返すよう改変）し、週表示・月表示の占有判定テスト2件が red になることを確認したうえで復元し、再度 green になることを確認した（詳細は `construction/calendar-view/code/frontend-summary.md` 参照）。

## 動作確認（手動・ブラウザ）

ローカルの `pnpm dev` 環境で MEMBER ロールでサインインし、リソース詳細画面（「第1会議室」）を実際に開いて、週表示（月曜始まり・8:00〜19:00のグリッド）・月表示（当月のグリッド、前月の空白セルを含む）の見た目と、週表示セルクリック→予約申請フォームへの日時引き継ぎ（`startAt` クエリパラメータ・開始日時入力欄への反映）を確認した。

## テスト実装上の技術的な注意点（今後の参考用）

`vi.useFakeTimers()` と `@testing-library/react` の `waitFor`・`@testing-library/user-event` の組み合わせで、テストがタイムアウトする事象が発生した。`vi.waitFor`（Vitest本体が提供する、fake timers使用時に内部で自動的に時計を進める実装）と `fireEvent.click()`（同期的でタイマーに依存しない）に置き換えることで解決した。日時に依存するコンポーネントを `vi.setSystemTime` で固定してテストする際は、この組み合わせを踏襲することを推奨する。

## Overall Status

- **Build**: Success（backend・frontend 両方）
- **All Tests**: Pass（328 テスト全成功：backend 188 + frontend unit 132 + frontend E2E 8）
- **Ready for Operations**: Yes
