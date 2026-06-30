---
type: adr
title: ADR-016 — バックエンド：認証・認可
description: バックエンドの認証・認可として Spring Security + OAuth2 Resource Server（Cognito）を採用した判断の記録
tags:
  - backend
  - auth
  - spring-security
  - cognito
  - oauth2
timestamp: 2026-06-06
---

# ADR-016 — バックエンド：認証・認可

## Status

Accepted

> **実装時 DEVIATION（2026-06-02）**
> - `issuer-uri` ではなく **`jwk-set-uri`** を使用。cognito-local 停止中でも起動できるよう、起動時の OIDC discovery（`/.well-known/openid-configuration` フェッチ）を回避するため。
> - `hasAuthority("SCOPE_xxx")` ではなく **`hasRole("MEMBER")`** 等を使用。Cognito JWT の `custom:role` クレーム（スカラー文字列 `MEMBER`/`APPROVER`/`ADMIN`）を `ROLE_*` 権限にマッピングする `RoleJwtAuthenticationConverter` を実装。
> - `JwtDecoder` Bean の明示定義は不要（Spring Boot 自動構成が `jwk-set-uri` から生成）。
> - テストでは `@WithMockMember`/`@WithMockApprover`/`@WithMockAdmin`（`JwtAuthenticationToken` ベースのカスタムアノテーション）を採用（`@WithMockUser` は Spring Security の通常 Auth 向けで JWT には非推奨）。
>
> **実装時 DEVIATION（2026-06-03）**
> - `CurrentUserArgumentResolver`（`@CurrentUser User`）を `WebMvcConfigurer.addArgumentResolvers` で登録。JWT `sub` クレーム → `UserRepository.findByCognitoSub()` → `User` エンティティを解決。未登録ユーザーには `UnregisteredUserException`（素の `RuntimeException`）をスロー。フィルタチェーン後のリゾルバから投げるため Spring Security の `AuthenticationException` にはせず、`@RestControllerAdvice` の `@ExceptionHandler(UnregisteredUserException.class)` が 401 `UNAUTHORIZED` に変換する。

## Context

Spring Boot での API 認証・認可の実装方針を決定する。フロントエンドは Better Auth（ADR-008）+ cognito-local を通じて発行された JWT を Spring Boot に送信する。

## Decision

**Spring Security + OAuth2 Resource Server（Cognito JWT 検証）** を採用する。

- `spring-boot-starter-oauth2-resource-server` で JWT 検証が設定ファイルだけで完結する
- `application.yml` の `spring.security.oauth2.resourceserver.jwt.issuer-uri` に cognito-local のエンドポイントを指定することでローカル動作する
- Spring Security の `@PreAuthorize` / `SecurityContext` で認可ロジックを標準的に実装できる
- 本番（Amazon Cognito）とローカル（cognito-local）の切り替えが環境変数 1 つで完結する

## Consequences

- `SecurityConfig` クラスで `JwtDecoder` Bean を定義し JWT 検証ロジックをカスタマイズできるようにする
- `@PreAuthorize("hasAuthority('SCOPE_xxx')")` で認可を実装する
- 本番環境では `issuer-uri` を Cognito の実際のエンドポイントに切り替える
- テストでは `@WithMockUser` または `SecurityMockMvcRequestPostProcessors.jwt()` を使用する
