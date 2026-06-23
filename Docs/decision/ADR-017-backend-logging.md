---
type: adr
title: ADR-017 — バックエンド：ロギング戦略
description: バックエンドのロギング戦略として SLF4J + Logback を採用した判断の記録
tags: [backend, logging, slf4j, logback]
timestamp: 2026-06-23
---

# ADR-017 — バックエンド：ロギング戦略

## Status

Accepted

## Context

Spring Boot アプリケーションのログ出力方式を決定する。候補は Logback + SLF4J の標準設定 / 構造化 JSON 出力。

## Decision

**Logback + SLF4J + 構造化 JSON 出力**（`logstash-logback-encoder`）を採用する。

- Spring Boot 標準の Logback をそのまま使用するためランタイム変更なし
- `logstash-logback-encoder` で JSON 形式出力に切り替え、コンテナログ収集（CloudWatch Logs / Fluentd）と親和性が高い
- `prod` プロファイルでは JSON appender、`!prod`（local / test）では ANSI 色付きテキスト appender をプロファイルで切り替える
- SLF4J ファサードを使うため将来的なロガー実装の交換が容易

**HTTP リクエストロギング**

- Spring の `CommonsRequestLoggingFilter` を Bean 登録し、受信リクエストをログ出力する
- **クエリストリングは含める**、クライアント情報・リクエストヘッダ・リクエストボディは**除外する**（PII やシークレットのログ流出リスクを最小化する保守的設定）
- ログレベルは `org.springframework.web.filter.CommonsRequestLoggingFilter: DEBUG`（`application.yml`）で制御する

## Consequences

- 依存に `net.logstash.logback:logstash-logback-encoder` を追加する
- `logback-spring.xml` でプロファイル（`prod` / `!prod`）別の appender を定義する
  - `!prod`（local / test）: `%clr(...)` によるANSI 色付きパターン。`spring.output.ansi.enabled: ALWAYS`（`application.yml`）でターミナル色出力を有効化する
  - `prod`: `LogstashEncoder` による JSON 構造化出力
- アプリケーションコードは常に `LoggerFactory.getLogger(Xxx.class)` / `@Slf4j`（Lombok）でロガーを取得する
- リクエスト ID（トレース ID）は `MDC` に格納し JSON フィールドとして出力する
- `RequestLoggingConfig`（`infrastructure/config/`）で `CommonsRequestLoggingFilter` を Bean 定義する
