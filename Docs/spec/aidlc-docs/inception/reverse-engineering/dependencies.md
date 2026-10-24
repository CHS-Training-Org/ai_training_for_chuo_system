# Dependencies

## Internal Dependencies

```mermaid
flowchart LR
    FE["frontend"] -->|"REST /api Bearer JWT"| BE["backend"]
    BE --> PG[("PostgreSQL")]
    FE -.->|"OIDC"| Cognito["Cognito"]
    BE -.->|"JWT 検証"| Cognito
```

### frontend depends on backend
- **Type**: Runtime
- **Reason**: Server Actions が `api-client.ts` 経由で `/api` を呼ぶ（JSON 前提）

### backend の層間依存
- **Type**: Compile
- **Reason**: presentation → application → domain。infrastructure は security / config を提供。`ReservationService` は `presentation.dto` の Request / Response 型を直接扱う（既存の慣習）

## External Dependencies

### Spring Boot 4.0 系 starter
- **Version**: BOM 管理（actuator / data-jpa / oauth2-resource-server / validation / web / flyway）
- **Purpose**: アプリ基盤
- **License**: Apache-2.0

### springdoc-openapi-starter-webmvc-ui
- **Version**: 3.0.1
- **Purpose**: OpenAPI / Swagger UI
- **License**: Apache-2.0

### logstash-logback-encoder
- **Version**: 8.0
- **Purpose**: 本番 JSON ログ（ADR-017）
- **License**: Apache-2.0

### frontend 主要依存
- **Version**: Next.js ^15.3.2 / React ^19.1.0 / Zod ^3.25.76 / Better Auth ^1.2.7 / MSW ^2.7.5 / Vitest ^3.2.6 / Playwright ^1.52.0
- **Purpose**: UI・BFF・テスト
- **License**: MIT ほか

### CSV ライブラリ
- **Version**: なし
- **Purpose**: 未導入。Issue #29 で `opencsv` を採用する場合は `build.gradle.kts` への追加とライセンス確認（Apache-2.0）が必要
