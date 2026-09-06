# Component Inventory

> パッケージ構成の全体像は既存の [`CLAUDE.md`](../../../../../CLAUDE.md) §ディレクトリ構成を出典とする。ここでは今回のタスクに直接関わるパッケージのみ記載する。

## Application Packages
- `frontend` - Next.js 15（App Router）。UI + BFF（Server Actions）。
- `backend` - Spring Boot 4.0。REST API（4 レイヤーアーキテクチャ）。

## Infrastructure Packages
- なし（本タスクはインフラ変更を伴わない）。

## Shared Packages
- `frontend/src/lib/` - 型定義（`lib/types/api.ts`）・API クライアント（`lib/api-client.ts`）・ラベル定義（`lib/labels.ts`）。

## Test Packages
- `backend/src/test/java/com/example/bookflow/application/` - `ResourceServiceTest`（Service 層ユニットテスト）
- `backend/src/test/java/com/example/bookflow/presentation/` - `ResourceControllerTest`（Controller 層テスト）
- `frontend/tests/unit/server/actions/resources.test.ts` - `listResourcesAction` 等の Server Actions ユニットテスト（既存）。`ResourceFilterForm.tsx` 自体のユニットテストは現状なし。

## Total Count
- **Total Packages**: 2（application: frontend, backend）
- **Application**: 2
- **Infrastructure**: 0
- **Shared**: 1（frontend/src/lib）
- **Test**: 2（backend）+ frontend/tests/unit（存在する場合）
