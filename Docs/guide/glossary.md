---
type: guide
title: 用語集
description: BookFlow 学習リポジトリで使用するドメイン用語・プロジェクト技術用語・AI-DLC 開発プロセス用語の一覧
tags:
  - guide
  - glossary
timestamp: 2026-07-07
audience: 学習者（若手・中堅以上）・メンター
references:
  - Docs/spec/overview.md
  - Docs/spec/requirements.md
  - Docs/guide/dev-workflow.md
---

# 用語集

BookFlow のドキュメントを読み進める上で登場する用語をまとめています。  
ドメイン用語（業務システムとしての BookFlow）、プロジェクト・技術用語（開発環境、技術スタック）、AI-DLC・開発プロセス用語（本リポジトリの標準ワークフロー）の 3 分類です。

---

## ドメイン用語

BookFlow の業務ドメイン（施設・備品予約 + 承認ワークフロー）に関する用語です。  
詳細は [requirements.md §用語定義](../spec/requirements.md#用語定義) を参照してください。

| 用語 | 定義 |
|------|------|
| **リソース** | 予約対象となる施設・備品の総称。カテゴリは `ROOM`（会議室）/ `EQUIPMENT`（備品）/ `VEHICLE`（社用車）の 3 種 |
| **予約** | ユーザーがリソースの特定日時を占有申請したレコード。ステータスにより状態が管理される |
| **承認ステップ** | 承認必要リソースの予約に紐づく承認者の判断レコード。ベース実装は 1 段階（`step_order = 1`） |
| **ロール** | ユーザーの権限種別。`MEMBER`（一般社員）/ `APPROVER`（承認者）/ `ADMIN`（管理者）の 3 種 |
| **承認フロー** | `requires_approval = true` のリソースを予約した際に発生するワークフロー。承認者が承認・却下するまで予約は `PENDING` 状態を保つ |
| **即時確定** | `requires_approval = false` のリソースを予約した際の動作。`approval_steps` を生成せず即座に `APPROVED` へ遷移する |
| **重複予約** | 同一リソース・同一時間帯に `status IN ('PENDING', 'APPROVED')` の予約が存在する状態。新規申請時にアプリ層で検出し拒否する |

---

## プロジェクト・技術用語

本リポジトリの学習環境、技術スタックに関する用語です。詳細は [overview.md](../spec/overview.md) を参照してください。

| 用語 | 説明 |
|------|------|
| **AI 駆動開発** | Claude Code などの AI ツールを積極活用して開発速度・品質を高める開発手法 |
| **BookFlow** | 本リポジトリのベースとなるサンプルサービス（施設・備品予約 + 承認ワークフロー統合アプリ） |
| **BFF** | Backend for Frontend。Next.js API Routes がこの役割を担い、認証トークン管理とバックエンド呼び出しを集約する |
| **DevContainer** | VS Code + Docker を用いた再現性の高い開発環境。`.devcontainer/` 配下に定義 |
| **選択課題** | GitHub Issue に登録して取り組む、順序性のない課題。学習者が自由に選択する |
| **必須課題** | 環境構築など順序依存のあるステップ課題（STEP-01〜03）。GitHub Issue は起票せず自己チェックで進める。若手は先にこれをクリアする |
| **LocalStack** | AWS サービス（S3・DynamoDB・Lambda・API Gateway）をローカルでエミュレートするツール |
| **cognito-local** | Amazon Cognito のユーザープール認証フローをローカルでエミュレートする npm パッケージ |

---

## AI-DLC・開発プロセス用語

本リポジトリが標準ワークフローとして採用する AI-DLC エンジンおよび開発プロセスに関する用語です。  
詳細は [dev-workflow.md](./dev-workflow.md) と `.claude/skills/aidlc/SKILL.md` を参照してください。

| 用語 | 説明 |
|------|------|
| **AI-DLC** | AWS Labs の AI Development Life Cycle（[`awslabs/aidlc-workflows`](https://github.com/awslabs/aidlc-workflows)）。BookFlow が標準開発フローとして採用しているエンジン。`/aidlc` の明示起動、または「AI-DLC で進めて」等の意図指定があったときにのみ発動する |
| **INCEPTION フェーズ** | AI-DLC の第 1 フェーズ（WHAT/WHY）。`/aidlc` 起動後、通常（agent）モードで Workspace Detection → Requirements Analysis → Workflow Planning を実行し、実行計画を提示する |
| **CONSTRUCTION フェーズ** | AI-DLC の第 2 フェーズ（HOW）。設計ステージ（Functional Design 等）と Code Generation・Build and Test を per-unit ループで実行する |
| **OPERATIONS フェーズ** | AI-DLC の第 3 フェーズ。BookFlow では CI 品質ゲート（`CI Frontend` / `CI Backend`）がこれに相当する |
| **units of work** | CONSTRUCTION で並行実行可能な作業単位。BookFlow では縦切り課題 Issue（`feature/<GitHubユーザー名>/<issue番号>-<short-desc>` 単位）に対応する |
| **縦切り実装** | フロントエンド・バックエンドなど複数レイヤーにまたがる変更を機能単位でまとめて実装する方針 |
| **Spec-first** | 実装より先に `Docs/spec/` を更新し、それを真実の源とする原則 |
| **セルフレビュー・マージ** | PR テンプレートのチェックリストを学習者自身が満たしたうえでマージする運用。メンターの承認は不要（[ADR-023](../decision/ADR-023-mentor-gate-removal.md) 参照） |
| **ADR（Architecture Decision Record）** | 技術選定・設計上の重要な意思決定を記録するドキュメント。`Docs/decision/` に格納（[decision/README.md](../decision/README.md) 参照） |
| **OKF（Open Knowledge Format）** | Markdown + YAML frontmatter で知識メタデータを表現するベンダー中立フォーマット。BookFlow は frontmatter 規律のみを採用（[ADR-021](../decision/ADR-021-okf-frontmatter-adoption.md) 参照） |
