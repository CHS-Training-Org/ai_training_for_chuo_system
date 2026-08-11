---
sidebar_position: 2
title: ラベル設計と課題 Issue 起票手順
description: GitHub Issue のラベル設計とエンハンス課題の起票・管理手順
tags:
  - guide
  - issues
  - labels
  - github
audience: 運営者
references:
  - ../develop/enhancement-catalog.md
  - ../develop/dev-workflow.md
last_updated: '2026-08-01T11:56:18+09:00'
---

# ラベル設計と課題 Issue 起票手順

このページは、課題 Issue に付与するラベル体系と、Issue の起票手順を定義します。  
ラベルの定義実体は [`.github/labels.yml`](../../.github/labels.yml) が真実の源です。

---

## ラベル体系
| ラベル | 意味 | 付与基準 | 付与者 |
|--------|------|---------|--------|
| `課題` | 学習課題（選択課題・エンハンス課題） | 選択課題テンプレートで起票した Issue に自動付与 | Issue テンプレート |
| `難易度：初級` | 難易度 初級 | [カタログ初級節](../develop/enhancement-catalog.md#beginner) の課題 | 運営者 |
| `難易度：中級` | 難易度 中級 | [カタログ中級節](../develop/enhancement-catalog.md#intermediate) の課題 | 運営者 |
| `難易度：上級` | 難易度 上級 | [カタログ上級節](../develop/enhancement-catalog.md#advanced) の課題 | 運営者 |
| `対象：フロントエンド` | 対象レイヤー：フロントエンドのみ | カタログの「対象レイヤー」列が `frontend` の課題 | 運営者 |
| `対象：バックエンド` | 対象レイヤー：バックエンドのみ | カタログの「対象レイヤー」列が `backend` の課題 | 運営者 |
| `対象：フルスタック` | 対象レイヤー：フロント＋バックエンド両方 | カタログの「対象レイヤー」列が `両方` の課題 | 運営者 |
| `進行中` | 着手中 | 運用・整備タスク等で着手時に運営者が付与（選択課題 Issue では使用しない。選択課題はステータス管理をしない） | 運営者 |
| `バグ報告` | 不具合報告 | 学習環境・コード・ドキュメントの不具合を報告する Issue | 起票者 |
| `運用・管理` | 運用・整備タスク | 運営者による設定変更・整備タスク | 起票者 |
| `質問・相談` | 質問・相談 | 学習者からの質問・詰まり相談 | 起票者 |
| `ドキュメント改善` | ドキュメント改善 | Docs や仕様書の誤り・改善提案 | 起票者 |

---

## ラベルマッピング規則
起票時に付与するラベルの組み合わせを以下の通りに定めます。必須ステップのうち STEP-01〜02 は GitHub Issue を起票しないため、対象は選択課題のみです。

### 選択課題（エンハンス課題）

| ラベル | 付与理由 | 決定元 |
|--------|---------|--------|
| `課題` | 選択課題テンプレートに `labels: [課題]` として定義済みで自動付与される | テンプレート |
| `難易度：初級` / `難易度：中級` / `難易度：上級` | [カタログの難易度節](../develop/enhancement-catalog.md#catalog) から決定 | 運営者 |
| `対象：フロントエンド` / `対象：バックエンド` / `対象：フルスタック` | カタログの「対象レイヤー」列（`frontend` → `対象：フロントエンド`、`backend` → `対象：バックエンド`、`両方` → `対象：フルスタック`）から決定 | 運営者 |

---

## 起票手順
起票は運営者が行います。学習者自身が選択課題の Issue を起票することはありません。カタログの選択課題 1 件につき Issue を 1 つ、事前にまとめて起票しておきます。複数の学習者が同じ課題を選んでも、参照する Issue は共通の 1 つです。

起票後は参照するのみで、ステータス管理（着手・進行中等のラベル運用）は行いません。

### 前提：label-sync を先に実行する

Issue テンプレートは起票時に `課題` を自動付与しますが、**ラベル実体がリポジトリに存在しない状態で起票するとラベルが付きません**。  
起票前に [§ label-sync の実行](#label-sync) を完了させてください。

### 起票の流れ

1. GitHub の「Issues → New issue」で「選択課題（エンハンス）」テンプレートを選ぶ
2. テンプレートの各項目を記入し、Issue を作成する  
   （受入条件、完了条件はビジネス要求シート参照を旨とし、Issue 側には再掲しない）
3. 作成後に追加ラベルを手動付与する（[§マッピング規則](#mapping) に従う）
4. カタログの選択課題全件（初級・中級・上級）について同様に起票する

### gh CLI によるバッチ起票（推奨）

カタログの課題数分をまとめて起票するため、gh CLI での起票を推奨します。

```bash
# 例：選択課題（エンハンス）を CLI で起票
gh issue create \
  --title "[Enhance] リソース一覧の検索・フィルタ追加" \
  --label "課題" \
  --body "ビジネス要求シート: Docs/spec/enhancements/resource-list-filter.md"
```

> **注意**：CLI 起票ではテンプレートの自動ラベル付与が適用されないため、`--label` オプションで明示的に指定してください。

---

## label-sync の実行
### 重要：起票より先にラベル実体を作る

`課題` ラベルはテンプレートに宣言済みです。  
このラベル実体がリポジトリに存在しない状態で Issue を起票すると、**ラベルがサイレントに無視されます**。

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

ラベルの名称、色、説明を変更したい場合は [`.github/labels.yml`](../../.github/labels.yml) を編集して push してください。  
`skip_delete: true` のため、`labels.yml` から**削除したラベルはリポジトリ側に残ります**（意図的な削除は GitHub UI で手動実施）。

---

## 関連ドキュメント

- ラベル定義実体：[`.github/labels.yml`](../../.github/labels.yml)
- 選択課題一覧（難易度・レイヤー）：[enhancement-catalog.md](../develop/enhancement-catalog.md)
- 必須課題定義：[curriculum.md §必須ステップ課題](../curriculum.md#required-steps)
- Issue テンプレート：[`.github/ISSUE_TEMPLATE/`](../../.github/ISSUE_TEMPLATE/)
