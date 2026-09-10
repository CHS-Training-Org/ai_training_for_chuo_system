# Reverse Engineering Metadata

**Analysis Date**: 2026-09-08T20:08:40+09:00
**Analyzer**: AI-DLC（`/aidlc` スキル、3つの並列調査サブエージェント: backend / frontend / インフラ・CI・全体構成）
**Workspace**: /workspace
**Scope**: フルスコープ（`frontend/` 全体、`backend/` 全体、`.devcontainer/`・`scripts/`・`.github/workflows/`・`docs-next/`・`Docs/spec/`・`.claude/` を含むリポジトリ全体）。ユーザーが `AskUserQuestion` で「EXECUTE（フルスコープ）」を選択したことに基づく。
**Total Files Analyzed**: 約170ファイル（backend main .java 58 + backend test .java 18 + frontend src .ts/.tsx 55 + frontend tests 14 + インフラ/CI/ドキュメント構成ファイル約25、のべ件数）

## Artifacts Generated

- [x] business-overview.md
- [x] architecture.md
- [x] code-structure.md
- [x] api-documentation.md
- [x] component-inventory.md
- [x] technology-stack.md
- [x] dependencies.md
- [x] code-quality-assessment.md

## 既知の重複範囲（将来の staleness 判定のための注記）

以下の既存ドキュメントと内容が重複する（Spec-first の「真実の源」はあくまで下記側）:

- `docs-next/docs/reference/architecture.md`（本番相当のAWS標準アーキテクチャ）
- `docs-next/docs/spec/api-spec.md`（REST API仕様）
- `docs-next/docs/spec/er-diagram.md`（ER図）

本 RE 成果物は「現状のコードから読み取れる実装の実態」を記録するものであり、上記 spec 文書と矛盾する場合は spec 文書を優先する。
