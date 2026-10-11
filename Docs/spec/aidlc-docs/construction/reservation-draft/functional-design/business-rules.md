# Business Rules — reservation-draft

| # | ルール |
|---|--------|
| BR-01 | `POST /api/reservations` の `draft=true` は、リソースの `requires_approval` 設定に関わらず常に `status=DRAFT` とする。`draft` 未指定時は `false` として扱う（既存の挙動を変えない） |
| BR-02 | `DRAFT` 作成時は `approval_steps` を作成しない |
| BR-03 | `PUT /api/reservations/{id}` の更新は `status` が `PENDING` または `DRAFT` の場合のみ許可する。`APPROVED`/`REJECTED`/`CANCELLED` は既存どおり422で拒否する |
| BR-04 | `DRAFT` の更新で `submit=false`（または未指定）の場合、内容のみ更新し `status` は `DRAFT` のまま変更しない |
| BR-05 | `DRAFT` の更新で `submit=true` の場合、内容更新に加えて `status` を `resource.requires_approval ? PENDING : APPROVED` に遷移させる。`PENDING` になる場合のみ `approval_steps` を作成する |
| BR-06 | `PENDING` 状態の予約の更新時は、`submit` フィールドの値に関わらず常に無視する（既存の `PENDING` 更新の挙動は変えない） |
| BR-07 | `approval_steps` は「ステータスが `PENDING` になる瞬間」にのみ作成する（新規作成時に直接`PENDING`になる場合、`DRAFT`から正式申請して`PENDING`になる場合の両方に共通） |
| BR-08 | `DRAFT` の予約詳細（`GET /api/reservations/{id}`）は、申請者本人または `ADMIN` のみ閲覧できる。`APPROVER`（本人以外）は403とする。`DRAFT` 以外のステータスでは既存どおり `APPROVER`/`ADMIN` は全件閲覧可能とする |
| BR-09 | 予約一覧（`GET /api/reservations`）の挙動は変更しない。`MEMBER`/`APPROVER` は本人の予約のみが対象のため、他人の `DRAFT` は元々結果に含まれない。`ADMIN` は既存どおり全件対象（`DRAFT` を含む） |
| BR-10 | `DRAFT` のキャンセル（削除相当）は、既存のキャンセル機構（`cancel()`、`status=CANCELLED` への遷移）をそのまま使う。新規の物理削除APIは追加しない。バックエンドの `ReservationService.CANCELLABLE_STATUSES`（現状 `PENDING`/`APPROVED` のみ）と、フロントエンドの `CANCELLABLE_STATUSES`（`reservations/[id]/page.tsx`）の両方に `DRAFT` を追加する |
