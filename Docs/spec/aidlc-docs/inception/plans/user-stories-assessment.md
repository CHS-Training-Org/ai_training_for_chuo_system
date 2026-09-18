# User Stories Assessment — 予約の下書き保存（Issue #30）

## Request Analysis

- **Original Request**: `docs-next/docs/spec/enhancements/intermediate/reservation-draft.md`（予約の下書き保存）。既存の予約申請（UC-03）に `DRAFT` ライフサイクルを追加する
- **User Impact**: Direct（MEMBER/APPROVER が予約申請フォーム・予約一覧・予約詳細・予約編集の4画面で直接操作する新しい導線）
- **Complexity Level**: Medium（新規サービス・新規ペルソナはないが、状態遷移とステータス限定のアクセス制御分岐を含む）
- **Stakeholders**: MEMBER（下書きの作成者本人）、APPROVER（DRAFTには関与しないが既存の予約閲覧範囲との違いを認識する必要がある）、ADMIN（全件閲覧・操作の例外ロール）

## Assessment Criteria Met

- [x] High Priority: **User Experience Changes**（既存の「1ステップで申請確定」というワークフローに「下書き保存→再編集→正式申請」という新しい経路が加わる。予約一覧・予約詳細・予約編集の各画面の振る舞いも `DRAFT` ステータスの有無で分岐する）
- [x] Medium Priority: **Backend User Impact**（`checkReadAccess` のロール別可視範囲が `DRAFT` に限り変わり、既存の「APPROVERは全件閲覧可」という前提から外れる例外を生む）
- [x] Complexity Assessment Factors: **Scope**（4画面＋3層にまたがる）、**Risk**（要求シートのAI活用ポイントが示唆する設計論点＝所有権チェックの実装場所・状態遷移バリデーションが requirements.md の D6/D7 で確定済みだが、これを「誰が・どの画面で・どう操作するか」というユーザー視点でストーリー化しないと、Code Generation で受入条件の抜け漏れが起きやすい）

## Decision

**Execute User Stories**: Yes
**Reasoning**: 前回タスク（resource-list-filter、Issue #23）は既存の一覧画面への検索フィルタ1点追加で、既存ワークフローの延長線上に収まりSKIPと判定した。本タスクは既存の「予約は申請したら即座に確定/承認待ちになる」という単一の完了型ワークフローに対し、「途中状態で保存し、後から選んで正式申請する」という**新しい中間状態と2つの利用者アクション（保存・正式申請）**を追加するものであり、`inception/user-stories.md` の High Priority 基準「User Experience Changes」に正面から該当する。前回のSKIP判断をそのまま踏襲しない。

## Expected Outcomes

- MEMBER/APPROVER/ADMIN それぞれの視点から「DRAFTに対して何ができ、何ができないか」を明文化し、requirements.md の D1〜D7（特にD4のAPPROVER除外）が実装時に見落とされないようにする
- 「下書き保存」「再編集」「正式申請」「下書きの削除（キャンセル）」を独立した検証可能なストーリーとして分離し、Code Generation の受入条件チェックに直接使えるようにする
