---
type: index
title: BookFlow ドキュメント
description: 社内 AI 駆動開発チュートリアル「BookFlow」の設計・学習ドキュメントサイトのトップページ
tags: [index, overview]
timestamp: 2026-06-12
---

# BookFlow ドキュメント

> 社内 AI 駆動開発チュートリアル「BookFlow」の設計・学習ドキュメントサイトへようこそ。

**BookFlow** は、社内エンジニアが **AI 駆動開発**（Claude Code）を活用したフルスタック開発を体験・習得するための学習用リポジトリです。あらかじめ用意された施設・備品予約サービスを土台に、AI ツールを積極的に活用しながらエンハンス開発を行い、実務に近い技術スタックと開発フローを通じて実践スキルを身につけます。

本サイトでは、プロジェクトの計画・アーキテクチャ・設計判断（ADR）・仕様・学習者向けガイドを公開しています。

---

## まず読む

はじめての方は、まず環境構築から始めましょう。

- 🚀 **[はじめに（環境構築・起動手順）](./guide/getting-started.md)** — クローンから動作確認・初期データ投入まで
- 📘 **[学習者向けガイド](./guide/index.md)** — AI ツールの使い分け・コーディング規約・トラブルシューティング

---

## ドキュメントセクション

| セクション | 概要 | 対象読者 |
|-----------|------|---------|
| [リポジトリ概要](./spec/overview.md) | 本リポジトリの目的・対象者・ステークホルダー役割・用語集 | 全員 |
| [アーキテクチャ](./ARCHITECTURE.md) | AWS 標準アーキテクチャと全体構成図 | メンター・管理者 |
| [計画 (Plan)](./plan/PHASE4_AI_DRIVEN_DEV_TASKS.md) | 今後の整備タスク（仕様書整備・AI 駆動開発ワークフロー・エンハンス要件策定） | メンター・管理者 |
| [設計判断 (ADR)](./decision/README.md) | 技術選定・設計上の意思決定の記録 | メンター・学習者 |
| [仕様 (Spec)](./spec/index.md) | 要件・画面・API・ER などの実装仕様 | 学習者・メンター |
| [ガイド (Guide)](./guide/index.md) | 学習者が詰まりやすいポイントを先回りで解決 | 学習者 |
| [Claude Code 設定](./claude/index.md) | Rules・Skills・Hooks など Claude Code の設定資産一覧 | 学習者・メンター |

---

## 技術スタック概要

- **フロントエンド**: Next.js 15（App Router）/ React 19 / TypeScript / Tailwind CSS v4 / shadcn/ui
- **バックエンド**: Spring Boot 4.0 / Java 25 / Spring Data JPA / Flyway
- **認証・認可**: Better Auth + Cognito / Spring Security + OAuth2 Resource Server
- **開発環境**: DevContainer + Docker Compose（`docker compose up` 一発で起動）

詳細は [リポジトリ概要](./spec/overview.md) と [アーキテクチャ](./ARCHITECTURE.md) を参照してください。
