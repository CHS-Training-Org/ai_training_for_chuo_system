---
type: guide
title: ラベル設計と課題 Issue 起票手順
description: GitHub Issue のラベル設計とエンハンス課題の起票・管理手順
tags: [guide, issues, labels, github]
timestamp: 2026-06-16
audience: メンター・リポジトリ管理者
references:
  - Docs/guide/enhancement-catalog.md
  - Docs/guide/dev-workflow.md
---

# ラベル設計と課題 Issue 起票手順

このページは、課題 Issue に付与するラベル体系と、Issue の起票手順を定義します。  
ラベルの定義実体は [`.github/labels.yml`](../../.github/labels.yml) が真実の源です。

---

## ラベル体系 { #labels }

| ラベル | 意味 | 付与基準 | 付与者 |
|--------|------|---------|--------|
| `課題` | 学習課題（必須ステップ・エンハンス共通） | 必須課題・選択課題テンプレートで起票した Issue に自動付与 | Issue テンプレート |
| `順序依存あり` | 順序依存あり | 必須ステップ（STEP-01〜05）は前のステップ完了が前提のため付与 | メンター |
| `難易度：初級` | 難易度 Beginner | [カタログ Beginner 節](./enhancement-catalog.md#beginner) の課題 | メンター |
| `難易度：中級` | 難易度 Intermediate | [カタログ Intermediate 節](./enhancement-catalog.md#intermediate) の課題 | メンター |
| `難易度：上級` | 難易度 Advanced | [カタログ Advanced 節](./enhancement-catalog.md#advanced) の課題 | メンター |
| `対象：フロントエンド` | 対象レイヤー：フロントエンドのみ | カタログの「対象レイヤー」列が `frontend` の課題 | メンター |
| `対象：バックエンド` | 対象レイヤー：バックエンドのみ | カタログの「対象レイヤー」列が `backend` の課題 | メンター |
| `対象：フルスタック` | 対象レイヤー：フロント＋バックエンド両方 | カタログの「対象レイヤー」列が `両方` の課題 | メンター |
| `進行中` | 着手中 | 学習者が課題に着手した時点でメンターが付与 | メンター |
| `バグ報告` | 不具合報告 | 学習環境・コード・ドキュメントの不具合を報告する Issue | 起票者 |
| `運用・管理` | 運用・整備タスク | メンター・オーナーによる設定変更・整備タスク | 起票者 |
| `質問・相談` | 質問・相談 | 学習者からの質問・詰まり相談 | 起票者 |
| `ドキュメント改善` | ドキュメント改善 | Docs や仕様書の誤り・改善提案 | 起票者 |
| `依存更新` | 依存更新 | Dependabot が自動起票する依存バージョン更新 PR | Dependabot |

---

## ラベルマッピング規則 { #mapping }

起票時に付与するラベルの組み合わせを以下の通りに定めます。

### 必須課題（STEP-01〜05）

| ラベル | 付与理由 |
|--------|---------|
| `課題` | 必須課題テンプレートに `labels: [課題]` として定義済みで自動付与される |
| `順序依存あり` | 必須ステップは順序性があるためメンターが手動付与 |

### 選択課題（エンハンス課題）

| ラベル | 付与理由 | 決定元 |
|--------|---------|--------|
| `課題` | 選択課題テンプレートに `labels: [課題]` として定義済みで自動付与される | テンプレート |
| `難易度：初級` / `難易度：中級` / `難易度：上級` | [カタログの難易度節](./enhancement-catalog.md#catalog) から決定 | メンター |
| `対象：フロントエンド` / `対象：バックエンド` / `対象：フルスタック` | カタログの「対象レイヤー」列（`frontend` → `対象：フロントエンド`、`backend` → `対象：バックエンド`、`両方` → `対象：フルスタック`）から決定 | メンター |

---

## 起票手順 { #howto }

### 前提：label-sync を先に実行する

Issue テンプレートは起票時に `課題` を自動付与しますが、**ラベル実体がリポジトリに存在しない状態で起票するとラベルが付きません**。  
起票前に [§ label-sync の実行](#label-sync) を完了させてください。

### 起票の流れ

1. GitHub の「Issues → New issue」でテンプレートを選ぶ  
   - **必須課題**：「必須課題（STEP）」テンプレートを使用  
   - **選択課題**：「選択課題（エンハンス）」テンプレートを使用
2. テンプレートの各項目を記入し、Issue を作成する  
   （受入条件・完了条件はビジネス要求シート参照を旨とし、Issue 側には再掲しない）
3. 作成後にメンターが追加ラベルを手動付与する（[§マッピング規則](#mapping) に従う）

### gh CLI によるバッチ起票（任意）

同じテンプレートを繰り返し使う場合、gh CLI で起票できます。

```bash
# 例：選択課題（エンハンス）を CLI で起票
gh issue create \
  --title "[Enhance] リソース一覧の検索・フィルタ追加" \
  --label "課題" \
  --body "ビジネス要求シート: Docs/spec/enhancements/resource-list-filter.md"
```

> **注意**：CLI 起票ではテンプレートの自動ラベル付与が適用されないため、`--label` オプションで明示的に指定してください。

---

## label-sync の実行 { #label-sync }

### 重要：起票より先にラベル実体を作る

`課題` ラベルはテンプレートに宣言済みです。このラベル実体がリポジトリに存在しない状態で Issue を起票すると、**ラベルがサイレントに無視されます**。

`.github/labels.yml` を push するか、`workflow_dispatch` で label-sync workflow を実行することで全ラベルを一括登録してください。

### 実行手順

```bash
# labels.yml を main に push する（workflow が自動実行される）
git add .github/labels.yml
git commit -m "ci: ラベル定義を追加"
git push
```

または GitHub の Actions タブ → **Label Sync** → **Run workflow** で手動実行します。

### ラベルの変更

ラベルの名称・色・説明を変更したい場合は [`.github/labels.yml`](../../.github/labels.yml) を編集して push してください。  
`skip_delete: true` のため、`labels.yml` から**削除したラベルはリポジトリ側に残ります**（意図的な削除は GitHub UI で手動実施）。

---

## 関連ドキュメント

- ラベル定義実体：[`.github/labels.yml`](../../.github/labels.yml)
- 選択課題一覧（難易度・レイヤー）：[enhancement-catalog.md](./enhancement-catalog.md)
- 必須課題定義：[curriculum.md §必須ステップ課題](./curriculum.md#required-steps)
- Issue テンプレート：[`.github/ISSUE_TEMPLATE/`](../../.github/ISSUE_TEMPLATE/)
