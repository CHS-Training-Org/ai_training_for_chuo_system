---
type: working-doc
title: Domain Entities（ユニット：reservation-draft）
description: AI-DLC Functional Design ステージが生成するドメインモデルの変更点
timestamp: 2026-11-14
---

# Domain Entities — reservation-draft

**略記**: `BE/` = `backend/src/main/java/com/example/bookflow/`

## データベーススキーマ

変更しない（Flyway のマイグレーションは追加しない）。`reservations.status` の CHECK 制約は、`DRAFT` を既に含む。`purpose`、`start_at`、`end_at` の NOT NULL も維持する（下書きでも必須。要件書 D-4）。

## Reservation（`BE/domain/Reservation.java`）

| 項目 | 変更 | 内容 |
|---|---|---|
| フィールド | なし | 既存のまま |
| `create(..., status)` | なし | 既に `status` を引数で受けるため、`DRAFT` を渡せる |
| `update(startAt, endAt, purpose, attendeesCount)` | なし | 下書きの更新にも、そのまま使う（`status` は変えない） |
| `markPending()` | **追加** | `DRAFT` から `PENDING` へ遷移する（`status = PENDING`、`updatedAt` 更新）。事前の検証は Service が行う（既存の方針） |
| `markApproved()` | なし（再利用） | 承認不要リソースの正式申請（`DRAFT` から `APPROVED`）にも使う |
| `cancel()` / `markRejected()` | なし | 変更しない |

## ReservationStatus

変更しない。`DRAFT` は定義済み。

## 状態遷移（今回追加分）

| 遷移元 | 遷移先 | 契機 | 実装 |
|---|---|---|---|
| なし（新規） | `DRAFT` | 下書き保存（`POST`、`draft: true`） | `Reservation.create(..., DRAFT)` |
| `DRAFT` | `DRAFT` | 下書きの更新（`PUT`、`draft: true`） | `update(...)` |
| `DRAFT` | `PENDING` | 正式申請（承認が必要なリソース） | `update(...)` と `markPending()` |
| `DRAFT` | `APPROVED` | 正式申請（承認が不要なリソース） | `update(...)` と `markApproved()` |
| `DRAFT` | （消滅） | 削除（`DELETE`） | `ReservationRepository.delete(...)`（物理削除） |

## リクエスト DTO（`BE/presentation/dto/`）

| DTO | 変更 | 内容 |
|---|---|---|
| `CreateReservationRequest` | **追加** | 任意の `Boolean draft`。`null` と `false` は通常申請として扱う。必須項目の Bean Validation（`@NotNull`、`@NotBlank`）は下書きでも維持する |
| `UpdateReservationRequest` | **追加** | 任意の `Boolean draft`。意味は「business-rules.md」の更新の分岐表を参照。`resourceId` は引き続き持たない（変更不可。Q1 の回答） |
| `ReservationResponse` | なし | `status` は文字列のまま（`DRAFT` を返せる） |

## Repository（`BE/domain/ReservationRepository.java`）

新しいクエリメソッドは追加しない。

- 削除は、`JpaRepository` が持つ `delete(entity)` を使う。
- 一覧の「下書きを除く」は、既存の `findByStatusInFetch` と `findByRequesterIdAndStatusInFetch` に、`DRAFT` を除くステータスの集合を渡して実現する（`business-logic-model.md` の一覧を参照）。
- `status` 未指定の分岐で使っていた `findAllFetch` と `findByRequesterIdFetch` は、呼び出し元が無くなる見込み。Code Generation で参照を確認し、未使用になれば削除する。

## エラーコード（`BE/application/exception/ErrorCode.java`）

新しいコードは追加しない。既存の `VALIDATION_ERROR`（422）、`FORBIDDEN`（403）、`NOT_FOUND`（404）、`RESERVATION_CONFLICT`（409）、`APPROVER_NOT_AVAILABLE`（422）を再利用する。
