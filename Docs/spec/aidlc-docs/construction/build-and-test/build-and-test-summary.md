# Build and Test Summary — reservation-draft

## 適用範囲の判定

本ユニットは単一 Issue（#30）に対する brownfield の機能追加（予約の下書き保存）であり、Workflow Planning で Application Design・Units Generation・NFR Requirements/Design・Infrastructure Design は SKIP 済み、Functional Design は EXECUTE 済み。これに整合させ、Build and Test でも以下のとおり適用範囲を判定した。

| テスト種別 | 判定 | 理由 |
|---|---|---|
| Unit Test | 実施（本ユニットの主眼） | backend: `ReservationServiceTest`（新規11件）、frontend: `reservation-form.test.tsx`（新規2件）・`server/actions/reservations.test.ts`（新規3件）・`reservation-edit-form.test.tsx`（新規ファイル4件）・`reservation-detail-page.test.tsx`（新規ファイル4件） |
| Integration Test | Unit Test に統合して実施 | `ReservationControllerTest` が本リポジトリの唯一の結合テスト層であり、`./gradlew test` に含まれる。本ユニットで新規9件を追加（201/200/403のステータスコード検証を含む） |
| E2E Test | 実施（回帰確認） | `reservations/new/`・`reservations/page.tsx`・`reservations/[id]/page.tsx`・`reservations/[id]/edit/` 配下を改修しているため、既存の E2E スイート（`pnpm test:e2e`）に回帰がないことを確認する。本ユニットのスコープとして下書きシナリオの新規 E2E 追加は行わない（Code Generation Planに明記済み） |
| Performance Test | SKIP | NFR Requirements が SKIP 済み（性能要件なし） |
| Contract Test | SKIP | マイクロサービス構成ではない（モノレポ・単一 backend） |
| Security Test | SKIP | Security Baseline 拡張は Requirements Analysis で不採用と決定済み |

## Build Status

- **Backend**: `./gradlew build` → `BUILD SUCCESSFUL`
- **Frontend**: `pnpm build` → 成功（型チェック・全13ルートの静的生成含む）

## Test Execution Summary

### Backend（`./gradlew test`）

- **Total Tests**: 208（既存188件 + 本ユニットの新規追加分：`ReservationServiceTest` 11件・`ReservationControllerTest` 9件）
- **Passed**: 208 / **Failed**: 0
- **Status**: Pass

### Frontend ユニット・コンポーネントテスト（`pnpm test`）

- **Total Tests**: 150（20ファイル。既存137件 + 本ユニットの新規追加分：`reservation-form.test.tsx` 2件・`server/actions/reservations.test.ts` 3件・`reservation-edit-form.test.tsx`〔新規ファイル〕4件・`reservation-detail-page.test.tsx`〔新規ファイル〕4件）
- **Passed**: 150 / **Failed**: 0
- **Status**: Pass

### Frontend E2E テスト（`pnpm test:e2e`、回帰確認）

- **Total Tests**: 8（本ユニットでの追加・変更なし）
- **Passed**: 8 / **Failed**: 0（本ユニットで改修した `reservations/*` 配下に回帰がないことを確認）
- **Status**: Pass

### Lint / Format

- `./gradlew spotlessApply checkstyleMain`：差分なし。Checkstyle 警告214件（すべて本ユニットより前から存在する `MethodName` パターン既知 WARN、severity=warning）
- `pnpm lint && pnpm format:check`：差分・エラーなし

## 自己検証（break-and-verify）

以下6点について、対象ロジックを一時的に無効化し、意図したテストのみが red になることを確認したうえで復元した（詳細は `construction/reservation-draft/code/backend-summary.md`・`frontend-summary.md` 参照）。

1. Backend: `create()` の `createsApprovalStep = false → true`（draft時に誤ってapproval_steps生成する状態） → `create_draftTrueRequiresApprovalTrue_returnsDraftWithoutApprovalStep` が red
2. Backend: `checkReadAccess()` のDRAFT/APPROVER除外条件を無効化 → `get_draftByApprover_throwsAccessDeniedException` が red
3. Backend: `update()` の `if (wasDraft && req.isSubmit())` を `false &&` でラップ → `update_draftSubmitTrue_returns200PendingWithApprovalStep` が red
4. Frontend: `ReservationForm` の下書き保存ボタンの `draft` 値を反転 → 下書き保存テストが red
5. Frontend: `ReservationEditForm` の正式申請ボタン表示条件（`isDraft &&` → `false &&`） → 関連テスト2件が red
6. Frontend: `reservations/[id]/page.tsx` の `canEdit` のDRAFT条件を無効化 → 編集ボタン表示テストが red

## テスト実装上の技術的な注意点（今後の参考用）

Radix UI Select を React Testing Library でクリック操作すると jsdom の `hasPointerCapture` 未実装により例外が発生する（既存の `availability-calendar` 等と同様の既知制約）。本ユニットの新規テストでは `defaultResourceId` propでリソース選択済みの状態を直接再現し、ドロップダウンの開閉操作自体はE2Eレベルで別途担保する既存方針を踏襲した。

## スコープ外（本ユニットで対応していない）

- 新規の物理削除（DELETE）APIの追加（既存の `cancel`/`CANCELLABLE_STATUSES` 機構を転用）
- E2Eテストへの下書きシナリオ追加（既存のE2Eスイートは回帰確認のみ実施）
- `requirements-reservation-status.drawio.svg` の再生成（本サンドボックス環境にdrawio CLI・動作するpython3 xmlモジュールがないため未実施。VSCodeのdrawio拡張での手動エクスポートが必要な既知のフォローアップ）

## Overall Status

- **Build**: Success（backend・frontend 両方）
- **All Tests**: Pass（366 テスト全成功：backend 208 + frontend unit 150 + frontend E2E 8）
- **Ready for Operations**: Yes
