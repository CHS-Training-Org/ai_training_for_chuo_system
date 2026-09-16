# Component Inventory

## Application Packages

- `backend` — Spring Boot アプリケーション。4レイヤー構成（domain / application / presentation / infrastructure）。
- `frontend` — Next.js App Router アプリケーション。UI と BFF（Server Actions）を兼ねる。

## Infrastructure Packages

- `.devcontainer` — DevContainer 定義と Docker Compose（PostgreSQL・cognito-local・docs サービス）。
- `.github/workflows` — CI ワークフロー（`ci-backend.yml`・`ci-frontend.yml`・`docs-check.yml`・`docs.yml`・`docs-preview.yml`・`claude.yml`・`label-sync.yml`）。

IaC（CDK・Terraform・CloudFormation）は本リポジトリに含まれない。

## Shared Packages

独立した共有パッケージは存在しない。フロントエンド内の `src/lib/`（型定義・Zod スキーマ・auth・定数）が共有層に相当する。

## Test Packages

- `backend/src/test/java/` — JUnit 5 + Mockito + MockMvc。`support/` にテスト用の認証アノテーションとベースクラスを置く。
- `frontend/tests/unit/` — Vitest + Testing Library + MSW。
- `frontend/tests/e2e/` — Playwright。現状は `example.spec.ts` のみで、実機能の E2E は未整備。

## Documentation Packages

- `docs-next` — Docusaurus。`docs/spec/` が仕様の真実の源。
- `ops-note` — 運営ノート（素の静的 HTML）。
- `Docs/spec` — AI-DLC の状態・監査・設計成果物。

## Total Count

- **Total Packages**: 8（backend / frontend / docs-next / ops-note / .devcontainer / .github / .aidlc-rule-details / Docs）
- **Application**: 2
- **Infrastructure**: 2
- **Shared**: 0（frontend 内に内包）
- **Test**: 0（各アプリケーションパッケージに内包）
- **Documentation**: 3
- **ルール定義**: 1（`.aidlc-rule-details`）
