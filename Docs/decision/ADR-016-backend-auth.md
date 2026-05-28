# ADR-016 — バックエンド：認証・認可

## Status

Accepted

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
