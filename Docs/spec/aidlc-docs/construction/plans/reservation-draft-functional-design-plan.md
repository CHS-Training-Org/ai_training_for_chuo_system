---
type: working-doc
title: Functional Design Plan（ユニット：reservation-draft）
description: AI-DLC Functional Design ステージの実行計画
timestamp: 2026-11-14
---

# Functional Design Plan — reservation-draft

## 前提

Units Generation と Application Design は、Workflow Planning で共に SKIP と判定済み（作業単位は 1 つで、既存コンポーネントの境界内の変更のため）。ユニット定義ファイルの代わりに、`Docs/spec/aidlc-docs/inception/requirements/requirements.md`（FR-01〜FR-12）と `Docs/spec/aidlc-docs/inception/plans/execution-plan.md` をスコープとして扱う。

## 明確化の状況

### 確定済み（再度の質問はしない）

- 権限: ADMIN は他人の下書きを閲覧のみ（自分の下書きは操作できる。D-10、BR-D6）、APPROVER は閲覧不可（D-1、D-2）
- 削除: 物理削除。本人の `DRAFT` のみ。`DRAFT` 以外は 422（前提・解釈 4）
- 下書きの入力: 通常申請と同じ必須項目。下書き保存では重複判定をしない（D-4）
- 正式申請: 新規申請と同じ分岐（D-5）
- 一覧: `status` 未指定は下書きを除く。下書きタブは `status=DRAFT`（D-6、D-7）
- `draft: true` を `DRAFT` 以外に指定した場合: 422（前提・解釈 3。Requirements Analysis で承認済み）

### 既存コードの調査で分かったこと（設計の前提）

- `create` は、リソースの利用停止（`is_active`）や過去日時を確認しない。正式申請も同じ検証に揃える（挙動を足さない）。
- 予約一覧は、ページサイズ 20 だけを指定し、並び順を指定していない。下書きタブも既存の挙動を踏襲する（並び順は今回変えない）。
- `UpdateReservationRequest` は `resourceId` を持たない。

### 設計上の確認事項（ユーザーに質問する）

- Q1: 下書きの再編集でリソースを変更できるようにするか
- Q2: 削除前に確認ダイアログを出すか

## 実行ステップ

- [x] 既存の `ReservationService`・`ReservationController`・DTO・Repository・フロントエンドの予約の各ページを読み込み、現状の分岐と遷移を把握する
- [x] 要件書の FR-01〜FR-12 から、設計が必要な論点（Q1、Q2 と、確定済みの項目）を洗い出す
- [x] Q1、Q2 の回答を受け、あいまいな点がないか確認する
- [x] `business-logic-model.md` を生成する（作成・更新・正式申請・削除・閲覧・一覧の処理の流れ）
- [x] `business-rules.md` を生成する（状態遷移、権限、検証、エラーの対応表）
- [x] `domain-entities.md` を生成する（`Reservation` の状態遷移メソッド、DB スキーマ変更なしの旨）
- [x] `frontend-components.md` を生成する（ボタン、タブ、画面ごとの出し分け、Server Actions、スキーマ）
