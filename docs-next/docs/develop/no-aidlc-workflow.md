---
sidebar_position: 2
title: AI-DLC を使わない開発フロー
description: STEP-03 で使う、AI-DLC エンジンを使わずに選択課題を進める手順
tags:
  - guide
  - workflow
audience: 学習者
references:
  - ./dev-workflow.md
  - ./aidlc-guide.md
  - ./coding-conventions.md
  - ./review-criteria.md
  - ../ai-tools-guide.md
  - ../claude-code-best-practices.md
  - ../curriculum.md
last_updated: '2026-08-12T00:00:00+09:00'
---

# AI-DLC を使わない開発フロー

このガイドは **STEP-03**（初級課題1回目）で使う手順です。  
AI-DLC エンジン（`/aidlc`）を使わず、選択課題を Claude Code へ直接プロンプトして実装します。ゴールと完了条件は [STEP-03](../curriculum.md#step-03) を参照してください。

AI-DLC エンジンを使わないことは、Claude Code を使わないことも、計画を立てずに実装を始めることも意味しません。コード補完・設計相談・生成コードの相棒として、このフローでも通常どおり Claude Code を使います。  
使わないのは `/aidlc` が代行する計画立案の自動オーケストレーション（段階分割・承認ゲート）だけで、実装前に計画を立てて自分で納得してから進める [plan-first](./aidlc-guide.md#plan-first) の考え方自体は、[ステップ3](#step-3)で Claude Code 標準のプランモードを使って踏襲します。  
**Spec-first**（実装より先に `Docs/spec/` を更新する原則）やセルフレビューも、AI-DLC の有無にかかわらずリポジトリ全体の必須ルールなので、このフローでも維持します。

---

## 進め方 \{#flow}

### 1. 取り組む課題を選ぶ

[初級の選択課題](./enhancement-catalog.md#beginner) から1つ選びます。各課題には**ビジネス要求シート**（`Docs/spec/enhancements/<short-desc>.md`。背景・依存関係・要件・受入条件・影響範囲・AI 活用ポイントの6節で実装対象を定義する文書）があります。  
対応する GitHub Issue は運営者が起票済みです。

### 2. ブランチを作成する

最初の課題であれば、まず `main` から自分のトランクブランチを作成します（[トランクブランチの作成](./coding-conventions.md#trunk-branch)、初回のみ）。  
そのうえで、自分のトランクブランチ（`learner/<GitHubユーザー名>/main`）から `feature/<GitHubユーザー名>/<issue番号>-<short-desc>` の形式でブランチを作成します（[作業ブランチの作成](./coding-conventions.md#feature-branch)）。

### 3. 計画を立て、仕様を更新する（Plan → Spec-first） \{#step-3}

ステップ3・4を合わせた流れは次の図のとおりです。

![計画→実装のループ](/diagrams/guide/no-aidlc-workflow-plan-implement.drawio.svg)

Claude Code を[探索→計画→実装→コミット](../claude-code-best-practices.md#explore-plan-code-commit)の「探索・計画」に相当するプランモードに切り替え、選んだ課題のビジネス要求シートと関連する既存コードを読み取らせて、実装計画を立てさせます。プランモードの間は変更が加えられません。

計画の内容は、次の観点で自分で確認してください。

| 観点 | 確認すること |
|---|---|
| スコープの一致 | 受入条件に対して過不足がないか（要求していない変更が紛れていないか、逆に一部の受入条件を落としていないか） |
| 既存パターンとの整合性 | 新しい抽象化・依存関係を安易に増やしていないか。既存の実装（4層構成・命名規則等）に沿っているか |
| 前提の解消 | 計画に「不明点」が残っている場合、実装に入る前にこの段階で解消されているか |
| テストの妥当性 | 各手順に対応する検証方法があるか。「関数が動く」ではなく「要求された振る舞いを示す」テストになっているか |
| リスクの大きい変更への警戒 | DB スキーマ変更・認証・既存データへの影響など、間違えると手戻りが大きい変更が含まれる場合は特に厳しく確認する |

問題があれば、プランモードのまま指摘して計画を修正させます。納得したらプランモードを終了して次に進みます。運営者の承認は不要です。

この計画がそのまま設計の全体です。AI-DLC のように、実装の途中で詳細を確定させる設計ステージはありません。変更が DB スキーマや API に及ぶ場合は、計画の段階でカラム定義やエンドポイントの詳細まで確定させてください（あとから確定させる場を持たないため）。  
計画が固まったら、`/update-spec` スキルを使って、計画の内容を既存の仕様書（要件定義 `requirements.md`、画面仕様書 `screen-spec.md`、API 仕様書 `api-spec.md`、ER 図 `er-diagram.md`。いずれも `Docs/spec/` 配下）に反映してください。  

### 4. 実装する

ステップ3で立てた計画の手順に沿って、Claude Code に実装させます。手順が複数に分かれている場合は、1手順ごとに動作確認してから次の手順に進めてください。まとめて全部実装させてから確認すると、どの手順で問題が起きたか分かりにくくなります。  
生成されたコードは手順が完了するたびに自分で読み、[コーディング規約](./coding-conventions.md) に沿っているか、計画から外れていないかを確認してください。

計画になかった判断が実装中に必要になった場合（想定外のコード、見積もりの誤り等）は、その場で判断せずいったん止めてください。プランモードに戻って計画を見直し、必要なら `/update-spec` もやり直したうえで実装を再開します。

### 5. ビルド・テストを通す

以下のコマンドで検証してください。

```bash
# フロントエンド
cd frontend && pnpm test && pnpm lint

# バックエンド
cd backend && ./gradlew test && ./gradlew checkstyleMain
```

CI（`CI Frontend` / `CI Backend`）は機械的な品質ゲートです。

### 6. PR を作成する

[`.github/PULL_REQUEST_TEMPLATE.md`](https://github.com/CHS-Training-Org/ai_training_for_chuo_system/blob/main/.github/PULL_REQUEST_TEMPLATE.md) の様式に沿って PR を作成します。base ブランチは自分のトランクブランチです。  
修正差分のコミット・push は `/commit-push` スキルで行えます。`/create-pr` スキルを使うと、テンプレートに沿ったタイトル・本文を組み立て、PR 作成まで実行します。

### 7. セルフレビューする

[評価基準](./review-criteria.md#completion-criteria) のうち、**AI レビューの項目を除く**チェックリストで自分の PR をセルフレビューします。STEP-03 では `@claude pr-review` による AI レビューは行いません（[STEP-03](../curriculum.md#step-03)）。

完了したら、AI-DLC なしで進めて感じた手間（段取り、仕様との整合、レビューの負荷など）を短く振り返り、PR に記載してください。STEP-04 で同じ課題を AI-DLC を使って実装し直すときの対比の基準になります。

:::note[この PR はマージしない]

STEP-03 の PR はマージしません。詳しくは [標準開発フロー](./dev-workflow.md#flow) の STEP-03 に関する注記を参照してください。

:::

---

## 関連ドキュメント

- [標準開発フロー](./dev-workflow.md)（AI-DLC を使う場合。STEP-04 以降で使用）
- [AI ツール活用ガイド](../ai-tools-guide.md)
- [STEP-03](../curriculum.md#step-03)
