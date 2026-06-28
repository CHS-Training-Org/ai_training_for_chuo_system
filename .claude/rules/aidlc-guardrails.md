---
name: aidlc-guardrails
description: AI-DLC のガードレール（過信防止・コンテンツ検証・出力粒度の調整・ASCII図の規約）をBookFlow向けに再構成したもの
---

# AI 駆動開発のガードレール

AI-DLC（[awslabs/aidlc-workflows](https://github.com/awslabs/aidlc-workflows)、固定コミット `b19c81928bdf1b8d13856f462fcf2ede1720b4cb`、VERSION 0.1.8）の `common/` 配下のガードレール群を、BookFlow の開発フロー（[`Docs/guide/dev-workflow.md`](../../Docs/guide/dev-workflow.md)）に合わせて再構成したもの。元ファイルは [`vendor/aidlc-rules/common/`](../../vendor/aidlc-rules/common/) に逐語保存されている。採用状況は [`Docs/spec/aidlc-adoption.md`](../../Docs/spec/aidlc-adoption.md) を参照。

## 1. 過信を防ぐ（`overconfidence-prevention.md` より）

不確実な点があるまま実装やドキュメント更新を進めない。

- ユーザーの要求が複雑・曖昧、または影響範囲が広い場合は、仮定で進めず質問する。
- 「たぶん」「おそらく」「一般的には」で済ませている箇所があれば、それは質問すべき箇所のサイン。
- plan mode（[`Docs/guide/dev-workflow.md` §3](../../Docs/guide/dev-workflow.md)）では、計画提示前に疑問点を解消しておく。曖昧なまま計画を提示しない。
- 「質問しすぎ」より「誤った前提で実装してしまう」方がコストが高い、という前提で判断する。

## 2. 出力粒度を問題の複雑さに合わせる（`depth-levels.md` より）

- 単純な修正（タイポ・小さなバグ修正等）には、最小限の説明・最小限のドキュメント更新で対応する。
- 複数レイヤー・複数ファイルにまたがる変更や、仕様（`Docs/spec/`）に影響する変更では、Spec-first の原則に従い必要な範囲を網羅的に更新する。
- 「このタスクに必要な詳細さは何か」を都度判断する。過不足のいずれも避ける。

## 3. コンテンツ検証（`content-validation.md` より）

ファイルに書き込む前に、構文・整形を検証する。

- Mermaid 図を書く場合は、構文（ノードID・矢印・ラベルのエスケープ）を確認してから書き込む。複雑になりすぎる場合はテキストでの代替表現も検討する。
- Markdown のテーブル・見出し・リンクが正しく閉じているか確認する。
- 特殊文字（`"` `'` 等)のエスケープを確認する。

## 4. ASCII 図の規約（`ascii-diagram-standards.md` より）

ASCII 図を書く場合:

- `+` `-` `|` `^` `v` `<` `>` と英数字のみを使う。Unicode box-drawing文字（`┌` `─` `│` 等）は使わない（フォント・プラットフォームによって表示が崩れるため）。
- 同じボックス内の各行は**文字数を揃える**（角が縦に揃うことを確認する）。
- タブではなくスペースでインデントする。
- 複雑な図は Mermaid を使う。
