---
type: working-doc
title: Component Inventory（Reverse Engineering）
description: AI-DLC Reverse Engineering ステージが生成するコンポーネント一覧（モノレポ構成）
timestamp: 2026-09-29
---

# Component Inventory

> リポジトリ全体のディレクトリ構成は `/workspace/CLAUDE.md` を参照。ここではパッケージ単位の一覧を記録する。

## Application Packages

- `frontend` - Next.js 15（App Router）フロントエンド兼 BFF
- `backend` - Spring Boot 4.0 / Java 25 バックエンドAPI

## Infrastructure Packages

- `.devcontainer` - DevContainer + Docker Compose によるローカル開発環境定義

## Shared Packages

- なし（本モノレポにフロント/バックエンド間の共有パッケージはない。型定義はフロントの `frontend/src/lib/types/` にAPI契約として個別定義）

## Test Packages

- `frontend/tests/unit` - Vitest ユニットテスト
- `frontend/tests/e2e` - Playwright E2Eテスト
- `backend/src/test` - JUnit 5 + H2 + Mockito

## その他

- `docs-next` - Docusaurus ドキュメントサイト（仕様・規約・ADR）
- `Docs/spec` - AI-DLC エンジンの作業ファイル（本ディレクトリ）
- `ops-note` - チュートリアル運営ノート

## Total Count

- **Total Packages**: 2（Application）+ 1（Infrastructure）+ 0（Shared）+ 3（Test）
- **Application**: 2
- **Infrastructure**: 1
- **Shared**: 0
- **Test**: 3
