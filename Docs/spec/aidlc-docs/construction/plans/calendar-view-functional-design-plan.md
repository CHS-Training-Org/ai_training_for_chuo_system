# Functional Design Plan — ユニット: calendar-view（カレンダービュー）

## Unit Context

- **Stories**: US-01〜US-04（`Docs/spec/aidlc-docs/inception/user-stories/stories.md`）
- **Application Design**: SKIP 済みのため、requirements.md・stories.md を直接入力として使う
- **対象範囲**: frontend のみ（`resources/[id]/` 配下・`reservations/new/` 配下）

## 解消済みの曖昧点

- 既存リスト表示の扱い：カレンダーへの置き換え（requirements.md 決定事項1）
- カレンダーUI実装：shadcn/uiベース自作（requirements.md 決定事項2）
- 週の開始曜日：月曜始まり（requirements.md 決定事項3）
- カレンダーの時刻粒度：週表示1時間グリッド（8:00〜20:00）・月表示は日クリック+既定時刻9:00（requirements.md 決定事項4）
- 月表示の「予約済み」グレーアウト判定基準：営業時間全体（8:00〜20:00）が埋まっている日のみグレーアウト（本ステージでAskUserQuestionにより確定）

## 実行チェックリスト

- [x] Step 1: `business-logic-model.md` を生成する（from-to算出・グリッドセル生成・占有判定ロジックのデータフロー）
- [x] Step 2: `business-rules.md` を生成する（BR-01〜08）
- [x] Step 3: `domain-entities.md` を生成する（新規エンティティの要否確認）
- [x] Step 4: `frontend-components.md` を生成する（コンポーネント構成・props/state・改修ファイルの変更点）
