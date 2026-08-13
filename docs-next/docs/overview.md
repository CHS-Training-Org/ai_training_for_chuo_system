---
sidebar_position: 1
title: BookFlow 学習用リポジトリ概要
description: 本リポジトリ（AI 駆動開発 学習教材）の目的・対象者・ゴール・ステークホルダー役割・用語を定義する概要仕様
tags:
  - spec
  - overview
audience: 学習者・運営者
references:
  - ../architecture.md
  - Docs/spec/index.md
  - Docs/guide/index.md
  - ../glossary.md
last_updated: '2026-08-01T11:56:18+09:00'
---

# BookFlow 学習用リポジトリ概要

---

## 目的

社内エンジニアが **AI 駆動開発**（Claude Code）を活用したフルスタック開発を体験・習得するための学習用リポジトリです。

学習者は、あらかじめ用意されたベースサービス（**BookFlow**）を土台として、AI ツールを積極的に活用しながらエンハンス開発を行います。  
実際の業務に近い技術スタックと開発フロー（AI-DLC エンジン）を通じて、AI 駆動開発の実践スキルを身につけます。

---

## 対象者

| ペルソナ | 前提スキル | 到達目標 |
|----------|-----------|---------|
| 学習者 | プログラミング基礎あり、AI 駆動開発未経験 | AI ツールを使い分けながら独立した機能追加・設計ができる |

経験年数やレベルによる学習パスの分岐は設けていません。全員が同じ順序で同じ課題に取り組みます（[curriculum.md §学習パスマップ](./curriculum.md#path-map)）。

---

## ゴール

- DevContainer を使って周辺サービス（DB・Cognito・LocalStack）を一括起動し、アプリ（`pnpm dev` / `./gradlew bootRun`）を手動で起動するフルスタック開発環境を構築できる
- GitHub Issue に登録された課題を AI ツールを活用して実装・PR・レビューのサイクルを回せる
- [ARCHITECTURE.md](./architecture.md) に記載されたアーキテクチャの全レイヤー（BFF・バックエンド・DB・AWS サービス）を体験できる

---

## ステークホルダーと役割
| 役割 | 責務 |
|------|------|
| **運営者** | 計画書の最終承認・リポジトリ設定管理・課題設計・学習者サポート（Teams 経由）・任意のコードフィードバック（マージのブロッキング承認は行わない） |
| **AI エージェント** | ソフトウェア開発要求に対して INCEPTION（計画）→ CONSTRUCTION（実装）→ OPERATIONS（CI）を駆動する。学習者自身がレビュー・承認 |
| **学習者** | STEP-01〜05 の順で必須課題に取り組む（詳細は [curriculum.md §学習パスマップ](./curriculum.md#path-map) 参照） |

> **役割の統一**：本リポジトリに「メンター」「リポジトリオーナー」の区別はなく、リポジトリ設定管理から学習者サポートまでを「運営者」が担います。運用責任マトリクス（役割 × 責務）の詳細は [operations-guide.md §役割分担](./operations/operations-guide.md#roles) を参照してください。

---

## 用語集

プロジェクト・技術用語の説明は [用語集](./glossary.md) に集約しました。
