# Component Inventory

> 深さ：浅め。パッケージ全体の網羅よりも、モノレポの構成把握を目的とする。

## Application Packages

- `frontend` - Next.js（App Router）フロントエンド + BFF
- `backend` - Spring Boot バックエンド API

## Infrastructure Packages

- `.devcontainer` - DevContainer + Docker Compose（ローカル環境構築）
- 本番インフラ（Terraform 等）はこのモノレポには含まれない（[architecture.md](../../../../../docs-next/docs/reference/architecture.md) はベースライン設計のドキュメントのみ）

## Shared Packages

- なし（フロントエンド・バックエンドは型定義を共有しない。フロントエンドの Zod スキーマ・型は `frontend/src/lib/` 配下で独自定義）

## Documentation / Tooling Packages

- `docs-next` - ドキュメントサイト（Docusaurus）。`docs/spec/` が仕様の真実の源
- `Docs/spec` - AI-DLC エンジンの作業ファイル（進捗トラッカー・監査ログ・本 RE 成果物）
- `ops-note` - チュートリアル運営ノート

## Test Packages

- `backend/src/test` - JUnit 5 + H2 + Mockito
- `frontend/tests/unit` - Vitest ユニットテスト
- `frontend/tests/e2e` - Playwright E2E テスト

## Total Count

- **Total Packages**: 2（application）+ 3（documentation/tooling）
- **Application**: 2（frontend, backend）
- **Infrastructure**: 0（コードとしては存在しない）
- **Shared**: 0
- **Test**: 2（backend/src/test, frontend/tests）
