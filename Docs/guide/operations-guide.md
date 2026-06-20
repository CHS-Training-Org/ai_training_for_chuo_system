---
type: guide
title: 運用ガイド
description: リポジトリ管理者向けの日常運用・学習者サポート・質問対応フローの手引き
tags: [guide, operations, management]
timestamp: 2026-06-17
audience: メンター・リポジトリ管理者
references:
  - Docs/spec/overview.md
  - Docs/guide/dev-workflow.md
  - Docs/guide/review-criteria.md
---

# 運用ガイド

このページは、BookFlow チュートリアルを**日常的に運営する上での役割分担・サポートフロー・応答方針**を一元化します。  
役割の名簿（誰が何者か）は [リポジトリ概要 §ステークホルダーと役割](../spec/overview.md#roles) が真実の源。レビューの観点・評価基準は [review-criteria.md](./review-criteria.md) が真実の源。本ページはそれらを運用の視点から接続します。

> **用語の統一**：本ガイドでは「オーナー」と「リポジトリ管理者」は同一アクターを指します（[リポジトリ概要 §役割](../spec/overview.md#roles)：リポジトリ設定管理を担う「リポジトリオーナー」）。以下では「オーナー（リポジトリ管理者）」と表記します。

---

## 役割分担（運用責任マトリクス） { #roles }

役割の定義は [リポジトリ概要 §ステークホルダーと役割](../spec/overview.md#roles) を参照してください。以下は**運用上の責務**に絞った一覧です。

| 責務 | オーナー（リポジトリ管理者） | メンター | 学習者 |
|------|:---:|:---:|:---:|
| リポジトリ設定・ブランチ保護の設定・変更 | ◎ | — | — |
| label-sync ワークフローの実行・ラベル管理 | ◎ | ○ | — |
| 課題 Issue の起票・カタログの棚卸し | ○ | ◎ | — |
| plan mode 計画の承認（第 1 ゲート） | — | ◎ | — |
| PR レビュー・Approve（第 2 ゲート） | — | ◎ | — |
| 学習者の質問・詰まりへのサポート | — | ◎ | — |
| feature ブランチでの開発・PR 作成 | — | — | ◎ |
| main ブランチの保守・依存更新（5.2） | ◎ | ○ | — |

> ◎ = 主担当、○ = 補助または任意、— = 担当外

**補足：**

- ブランチ保護（Approve 1 名以上・必須 status check 3 つ）は GitHub の Settings で設定します。詳細は [dev-workflow.md §8 の admonition](./dev-workflow.md#flow) を参照してください。
- label-sync の実行手順は [issue-registration.md §label-sync の実行](./issue-registration.md#label-sync) にあります。
- 課題の起票手順は [issue-registration.md §起票手順](./issue-registration.md#howto) にあります。

---

## 質問サポートフロー { #support }

### 一次窓口：Issue コメント優先

学習者の質問・詰まりは、**取り組んでいる課題の GitHub Issue へのコメント**を一次窓口とします。Issue コメントにすることで：

- 後から参照できる記録が残る（同じ詰まりへの回答が再利用できる）
- コンテキスト（どの課題・どのステップ）が自然に付く
- 複数の学習者で知識を共有できる

!!! note "メンター・リポジトリ管理者向け"
    対象の Issue が見つからない、または既存の課題 Issue に紐付かない質問（環境構築全般など）の場合は、新規 Issue としてラベル `type:question` を付けて起票するよう学習者に案内してください（ラベル体系は [issue-registration.md §ラベル体系](./issue-registration.md#labels) 参照）。

### 受付経路のまとめ

| 質問の種類 | 推奨チャネル |
|-----------|-------------|
| 課題実装中の疑問・詰まり | 対象課題の Issue にコメント |
| 環境構築・ツール系のトラブル | [troubleshooting.md](./troubleshooting.md) を確認 → 解決しなければ新規 Issue |
| 学習フロー・カリキュラムへのフィードバック | [学習効果測定（満足度アンケート）](./learning-effectiveness.md) のふりかえり用 Issue にコメント |
| バグ報告・改善提案 | 新規 Issue（`type:bugfix` または `type:enhancement` ラベル） |

### エスカレーション

Issue コメントで解決しない場合：

1. **メンターへのメンション**：Issue コメントで `@メンターのユーザー名` を付けて再質問する。
2. **Issue のエスカレーション化**：メンターが「ここでは解決が難しい」と判断した場合は、別途対話チャネル（チーム内の Slack・チャット等）で対応し、解決後に Issue にまとめを残す。

---

## レビュー・応答方針 { #response-policy }

### 基本方針

メンターは PR レビュー・Issue コメントへの応答を**可能な限り早く**返すことを努力目標とします。具体的な日数の SLA は設けません。

学習者は：
- マージを急がず、レビュー中は別の学習ステップ（ドキュメント読み込み・次課題の仕様確認等）を並行して進める。
- 応答が遅いと感じた場合は、Issue コメントで「レビューお願いします」とメンションして問題ありません。

### 第 2 ゲート（PR レビュー）の手順

PR レビューの流れと完了条件は [dev-workflow.md §8](./dev-workflow.md#flow) を参照してください。  
レビューの観点・評価基準は [review-criteria.md](./review-criteria.md) が真実の源です。本ページでは再掲しません。

!!! note "メンター・リポジトリ管理者向け"
    第 2 ゲートでは「CI green・セルフレビュー済み・Spec-first 遵守・PR テンプレート記入」の 4 点を Approve 前に確認してください（[review-criteria.md §評価基準](./review-criteria.md#completion-criteria)）。  
    GitHub のブランチ保護で「Approve 1 名以上」が必須化されているため、承認なしではマージできません。

---

## 前方互換メモ { #forward-compat }

以下の事項は**未決**のため、本ガイドの現行バージョンでは人による承認・応答のみを運用モデルとして記述しています。

- **検討 A（AI 一次レビュー）**：PR 作成をトリガーに AI が一次レビューする構成は検討中です。AI レビューをアクターとして役割マトリクスに追加する・応答方針に組み込むのは検討 A の結論後とします（[review-criteria.md §前方互換メモ](./review-criteria.md#forward-compat) 参照）。
- **追加 E（リポジトリの公開/非公開の確定）**：検討 A 案 2（AI レビュー基盤）の前提となります。確定後に必要な設定変更（GHAS・CodeQL 等）はそのタイミングで対応します。

---

## ドキュメントサイトの公開・運用 { #docs-publish }

### 公開 URL

| 項目 | 値 |
|------|---|
| 公開先 URL | `https://bizarress.github.io/AI-Development-Tutorial/` |
| ソース | `main` ブランチの `Docs/` 配下 |
| ビルドツール | Zensical（`zensical.toml` で設定） |
| 設定ファイル | `zensical.toml`・`pyproject.toml`・`uv.lock` |

### 自動デプロイの仕組み

`.github/workflows/docs.yml` が次のタイミングで自動的にビルド＆デプロイします。

- **main/master への push** ：`Docs/**`・`zensical.toml`・`pyproject.toml`・`uv.lock`・`docs.yml` のいずれかが変更された場合
- **手動実行**（`workflow_dispatch`）：GitHub Actions の UI からいつでも実行可能

ビルドフローは「`uv sync` → `uv run zensical build`（`site/` へ出力）→ GitHub Pages へデプロイ」の 2 ジョブ構成です。

### 管理者による初回有効化手順（申し送り）

!!! warning "リポジトリ管理者作業"
    以下の手順は本環境からは実施不可のため、オーナー（リポジトリ管理者）への申し送りです。**この手順が完了するまでは受入条件「ドキュメントサイトが公開され…」は未充足です**（4.4 / 5.2 / 3.6 と同じ申し送りパターン）。

1. GitHub リポジトリの **Settings → Pages** を開く
2. **Source** を **"GitHub Actions"** に設定して保存する
3. `docs.yml` を手動実行（Actions → "Deploy Docs to GitHub Pages" → "Run workflow"）またはドキュメントの変更を main に push する
4. Actions が green になったあと `https://bizarress.github.io/AI-Development-Tutorial/` にアクセスし、サイトが表示されることを確認する

### ビルド失敗時の対処

ローカルで以下のコマンドで再現できます（docs コンテナが起動している必要があります）：

```bash
docker compose exec docs uv run zensical build
```

> DevContainer 外から実行する場合：`docker exec ai-development-tutorial_devcontainer-docs-1 sh -c 'cd /workspace && uv run zensical build'`

**主なビルド失敗パターン：**

| 症状 | 原因 | 対処 |
|------|------|------|
| `page does not exist` | `zensical.toml` の nav に追記したが対応ファイルが存在しない（または逆） | nav とファイルを揃える |
| `page does not exist`（警告のみ） | `Docs/` 外のファイルへのリンク（`.claude/`・`vendor/` 等） | サイト外リンクのため無視してよい（既存の既知警告） |
| ビルドエラー | Markdown 構文エラー・Mermaid 構文ミス | エラー箇所を修正する |

環境・コンテナ起動に関するトラブルは [troubleshooting.md](./troubleshooting.md) を参照してください。

---

## 関連ドキュメント

- 役割の名簿・ステークホルダー定義：[リポジトリ概要 §ステークホルダーと役割](../spec/overview.md#roles)
- 標準開発フロー・ゲートの詳細：[dev-workflow.md §標準開発フロー](./dev-workflow.md#flow)
- レビュー観点・評価基準：[review-criteria.md](./review-criteria.md)
- ラベル体系・課題起票手順：[issue-registration.md](./issue-registration.md)
- トラブルシューティング：[troubleshooting.md](./troubleshooting.md)
- 依存更新ポリシー（Dependabot）：[dependency-policy.md](./dependency-policy.md)
- 学習効果測定（満足度アンケート）：[learning-effectiveness.md](./learning-effectiveness.md)
