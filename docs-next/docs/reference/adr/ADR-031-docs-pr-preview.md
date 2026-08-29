---
sidebar_position: 31
type: adr
title: ADR-031 — ドキュメントの PR プレビュー：gh-pages ブランチ配信＋ラベル駆動
description: 修正途中のドキュメントを実サイトの見た目で確認するため、GitHub Pages の配信方式をブランチ配信へ移し、ラベルが付いた main 宛の PR にだけプレビューを生成する判断の記録
tags:
  - docs
  - infrastructure
  - ci
timestamp: 2026-08-29
---

# ADR-031 — ドキュメントの PR プレビュー：gh-pages ブランチ配信＋ラベル駆動

## Status

Accepted（2026-08-26）

## Context

ドキュメントサイトのデプロイ（`.github/workflows/docs.yml`）は `main` への push でしか走らない。そのため **PR で修正途中のドキュメントを、実際のサイトの見た目で確認する手段が無い**。ドキュメント修正が増えるほど、「マージしてからでないと仕上がりが分からない」状態のコストが上がる。

要件は「**実サイトのデザインで**、修正途中の内容をブラウザで確認できること」である。この要件により、次の 2 案は要件を満たさないため候補から外れる。

- **Markdown を独自にレンダリングして配信する**（Claude Code の Artifact 等）：自己完結した 1 枚の HTML になるため、Docusaurus のテーマ・分割 JS・全文検索を持ち込めない。サイトの見た目の確認にならない。
- **GitHub の PR 画面（Files changed）の Markdown 表示**：テーマ・サイドバー・コンポーネントが反映されない。

実サイトの見た目で確認するには Docusaurus を実際にビルドしてどこかに配信する必要があり、候補は次の 3 つだった。

| 候補 | 本番 Pages への影響 | 外部サービス | 別リポジトリ |
|------|------|------|------|
| Pages をブランチ配信に切り替え + `rossjrw/pr-preview-action` | 公開方式の変更が必要（**公開 URL は不変**） | 不要 | 不要 |
| プレビュー専用リポジトリへ `external_repository` でデプロイ | 影響なし | 不要 | **必要**（Deploy key / PAT も必要） |
| Cloudflare Pages / Netlify の PR プレビュー | 影響なし | **必要**（アカウント・トークン登録） | 不要 |

`rossjrw/pr-preview-action` は Pages の公開方式が「Deploy from a branch」であることを前提とする。現行は `actions/upload-pages-artifact` + `actions/deploy-pages` による「GitHub Actions」方式であり、この 2 つは排他（Pages サイトは 1 つ・ソースは 1 つ）である。「GitHub Actions」方式のままでは `gh-pages` ブランチはそもそも配信されないため、プレビューを同一リポジトリで実現するには公開方式の移行が前提になる。

プレビューの生成対象についても制約がある。[ADR-030](./ADR-030-personal-trunk-branch-strategy.md) は学習者の PR の base を個人トランクブランチ（`learner/<ユーザー名>/main`）とする方針だが、**運用は移行途上で、直近の学習者 PR はすべて base が `main`** である。加えて Spec-first 運用（[dev-workflow.md](../../develop/dev-workflow.md)）により学習者の PR は必ず `Docs/` 配下を変更するため、base ブランチや変更パスによる絞り込みでは学習者の PR を除外できない。

## Decision

**GitHub Pages の配信を `gh-pages` ブランチからの配信に移し、ラベル `ドキュメントプレビュー` が付いた `main` 宛の PR にだけプレビューをデプロイする。**

