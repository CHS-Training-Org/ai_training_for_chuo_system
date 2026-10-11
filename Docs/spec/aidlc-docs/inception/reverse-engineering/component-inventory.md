# Component Inventory

## Application Packages
- `frontend` - Next.js 15 / React 19 フロントエンド + BFF（Server Actions）
- `backend` - Spring Boot 4.0 / Java 25 バックエンド API サーバー
- `docs-next` - Docusaurus ドキュメントサイト（業務ロジックなし、学習者・運営者向け仕様書公開）

## Infrastructure Packages
- 該当なし（CDK/Terraform/CloudFormation コードは本リポジトリに含まれない。本番アーキテクチャは `docs-next/docs/reference/architecture.md` にドキュメントとしてのみ存在する）

## Shared Packages
- 該当なし（frontend・backend 間でコード共有パッケージはなく、型定義はそれぞれ独立して保持している。フロントエンドの `frontend/src/lib/types/api.ts` の Zod スキーマとバックエンドの `presentation/dto/*.java` が手動で同期されている）

## Test Packages
- `backend/src/test/java/com/example/bookflow/` - JUnit 5 + H2 + Mockito によるユニット・統合テスト（Unit、10ファイル確認）
- `frontend/tests/unit/` - Vitest + MSW によるユニットテスト
- `frontend/tests/e2e/` - Playwright による E2E テスト

## Total Count
- **Total Packages**: 3（frontend / backend / docs-next）
- **Application**: 3
- **Infrastructure**: 0
- **Shared**: 0
- **Test**: 2（backend 側 JUnit、frontend 側 Vitest/Playwright。物理的にはそれぞれのアプリケーションパッケージ内に同居）
