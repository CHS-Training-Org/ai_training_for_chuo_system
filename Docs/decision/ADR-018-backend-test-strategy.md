---
type: adr
title: ADR-018 — バックエンド：テスト戦略
description: バックエンドのテスト戦略として JUnit 5 + H2 + Mockito を採用した判断の記録
tags:
  - backend
  - testing
  - junit
  - mockito
  - h2
timestamp: 2026-05-28
---

# ADR-018 — バックエンド：テスト戦略

## Status

Accepted

## Context

Spring Boot アプリケーションのテスト構成を決定する。ローカル・CI いずれにおいても **テスト実行速度を最優先** とする。Docker コンテナ（Testcontainers）の起動コストは避けたい。

## Decision

**JUnit 5 + Spring Boot Test + H2 インメモリ DB（テスト専用）+ Mockito** を採用する。

| 層 | 手段 | 理由 |
|---|---|---|
| Domain / Service | `@ExtendWith(MockitoExtension.class)` | Spring Context なしで最速 |
| Repository | `@DataJpaTest` + H2 in-memory | Docker 不要、Flyway マイグレーション込みで実行 |
| Controller | `@WebMvcTest` + `@MockBean` | MVC 層のみ起動し上位 Bean はモック |
| 結合 | 基本作成しない | 必要な場合のみ `@SpringBootTest` を使用 |

H2 の PostgreSQL 互換モード（`jdbc:h2:mem:testdb;MODE=PostgreSQL`）を使用することで Flyway マイグレーション SQL の大半をそのまま実行できる。ただし PostgreSQL 固有の型（`jsonb` 等）や関数は使用しないこと。

## Consequences

- テスト用プロパティは `src/test/resources/application-test.yml` で H2 接続に切り替える
- Flyway はテスト時も有効にし、`V001__...sql` が H2 で正常実行されることを確認する
- Service 層のテストは Spring Context を起動しない（`@ExtendWith(MockitoExtension.class)` のみ）
- Testcontainers は導入しない。将来的に PostgreSQL 固有の検証が必要になった場合に限り追加を検討する
- テストの命名は `methodName_condition_expectedBehavior` 形式とする
