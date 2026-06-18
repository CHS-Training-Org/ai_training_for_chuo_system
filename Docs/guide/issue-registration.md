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
| `required` | 必須課題（STEP） | 必須課題テンプレートで起票した Issue に自動付与 | Issue テンプレート |
| `optional` | 選択課題（エンハンス） | 選択課題テンプレートで起票した Issue に自動付与 | Issue テンプレート |
| `sequential` | 順序依存あり | 必須ステップ（STEP-01〜05）は前のステップ完了が前提のため付与 | メンター |
| `level:beginner` | 難易度 Beginner | [カタログ Beginner 節](./enhancement-catalog.md#beginner) の課題 | メンター |
| `level:intermediate` | 難易度 Intermediate | [カタログ Intermediate 節](./enhancement-catalog.md#intermediate) の課題 | メンター |
| `level:advanced` | 難易度 Advanced | [カタログ Advanced 節](./enhancement-catalog.md#advanced) の課題 | メンター |
| `type:frontend` | 対象レイヤー：フロントエンドのみ | カタログの「対象レイヤー」列が `frontend` の課題 | メンター |
| `type:backend` | 対象レイヤー：バックエンドのみ | カタログの「対象レイヤー」列が `backend` の課題 | メンター |
| `type:fullstack` | 対象レイヤー：フロント＋バックエンド両方 | カタログの「対象レイヤー」列が `両方` の課題 | メンター |
| `in-progress` | 着手中 | 学習者が課題に着手した時点でメンターが付与 | メンター |

---

## ラベルマッピング規則 { #mapping }

起票時に付与するラベルの組み合わせを以下の通りに定めます。

### 必須課題（STEP-01〜05）

| ラベル | 付与理由 |
|--------|---------|
| `required` | 必須課題テンプレートに `labels: [required]` として定義済みで自動付与される |
| `sequential` | 必須ステップは順序性があるためメンターが手動付与 |

### 選択課題（エンハンス課題）

| ラベル | 付与理由 | 決定元 |
|--------|---------|--------|
| `optional` | 選択課題テンプレートに `labels: [optional]` として定義済みで自動付与される | テンプレート |
| `level:beginner` / `level:intermediate` / `level:advanced` | [カタログの難易度節](./enhancement-catalog.md#catalog) から決定 | メンター |
| `type:frontend` / `type:backend` / `type:fullstack` | カタログの「対象レイヤー」列（`frontend` → `type:frontend`、`backend` → `type:backend`、`両方` → `type:fullstack`）から決定 | メンター |

---

## 起票手順 { #howto }

### 前提：label-sync を先に実行する

Issue テンプレートは起票時に `required` / `optional` を自動付与しますが、**ラベル実体がリポジトリに存在しない状態で起票するとラベルが付きません**。  
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
  --label "optional" \
  --body "ビジネス要求シート: Docs/spec/enhancements/resource-list-filter.md"
```

> **注意**：CLI 起票ではテンプレートの自動ラベル付与が適用されないため、`--label` オプションで明示的に指定してください。

---

## label-sync の実行 { #label-sync }

### 重要：起票より先にラベル実体を作る

`required` / `optional` はテンプレートに宣言済みです。これらのラベル実体がリポジトリに存在しない状態で Issue を起票すると、**ラベルがサイレントに無視されます**。

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
