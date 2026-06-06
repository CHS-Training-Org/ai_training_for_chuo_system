# ADR-015 — バックエンド：API ドキュメント

## Status

Accepted

## Context

Spring Boot REST API のドキュメント自動生成ツールを決定する。候補は Springdoc OpenAPI / Spring REST Docs。

| 候補 | 学習コスト | AI補完精度 | メンテ活性 | エコシステム整合 |
|---|---|---|---|---|
| Springdoc OpenAPI | ★★★ | ★★★ | ★★ | ★★ |
| Spring REST Docs | ★★ | ★★ | ★★ | ★★ |

## Decision

**Springdoc OpenAPI** を採用する。

- `springdoc-openapi-starter-webmvc-ui` を `build.gradle.kts` に追加するだけで Swagger UI が即座に利用可能
- コードから OpenAPI 3.x 仕様を自動生成し、追加記述コストが最小
- `/v3/api-docs` エンドポイントで JSON 仕様を取得でき、フロントエンドとの型共有にも使える
- Spring REST Docs と異なりテストの記述なしにドキュメントが生成される

## Consequences

- `http://localhost:8080/swagger-ui.html` で Swagger UI を確認できる
- `@Operation` / `@ApiResponse` アノテーションで詳細な説明を補完する（必須ではない）
- 本番環境では `springdoc.swagger-ui.enabled=false` でUIを無効化する
- `/v3/api-docs` の OpenAPI JSON を使い、将来的な型生成（openapi-generator 等）の基盤とする
