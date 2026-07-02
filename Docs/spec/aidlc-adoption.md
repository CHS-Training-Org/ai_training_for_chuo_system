---
type: adoption
title: AI-DLC 採用台帳
description: AWS Labs AI-DLC から BookFlow に取り込んだ要素・反映先・状態・上流同期手順の管理台帳
tags:
  - ai-dlc
  - adoption
  - vendor
timestamp: 2026-06-18
audience: メンター・学習者
references:
  - Docs/guide/dev-workflow.md
  - Docs/plan/aidlc-overview.html
  - Docs/plan/PHASE4_AI_DRIVEN_DEV_TASKS.md
---

# AI-DLC 採用台帳

[AWS Labs AI-DLC（`awslabs/aidlc-workflows`）](https://github.com/awslabs/aidlc-workflows) のうち、本リポジトリに取り込み・反映した要素と、その反映先・状態を管理する台帳。

- **固定コミット**: `b19c81928bdf1b8d13856f462fcf2ede1720b4cb`（2026-06-08、VERSION 0.1.8）
- **取得日**: 2026-06-14（common）/ 2026-06-18（inception / construction / operations / extensions / core-workflow）
- **ライセンス**: MIT No Attribution（vendored ファイルに同梱）
- **vendored スナップショット**: [`vendor/aidlc-rules/`](../../vendor/aidlc-rules/)（逐語コピー・出典は `PROVENANCE.md`）
- **BookFlow 翻案済みステージファイル**: [`.aidlc-rule-details/`](../../.aidlc-rule-details/)（パス翻案済み活性資産）

---

## 採用方針の変更記録

**2026-06-18 採用方針更新**（ADR-020 参照）: PHASE4 タスク 3.7「案B改良（写像のみ・エンジン非採用）」から「エンジン完全導入（replace）+ Docs/spec/ 写像統合」に転換。  
AI-DLC エンジン（`core-workflow.md` + 全ステージ）を BookFlow の標準ワークフローとして採用し、`dev-workflow.md` をエンジンベースに全面改訂。

**2026-06-24 起動メカニズム変更**（ADR-020 追記参照）: エンジン本体を `.claude/rules/aidlc-core.md`（常時読込、soft 委譲）から **`.claude/skills/aidlc/SKILL.md`（`/aidlc` スキル）へ移設**。  
発火は `/aidlc` 明示起動または「AI-DLC で進める」等の意図指定時のみ（常時 OVERRIDES ではない）。  
これによりスキル内で硬い per-stage 意味論（承認ゲート、成果物生成、監査ログ記録）が保持され、台帳の「活性化」主張が実行時に履行される。常時読込の `aidlc-core.md` は薄いポインタに縮小。

---

## 状態管理の写像 { #state-mapping }

エンジンが前提とする状態管理ファイルの BookFlow 写像：

| 上流ファイル | BookFlow 写像先 | 理由 |
|---|---|---|
| `aidlc-docs/aidlc-state.md` | `Docs/spec/aidlc-state.md` | 単一ファイル（ツリー新設なし）でセッション復元機構（`session-continuity.md`）が機能する |
| `aidlc-docs/audit.md` | `Docs/spec/aidlc-audit.md` | 単一の追記専用ログファイル。並行ツリーの懸念なし。学習者の AI 利用記録と相補的 |
| `aidlc-docs/<phase>/` 設計成果物 | `Docs/spec/aidlc-docs/<phase>/`（作業用）→ 永続成果は既存 `Docs/spec/` ファイルに統合 | aidlc-docs/ という**ツリー**は新設せず `Docs/spec/` 内の 1 サブディレクトリに限定 |
| units of work 分解 | 縦切り課題 Issue（`feature/<issue番号>-<short-desc>` 単位） | 既存ブランチ命名・課題粒度と一致 |

---

## 採用台帳（上流 32 ファイル全カバレッジ）

### オーケストレーション（1ファイル）

| 上流ファイル | 役割 | BookFlow 反映先 | 採用状態 | 根拠 |
|---|---|---|---|---|
| `aws-aidlc-rules/core-workflow.md` | AI-DLC エンジン本体。3フェーズ・全ステージ・ゲート・監査ログ・パス解決・extensions ローディングを統括 | **`.claude/skills/aidlc/SKILL.md`（エンジン本体・硬い意味論）** + `.claude/rules/aidlc-core.md`（薄いポインタ・常時読込）+ `.aidlc-rule-details/`（ステージファイル群） | **エンジン採用（スキル化・活性化）** | BookFlow の標準ワークフローとして教える。発火は `/aidlc` 明示起動または「AI-DLC で進める」等の意図指定時。スキル内で per-stage MANDATORY・承認ゲート・成果物生成・監査ログが確定的に機能する |

### common（全フェーズ共通、11ファイル）

| 上流ファイル | 役割 | BookFlow 反映先 | 採用状態 | 根拠 |
|---|---|---|---|---|
| `common/ascii-diagram-standards.md` | ASCII 図の文字種・整列規約 | `.claude/rules/aidlc-guardrails.md` §4 | rules 化（既存） | ドキュメント内の図表品質を保つための具体的な規約として有用 |
| `common/content-validation.md` | ファイル作成前の Mermaid/ASCII 構文検証 | `.claude/rules/aidlc-guardrails.md` §3 | rules 化（既存） | 仕様ドキュメント（Mermaid 多用）の品質保証に直結 |
| `common/depth-levels.md` | 問題の複雑さに応じた出力粒度の調整 | `.claude/rules/aidlc-guardrails.md` §2 | rules 化（既存） | plan-first ゲートでの計画粒度判断に有用 |
| `common/error-handling.md` | ワークフローエンジンのエラー処理・復旧手順 | `.aidlc-rule-details/common/error-handling.md`（翻案済み） | **エンジン採用（翻案・活性化）** | エンジン導入により前提（`aidlc-state.md` / `audit.md`）が揃った。状態ファイルパスを BookFlow 写像先に翻案済み |
| `common/overconfidence-prevention.md` | 過信防止（不確実なら質問する） | `.claude/rules/aidlc-guardrails.md` §1 | rules 化（既存） | 「プロセスの厳格さは簡略化しない」方針と直結する中核的ガードレール |
| `common/process-overview.md` | AI-DLC 3フェーズワークフローの技術参照（Mermaid 図含む） | `Docs/guide/dev-workflow.md` の写像表・標準フロー図 | **参照のみ（写像済み）** | フェーズ構造は `dev-workflow.md #aidlc-mapping` で写像済み（エンジン採用に更新）。重複再構成はしない |
| `common/question-format-guide.md` | 確認質問の様式（専用ファイル＋選択肢＋Other） | `.claude/rules/aidlc-questions.md` | rules 化（既存） | 様式上の規律は Claude Code の `AskUserQuestion` 運用に翻案して有用 |
| `common/session-continuity.md` | `aidlc-state.md` 再開時のアーティファクト読み込み手順 | `.aidlc-rule-details/common/session-continuity.md`（翻案済み） | **エンジン採用（翻案・活性化）** | エンジン導入により前提が揃った。`Docs/spec/aidlc-state.md` からの first unchecked item レジューム機構として機能 |
| `common/terminology.md` | AI-DLC 独自用語集（Phase/Stage/Unit of Work 等） | `.aidlc-rule-details/common/terminology.md`（翻案済み） | **エンジン採用（翻案・活性化）** | エンジン採用により用語体系が BookFlow の正式用語となった。用語集としてそのまま採用可 |
| `common/welcome-message.md` | AI-DLC 開始時のユーザー向けウェルカムメッセージ | `.aidlc-rule-details/common/welcome-message.md`（翻案済み）| **エンジン採用（条件付き活性化）** | エンジン導入により有効。Claude Code には「エンジン起動」イベントがないため、ワークフロー開始時に 1 回表示する形で `aidlc-core.md` §MANDATORY が発動 |
| `common/workflow-changes.md` | `aidlc-state.md` ベースのワークフロー変更管理 | `.aidlc-rule-details/common/workflow-changes.md`（翻案済み） | **エンジン採用（翻案・活性化）** | エンジン導入により前提が揃った。状態ファイルパスを `Docs/spec/aidlc-state.md` に翻案済み |

### inception（フェーズ1、7ファイル）

| 上流ファイル | 役割 | BookFlow 反映先 | 採用状態 | 根拠 |
|---|---|---|---|---|
| `inception/workspace-detection.md` | ワークスペース検出・state 初期化（必須・最初） | `.aidlc-rule-details/inception/workspace-detection.md`（翻案済み） | **エンジン採用（翻案・活性化）** | 必須ステージ。`Docs/spec/aidlc-state.md` の初期化・Brownfield/Greenfield 判定 |
| `inception/reverse-engineering.md` | 既存コード解析（Brownfield のみ・条件付き） | `.aidlc-rule-details/inception/reverse-engineering.md`（翻案済み）+ 将来 `/reverse-engineering` スキル化 | **エンジン採用（翻案・活性化）** | 学習者向け STEP-05「既存機能読解」に直結（台帳「今後の候補」から実装済みに昇格） |
| `inception/requirements-analysis.md` | 要件分析（必須・深さ適応型） | `.aidlc-rule-details/inception/requirements-analysis.md`（翻案済み） | **エンジン採用（翻案・活性化）** | 必須ステージ。成果は `Docs/spec/requirements.md` に統合 |
| `inception/user-stories.md` | ユーザーストーリー作成（条件付き） | `.aidlc-rule-details/inception/user-stories.md`（翻案済み） | **エンジン採用（翻案・活性化）** | 条件付きステージ。ユーザー影響のある機能開発時に実行 |
| `inception/workflow-planning.md` | ワークフロー計画・ステージ EXECUTE/SKIP 判断（必須） | `.aidlc-rule-details/inception/workflow-planning.md`（翻案済み） | **エンジン採用（翻案・活性化）** | 必須ステージ。plan mode での実行計画提示＝第1ゲートの実体 |
| `inception/application-design.md` | コンポーネント・サービス設計（条件付き） | `.aidlc-rule-details/inception/application-design.md`（翻案済み） | **エンジン採用（翻案・活性化）** | 条件付きステージ。新コンポーネント・サービスが必要な場合に実行 |
| `inception/units-generation.md` | units of work 分解（条件付き） | `.aidlc-rule-details/inception/units-generation.md`（翻案済み） | **エンジン採用（翻案・活性化）** | 条件付きステージ。複数ユニット分割が必要な場合に実行。分解結果は縦切り Issue に写像 |

### construction（フェーズ2、6ファイル）

| 上流ファイル | 役割 | BookFlow 反映先 | 採用状態 | 根拠 |
|---|---|---|---|---|
| `construction/functional-design.md` | 機能設計・ビジネスロジック設計（条件付き・ユニット別） | `.aidlc-rule-details/construction/functional-design.md`（翻案済み） | **エンジン採用（翻案・活性化）** | 条件付きステージ。新データモデル・複雑なビジネスロジックに実行 |
| `construction/nfr-requirements.md` | 非機能要件・技術スタック選定（条件付き・ユニット別） | `.aidlc-rule-details/construction/nfr-requirements.md`（翻案済み） | **エンジン採用（翻案・活性化）** | 条件付きステージ。BookFlow の Spring Boot + Next.js スタックに対応 |
| `construction/nfr-design.md` | NFR パターン・論理コンポーネント設計（条件付き・ユニット別） | `.aidlc-rule-details/construction/nfr-design.md`（翻案済み） | **エンジン採用（翻案・活性化）** | 条件付きステージ。NFR Requirements 実行時に続けて実行 |
| `construction/infrastructure-design.md` | インフラ・デプロイアーキテクチャ設計（条件付き・ユニット別） | `.aidlc-rule-details/construction/infrastructure-design.md`（翻案済み） | **エンジン採用（翻案・活性化）** | 条件付きステージ。BookFlow の Docker Compose / DevContainer 環境に対応 |
| `construction/code-generation.md` | コード生成（必須・ユニット別。計画→生成の 2 段階） | `.aidlc-rule-details/construction/code-generation.md`（翻案済み） | **エンジン採用（翻案・活性化）** | 必須ステージ。Spec-first との統合：コード生成前に `Docs/spec/` 更新（`/update-spec` スキル） |
| `construction/build-and-test.md` | ビルド・テスト手順生成（必須・全ユニット完了後） | `.aidlc-rule-details/construction/build-and-test.md`（翻案済み） | **エンジン採用（翻案・活性化）** | 必須ステージ。CI 品質ゲート（`ci-frontend` / `ci-backend`）に対応 |

### operations（フェーズ3、1ファイル）

| 上流ファイル | 役割 | BookFlow 反映先 | 採用状態 | 根拠 |
|---|---|---|---|---|
| `operations/operations.md` | デプロイ・監視（将来機能のプレースホルダー） | `.aidlc-rule-details/operations/operations.md`（翻案済み） | **エンジン採用（プレースホルダー）** | 上流同様プレースホルダー。BookFlow の CI 品質ゲート（Operations 相当）が現状の実体 |

### extensions（オプトイン拡張、6ファイル）

| 上流ファイル | 役割 | BookFlow 反映先 | 採用状態 | 根拠 |
|---|---|---|---|---|
| `extensions/security/baseline/security-baseline.md` | セキュリティベースラインルール（フルルール） | `.aidlc-rule-details/extensions/security/baseline/security-baseline.md`（翻案済み） | **エンジン採用（opt-in 時にロード）** | 既存セキュリティ監査（`Docs/decision/` ADR）と相補的 |
| `extensions/security/baseline/security-baseline.opt-in.md` | セキュリティ拡張のオプトイン質問 | `.aidlc-rule-details/extensions/security/baseline/security-baseline.opt-in.md`（翻案済み） | **エンジン採用（Requirements Analysis で表示）** | Requirements Analysis で学習者にセキュリティ適用有無を問う |
| `extensions/resiliency/baseline/resiliency-baseline.md` | レジリエンシーベースラインルール（フルルール） | `.aidlc-rule-details/extensions/resiliency/baseline/resiliency-baseline.md`（翻案済み） | **エンジン採用（opt-in 時にロード）** | AWS Well-Architected ベース。BookFlow の Spring Boot + Docker 環境に対応 |
| `extensions/resiliency/baseline/resiliency-baseline.opt-in.md` | レジリエンシー拡張のオプトイン質問 | `.aidlc-rule-details/extensions/resiliency/baseline/resiliency-baseline.opt-in.md`（翻案済み） | **エンジン採用（Requirements Analysis で表示）** | Requirements Analysis で学習者にレジリエンシー適用有無を問う |
| `extensions/testing/property-based/property-based-testing.md` | プロパティベーステストルール（フルルール） | `.aidlc-rule-details/extensions/testing/property-based/property-based-testing.md`（翻案済み） | **エンジン採用（opt-in 時にロード）** | Vitest + JUnit 5 テスト基盤でのプロパティベーステスト適用 |
| `extensions/testing/property-based/property-based-testing.opt-in.md` | プロパティベーステスト拡張のオプトイン質問 | `.aidlc-rule-details/extensions/testing/property-based/property-based-testing.opt-in.md`（翻案済み） | **エンジン採用（Requirements Analysis で表示）** | Requirements Analysis で学習者にプロパティベーステスト適用有無を問う |

---

## 上流同期手順

1. [`awslabs/aidlc-workflows`](https://github.com/awslabs/aidlc-workflows) の最新コミットを確認する。
2. [`vendor/aidlc-rules/`](../../vendor/aidlc-rules/) の各ファイルを新しい上流コミットの内容と diff する（vendored スナップショットが diff の基準）。
3. 差分があった内容について、上の採用台帳テーブルと以下を更新する：
   - `.claude/rules/aidlc-core.md`（core-workflow 翻案）
   - `.claude/rules/aidlc-guardrails.md` / `.claude/rules/aidlc-questions.md`
   - `.aidlc-rule-details/` の対応ファイル（パス翻案を維持しつつ内容を更新）
4. `vendor/aidlc-rules/` の内容、`vendor/aidlc-rules/PROVENANCE.md` の固定コミット・取得日・VERSION を新しい値に更新する。
5. 本ファイル冒頭の固定コミット・取得日表記を更新する。

専用の同期スキル・CI は設けていない。上記手順を都度実施する。

---

## 関連リンク

- BookFlow の標準フロー・フェーズ詳細: [`Docs/guide/dev-workflow.md`](../guide/dev-workflow.md)
- 取り込み案の検討記録: [`Docs/plan/aidlc-overview.html`](../plan/aidlc-overview.html)
- 採用転換 ADR: [`Docs/decision/`](../decision/)（ADR-020 参照）
- vendored スナップショットの出典: [`vendor/aidlc-rules/PROVENANCE.md`](../../vendor/aidlc-rules/PROVENANCE.md)
- BookFlow 翻案済みステージファイル: [`.aidlc-rule-details/`](../../.aidlc-rule-details/)
- 状態トラッカー: [`Docs/spec/aidlc-state.md`](./aidlc-state.md)
- 監査ログ: [`Docs/spec/aidlc-audit.md`](./aidlc-audit.md)
