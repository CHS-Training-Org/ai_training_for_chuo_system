# AI-DLC 採用台帳

> 対象読者：メンター・学習者
> 参照：[`Docs/guide/dev-workflow.md`](../guide/dev-workflow.md#aidlc-mapping) / [`Docs/plan/aidlc-overview.html`](../plan/aidlc-overview.html) / [`Docs/plan/PHASE4_AI_DRIVEN_DEV_TASKS.md`](../plan/PHASE4_AI_DRIVEN_DEV_TASKS.md)

[AWS Labs AI-DLC（`awslabs/aidlc-workflows`）](https://github.com/awslabs/aidlc-workflows) のうち、本リポジトリに取り込み・反映した要素と、その反映先・状態を管理する台帳。

- **固定コミット**: `b19c81928bdf1b8d13856f462fcf2ede1720b4cb`（2026-06-08、VERSION 0.1.8）
- **取得日**: 2026-06-14
- **ライセンス**: MIT No Attribution（vendored ファイルに同梱）
- **vendored スナップショット**: [`vendor/aidlc-rules/common/`](../../vendor/aidlc-rules/common/)（逐語コピー・出典は `PROVENANCE.md`）

---

## 採用台帳（`common/` 全11ファイル）

| 上流ファイル | 役割 | BookFlow 反映先 | 採用状態 | 根拠 |
|---|---|---|---|---|
| `ascii-diagram-standards.md` | ASCII図の文字種・整列規約 | `.claude/rules/aidlc-guardrails.md` §4 | rules化 | ドキュメント内の図表品質を保つための具体的な規約として有用 |
| `content-validation.md` | ファイル作成前のMermaid/ASCII構文検証 | `.claude/rules/aidlc-guardrails.md` §3 | rules化 | 仕様ドキュメント（Mermaid多用）の品質保証に直結 |
| `depth-levels.md` | 問題の複雑さに応じた出力粒度の調整 | `.claude/rules/aidlc-guardrails.md` §2 | rules化 | plan-firstゲートでの計画粒度判断に有用 |
| `error-handling.md` | AI-DLCワークフローエンジン（`aidlc-state.md`/`audit.md`/units）のエラー処理・復旧手順 | （なし） | 非該当 | `aidlc-state.md`・`audit.md`・units of work 等、BookFlowが採用していないAI-DLC固有の状態管理機構を前提とした内容のため |
| `overconfidence-prevention.md` | 過信防止（不確実なら質問する） | `.claude/rules/aidlc-guardrails.md` §1 | rules化 | 「プロセスの厳格さは簡略化しない」方針と直結する中核的ガードレール |
| `process-overview.md` | AI-DLC 3フェーズワークフローの技術参照（Mermaid図含む） | `Docs/guide/dev-workflow.md` の写像表・標準フロー図 | 参照のみ（写像済み） | フェーズ構造は dev-workflow.md `{#aidlc-mapping}` で既にBookFlowフローへ写像済み。重複再構成はしない |
| `question-format-guide.md` | 確認質問の様式（専用ファイル＋選択肢＋Other） | `.claude/rules/aidlc-questions.md` | rules化 | 様式上の規律（互いに排他的な選択肢・矛盾検出）はClaude Codeの`AskUserQuestion`運用に翻案して有用 |
| `session-continuity.md` | `aidlc-state.md`再開時のアーティファクト読み込み手順 | （なし） | 非該当 | AI-DLCワークフローエンジンの状態ファイル（`aidlc-state.md`等）に依存する内容で、BookFlowは未採用 |
| `terminology.md` | AI-DLC独自用語集（Phase/Stage/Unit of Work等） | （なし） | 非該当 | AI-DLCワークフローエンジン固有の用語体系。BookFlowはdev-workflow.mdの用語（ビジネス要求シート等）を使用 |
| `welcome-message.md` | AI-DLC開始時のユーザー向けウェルカムメッセージ | （なし） | 非該当 | AI-DLCワークフローエンジンのオンボーディングUI。BookFlowはdev-workflow.mdがオンボーディング資料を兼ねる |
| `workflow-changes.md` | `aidlc-state.md`ベースのワークフロー変更管理（ステージ追加/スキップ/再実行） | （なし） | 非該当 | units・ステージ・`aidlc-state.md`等、BookFlowが採用していないワークフローエンジンの状態管理機構に依存 |

---

## 今後の候補（未実装・スコープ外）

- `inception/reverse-engineering.md`: 既存コードの読解（ブラウンフィールド）を支援するステージ。BookFlowの学習者向けSTEP（既存コード読解）に直結する可能性があるが、今回の採用範囲（`common/`）外のため未着手。将来 skill化を検討する。

---

## 上流同期手順

1. [`awslabs/aidlc-workflows`](https://github.com/awslabs/aidlc-workflows) の最新コミットを確認する。
2. [`vendor/aidlc-rules/common/`](../../vendor/aidlc-rules/common/) の各ファイルと新しい上流コミットの該当ファイルを diff する（vendored スナップショットが diff の基準）。
3. 差分があった内容について、上の採用台帳テーブルと `.claude/rules/aidlc-guardrails.md` / `.claude/rules/aidlc-questions.md` を更新する。
4. `vendor/aidlc-rules/common/` の内容、`vendor/aidlc-rules/PROVENANCE.md` の固定コミット・取得日・VERSIONを新しい値に更新する。
5. 本ファイル冒頭の固定コミット・取得日表記を更新する。

専用の同期スキル・CIは設けていない。上記手順を都度実施する。

---

## 関連リンク

- BookFlowの標準フロー・写像表: [`Docs/guide/dev-workflow.md`](../guide/dev-workflow.md#aidlc-mapping)
- 取り込み案の検討記録: [`Docs/plan/aidlc-overview.html`](../plan/aidlc-overview.html)
- vendored スナップショットの出典: [`vendor/aidlc-rules/PROVENANCE.md`](../../vendor/aidlc-rules/PROVENANCE.md)
