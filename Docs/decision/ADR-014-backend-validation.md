---
type: adr
title: ADR-014 — バックエンド：バリデーション
description: バックエンドのバリデーション方針として Bean Validation（Jakarta EE）を採用した判断の記録
tags: [backend, validation, bean-validation]
timestamp: 2026-05-28
---

# ADR-014 — バックエンド：バリデーション

## Status

Accepted

## Context

Spring Boot でのリクエストバリデーション方式を決定する。実質的な候補は Jakarta Bean Validation（Hibernate Validator）のみ。

## Decision

**Jakarta Bean Validation（Hibernate Validator）** を採用する。

- Spring Boot の `spring-boot-starter-validation` に同梱されており追加依存不要
- `@Valid` / `@Validated` アノテーションで Controller / Service レベルの両方でバリデーションできる
- `@NotNull` / `@Size` / `@Pattern` 等の標準アノテーションとカスタムアノテーションを統一的に扱える
- Spring の `MethodArgumentNotValidException` ハンドラと連携してエラーレスポンスを標準化できる

## Consequences

- DTO クラスにバリデーションアノテーションを付与し、Controller で `@Valid` を使ってバリデーションを起動する
- カスタムバリデーションは `@Constraint` + `ConstraintValidator` で実装する
- バリデーションエラーは `@ExceptionHandler` または `@RestControllerAdvice` で統一レスポンスに変換する
