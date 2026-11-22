# Reverse Engineering 追加分: 予約ドメイン（reservation-draft 向け）

**Analysis Date**: 2026-11-06T03:07:14+00:00
**Scope**: 既存の逆解析成果物（`resources` ドメイン中心）が扱っていない予約ドメインのうち、下書き保存の影響範囲に関わる部分のみ。

## バックエンド

| 要素 | 現状 | 下書き保存への影響 |
|---|---|---|
| `ReservationStatus` | `DRAFT` / `PENDING` / `APPROVED` / `REJECTED` / `CANCELLED`（`DRAFT` は定義済み・未使用） | enum 変更は不要 |
| `reservations` テーブル（`V001`） | `status` の CHECK に `DRAFT` を含む。`resource_id`・`start_at`・`end_at`・`purpose` は `NOT NULL`、`end_at > start_at` の CHECK あり | 途中状態（必須項目が空）で保存するなら Flyway で制約緩和が必要 |
| `CreateReservationRequest` | `resourceId`・`startAt`・`endAt`・`purpose` が `@NotNull`/`@NotBlank` | `draft` フラグ追加と、下書き時の検証緩和の要否を決める必要がある |
| `UpdateReservationRequest` | 同上（`resourceId` なし） | `DRAFT` → `PENDING` の遷移を指示する項目がない |
| `ReservationService.create()` | `requires_approval` で `APPROVED` / `PENDING` を決定。`PENDING` のとき `approvalService.createInitialStep()` を呼ぶ。重複チェックは `PENDING`/`APPROVED` が対象 | `DRAFT` では承認ステップ生成と重複チェックの扱いを分岐させる |
| `ReservationService.update()` | `PENDING` のみ更新可（それ以外は 422）。本人のみ（ADMIN 不可） | `DRAFT` も更新可にし、正式申請の遷移を追加する |
| `ReservationService.cancel()` | `PENDING`/`APPROVED` のみ。本人または ADMIN | `DRAFT` の削除手段が未定義 |
| `ReservationService.get()` / `checkReadAccess()` | `MEMBER` は本人のみ。`APPROVER`・`ADMIN` は全件閲覧可 | 下書きだけは `APPROVER` を拒否する分岐が必要（受入条件は「ADMIN は除く」） |
| `ReservationService.list()` | ADMIN は全件、それ以外は本人分。`status` フィルタ対応 | ADMIN の全予約一覧に他人の下書きが混ざる扱いを決める必要がある |
| `ApprovalService`（承認一覧） | `approval_steps` 経由で取得（`findPendingByApprover`） | 下書きには `approval_steps` がないため、承認一覧には自然に出ない |
| 重複判定 `OCCUPIED_STATUSES` | `PENDING`/`APPROVED` のみ | 下書きは時間帯を占有しない（変更不要） |
| `ErrorCode` | `VALIDATION_ERROR`・`FORBIDDEN`・`RESERVATION_CONFLICT` ほか | 新規コードの要否は設計時に判断 |

## フロントエンド

| 要素 | 現状 | 下書き保存への影響 |
|---|---|---|
| `ReservationForm.tsx`（`/reservations/new`） | `CreateReservationSchema` で全必須項目を検証し、「予約を申請する」のみ | 「下書き保存」ボタンの追加と、保存時の検証方針 |
| `reservation.ts`（Zod スキーマ） | `CreateReservationSchema` / `UpdateReservationSchema` | `draft` フラグまたは緩和スキーマの追加 |
| `reservations.ts`（Server Actions） | `create` / `update` / `cancel` / `list` / `get` | 下書き保存・正式申請・（必要なら）削除のアクション |
| `reservations/page.tsx`（一覧） | `ALL_STATUSES` が `DRAFT` を含まない。バッジ色は `DRAFT` 定義済み | 「下書き」タブの追加 |
| `reservations/[id]/page.tsx`（詳細） | 編集は `PENDING` かつ本人のみ。`DRAFT` のバッジ色は定義済み | 下書き時の「再編集」「正式申請」操作 |
| `reservations/[id]/edit/page.tsx` | `PENDING` 以外は `notFound()` | `DRAFT` を許可する |
| `(authenticated)/page.tsx`（ダッシュボード） | `PENDING`/`APPROVED` の件数のみ表示 | 変更不要 |
| `labels.ts` / `enums.ts` | `DRAFT` のラベル・値は定義済み（要確認） | 確認のみ |

## 仕様書（真実の源）で更新が必要な箇所

- `requirements.md`: §予約の「下書き保存（DRAFT 生成）はベース実装の対象外」、§予約ステータス遷移図の注記（`DRAFT` はベース実装では未使用）
- `er-diagram.md`: `status` 列の備考（`DRAFT` はベース実装では未使用）
- `api-spec.md`: `POST`/`PUT /api/reservations`、レスポンスの `status` 説明
- `screen-spec.md`: `/reservations/new`・`/reservations`・`/reservations/{id}`・`/reservations/{id}/edit`

## 課題シート内の矛盾・空白（確認質問の対象）

1. 閲覧権限: 要件 RSV-02 は「申請者本人のみ」、受入条件は「ADMIN は除く」で食い違う。`APPROVER` の扱いも未定義。
2. 下書きの必須項目: 背景は「フォーム入力途中」だが、DB は必須項目が `NOT NULL`。
3. 重複チェック: 下書き保存時と正式申請時のどちらで行うか未定義。
4. 正式申請の遷移先: 要件は `DRAFT` → `PENDING` だが、`requires_approval=false` のリソースは即 `APPROVED` が既存仕様（UC-04）。
5. 削除: RSV-02 に「削除できる」とあるが、対応する API・受入条件がない。
