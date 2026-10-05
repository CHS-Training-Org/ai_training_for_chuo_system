# Component Inventory

## Application Packages

- `frontend` - Next.js 15（App Router + Server Actions = BFF）/ UI・画面・フォーム
- `backend` - Spring Boot 4.0（4層アーキテクチャ）/ REST API・業務ロジック・永続化

## Infrastructure Packages

- なし（本リポジトリに CDK/Terraform コードは含まれない。IaC は別リポジトリ想定、`docs-next/docs/reference/architecture.md` を参照）

## Shared Packages

- `docs-next` - Docusaurus 製ドキュメントサイト（仕様・学習ガイド・ADR）
- `Docs/spec` - AI-DLC エンジンの作業ファイル（本 Reverse Engineering 成果物もここに含まれる）
- `ops-note` - チュートリアル運営ノート（静的 HTML）
- `vendor/aidlc-rules` - AI-DLC エンジンの上流ルール逐語保存

## Test Packages

- `backend/src/test/java/com/example/bookflow/application/` - JUnit5 + Mockito 単体テスト（例：`ResourceServiceTest`）
- `backend/src/test/java/com/example/bookflow/presentation/` - MockMvc + H2 結合テスト（例：`ResourceControllerTest`）
- `frontend/tests/unit/` - Vitest ユニットテスト
- `frontend/tests/e2e/` - Playwright E2E テスト

## backend ドメイン別クラス数（domain / application / presentation）

| ドメイン | domain | application | presentation |
|---|---|---|---|
| Resource | Resource, ResourceCategory, ResourceRepository | ResourceService | ResourceController + dto |
| Reservation | Reservation, ReservationStatus, ReservationRepository | ReservationService | ReservationController |
| Approval | ApprovalStep, ApprovalStatus, ApprovalStepRepository | ApprovalService | ApprovalController |
| User | User, Role, UserRepository | UserService | UserController |
| Department | Department, DepartmentRepository | DepartmentService | DepartmentController |
| Auth | — | — | AuthController |

## Total Count

- **Total Packages**: 2（application: frontend, backend）+ 3（shared: docs-next, Docs/spec, ops-note）
- **Application**: 2（frontend, backend）
- **Infrastructure**: 0
- **Shared**: 3
- **Test**: 4（backend 単体・結合、frontend 単体・E2E）
