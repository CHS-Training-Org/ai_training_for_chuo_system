---
type: working-doc
title: API Documentation（Reverse Engineering）
description: AI-DLC Reverse Engineering ステージが生成する API 資料（今回のスコープ：予約の下書き保存）
timestamp: 2026-11-14
---

# API Documentation

**略記**: `BE/` = `backend/src/main/java/com/example/bookflow/`。仕様の正は `docs-next/docs/spec/api-spec.md`（予約の節は `§予約`）。

## REST APIs（予約）

### 予約一覧
- **Method / Path**: GET `/api/reservations`
- **Purpose**: 予約の一覧（ページング）。ADMIN は全件、それ以外は本人分。
- **Request**: `status`（任意・複数可、列挙型 `ReservationStatus`。DRAFT も受け付ける）、`page`、`size`
- **Response**: `ReservationResponse` のページ
- **現状の注意**: status 未指定では DRAFT を含む全件を返す（`BE/application/ReservationService.java` の `list`）。

### 予約作成
- **Method / Path**: POST `/api/reservations`
- **Request**: `resourceId`（必須）、`startAt`（必須）、`endAt`（必須）、`purpose`（必須・255 文字以内）、`attendeesCount`（正の整数・任意）。`draft` は無い。
- **Response**: 201 + `ReservationResponse`
- **エラー**: 400（Bean Validation）、409（重複）、422（`endAt` が `startAt` 以前など）

### 予約取得
- **Method / Path**: GET `/api/reservations/{id}`
- **権限**: MEMBER は本人のみ。APPROVER・ADMIN は全件（DRAFT を本人と ADMIN に限定する処理は現状ない）。

### 予約更新
- **Method / Path**: PUT `/api/reservations/{id}`
- **Request**: `startAt`、`endAt`、`purpose`、`attendeesCount`（`resourceId` と status は含まない）
- **制約**: 本人のみ（ADMIN も不可）、PENDING のみ（それ以外は 422）。status は変えず、承認ステップにも触れない。

### 予約取消
- **Method / Path**: POST `/api/reservations/{id}/cancel`
- **制約**: 本人または ADMIN、PENDING / APPROVED のみ。

### 予約削除
- **見つからなかった**: DELETE エンドポイントは仕様・実装ともに存在しない（要件シートの RSV-02 は「削除」に言及している）。

### 関連（読み取りのみ）
- GET `/api/resources/{id}/availability` と GET `/api/resources?from&to` は、PENDING / APPROVED を占有とみなす。DRAFT は占有扱いにならない。
- GET `/api/approvals/pending` は承認ステップ起点で、`approval_steps.status = PENDING` かつ `reservations.status = PENDING` で絞るため、DRAFT は混入しない。

## Internal APIs

### ReservationService（public メソッド）
- `list(...)` / `get(id, currentUser)` / `create(req, requester)` / `update(id, req, currentUser)` / `cancel(id, currentUser)`
- 遷移の検証・権限チェックはここに集約されている。

### ApprovalService
- `createInitialStep(reservation)`: 承認者を `findFirstByRole(APPROVER)` で選び、見つからなければ `APPROVER_NOT_AVAILABLE`（422）。

## Data Models

### reservations（`V001__create_initial_schema.sql`）
- **Fields**: `id`、`resource_id`、`requester_id`、`start_at`、`end_at`、`purpose`、`attendees_count`、`status`、`created_at`、`updated_at`
- **NOT NULL**: `resource_id`、`requester_id`、`start_at`、`end_at`、`purpose`、`status`（`attendees_count` のみ NULL 可）
- **Validation（CHECK）**: `status IN ('DRAFT','PENDING','APPROVED','REJECTED','CANCELLED')`、`end_at > start_at`
- **Relationships**: `resources`、`users`（FK）、`approval_steps`（1 対多）

### approval_steps
- **Fields**: `reservation_id`（NOT NULL・FK）、`approver_id`（NOT NULL）、`step_order`（固定 1）、`status`（PENDING / APPROVED / REJECTED）

### ReservationResponse
- 12 フィールド。`status` は文字列（`status.name()`）。
