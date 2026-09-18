# API Documentation

> 深さ：浅め。全エンドポイントの正式な仕様は [`docs-next/docs/spec/api-spec.md`](../../../../../docs-next/docs/spec/api-spec.md) が真実の源。ここでは CSV 帳票出力に関連する既存エンドポイントのみ要約する。

## REST APIs（関連エンドポイントのみ抜粋）

### `GET /api/reservations`（予約一覧）

- **Method**: GET
- **Path**: `/api/reservations`
- **Purpose**: 予約一覧取得。ADMIN は全件、それ以外は本人分のみ。`status`（複数可）・`page`・`size` でフィルタ
- **Request**: クエリパラメータ `status` / `page` / `size`
- **Response**: `Page<ReservationResponse>`（JSON）

CSV 帳票出力（`GET /api/reports/reservations/csv`）は、この一覧取得ロジックと同じ絞り込み条件（`status`）に加え、期間 (`from`/`to`) 条件を追加し、レスポンス形式のみ `text/csv` に変える新規エンドポイントとして設計する。

### 権限モデル（共通）

- 認可は Spring Security の `@PreAuthorize`（メソッドレベル）。`ResourceController` の POST/PUT/PATCH は `@PreAuthorize("hasRole('ADMIN')")`
- 共通エラー形式：`{ "code": "ERROR_CODE", "message": "..." }`。403 は `code: FORBIDDEN`

## Internal APIs（関連クラスのみ）

### ReservationService

- **Methods**: `list(User, Collection<ReservationStatus>, Pageable)`, `get(UUID, User)`, `create(...)`, `update(...)`, `cancel(...)`
- **Parameters**: 詳細は [code-structure.md](./code-structure.md) を参照
- **Return Types**: `Page<ReservationResponse>` / `ReservationResponse`

## Data Models（CSV 出力対象フィールド）

### ReservationResponse（既存 DTO、CSV 列の元になる想定データ）

- **Fields**: `id`（予約ID）, `resourceName`（リソース名）, `requesterName`（申請者名）, `startAt`（開始日時）, `endAt`（終了日時）, `purpose`（目的）, `status`（承認状態）
- **Relationships**: `Resource`（`resourceName` は JOIN）、`User`（`requesterName` は JOIN）
- **Validation**: なし（読み取り専用の出力のため）

`docs-next/docs/spec/enhancements/intermediate/csv-export.md` の RPT-02 が定義する CSV 列（予約 ID・リソース名・申請者名・開始日時・終了日時・目的・承認状態）は、既存 `ReservationResponse` のフィールドとほぼ一致する（`attendeesCount` を含めるかは要件分析で確認）。
