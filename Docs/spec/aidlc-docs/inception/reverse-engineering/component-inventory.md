---
type: spec
title: Component Inventory（Reverse Engineering・最小深度）
description: resource-list-filter エンハンス対象のパッケージ構成の要約
tags:
  - ai-dlc
  - reverse-engineering
timestamp: 2026-07-19
references:
  - Docs/ARCHITECTURE.md
---

# Component Inventory

> **深度メモ**: モノレポ全体の構成は [`Docs/ARCHITECTURE.md`](../../../../ARCHITECTURE.md) およびルート `CLAUDE.md` のディレクトリ構成を参照。

## Application Packages

- `frontend` — Next.js（App Router）BFF 兼 UI。今回 `resources` 配下・`server/actions/resources.ts` を変更
- `backend` — Spring Boot（4レイヤー：domain / application / presentation / infrastructure）。今回 `domain.ResourceRepository`・`application.ResourceService`・`presentation.ResourceController` を変更

## Shared Packages

- なし（本エンハンスの範囲では共有パッケージへの変更は発生しない）

## Test Packages

- `backend/src/test/.../ResourceServiceTest.java`、`ResourceControllerTest.java` — Unit（JUnit5 + Mockito/H2）
- `frontend/tests/unit/` — Vitest（`ResourceFilterForm` 関連のテスト有無は Code Generation 計画時に確認）

## Total Count（本エンハンスの変更範囲のみ）

- **変更対象パッケージ**: 2（frontend, backend）
