---
title: User Stories 生成計画 — 予約の下書き保存
status: Planning
---

# Story Generation Plan — 予約の下書き保存（Issue #30）

## 方針（Product Owner 視点）

既存ペルソナ（MEMBER / APPROVER / ADMIN）を再利用し、新規ペルソナは追加しない（`requirements.md` の User Scenarios のとおり、既存ロールの予約ライフサイクルが拡張されるだけで新しい利用者層は生まれない）。

## 実行チェックリスト

- [x] Step A: ストーリー分割方針・粒度をユーザーに確認する（`AskUserQuestion`。BookFlow ではファイル方式ではなくこのツールを使う）
- [x] Step B: `Docs/spec/aidlc-docs/inception/user-stories/personas.md` を生成する（既存ペルソナ MEMBER/APPROVER/ADMIN を、本タスクに関係する特性のみに絞って記述）
- [x] Step C: `Docs/spec/aidlc-docs/inception/user-stories/stories.md` を生成する（Step A で確定した分割方針・粒度に従い、INVEST 基準・受入条件付きで作成）
- [x] Step D: 各ストーリーに `requirements.md` の要件 ID（RSV-08〜15）・Design Decision（D1〜D7）とのトレーサビリティを付記する
- [x] Step E: 完了メッセージを提示しユーザーの承認を得る

## ストーリー分割アプローチの選択肢（Step A で確認）

| アプローチ | 内容 | 本タスクへの適合 |
|---|---|---|
| User Journey-Based（推奨） | 「下書き保存」「再編集」「正式申請」「下書きの削除」という利用者の一連の操作の流れでストーリーを分割する | 要求シートの受入条件がそのまま時系列の操作フローになっており、最も自然に対応する |
| Feature-Based | 画面（予約申請フォーム／予約一覧／予約詳細／予約編集）ごとにストーリーを分割する | 画面単位の実装計画（Code Generation）とは対応しやすいが、1操作が複数画面にまたがる（例：正式申請は詳細画面のボタン操作だが結果は一覧・承認一覧に波及する）ため利用者視点の一貫性が薄れる |
| Persona-Based | MEMBER視点・APPROVER視点・ADMIN視点でストーリーを分割する | 本タスクはほぼ全操作がMEMBER（申請者本人）視点に集中し、APPROVER/ADMINは「見えない・見える」という受動的な違いのみのため、分割の効果が薄い |

## 粒度・受入条件の形式

- 受入条件は要求シートの箇条書き形式（Given/When/Then ではなく素の条件文）を踏襲する。BookFlowの既存spec文書（`docs-next/docs/spec/enhancements/`）と文体を揃えるため
- 1ストーリーの粒度は「1つの利用者アクション＋その直接的な結果」とする（例：「MEMBERとして、入力途中の予約を下書き保存できる」を1ストーリーとし、「一覧でDRAFTを確認する」は別ストーリーとする）

## Step A: ユーザー確認

`AskUserQuestion` で以下を確認する。

1. ストーリー分割アプローチ（User Journey-Based を推奨として提示）
2. 受入条件の詳細度（要求シートの受入条件をそのまま引き継ぐか、Given/When/Then 形式に書き直すか）

回答はこのファイルの末尾に追記する。

---

## 回答記録

1. ストーリー分割アプローチ：**User Journey-Based**（推奨案を採用）
2. 受入条件の記述形式：**素の箇条書き**（要求シートの受入条件と同じ形式。Given/When/Then への書き直しはしない）
