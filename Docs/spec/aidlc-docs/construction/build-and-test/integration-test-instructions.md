# Integration Test Instructions — reservation-draft（Issue #30）

## Purpose

BookFlow はモノリシック構成（単一の `backend` アプリケーション、単一の `frontend` アプリケーション）であり、マイクロサービス間の結合テストは存在しない。本課題における「統合テスト」は、`ReservationControllerTest`（`@SpringBootTest` + H2 インメモリDB）による **Controller → Service → Repository → DBスキーマ** の一気通貫の検証を指す（Reverse Engineering `code-structure.md` で確認済みの既存パターン）。

## Test Scenarios

### Scenario 1: 下書き作成 → `POST /api/reservations`（`draft: true`）

- **Description**: `draft: true` を指定した申請が、承認分岐・重複予約チェック・`approval_steps` 生成のいずれも行わずステータス `DRAFT` で保存されることを確認する。
- **Setup**: `ReservationControllerTest.insertSeedData()`（`@BeforeEach`）で既存予約（`RESERVATION_MEMBER_ID`、APPROVED、2025-06-10 10:00-12:00）を投入。
- **Test Steps**: `create_draftTrue_ignoresConflict_returns201Draft`（既存予約と重複する時間帯で `draft: true` を指定）を実行。
- **Expected Results**: `201 Created`、`status: "DRAFT"`。重複予約チェックが実行されないため `409` にならない。
- **Cleanup**: テスト内で作成したレコードを個別に `DELETE`（`@AfterEach` の固定ID削除では拾えないため）。

### Scenario 2: 下書きの再編集・正式申請 → `PUT /api/reservations/{id}`（`submit`）

- **Description**: `DRAFT` の予約に対する `PUT` が、`submit` の値に応じて「内容更新のみ（`DRAFT` のまま）」「正式申請（`requires_approval` に応じて `APPROVED`/`PENDING` へ遷移）」に正しく分岐することを確認する。あわせて、セルフレビューで発覚した重複予約チェックの非対称性（作成時はスキップ、再編集時は常時実行）を是正した経路も検証する。
- **Setup**: `RESERVATION_DRAFT_ID`（承認不要リソース、DRAFT、2025-06-13 10:00-12:00）、`RESERVATION_DRAFT_APPROVAL_ID`（承認要リソース、DRAFT、2025-06-14 10:00-12:00）をシード投入。
- **Test Steps**:
  - `update_draftReservationBySubmitFalse_returns200Draft`（`submit: false`、非重複の時間帯）
  - `update_draftReservationBySubmitFalseWithConflict_returns200Draft`（`submit: false`、`RESERVATION_MEMBER_ID` と重複する時間帯）
  - `update_draftReservationBySubmitTrueNoApprovalRequired_returns200Approved`（`submit: true`、承認不要リソース）
  - `update_draftReservationBySubmitTrueApprovalRequired_returns200Pending`（`submit: true`、承認要リソース）
- **Expected Results**: `submit: false` はステータス `DRAFT` のまま更新に成功する（重複していてもスキップされ `409` にならない）。`submit: true` は `requires_approval` に応じて `APPROVED`/`PENDING` へ遷移し、`PENDING` の場合は `approval_steps` が生成される。
- **Cleanup**: `deleteSeedData()`（`@AfterEach`）で固定IDのシードデータを削除（`PUT` による内容変更は同じIDの行を上書きするだけなので、固定ID削除で問題なく片付く）。

### Scenario 3: DRAFT のアクセス制御 → `GET /api/reservations/{id}`

- **Description**: `DRAFT` の予約が、申請者本人と ADMIN のみ閲覧でき、APPROVER は本人以外アクセス不可（`PENDING` 以降の既存の閲覧範囲とは異なる）ことを確認する。
- **Setup**: Scenario 2 と同じシードデータ。
- **Test Steps**: `get_ownDraftReservation_returns200`／`get_otherMemberDraftReservationByAdmin_returns200`／`get_otherMemberDraftReservationByApprover_returns403` を実行。
- **Expected Results**: 本人・ADMIN は `200`。本人以外のAPPROVERは `403`。
- **Cleanup**: 同上。

### Scenario 4: DRAFT のキャンセル → `POST /api/reservations/{id}/cancel`

- **Description**: `DRAFT` の予約が既存のキャンセル権限（申請者本人 または ADMIN）でキャンセルできることを確認する。
- **Setup**: Scenario 2 と同じシードデータ。
- **Test Steps**: `cancel_draftReservationByOwner_returnsCancelled` を実行。
- **Expected Results**: `200`、`status: "CANCELLED"`。
- **Cleanup**: 同上。

### Scenario 5: 既存フロー（PENDING/APPROVED の更新・キャンセル）との回帰確認

- **Description**: `DRAFT` 対応の分岐追加によって既存の `PENDING`/`APPROVED` の更新・キャンセルの挙動が変わっていないことを確認する。
- **Setup**: `RESERVATION_PENDING_ID`（PENDING）・`RESERVATION_MEMBER_ID`（APPROVED）を使用。
- **Test Steps**: 既存テスト（`update_pendingReservationByOwner_returns200`、`update_pendingReservationBySubmitTrue_returns422`、`cancel_pendingReservationByOwner_returnsCancelled` 等）をそのまま再実行。
- **Expected Results**: 変更前と同じ結果（回帰なし）。特に `PENDING` の更新時は重複予約チェックが引き続き無条件で実行されること（`DRAFT` のみがスキップ対象）を確認する。
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
cd backend && ./gradlew test --tests "*ReservationControllerTest"
```

### 2. Verify Service Interactions

- **Test Scenarios**: 上記 Scenario 1〜5（`ReservationControllerTest` 30件のうち、DRAFT関連の新規ケースを含む）。
- **Expected Results**: すべて pass（このセッションで確認済み）。
- **Logs Location**: `backend/build/reports/tests/test/`（テストごとの詳細ログ・スタックトレース）。

### 3. Cleanup

```bash
# 特別な後片付けは不要（H2 はテストプロセス終了時に破棄される）
```
