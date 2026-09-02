---
type: spec
title: Build Instructions - resource-keyword-filter
description: AI-DLC Build and Test ステージの成果物。resource-list-filter エンハンス課題のビルド手順
tags:
  - ai-dlc
  - build-and-test
  - resource
timestamp: 2026-09-02
audience: 学習者・メンター
references:
  - ../plans/resource-keyword-filter-code-generation-plan.md
---

# Build Instructions - resource-keyword-filter

## 前提条件

- **バックエンド**: Gradle wrapper（`./gradlew`）、Java 25
- **フロントエンド**: pnpm、Node.js（`frontend/package.json` の `engines` 参照）
- **環境変数**: 通常のビルド・テストには不要（DB は H2 インメモリ、フロントエンドの型チェック・ビルドはバックエンド API 接続なしで完結）

## ビルド手順

### バックエンド

```bash
cd backend
./gradlew compileJava compileTestJava
```

**確認済み結果**：エラーなしで成功。

### フロントエンド

```bash
cd frontend
pnpm build
```

**確認済み結果**：`✓ Compiled successfully`。型チェック・11 ページの静的生成（`/resources` を含む）すべて成功。

> **注意**：サンドボックス環境では Next.js のフォント取得（Google Fonts 等の外部リクエスト）がネットワーク制限により毎回リトライ・タイムアウトし、ビルド全体で 10 分超かかることがある（機能面のエラーではない）。CI 環境（ネットワーク到達可能）では通常数十秒で完了する。

## ビルド成果物

- バックエンド: `backend/build/classes/`（コンパイル済みクラス）
- フロントエンド: `frontend/.next/`（ビルド成果物。`/resources` ルートは `ƒ`（動的レンダリング）として生成）

## トラブルシューティング

### フロントエンドビルドがフォント取得で長時間リトライする

- **原因**: サンドボックス・オフライン環境で Google Fonts 等の外部ホストに到達できない
- **対処**: ネットワーク到達可能な環境（通常の開発環境・CI）で実行する。機能上の問題ではないため、`Compiled successfully` が出力されれば成功

### バックエンドの `checkstyleTest` で `MethodName` 警告が出る

- **原因**: ADR-018 のテスト命名規約（`methodName_condition_expectedBehavior`）がアンダースコアを含むため、Checkstyle の `MethodName` ルール（camelCase 前提）に警告として引っかかる
- **対処**: 本プロジェクトの既定の許容事項（既存の全テストクラスに同様の警告が存在する）。`warning` severity のため `BUILD SUCCESSFUL` を妨げない
