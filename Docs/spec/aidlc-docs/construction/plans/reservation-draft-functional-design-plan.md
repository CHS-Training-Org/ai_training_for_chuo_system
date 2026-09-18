---
title: Functional Design 計画 — reservation-draft
status: Planning
---

# Functional Design Plan — unit: reservation-draft

## Unit Context

Application Design / Units Generation は SKIP 判定のため `unit-of-work.md` は存在しない。unit の定義は `Docs/spec/aidlc-docs/inception/plans/execution-plan.md`（単一unit「reservation-draft」）と `requirements.md`（D1〜D7）・`stories.md`（Story 1〜6）を入力とする。

## 実行チェックリスト

- [x] Step 1: Unit Context の確認（上記）
- [x] Step 2: 本計画の作成
- [ ] Step 3: 追加の確認質問の要否判定
- [x] Step 4: 成果物生成
  - [x] `business-logic-model.md`
  - [x] `business-rules.md`
  - [x] `domain-entities.md`
  - [x] `frontend-components.md`
- [x] Step 5: 完了メッセージ提示・承認待ち

## Step 3: 追加の確認質問の要否判定

Requirements Analysis（D1〜D7）と User Stories（Story 1〜6）で、業務ロジック・ドメインモデル・アクセス制御・フロントエンド導線に関わる論点はすでに確定している。Functional Design で新たに生じた論点は次の1点のみ：

- **正式申請ボタンの入力**：「正式申請」操作（Story 5）は、編集フォームとは別に予約詳細ページ（`/reservations/{id}`）のボタンから行う。このボタンはユーザーに新しい入力を求めず、**保存済みの下書きの内容をそのまま** `submit=true` で送信する（内容変更を伴わない）。これは Story 4（再編集）と Story 5（正式申請）が別々の受入条件として分離されていることから導かれる設計であり、確認質問ではなく本ドキュメントの business-logic-model.md に設計決定として記録する（新たな `AskUserQuestion` は不要と判断）

上記以外に未解決のギャップはないため、Step 4（成果物生成）に進む。