- **配信方式**：Settings > Pages の Source を "Deploy from a branch"（`gh-pages` / root）に変更する。`docs.yml` は成果物を Pages API へ直接アップロードする代わりに、`JamesIves/github-pages-deploy-action` で `gh-pages` ブランチへ push する。**公開 URL（`https://chs-training-org.github.io/ai_training_for_chuo_system/`）と `/docs-next/` `/ops-note/` のパスは変わらない。**
- **プレビュー**：`.github/workflows/docs-preview.yml` が `rossjrw/pr-preview-action` で `gh-pages` の `pr-preview/pr-<N>/` へデプロイし、URL を PR にコメントする。PR のクローズ、またはラベルを外した時点で自動削除される。
- **生成条件**：`pull_request` の `branches: [main]`（base による絞り込み）と、ラベル `ドキュメントプレビュー` の有無の **両方**を満たす PR のみ。ラベルは `.github/labels.yml` で管理する。
- **ビルド手順の共通化**：本番デプロイとプレビューで同じ成果物を作るため、`Docs/`（Zensical）・`docs-next/`（Docusaurus）・`ops-note/` を `pages-root/` に合成する手順を composite action（`.github/actions/build-docs-site`）に切り出す。
- **`baseUrl`**：プレビューは本番と別パスで配信されるため、`docusaurus.config.ts` の `baseUrl` を環境変数 `DOCS_BASE_URL` で差し替えられるようにする（未設定時は本番のパス）。
- **変更ページの通知**（2026-08-29 追記）：プレビューをデプロイした後、**この PR で変更されたドキュメントの一覧を、プレビューサイト上の該当ページへの直リンク付きで PR にコメントする**（`.github/scripts/changed-docs-comment.mjs`）。どのページを直したかを PR 本文から探す手間をなくすのが目的。

  - プレビュー URL は PR 番号だけで決まる決定的な値であり、ラベル付与を待たなくても組み立てられる。デプロイ済みであることだけが要件なので、同一ジョブの deploy ステップの後に置く。
  - 変更ファイルの取得は `git diff` ではなく **PR files API**（`/pulls/{N}/files`）を使う。`pull_request` イベントの HEAD はマージコミットのため `git diff` では正しい差分が取れず、また API なら `removed` / `renamed` の区別が付く。
  - パス → URL の変換は、Docusaurus 側は **ビルド成果物 `docs-next/.docusaurus/globalData.json`（doc id → URL パス）** を参照する。`slug` や `index.md` のディレクトリ URL 化を Docusaurus 自身の解決結果として得られ、`DOCS_BASE_URL` 適用済みのパスがそのまま使える。
  - Zensical（`Docs/`）・運営ノート（`ops-note/`）側は権威データが無いためディレクトリ URL の規則で変換し、**`pages-root/` に実体があるときだけリンクする**。規則がずれた場合はリンク無しのパス表示に退化するだけで、リンク切れは出さない。
  - コメントは `marocchino/sticky-pull-request-comment` で 1 件を更新し続ける。`rossjrw/pr-preview-action` 自身のコメントとは `header` を分ける（同じにすると互いに上書きし合う）。

ラベル方式を採ったのは、ADR-030 の移行状況に依存せず学習者の PR を除外できる唯一の手段であり、「見たい PR にラベルを付ける」という運用が明示的で誤発火しないため。作成者の許可リストや head ブランチ名による絞り込みは、人が増えるたびに workflow を編集する必要があるか、命名規則の追加を強いる。

## Consequences

**ポジティブ**：

- 修正途中のドキュメントを、サイドバー・全文検索・テーマを含む実サイトの見た目で確認できる。
- 変更したページに PR コメントから直接飛べるため、レビュアーが確認対象を探す必要がない。
- 公開 URL・パス構成・サイトの中身は変わらないため、既存のリンク・ブックマークに影響しない。
- 外部サービスも追加リポジトリも増えない。シークレットの追加も不要（`GITHUB_TOKEN` で完結する）。
- ビルド手順が composite action に集約されるため、[ADR-027](./ADR-027-docusaurus-migration.md) のカットオーバーで合成対象が変わっても修正箇所は 1 か所になる。

**留意点**：

- **リポジトリオーナーによる設定変更が 2 つ必要**（本環境からは実施できない申し送り事項。[operations-guide.md](../../operations/operations-guide.md#roles) 参照）。
  1. Settings > Pages > Source を "Deploy from a branch"（`gh-pages` / root）へ変更
  2. Settings > Actions > General > Workflow permissions を "Read and write permissions" へ変更
  設定変更が完了するまで本番サイトは更新されない（切替時に数分の断が生じ得る）。
- `gh-pages` ブランチにビルド成果物（約 24MB）が入り、`main` への push ごとにコミットが積む。プレビューは PR ごとに同程度が加算され、クローズ時に削除されるが**履歴には残る**。肥大化した場合は履歴を潰す運用が別途必要になる。
- 本番デプロイ側に `clean-exclude: pr-preview/` を入れないと、`main` への push のたびに全プレビューが消える。
- ブランチ配信では GitHub が Jekyll ビルドを挟み `_` 始まりのパスを無視するため、`pages-root/.nojekyll` が必須。
- **fork からの PR ではプレビューが生成されない**（`rossjrw/pr-preview-action` の制約）。通常運用は同一リポジトリのブランチなので影響は限定的。
- プレビューは公開される（リポジトリが public のため、URL を知る者は誰でも閲覧できる）。未公開情報を含むドキュメントの PR では、ラベルを付けない運用で対応する。
