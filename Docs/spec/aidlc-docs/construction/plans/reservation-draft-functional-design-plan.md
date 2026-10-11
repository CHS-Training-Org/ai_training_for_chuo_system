# Functional Design Plan — ユニット: reservation-draft（予約の下書き保存）

## Unit Context

- **Stories**: US-01〜US-06（`Docs/spec/aidlc-docs/inception/user-stories/stories.md`）
- **Application Design**: SKIP 済みのため、requirements.md・stories.md を直接入力として使う
- **対象範囲**: backend（`ReservationService`・DTO群）・frontend（予約申請/一覧/詳細/編集画面）

## Functional Design 実施中に確定した追加事実

Code Generation 前の設計検証として、`ReservationService.list`・`checkReadAccess` の実コードを確認した：

- **`checkReadAccess`**（単一予約取得用）：`MEMBER` のみ本人チェック、`ADMIN`/`APPROVER` は無条件に全件閲覧可（role ベースの判定）
- **`list`**（一覧取得用）：`isAdmin`（`Role.ADMIN` か否か）のみで分岐しており、**`APPROVER` は `MEMBER` と同じく `requesterId` スコープのクエリが使われる**（単一取得とは異なる挙動）

この事実に基づき、requirements.md の決定事項5（他人のDRAFTを見せない制御）を「`list` は変更不要（APPROVERは既に本人の予約のみ）、`checkReadAccess` のみ DRAFT 時に APPROVER 除外を追加する」に確定・反映済み。

## 実行チェックリスト

- [x] Step 1: `business-logic-model.md` を生成する（作成時・更新時の状態遷移フロー、approval_steps統一作成条件）
- [x] Step 2: `business-rules.md` を生成する（BR-01〜10）
- [x] Step 3: `domain-entities.md` を生成する（DTO・エンティティへの変更点）
- [x] Step 4: `frontend-components.md` を生成する（画面ごとの変更点）
