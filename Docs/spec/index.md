---
type: index
title: 仕様書 (Spec)
description: BookFlow の実装仕様文書（要件・画面・API・ER 図）の管理目次と Spec-first 更新ルール
tags: [spec, index]
timestamp: 2026-06-16
audience: 学習者・メンター
references:
  - Docs/PROJECT_PLAN.md
  - Docs/ARCHITECTURE.md
---

# 仕様書 (Spec)

BookFlow の実装仕様を正確に記述します。学習者が機能を理解する際の参照元です。  
更新責任：仕様変更を伴う実装を行う本人（学習者を含む）。レビュー責任：メンター。詳細は[仕様更新ルール](#spec-first)を参照

---

## 管理ファイル一覧

| ファイル | 目的 | 対象読者 |
|---------|------|---------|
| [requirements.md](./requirements.md) | 要件定義。機能要件・非機能要件・ロール権限・ステータス遷移を定義 | 学習者・メンター |
| [screen-spec.md](./screen-spec.md) | 画面仕様書。全 10 画面のレイアウト・操作・バリデーションを定義 | 学習者・メンター |
| [api-spec.md](./api-spec.md) | REST API 仕様書。エンドポイント・リクエスト/レスポンス・シーケンス図を定義 | 学習者・メンター |
| [er-diagram.md](./er-diagram.md) | ER 図（Mermaid）。データモデル・テーブル定義・リレーションを定義 | 学習者・メンター |
| [enhancements/](./enhancements/index.md) | エンハンス課題のビジネス要求シート集。配置規約・原則を定義 | 学習者・メンター |
| [aidlc-adoption.md](./aidlc-adoption.md) | AI-DLC 採用台帳。AWS Labs AI-DLC から取り込んだ要素・反映先・状態・上流同期手順を管理（BookFlow 機能仕様ではなく上流参照の管理台帳） | メンター |

---

## 仕様更新ルール（Spec-first） { #spec-first }

### 原則

`Docs/spec/` を「真実の源」とします。機能の追加・変更・削除を行うときは、**実装より先に仕様を更新する**（Spec-first）ことを原則とします。

実装と仕様の乖離を防ぎ、レビュアー（メンター）が「何を作ろうとしているか」を仕様差分から先に確認できるようにするためです。

### 更新責任

| 担当 | 役割 |
|------|------|
| 学習者・開発者 | 仕様に影響する変更を実装する本人が、対象の仕様ファイルを更新する |
| メンター | 仕様差分のレビュー・承認。ベース仕様（上記 4 ファイル）の保守 |

### 更新フロー

1. 変更内容から更新対象の仕様ファイルを特定する（上の管理ファイル一覧を参照。例：API 変更 → api-spec.md、画面変更 → screen-spec.md。複数にまたがることが多い）
2. Claude Code の `/update-spec` スキルを使って仕様を更新する（表記規約・更新チェックはスキルが案内する。手動更新も可だが、その場合もスキルの規約に従う）
3. 仕様更新を **PR の先頭コミット**として記録する（例：`docs(spec): 予約に繰り返し設定を追加`）
4. 実装・テストを行う
5. 仕様更新と実装を**同一 PR** で提出する。メンターは仕様差分から先にレビューする

### レビュー観点（メンター向け） { #review-mentor }

- requirements.md との整合
- 関連ファイル間の整合（総数・相互リンク・ER と API の項目対応）
- 既存の表記規約（アンカー・表形式・§共通参照）への準拠

### 関連リンク

- コミット・PR 規約: [coding-conventions.md §コミット・PR 規約](../guide/coding-conventions.md#commit-pr)
- Claude Code の使い方: [ai-tools-guide.md](../guide/ai-tools-guide.md)

---

## OpenAPI / Swagger UI の参照方法

バックエンドは Springdoc OpenAPI（[ADR-015](../decision/ADR-015-backend-api-docs.md)）により、実装コードから OpenAPI ドキュメントを自動生成している。バックエンド起動中に以下の URL で参照できる（いずれも認証不要）。

| URL | 内容 |
|-----|------|
| <http://localhost:8080/swagger-ui.html> | Swagger UI（ブラウザでエンドポイントを一覧・試行） |
| <http://localhost:8080/v3/api-docs> | OpenAPI 3.1 ドキュメント（JSON） |

**起動前提**：DevContainer 内で `cd backend && ./gradlew bootRun`（postgres コンテナが起動済みであること）。

**Try it out で保護エンドポイントを呼ぶには**：Bearer JWT が必要。cognito-local から JWT を取得し、Swagger UI 右上の「Authorize」ボタンに設定する。

```bash
# 事前に bash scripts/provision-cognito.sh でプロビジョニング済みであること
bash scripts/provision-cognito.sh --jwt hanako.tanaka@example.com   # JWT が標準出力に出る
```

### 位置づけと既知の制限

**正式な API 仕様は [api-spec.md](./api-spec.md)**。OpenAPI 出力はアノテーション最小の自動生成であり、以下の点で実際の API と表示が異なる。

- `currentUser` / `user` / `pageable` がクエリパラメータとして表示されるが、**実際には送信不要**（`@CurrentUser`（認証プリンシパル）と `Pageable` の引数が springdoc に解決されず漏れているもの。ページネーションの実パラメータは `page` / `size`）
- エラーレスポンス（400〜500）が全エンドポイントに一律表示されるが、各エンドポイントで実際に返るステータス・エラーコードは api-spec.md の記載が正
- 日時の `format: date-time` はオフセット付き（RFC 3339）を示唆するが、実際のワイヤー形式はオフセットなしのローカル日時（[api-spec.md §共通 日時フォーマット](./api-spec.md#datetime-format)参照）
- `status` / `category` / `role` の enum 値は OpenAPI に現れない（DTO が string 型のため）。許容値は api-spec.md を参照
