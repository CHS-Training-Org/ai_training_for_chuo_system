# Unit Test Execution — `reservation-draft`

**作成日時**: 2026-10-02

## バックエンド

```bash
cd backend
./gradlew test                                   # 全件
./gradlew test --tests "*ReservationServiceTest" # 本ユニットの中心
```

本ユニットで追加したのは `ReservationServiceTest` の `Draft` ネストクラス（15件）である。

| 観点 | テスト |
|---|---|
| 下書きの作成 | `create_draftWithRequiresApprovalFalse_returnsDraft`、`create_draftWithRequiresApprovalTrue_returnsDraft` |
| 承認ステップを作らない | `create_draft_doesNotCreateApprovalStep` |
| 重複チェックを行わない | `create_draftWithOverlappingReservation_returnsDraftWithoutConflict` |
| 内容の更新 | `update_draftWithoutStatus_staysDraft` |
| 正式申請 | `update_submitDraftWithRequiresApprovalTrue_returnsPendingAndCreatesApprovalStep`、`update_submitDraftWithRequiresApprovalFalse_returnsApprovedWithoutApprovalStep` |
| 不正な遷移 | `update_submitNonDraftReservation_throwsBusinessException`、`update_submitWithStatusOtherThanPending_throwsBusinessException` |
| 競合時のロールバック | `update_submitDraftWithConflict_throwsAndKeepsDraft` |
| 閲覧権限 | `get_draftByOwner_*`、`get_draftByAdmin_*`、`get_draftByApprover_*`、`get_draftByOtherMember_*`、`get_pendingByApprover_*` |

## フロントエンド

```bash
cd frontend
pnpm test                               # 全件
pnpm test reservation-permissions       # 権限判定の純関数
pnpm test reservations                  # Server Actions
```

| ファイル | 追加内容 |
|---|---|
| `tests/unit/reservation-permissions.test.ts` | 新規。ステータスとロールの組み合わせで編集可否・正式申請可否を検証 |
| `tests/unit/server/actions/reservations.test.ts` | `draft` と `status` がリクエストボディに含まれる／含まれないことを検証（4件追加） |

## 実行結果（2026-10-02）

| 対象 | 結果 |
|---|---|
| backend | 181件すべて通過 |
| frontend | 108件すべて通過（12ファイル） |

> **注意**：フロントエンドのテストを開発サーバー（`pnpm dev`）と同時に走らせると、負荷により不安定になることがある。実際に本ユニットの検証中、並行実行した際に10ファイルが失敗し、開発サーバーを停止して再実行したところ全件通過した。テストは単独で実行する。
