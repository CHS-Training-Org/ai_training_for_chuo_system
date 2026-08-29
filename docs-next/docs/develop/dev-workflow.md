---
sidebar_position: 1
title: 開発ワークフローガイド
description: Issue 着手からマージまでの BookFlow 標準開発フロー（8 ステップ）
tags:
  - guide
  - workflow
audience: 学習者
references:
  - ./no-aidlc-workflow.md
  - ./aidlc-guide.md
  - ./coding-conventions.md
  - ../learn/ai-tools-guide.md
  - ../reference/adr/ADR-030-personal-trunk-branch-strategy.md
  - ../spec/index.md
last_updated: '2026-08-12T00:00:00+09:00'
---

# 開発ワークフローガイド

このガイドは、学習課題（Issue）に着手してから完了するまでの **BookFlow の標準開発フロー** を示します。  
実装計画の立案から実装までは、原則として AI-DLC エンジンが支援します（例外は各ステップ内で明記）。エンジン自体の仕組みや起動条件は [AI-DLC ガイド](./aidlc-guide.md) を参照してください。

---

## 標準開発フロー {#flow}
![標準開発フロー](/diagrams/guide/dev-workflow-standard.drawio.svg)

計画段階（Workflow Planning）・実装完了段階（PR）のそれぞれで、学習者自身がセルフチェックしてから次に進みます。  
運営者は必須の承認者ではなく、Teams での質問対応で支援します。

### 1. 取り組む課題を選ぶ

