---
name: aidlc-questions
description: AI-DLC の質問様式ガイド（question-format-guide）をBookFlowのClaude Code plan mode/AskUserQuestion運用に合わせて再構成したもの
---

# 確認質問の進め方

AI-DLC（[awslabs/aidlc-workflows](https://github.com/awslabs/aidlc-workflows)、固定コミット `b19c81928bdf1b8d13856f462fcf2ede1720b4cb`）の `common/question-format-guide.md` をBookFlowの実行環境（Claude Code の `AskUserQuestion` ツール・plan mode）向けに再構成したもの。元ファイルは [`vendor/aidlc-rules/common/question-format-guide.md`](../../vendor/aidlc-rules/common/question-format-guide.md)。採用状況は [`Docs/spec/aidlc-adoption.md`](../../Docs/spec/aidlc-adoption.md) を参照。

AI-DLC 本体は質問を専用ファイル（`*-questions.md`）に書く方式だが、BookFlow では Claude Code の `AskUserQuestion` ツールが同等の役割を果たすため、ファイル方式は採用しない。代わりに以下の様式上の規律を踏襲する。

## 質問の構成

- 選択肢は**意味のある選択肢のみ**を用意する。数を揃えるための無意味な選択肢は作らない（最小2択＋必要なら「その他」）。
- 選択肢どうしは**互いに排他的**であること。
- 曖昧な回答（「どちらでも」「場合による」等）を受けた場合は、追加の確認質問を行う。矛盾する回答を検出した場合も同様に、進める前に解消する。

## plan mode での運用

- 計画承認の確認自体は `ExitPlanMode` で行う。「この計画でよいですか？」のようなテキスト質問は行わない（[`Docs/guide/dev-workflow.md` §3](../../Docs/guide/dev-workflow.md)、第1ゲート）。
- 要件・設計方針の選択肢が複数ありユーザー判断が必要な場合は、`AskUserQuestion` で計画提示前に解消する。
- 1回の `AskUserQuestion` は最大4問。選択肢が3つ以上に分岐する場合は質問を分割する。
