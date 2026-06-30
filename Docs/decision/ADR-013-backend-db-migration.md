---
type: adr
title: ADR-013 — バックエンド：DB マイグレーション
description: バックエンドの DB マイグレーションツールとして Flyway を採用した判断の記録
tags:
  - backend
  - db
  - flyway
  - migration
timestamp: 2026-05-28
---

# ADR-013 — バックエンド：DB マイグレーション

## Status

Accepted

## Context

PostgreSQL スキーマのバージョン管理・マイグレーションツールを決定する。候補は Flyway / Liquibase。

| 候補 | 学習コスト | AI補完精度 | メンテ活性 | エコシステム整合 |
|---|---|---|---|---|
| Flyway | ★★★ | ★★★ | ★★ | ★★ |
| Liquibase | ★★ | ★★ | ★★ | ★★ |

## Decision

**Flyway** を採用する。

- SQL ファイルを連番（`V001__xxx.sql`）で管理するシンプルな方式で概念把握が早い
- Spring Boot の `spring-boot-starter-flyway` で自動実行設定が完結する
- 生の SQL で記述するためスキーマ変更の意図がそのまま残る
- Liquibase の XML / YAML DSL より可読性が高い

## Consequences

- マイグレーションファイルは `src/main/resources/db/migration/` に配置する
- ファイル名規則は `V<3桁連番>__<snake_case>.sql`（例：`V001__create_posts_table.sql`）
- 一度コミットしたマイグレーションファイルは変更しない（変更は新規ファイルで追記）
- テスト用 DB も Flyway を適用し、`Testcontainers` で立ち上げた PostgreSQL を使用する
