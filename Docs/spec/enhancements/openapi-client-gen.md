---
type: spec
title: OpenAPI クライアント自動生成
description: OpenAPI スキーマからフロントエンドの型定義・API クライアントを自動生成するエンハンス課題ビジネス要求シート
tags:
  - spec
  - enhancement
  - openapi
  - codegen
timestamp: 2026-07-06
audience: 学習者・メンター
references:
  - Docs/spec/requirements.md
  - Docs/spec/enhancements/index.md
---

# OpenAPI クライアント自動生成

---

## 背景

BookFlow のフロントエンドは Spring Boot の API を `fetch` 呼び出し（Server Actions 内）で直接呼び出しており、型情報はすべて手書きの TypeScript 型に依存しています。バックエンド API の変更（フィールド追加・削除・型変更）があっても、フロントエンドの型定義に自動では伝わらないため、型の不整合による実行時エラーが起きやすい状態です。

Springdoc は `GET /v3/api-docs` で OpenAPI 3.0 仕様を自動生成しています。このスキーマからフロントエンドの TypeScript API クライアントコードを自動生成することで、型安全な API 呼び出しを実現し、バックエンド変更のフロントエンドへの反映を自動化できます。

## 依存関係

- 前提課題：なし（既存の Springdoc OpenAPI スキーマ `GET /v3/api-docs` のみに依存）
- 競合する課題：なし
- 推奨着手順序：API を追加・変更する他のエンハンス課題（[利用実績の集計・グラフ表示](./usage-statistics.md)・[CSV 帳票出力](./csv-export.md)・各種フィルタ課題 等）の**後に着手**するほど、生成対象 API が増えて型安全化の恩恵が大きくなる（前提ではないが順序として推奨）。

## 要件

| # | 要件 |
|---|------|
| DEVEX-01 | バックエンドの OpenAPI スキーマ（`/v3/api-docs`）からフロントエンドの TypeScript API クライアントを自動生成するツール（`orval`・`openapi-generator-cli` 等）を導入する |
| DEVEX-02 | 自動生成スクリプト（`pnpm generate:api` 等）を `package.json` に追加し、1 コマンドで再生成できる |
| DEVEX-03 | 既存の手書き型定義（`src/lib/` 配下）と Server Actions の `fetch` 呼び出しを、生成クライアントを使う方式に移行する（段階的でも可） |
| DEVEX-04 | 生成されたクライアントコードは `src/lib/generated/` 等の専用ディレクトリに出力し、直接編集しない（`.gitignore` に含めてもよいが、CI での再生成が必要な場合は含める） |
| DEVEX-05 | バックエンドの API 変更後に `pnpm generate:api` を実行すると、型の不整合が TypeScript コンパイルエラーとして検出される |

## 受入条件

- [ ] `pnpm generate:api` を実行すると TypeScript のクライアントコードが生成される
- [ ] 生成クライアントを使って少なくとも 1 本の Server Action を書き換え、動作することを確認できる
- [ ] バックエンドの API レスポンス型を変更した後に `pnpm generate:api` を実行すると、変更がフロントエンドの型に反映される
- [ ] `pnpm build`（TypeScript コンパイル）が pass する
- [ ] 既存の Vitest ユニットテストが引き続き pass する

## 影響範囲

- 推定工数：半日〜1日
- 対象レイヤー：両方（バックエンドの OpenAPI 注釈改善を含む場合）
- 更新が必要な spec：
  - `api-spec.md` §Springdoc / OpenAPI：自動生成コマンドと出力先ディレクトリを追記
  - `screen-spec.md`：変更なし（UI 仕様への影響なし）

## AI 活用ポイント

- plan mode で「`orval`（React Query / Axios 向け）・`openapi-generator-cli`（汎用）・`hey-api`（軽量・fetch ベース）のいずれを採用するか」をトレードオフ込みで相談する
- Springdoc の既知の制限（`@CurrentUser` / `Pageable` のパラメータ化・エラーレスポンスの一律表示。`spec/index.md` 注意書き参照）が生成コードに与える影響を AI に確認する
- 生成コードの `fetch` vs. `axios` の選択と、Next.js Server Actions での `cookies()` / 認証ヘッダ付与の方法を AI と議論する
- CI（`ci-frontend.yml`）に `generate:api` + `tsc --noEmit` を追加して型整合性を CI で保護する方法を AI に提案させる
