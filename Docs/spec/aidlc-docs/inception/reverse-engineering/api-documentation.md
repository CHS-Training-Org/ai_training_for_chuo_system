# API Documentation

## REST APIs
### GET /api/reservations
- **Purpose**: 予約一覧。ADMIN は全件、他は本人分。
- **Request**: `status`（複数可）、`page`、`size`（既定 20）
- **Response**: Spring Data の Page。要素は `ReservationResponse`（12 項目）
### 認可の現状
- ADMIN 限定は `@PreAuthorize("hasRole('ADMIN')")`（`GET /api/users`、`POST` `PUT` `PATCH /api/resources`）。違反時は 403 `FORBIDDEN`。
- `/api/reports/**` は存在しない。

## Internal APIs
### ReservationRepository
- **Methods**: `findAllFetch(Pageable)`、`findByStatusInFetch(statuses, Pageable)`、本人用の 2 本、重複確認用の `findByResource_IdAndStatusIn` ほか
- **Return Types**: `Page<Reservation>` または `List<Reservation>`

## Data Models
### Reservation（`reservations`）
- **Fields**: `id`、`resource`（LAZY）、`requester`（LAZY）、`startAt`、`endAt`、`purpose`（255）、`attendeesCount`、`status`、`createdAt`、`updatedAt`
- **Validation**: `end_at > start_at`、`status` の CHECK 制約
### ApprovalStep（`approval_steps`）
- **Fields**: `reservation`、`approver`、`stepOrder`、`status`、`comment`、`decidedAt`
- **Relationships**: 予約に 1 対多（現状は `step_order = 1` のみ）
### 日時
- タイムゾーンなしの ISO 文字列（`LocalDateTime`）。
