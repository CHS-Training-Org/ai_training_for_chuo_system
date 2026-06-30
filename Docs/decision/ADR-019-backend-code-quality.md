---
type: adr
title: ADR-019 — バックエンド：コード品質ツール
description: バックエンドのコード品質ツールとして Spotless + Checkstyle を採用した判断の記録
tags:
  - backend
  - code-quality
  - spotless
  - checkstyle
timestamp: 2026-05-31
---

# ADR-019 — バックエンド：コード品質ツール

## Status

Accepted

## Context

Java コードのフォーマット・スタイルチェックツールを決定する。候補は Spotless + Checkstyle / Spotless のみ。

## Decision

**Spotless + Checkstyle** を採用する。

- **Spotless**：コードフォーマットを自動適用（`./gradlew spotlessApply`）。Google Java Format をベースとすることで設定量を最小化する
- **Checkstyle**：Spotless が扱わないコーディング規約（命名規則・Javadoc 必須箇所・禁止パターン等）を静的解析でチェックする
- 両者を組み合わせることで「フォーマットは自動修正」「規約違反はビルド失敗」という役割分担ができる

Spotless のみだとスタイル規約（命名・構造）のチェックができず、Checkstyle のみだとフォーマット自動修正ができないため、両者の組み合わせが最適。

## Consequences

- Spotless は Gradle プラグイン（`com.diffplug.spotless`）で設定し、CI では `./gradlew spotlessCheck` でチェックのみ行う
- Checkstyle の設定は `config/checkstyle/checkstyle.xml` に配置し、Google スタイルをベースに最小限のカスタマイズを加える
- `./gradlew check` で Checkstyle・テストを一括実行できるようにする
- 開発時は `./gradlew spotlessApply` でフォーマットを自動適用してからコミットする
