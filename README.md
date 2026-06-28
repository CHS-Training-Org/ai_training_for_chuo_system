# AI Development Tutorial — BookFlow

社内 AI 駆動開発チュートリアル用リポジトリ。  
施設・備品予約システム **BookFlow** を題材に、Next.js + Spring Boot のフルスタック開発を体験する。

---

## 環境構築

手順の詳細（DevContainer・手動セットアップ・OS 別の事前準備）は **[はじめに（環境構築・起動手順）](Docs/guide/getting-started.md)** を参照してください。

---

## 学習の始め方

1. [`Docs/guide/getting-started.md`](Docs/guide/getting-started.md) を読む
2. GitHub Issues の `[Level: Beginner]` タグが付いた課題から着手する
3. [`CONTRIBUTING.md`](CONTRIBUTING.md) に従ってブランチを切り、PR を送る

---

## ドキュメントサイト

ドキュメントは **Zensical** で静的サイトとして公開しています。

- **公開サイト**: https://github.com/CHS-Training-Org/ai_training_for_chuo_system
- **ローカルプレビュー**: devcontainer 起動時に自動で http://localhost:8000 が立ち上がります。
- **手動ビルド**（`site/` への静的出力が必要な場合）:
  ```bash
  docker compose exec docs uv run zensical build
  ```

---

## ドキュメント一覧

| ドキュメント                                                                         | 内容                                                    |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| [`Docs/spec/overview.md`](Docs/spec/overview.md)                                     | リポジトリ概要（目的・対象者・役割・用語集）            |
| [`Docs/ARCHITECTURE.md`](Docs/ARCHITECTURE.md)                                       | システムアーキテクチャ                                  |
| [`Docs/plan/PHASE4_AI_DRIVEN_DEV_TASKS.md`](Docs/plan/PHASE4_AI_DRIVEN_DEV_TASKS.md) | 今後の計画（AI 駆動開発整備タスク）                     |
| [`Docs/decision/`](Docs/decision/)                                                   | ADR（アーキテクチャ決定記録）                           |
| [`Docs/spec/index.md`](Docs/spec/index.md)                                           | 実装仕様（要件・画面・API・ER 図）                      |
| [`Docs/guide/index.md`](Docs/guide/index.md)                                         | 学習者向けガイド（環境構築・AI ツール・規約・トラブル） |

---

## コントリビュート

[`CONTRIBUTING.md`](CONTRIBUTING.md) を参照。  
ブランチ命名規則：`feature/<issue番号>-<short-desc>`
