---
type: adr
title: ADR-017 — バックエンド：ロギング戦略
description: バックエンドのロギング戦略として SLF4J + Logback を採用した判断の記録
tags: [backend, logging, slf4j, logback]
timestamp: 2026-05-28
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
- ローカルでは `console-appender`（テキスト）、コンテナ環境では JSON appender をプロファイルで切り替える
- SLF4J ファサードを使うため将来的なロガー実装の交換が容易

## Consequences

- 依存に `net.logstash.logback:logstash-logback-encoder` を追加する
- `logback-spring.xml` でプロファイル（`local` / `prod`）別の appender を定義する
- アプリケーションコードは常に `LoggerFactory.getLogger(Xxx.class)` / `@Slf4j`（Lombok）でロガーを取得する
- リクエスト ID（トレース ID）は `MDC` に格納し JSON フィールドとして出力する