[選択課題カタログ](./enhancement-catalog.md#catalog)から、自分の STEP の難易度に合う課題を選びます。各課題には**ビジネス要求シート**（`docs-next/docs/spec/enhancements/<難易度>/<short-desc>.md`。背景・依存関係・要件・受入条件・影響範囲・AI 活用ポイントの6節で実装対象を定義する文書）があります。

対応する GitHub Issue はカタログ課題ごとに運営者が起票済みです。GitHub の Issues 一覧から、選んだ課題名で検索して見つけてください。受入条件はビジネス要求シート側が真実の源です。

### 2. フィーチャーブランチを作成する

自分のトランクブランチ（`learner/<GitHubユーザー名>/main`）から、`feature/<GitHubユーザー名>/<issue番号>-<short-desc>` の形式でブランチを作成します。  
手順は [作業ブランチの作成](./coding-conventions.md#feature-branch) を参照してください。

:::note[トランクブランチが未作成の場合]

最初の課題に着手する前に、`main` から自分のトランクブランチを 1 回だけ作成しておく必要があります。手順は [トランクブランチの作成](./coding-conventions.md#trunk-branch) を参照してください。

:::

:::note[作り忘れた場合]

作り忘れたまま `/aidlc` を起動しても、エンジン起動前の事前確認（Pre-flight）がブランチ名を推測・提案するので、確認して承認するだけで済みます（詳細は [`.claude/skills/aidlc/SKILL.md`](https://github.com/CHS-Training-Org/ai_training_for_chuo_system/blob/main/.claude/skills/aidlc/SKILL.md) の Pre-flight 節を参照）。

:::

:::tip[コードベースを読み解くタイミング]

実装に入る前に対象機能のコードを読み解いておくと、次の Workflow Planning での計画が立てやすくなります。読み方の目安は [コードベース理解ガイド](../learn/curriculum.md#codebase-understanding) を参照してください。

:::

### 3. `/aidlc` を起動する

通常（agent）モードのまま、ビジネス要求シートの内容を伝えたうえで、`/aidlc` を起動する（または「AI-DLC で進めて」と明示的に伝える）と、AI-DLC エンジンが発動し、実行計画（Workflow Planning）を提示します。AI-DLC の指定がない小修正・質問では発動しません。プランモードへの切り替えは不要です。  
エンジンが内部で何を行うかは [AI-DLC ガイド](./aidlc-guide.md) を参照してください。

計画の内容を自分で確認し、納得したらチャットでその旨を伝えて承認し、実装に進みます。運営者の承認は不要です。計画に問題があればこの段階で修正します。  
Claude Code の基本操作は [AI ツール活用ガイド](../learn/ai-tools-guide.md) を参照してください。

:::warning[STEP-03 は例外]

STEP-03（初級課題1回目）は AI-DLC を使わずに進めるため、このステップは行いません。代わりに [AI-DLC を使わない開発フロー](./no-aidlc-workflow.md) に沿って進めてください（背景は [STEP-03](../learn/curriculum.md#step-03) を参照）。

:::

### 4. 仕様を更新する

`/aidlc` は INCEPTION フェーズの成果を `Docs/spec/aidlc-docs/` に生成するだけで、既存の仕様書（要件定義 `requirements.md`、画面仕様書 `screen-spec.md`、API 仕様書 `api-spec.md`、ER 図 `er-diagram.md`。いずれも `docs-next/docs/spec/` 配下）への統合は自動で行われません。  
`/update-spec` スキルを使って統合します。

Spec-first が求めるのは、**コードを生成する前に仕様書が更新されていること**です。設計より先に書くことは求めていません。そのため、仕様を書けるだけの情報が揃うタイミングは変更の内容によって変わります。

- **既存のテーブルと API の範囲で収まる変更**  
ここまでの計画の内容だけで仕様書を書き切れます。ステップ 4 のうちに更新を終え、ステップ 5 に進みます。
- **新しいテーブルやカラムの追加、複雑な業務ルールを含む変更**  
カラムの定義や API エンドポイントの詳細は、ステップ 5 の設計作業の中で確定します。  
ステップ 4 では `requirements.md` と `screen-spec.md` の更新にとどめ、`er-diagram.md` と `api-spec.md` の詳細はステップ 5 の設計が確定したあとに更新します。

:::note[コミットのタイミング]

仕様更新は実装と同一 PR で提出します。実装に同梱しても、独立したコミットに分けてもよいです（分ける場合は、最初の仕様更新を PR の先頭コミットにします）。

:::

### 5. 設計・実装する

INCEPTION フェーズで計画した設計ステージを必要な範囲だけ実行し、コード生成へ進みます。  
各ステージで成果物を提示し、**2択（Request Changes / Continue）** で確認したうえで次へ進みます。設計ステージの内訳は [AI-DLC ガイド](./aidlc-guide.md) を参照してください。

設計の中でデータモデルや API の詳細が確定した場合は、コード生成に進む前に `/update-spec` をもう一度実行し、確定した内容を ER 図（`er-diagram.md`）と API 仕様書（`api-spec.md`）に反映します（ステップ 4 参照）。

フロントエンド、バックエンドなど複数レイヤーにまたがる変更は、機能単位（縦切り）でまとめて実装します。  
実装は [コーディング規約](./coding-conventions.md) に沿って `/aidlc` が行います。  
生成されたコードがこの規約に沿っているかは、次のステップのセルフレビューで確認します。

### 6. ビルド・テストを通す

`/aidlc` がビルド・テスト手順を生成します。以下のコマンドで検証してください。

```bash
# フロントエンド
cd frontend && pnpm test && pnpm lint

# バックエンド
cd backend && ./gradlew test && ./gradlew checkstyleMain
```

CI（`CI Frontend` / `CI Backend`）は機械的な品質ゲートです。

### 7. PR を作成する

[`.github/PULL_REQUEST_TEMPLATE.md`](https://github.com/CHS-Training-Org/ai_training_for_chuo_system/blob/main/.github/PULL_REQUEST_TEMPLATE.md) の様式に沿って PR を作成します。  
**base ブランチは自分のトランクブランチ**（`learner/<GitHubユーザー名>/main`）です。`main` 宛に PR を作成しないでください。

PR を作成するにはブランチへの push が事前に済んでいる必要があります。修正差分のコミット・push は `/commit-push` スキルで行えます。分割単位・コミットメッセージ案・push有無を確認したうえで実行します。

`/create-pr` スキルを使うと、テンプレートに沿ったタイトル・本文を組み立て、PR 作成まで実行します。

### 8. セルフレビューしてマージする

[評価基準](./review-criteria.md#completion-criteria) のチェックリストで自分の PR をセルフレビューします。

PR に `@claude pr-review` とコメントすると、AI が 3 観点（要求整合性・実装と非機能部分の整合性・理解度チェック）で PR を判定します。  
**観点1・観点2が OK、CI green、かつ観点3が確定している**とき総合判定が「完了」になり、これがタスク完了の条件です（[AI レビューとの対応](./review-criteria.md#ai-review)）。

:::note[観点3の誤答は完了を妨げない]

一度確定した観点3は、そのあと差分を変えても再判定・再出題されません。

:::

観点3（理解度チェック）は3〜5問の4択です。1回目のレビューは出題だけで終わるため、判定までに少なくとも2回のやり取りが必要です。  
出題されたら「問番号＋選んだ選択肢＋選んだ理由を一文」の形式（例：`1-B。理由は…`）で、PR の**会話コメント**に全問まとめて回答してください（差分の行に付けたコメントは読み取れません。一部の問だけ答えた状態では解説が返りません）。  
回答したうえで再度 `@claude pr-review` とコメントすると、2回目のレビューで判定が確定し、正誤にかかわらず全問の解説が返ります。

総合判定が「完了」になったら、**自分のトランクブランチへ**自分でマージします。`main` へは学習者は誰もマージしません。  
総合判定は必須 status check には含めないため、判定を待たずにマージすることも技術的には可能です。完了条件を満たしたことを自分で確かめてからマージしてください。

:::warning[STEP-03 は例外]

STEP-03（初級課題1回目）の PR はマージしません。振り返りの記録として残すためだけに作成するもので、確認が終わったらクローズしてよいです。手順は [AI-DLC を使わない開発フロー](./no-aidlc-workflow.md) を参照してください。

:::

マージしたら完了です。対応する Issue はクローズしません。今後の学習者が同じ選択課題に取り組む際に参照できるよう、開いたままにしておきます。
