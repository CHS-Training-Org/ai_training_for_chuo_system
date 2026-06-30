---
type: adr
title: ADR-012 — バックエンド：データアクセス（ORM）
description: バックエンドのデータアクセス層として Spring Data JPA + PostgreSQL を採用した判断の記録
tags:
  - backend
  - orm
  - spring-data-jpa
  - postgresql
timestamp: 2026-05-28
---

# ADR-012 — バックエンド：データアクセス（ORM）

## Status

Accepted

## Context

Spring Boot でのデータアクセス層の実装方針を決定する。候補は Spring Data JPA / MyBatis / jOOQ。

**SQL 記述方針について**

業界全体では「ORM ファーストで標準 CRUD を自動化し、複雑なクエリのみ SQL を補完する」が現在のデファクト。過去の大規模プロジェクトでは、スクラッチ SQL の乱立がメンテナンスコストの増大・可読性の低下を招いたケースが多く報告されており、本プロジェクトでも **JPQL を上限とし、生 SQL（Native Query）は原則禁止** とする。これは業界全体で ORM が「10 年前に勝ちを収めた」という評価と整合する判断である。

一方で「ORM では表現できない複雑な集計や高パフォーマンスが求められる処理に生 SQL は有効」という反論も存在する。本プロジェクトではその場合も JPQL の Specification / `@Query` での対応を優先し、例外的に `@NativeQuery` を使う場合はコードレビューでの承認を必須とする。

| 候補 | 学習コスト | AI補完精度 | SQL 記述方針適合 | ボイラープレート |
|---|---|---|---|---|
| Spring Data JPA | ★★★ | ★★★ | ✓ JPQL / メソッド名クエリ | 最小 |
| MyBatis | ★★ | ★★ | ✗ SQL 記述が前提 | 多い（Mapper XML）|
| jOOQ | ★ | ★★ | ✓ 型安全 DSL | 多い（コード生成が必要）|

## Decision

**Spring Data JPA（Hibernate）** を採用する。

- `interface extends JpaRepository<T, ID>` だけで標準 CRUD が自動生成され、ボイラープレートが最小
- メソッド名規約クエリ（`findByTitleContaining`）で SQL を書かずに検索が実装できる
- 複雑なクエリは `@Query` の JPQL で対応し、生 SQL を書かない方針と整合する
- MyBatis は SQL 記述が前提のため本方針と相反する
- jOOQ はスキーマ→コード生成ステップが必要でセットアップコストが高い

## Consequences

- エンティティは `domain/` レイヤーに配置し、`@Entity` / `@Table` でマッピングする
- Repository インターフェースは `domain/` 配下に定義する
- `FetchType.LAZY` をデフォルトとし、必要箇所に `@EntityGraph` または `JOIN FETCH` を使って N+1 を防ぐ
- Flyway（ADR-013）でスキーマを管理し、`spring.jpa.hibernate.ddl-auto=validate` を設定する
- `@NativeQuery` の使用はコードレビューで承認を必要とし、承認理由をコメントに残す
