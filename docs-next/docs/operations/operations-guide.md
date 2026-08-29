---
sidebar_position: 1
title: 運用ガイド
description: 運営者向けの日常運用・学習者サポート・質問対応フローの手引き
tags:
  - guide
  - operations
  - management
audience: 運営者
references:
  - ../spec/overview.md
  - ../develop/dev-workflow.md
  - ../develop/review-criteria.md
  - ../reference/adr/ADR-030-personal-trunk-branch-strategy.md
last_updated: '2026-08-01T11:56:18+09:00'
---

# 運用ガイド

このページは、BookFlow チュートリアルを**日常的に運営する上での役割分担、サポートフロー、応答方針**を一元化します。  
役割の名簿（誰が何者か）は [リポジトリ概要 §ステークホルダーと役割](../spec/overview.md#roles) が真実の源。  
レビューの観点、評価基準は [review-criteria.md](../develop/review-criteria.md) が真実の源。本ページはそれらを運用の視点から接続します。

---

## 役割分担（運用責任マトリクス） {#roles}
役割の定義は [リポジトリ概要 §ステークホルダーと役割](../spec/overview.md#roles) を参照してください。以下は**運用上の責務**に絞った一覧です。

| 責務 | 運営者 | 学習者 |
|------|:---:|:---:|
| リポジトリ設定・ブランチ保護の設定・変更 | ◎ | — |
| label-sync ワークフローの実行・ラベル管理 | ◎ | — |
| 課題 Issue の起票・カタログの棚卸し | ◎ | — |
| 学習者の質問・詰まりへのサポート（Teams） | ◎ | — |
| PR・Issue への任意コメント（ブロッキングではない） | ○ | — |
| `@claude pr-review` によるAIレビューの起動（タスク完了判定） | — | ◎ |
| Workflow Planning でのセルフ承認・PR のセルフレビュー＆マージ | — | ◎ |
| feature ブランチでの開発・PR 作成 | — | ◎ |
| main ブランチの保守 | ◎ | — |

> ◎ = 主担当、○ = 補助または任意、— = 担当外

**補足：**

- ブランチ保護は GitHub の Settings で設定します。詳細は [セルフレビュー・マージの手順](#self-merge) の admonition を参照してください。
- label-sync の実行手順は [issue-registration.md §label-sync の実行](./issue-registration.md#label-sync) にあります。
- 課題の起票手順は [issue-registration.md §起票手順](./issue-registration.md#howto) にあります。

---

## 質問サポートフロー {#support}
### 一次窓口：Teams

学習者の質問、詰まりは、**Teams で運営者に直接質問する**ことを一次窓口とします。

### 受付経路のまとめ

| 質問の種類 | 推奨チャネル |
|-----------|-------------|
| 課題実装中の疑問・詰まり | Teams で運営者に質問 |
| 環境構築・ツール系のトラブル | [troubleshooting.md](../develop/troubleshooting.md) を確認 → 解決しなければ Teams で運営者に連絡 |
| 学習フロー・カリキュラムへのフィードバック | [学習効果測定（満足度アンケート）](./learning-effectiveness.md) のふりかえり用 Issue にコメント |

---

## レビュー・応答方針 {#response-policy}
### 基本方針

PR のマージは運営者の承認を必要としません。学習者は [review-criteria.md](../develop/review-criteria.md) のチェックリストで自分の PR をセルフレビューし、満たしていることを確認したら自分のトランクブランチへ自分でマージします。`main` へは学習者は誰もマージしません（[ADR-030](../reference/adr/ADR-030-personal-trunk-branch-strategy.md)）。

運営者は Teams での質問対応を**可能な限り早く**返すことを努力目標としますが、これは質問対応・任意のフィードバックであり、マージの条件ではありません。具体的な日数の SLA は設けません。

学習者は：
- セルフレビューが済んだらマージしてよく、運営者の反応を待つ必要はありません。
- 判断に迷った点、相談したい設計上のトレードオフがあれば、PR テンプレートの「任意メモ（運営者へ・あれば）」に記入するか、Teams で質問してください。
- PR に `@claude pr-review` とコメントすると、AI レビューが得られます（[§AI レビュー](#ai-review)）。観点1・観点2 が OK、CI green、かつ観点3が確定していることがタスク完了の条件です。

### セルフレビュー・マージの手順 {#self-merge}

セルフレビューの流れと完了条件は [dev-workflow.md §8](../develop/dev-workflow.md#flow) を参照してください。  
セルフレビューの観点、評価基準は [review-criteria.md](../develop/review-criteria.md) が真実の源です。本ページでは再掲しません。

:::note[運営者向け]

運営者は PR の Approve を求められません。質問への回答や、気になった点への任意コメントで学習者を支援してください。

GitHub の Settings → Branches でブランチ保護ルールを設定する場合：

- `main` はマージ元をリポジトリ管理者のみに制限し、学習者からのマージを技術的に禁止してください。
- 学習者のトランクブランチ（`learner/*/main`）は、必須 status check に `CI Frontend / ci`、`CI Backend / ci` を指定してください。承認レビューは必須にしません（「Require approvals」はオフ）。

本リポジトリでは CODEOWNERS は使用しません。

:::
---

## AI レビュー {#ai-review}
AI レビューの採用は [ADR-024](../reference/adr/ADR-024-ai-first-review-adoption.md)、タスク完了判定としての位置づけは [ADR-025](../reference/adr/ADR-025-ai-review-completion-gate.md) で決着済みです。学習者が PR に `@claude pr-review` とコメントすると、`.github/workflows/claude.yml` の `claude-review` ジョブが起動し、`.github/workflows/references/pr-review-rubric/` に定義された3観点（要求整合性・実装と非機能部分の整合性・理解度チェック、[review-criteria.md §レビュー観点表](../develop/review-criteria.md#review-rubric) にも対応表を掲載）で判定します。

- 出力は観点ごとに1件、最後にサマリを1件の計4件のコメントです。サマリに判定表と総合判定が載ります。観点3が確定している実行では観点3のコメントを投稿せず3件になります（再判定しないため、解説を含む長文の複製を避ける）。
- 観点1・観点2 の判定は `OK`・`NG`・`判定不能` の3値です。ビジネス要求シートが未リンクの場合や PR 本文の該当欄が未記入の場合は、`OK` ではなく `判定不能` になります。「既存テストが引き続き pass する」のように CI の結果でしか確認できない受入条件は、CI green が OK であれば充足として扱います。
- 観点3 だけは3値ではなく**状態**（`未回答` / `全問正解` / `誤答N問・解説済み`）で表示されます。**観点1・観点2 が `OK`、CI green が `OK`、かつ観点3が確定しているとき**に総合判定が「完了」になります。これがタスク完了の条件です。**観点3の誤答は完了を妨げません**（[ADR-026](../reference/adr/ADR-026-comprehension-check-quiz-format.md)）。誤答はコードの欠陥ではなく理解度であり修正して解消できないためですが、誤答した事実は記録として残ります。運営者はこの記録から、学習者が自分のコードを読んでいたかを判断できます。
- 観点3（理解度チェック）は3〜5問の4択です。1回目は出題にとどまり `未回答` となります。学習者が「問番号＋選択肢＋理由を一文」の形式で PR の会話コメントに回答して再度 `@claude pr-review` すると、判定と**正誤にかかわらず全問の解説**が返ります。誤答した問を別の問題に差し替えて再検証することはしません。
- 観点3 は確定後に再判定・再出題しません。確定後にコミットが追加された場合はサマリにその事実が添えられ、結果が変更前のコードに対するものであることが示されます。学習者が改めて受け直したい場合は、観点3のコメントを削除して再実行すると未出題として扱われます。
- 総合判定はタスク完了の条件ですが、必須 status check には含めません。マージは学習者自身が、自分のトランクブランチへ行います（[§レビュー・応答方針](#response-policy)、[ADR-023](../reference/adr/ADR-023-mentor-gate-removal.md)、[ADR-030](../reference/adr/ADR-030-personal-trunk-branch-strategy.md)）。
- PR 作成時の自動起動、レビュアー指定による起動は採用していません。コスト面（Actions 実行）と、GitHub の仕様上「レビュアーに Claude を指定する」操作自体が実現できないためです。
- ジョブの `show_full_output` は既定で `true` です。ツール呼び出しとその結果が Actions ログに残るため、ルーブリックを改訂したときに意図した判定手順を踏んだかを確認できます。モデルの挙動は変わらないためレビュー自体の API 料金には影響しませんが、ログ量は増えます。料金または実行速度への影響が確認された場合に `false` へ切り替えます。
- 静的解析（GHAS・CodeQL）は学習用スコープ外のため採用していません。

---

## ドキュメントサイトの公開・運用
### 公開 URL

| 項目 | 値 |
|------|---|
| 公開先 URL | `https://chs-training-org.github.io/ai_training_for_chuo_system/` |
| 運営ノート | `https://chs-training-org.github.io/ai_training_for_chuo_system/ops-note/` |
| 配信方式 | `gh-pages` ブランチ配信（Settings → Pages → Deploy from a branch） |
| ビルドツール | Docusaurus（`docs-next/`） |

旧 Zensical 版の URL と、並行運用期間の `/docs-next/` 配下の URL は、`.github/scripts/gen-legacy-redirects.mjs` が生成するリダイレクトで新しい URL へ転送されます。共有済みのリンクを貼り直す必要はありません。

### 自動デプロイの仕組み

`.github/workflows/docs.yml` が次のタイミングでビルドし、`gh-pages` ブランチへ push します。

- **main への push**：`docs-next/**`・`ops-note/**`・共通ビルド action・リダイレクト生成スクリプト・`docs.yml` のいずれかが変更された場合
- **手動実行**（`workflow_dispatch`）：GitHub Actions の UI からいつでも実行可能

ビルド手順は composite action `.github/actions/build-docs-site` に集約されており、Docusaurus の出力（`docs-next/build/`）・`ops-note/`・旧 URL のリダイレクトスタブを `pages-root/` に合成します（ブランチ配信では Jekyll が `_` 始まりのパスを無視するため `.nojekyll` も配置します）。本番デプロイは `clean-exclude: pr-preview/` を指定しており、PR プレビューを消しません。

### PR プレビュー（修正途中のドキュメントを確認する） {#pr-preview}

`main` への push でしかサイトは更新されないため、PR で修正途中のドキュメントを確認するには **PR プレビュー**を使います（[ADR-031](../reference/adr/ADR-031-docs-pr-preview.md)）。

1. `main` 宛の PR にラベル **`ドキュメントプレビュー`** を付ける
2. `.github/workflows/docs-preview.yml` がサイトをビルドし、`https://chs-training-org.github.io/ai_training_for_chuo_system/pr-preview/pr-<PR番号>/` へデプロイする
3. プレビュー URL が PR にコメントで投稿される
4. ラベルを外すか PR をクローズすると、プレビューは自動的に削除される

学習者の PR でプレビューが生成されないよう、**ラベルが付いた PR のみ**を対象にしています（学習者の PR は Spec-first 運用のため必ず仕様のページを変更するため、変更パスや base ブランチでは絞り込めません）。fork からの PR ではプレビューは生成されません。プレビューは公開されるため、未公開情報を含む PR にはラベルを付けないでください。

### 管理者による設定（申し送り）

:::warning[運営者作業]

以下は本環境からは実施不可のため、運営者への申し送りです。設定が完了するまでサイトは更新されません。

:::

1. GitHub リポジトリの **Settings → Pages** を開き、**Source** を **"Deploy from a branch"**、Branch を **`gh-pages`**、Folder を **`/ (root)`** に設定して保存する（`gh-pages` ブランチが存在しないと選択できないため、先に `docs.yml` を手動実行してブランチを作る）
2. **Settings → Actions → General → Workflow permissions** を **"Read and write permissions"** に設定する（ワークフローが `gh-pages` へ push するため）
3. `docs.yml` を手動実行（Actions → "Deploy Docs …" → "Run workflow"）または `main` にドキュメント変更を push する
4. Actions が green になったあと公開 URL にアクセスし、サイトが表示されることを確認する

### ビルド失敗時の対処

ローカルで以下のコマンドで再現できます（docs コンテナが起動している必要があります）：

```bash
cd docs-next && npm ci && npm run build
```

**主なビルド失敗パターン：**

| 症状 | 原因 | 対処 |
|------|------|------|
| `Broken link` / `Broken anchor` | 移動・改名したページへのリンクが残っている | リンク先を修正する（`onBrokenLinks` / `onBrokenAnchors` が `'throw'` のため必ず失敗する） |
| リダイレクト生成で「既存ページと衝突」 | 旧 URL と新 URL のパスが同じになった | `.github/scripts/gen-legacy-redirects.mjs` の対応表から該当行を外す（転送は不要で、実ページが応答する） |
| ビルドエラー | Markdown 構文エラー・Mermaid 構文ミス | エラー箇所を修正する |

環境・コンテナ起動に関するトラブルは [troubleshooting.md](../develop/troubleshooting.md) を参照してください。
---

## 関連ドキュメント

- 役割の名簿・ステークホルダー定義：[リポジトリ概要 §ステークホルダーと役割](../spec/overview.md#roles)
- 標準開発フローの詳細：[dev-workflow.md §標準開発フロー](../develop/dev-workflow.md#flow)
- レビュー観点・評価基準：[review-criteria.md](../develop/review-criteria.md)
- ラベル体系・課題起票手順：[issue-registration.md](./issue-registration.md)
- トラブルシューティング：[troubleshooting.md](../develop/troubleshooting.md)
- 学習効果測定（満足度アンケート）：[learning-effectiveness.md](./learning-effectiveness.md)
- AI レビュー採用の意思決定：[ADR-024](../reference/adr/ADR-024-ai-first-review-adoption.md)
- AI レビューをタスク完了判定に格上げした意思決定：[ADR-025](../reference/adr/ADR-025-ai-review-completion-gate.md)
