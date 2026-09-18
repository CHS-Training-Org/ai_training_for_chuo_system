---
title: Code Generation 計画 — reservation-draft
status: Planning
---

# Code Generation Plan — unit: reservation-draft

## Unit Context

- **実装するストーリー**: Story 1〜6（`Docs/spec/aidlc-docs/inception/user-stories/stories.md`）
- **要件トレーサビリティ**: RSV-08〜15（`requirements.md`）、Design Decisions D1〜D7
- **依存関係**: なし（既存の `ApprovalService`/`ResourceService.overlaps` は無変更で再利用）
- **DB エンティティ**: `reservations`（スキーマ変更なし）
- **サービス境界**: `ReservationService`/`ReservationController`/`Reservation`（domain）に閉じる。`ApprovalService`/`ResourceController` 等の他サービスへの変更はない

## 実行ステップ

- [x] Step 1: Spec Update（`/update-spec`）＋ drawio 予約ステータス遷移図の更新（`drawio-skill`）
- [x] Step 2: Backend — Domain 層（`Reservation.markPending()` 追加）
- [x] Step 3: Backend — Application 層（`ReservationService`：`create()`/`update()`/`cancel()`/`checkReadAccess()` の分岐拡張）
- [x] Step 4: Backend — Presentation 層（`CreateReservationRequest`/`UpdateReservationRequest` へのフィールド追加、`ReservationController` の受け渡し）
- [x] Step 5: Backend — Unit Testing（`ReservationServiceTest`/`ReservationControllerTest` への追加ケース）
- [x] Step 6: Backend — Summary（前回タスクの前例に倣い、独立ファイルは作らずStep14のsummary.mdに統合する）
- [x] Step 7: Frontend — スキーマ（`lib/schemas/reservation.ts` に `draft`/`submit` 追加）
- [x] Step 8: Frontend — 予約申請フォーム（`ReservationForm.tsx` に「下書き保存」ボタン）
- [x] Step 9: Frontend — 予約一覧（`reservations/page.tsx` の `ALL_STATUSES` に `DRAFT` 追加）
- [x] Step 10: Frontend — 予約詳細（`reservations/[id]/page.tsx` の `canEdit`/`CANCELLABLE_STATUSES` 拡張、新規 `SubmitButton.tsx`）
- [x] Step 11: Frontend — 予約編集（`reservations/[id]/edit/page.tsx` のガード拡張・見出し出し分け）
- [x] Step 12: Frontend — Unit Testing（Vitest への追加ケース）
- [x] Step 13: Frontend — Summary（前回タスクの前例に倣い、独立ファイルは作らずStep14のsummary.mdに統合する）
- [x] Step 14: Documentation Generation（`Docs/spec/aidlc-docs/construction/reservation-draft/code/summary.md` の作成、要件トレーサビリティの記録）

**Database Migration Scripts**: 不要（D1。スキーマ変更なし）
**Deployment Artifacts**: 変更なし

## Step 詳細（各ステップで参照する設計成果物）

| Step | 参照する Functional Design 成果物 | ストーリー |
|---|---|---|
| 2〜4 | `business-logic-model.md`（フロー）、`business-rules.md`（分岐条件・エラーコード）、`domain-entities.md`（メソッド・DTOシグネチャ） | Story 1, 4, 5, 6 |
| 5 | `business-rules.md`（テストすべき組み合わせの一覧そのもの） | Story 1, 3, 4, 5, 6 |
| 7〜11 | `frontend-components.md`（コンポーネント別の変更点） | Story 1, 2, 3, 4, 5 |
| 12 | `frontend-components.md` | 同上 |

この計画が Code Generation の単一の情報源（single source of truth）である。Part 2 ではこの計画のステップを順に実行し、完了ごとに `[x]` を付ける。
