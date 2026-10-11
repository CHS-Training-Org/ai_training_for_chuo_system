# Application Design Plan: リソース一覧の検索・フィルタ追加（Issue #23）

軽量な深度で実施する（新規の独立コンポーネントなし。既存 4 層の境界内での設計）。

## 設計判断（確認質問の回答）

確認は `AskUserQuestion` で実施した（BookFlow の運用。`.claude/rules/aidlc-questions.md`）。

| # | 論点 | 回答 |
|---|------|------|
| Q1 | `%` と `_` の扱い | 通常の文字として検索する（エスケープ） |
| Q2 | Repository の問い合わせ方式 | Specification（`JpaSpecificationExecutor`） |
| Q3 | keyword 正規化の層 | Service で行う |
| Q4 | キーワード入力欄の UI 文言 | ラベル「キーワード」＋プレースホルダ「名称・説明で検索」 |

回答に曖昧・矛盾なし（フォローアップ質問は不要）。

## 計画チェックリスト

- [x] 文脈の分析（requirements.md、既存の ResourceRepository / ResourceService / ResourceController / ResourceFilterForm）
- [x] 確認質問と回答の分析
- [x] components.md（コンポーネント定義と責務）
- [x] component-methods.md（メソッドシグネチャ）
- [x] services.md（Service のオーケストレーション）
- [x] component-dependency.md（依存関係とデータフロー）
- [x] application-design.md（統合版）
- [x] 設計の完全性・一貫性の検証
