# Functional Design Plan — ユニット: calendar-view

## 入力コンテキスト

Units Generation / Application Design は SKIP したため、ユニット定義は `Docs/spec/aidlc-docs/inception/requirements/requirements.md` と `Docs/spec/aidlc-docs/inception/user-stories/{stories,personas}.md`（US-01〜US-05）をそのまま入力とする。

## 明確化質問

`AskUserQuestion` で以下3問を提示する（BookFlow では質問ファイル方式を採用せず `AskUserQuestion` を使う。`.claude/rules/aidlc-questions.md` 参照）。

1. カレンダー実装方式（外部ライブラリ vs shadcn/ui 自作）
2. 週表示の時間グリッド粒度（空き枠クリックの最小単位）
3. 月表示の日セルでの混雑度の表現方法

## 実行チェックリスト

- [ ] 明確化質問を提示し回答を得る
- [ ] 回答の曖昧さ・矛盾を点検する
- [ ] `construction/calendar-view/functional-design/business-logic-model.md` を生成する（空き状況データ→カレンダーセル変換ロジック、週/月の期間計算）
- [ ] `construction/calendar-view/functional-design/business-rules.md` を生成する（グレーアウト判定・クリック可否・RSV-06の遷移ルール等）
- [ ] `construction/calendar-view/functional-design/domain-entities.md` を生成する（カレンダーセル・期間等のフロントエンド側ドメインモデル）
- [ ] `construction/calendar-view/functional-design/frontend-components.md` を生成する（コンポーネント構成・props/state・ユーザー操作フロー・API連携箇所）
