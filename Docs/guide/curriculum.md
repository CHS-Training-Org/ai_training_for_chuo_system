---
type: guide
title: 学習カリキュラム
description: BookFlow を使った AI 駆動開発の学習ステップと到達目標の体系
tags:
  - guide
  - curriculum
  - learning
timestamp: 2026-07-07
audience: 学習者（新人・中堅）・メンター
references:
  - Docs/guide/getting-started.md
  - Docs/guide/dev-workflow.md
  - Docs/guide/ai-tools-guide.md
---

# 学習カリキュラム

このページは、BookFlow で学習を進める際の**学習パス**と、最初に取り組む**必須ステップ課題（STEP-01〜03）**を定義します。  
必須ステップを終えたあとは、難易度別の選択課題へ進みます。どの課題に取り組むか迷ったら、まず下の[学習パスマップ](#path-map)を確認してください。

---

## 学習パスマップ { #path-map }

学習者のレベルに応じて、2 つのパスを用意しています。  
STEP-01（環境構築）・STEP-02（リポジトリ運用・開発フロー理解）は、本リポジトリ固有の環境とプロセスであるため、新人・中堅を問わず全員が必須で実施します。  
STEP-03（AI ツール導入・活用）は、Claude Code の基本操作の習得に加え、標準開発フロー（AI-DLC）を使わずに最初の選択課題を進め、使った場合との違いを体感するステップです。  
スキップの余地があるのはこの STEP-03 のみで、Claude Code の基本操作と標準開発フロー（AI-DLC）の両方に既に習熟している場合に限り、任意確認で済ませられます。

| パス | 進め方 |
| ---- | ------ |
| 新人向け | STEP-01 → 02 → 03 を**順番に必須**で実施 → Beginner レベルの選択課題へ |
| 中堅向け | STEP-01 → 02 を**必須**で実施し、STEP-03（AI ツール導入・活用）のみ Claude Code の基本操作と標準開発フロー（AI-DLC）の両方に習熟していれば**任意確認・スキップ可** → Intermediate / Advanced の選択課題へ |

難易度別の選択課題カタログ（Beginner / Intermediate / Advanced）は **[選択課題カタログ](./enhancement-catalog.md)** を参照してください。

- **新人**は STEP-03 完了後に [Beginner の課題](./enhancement-catalog.md#beginner) から始めることを推奨します。
- **中堅**は [Intermediate / Advanced の課題](./enhancement-catalog.md#intermediate) から選んでください。
- 選択課題に着手する際は、[コードベース理解ガイド](#codebase-understanding)を必要な範囲で参照してください。

---

## 必須ステップ課題 { #required-steps }

新人が最初に取り組む 3 つの課題です。**順序性があり**、前の STEP の完了を前提に次へ進みます。  
各 STEP の「完了条件」を自己チェックしながら進めます。

文書化が必要な STEP の完了証跡は、各 STEP の「完了条件」の指示に従い、最初に着手する選択課題（エンハンス課題）の PR にまとめて記載してください。STEP ごとに個別の Issue や PR を作成する必要はありません。  
選択課題の進め方は [dev-workflow.md §標準開発フロー](./dev-workflow.md#flow) を参照してください。

---

## STEP-01：環境構築 { #step-01 }

| 項目 | 内容 |
| ---- | ---- |
| ゴール | DevContainer を起動し、ブラウザで BookFlow のダッシュボードにアクセスできる状態を作る |
| 推奨レベル | Beginner |
| 推定工数 | 2 時間〜半日 |
| AI 活用例 | 起動エラーが出たら、Claude Code にエラーメッセージを貼り付けて原因と対処法を尋ねる |
| 完了条件 | [getting-started.md §動作確認](./getting-started.md) の手順で、`curl http://localhost:8080/actuator/health` が `{"status":"UP"}` を返し、`http://localhost:3000` でサインイン画面またはダッシュボードが表示される |

手順の詳細は [getting-started.md](./getting-started.md)（STEP-01 の手順書）を参照してください。トラブル時は [troubleshooting.md](./troubleshooting.md) も確認してください。

---

## STEP-02：リポジトリ運用・開発フローの理解 { #step-02 }

| 項目 | 内容 |
| ---- | ---- |
| ゴール | このリポジトリでの開発の進め方（ブランチの切り方・学習パスの選び方・AI-DLC に基づく標準フロー）を理解し、実装を始められる状態を作る |
| 推奨レベル | Beginner |
| 推定工数 | 半日 |
| AI 活用例 | Claude Code に [dev-workflow.md](./dev-workflow.md) を読み込ませ、標準フローを自分の言葉で要約させて理解を確認する |
| 完了条件 | 下記の確認項目をすべて満たし、自分の言葉で説明できる（最初に着手する選択課題の PR に記載する） |

実装に着手する前に、リポジトリの運用ルールを把握します。次の 4 点を確認してください。

- **標準開発フロー**：[dev-workflow.md §標準開発フロー](./dev-workflow.md#flow) を読み、「ビジネス要求シート（Issue）選択 → ブランチ作成 → `/aidlc` 起動・plan mode で計画提示・セルフ承認 → Spec-first で仕様更新 → 縦切り実装 → セルフレビュー → PR → セルフレビュー・マージ」という**自己完結の流れ**を説明できる。
- **AI-DLC の考え方**：[dev-workflow.md §AI-DLC と BookFlow フローの対応](./dev-workflow.md#aidlc-mapping) を読み、plan-first（`/aidlc` を起動して AI-DLC エンジンに計画を立てさせ、plan mode で計画に納得してから実装する）の狙いを理解する。
- **ブランチの切り方**：[coding-conventions.md §共通方針](./coding-conventions.md#common) に従い、`feature/<GitHubユーザー名>/<issue番号>-<short-desc>` 形式でブランチを作成できる。issue 番号は要件シートには記載されておらず、Issue を起票した時点で GitHub が採番するため、起票後に Issue の URL やタイトル横の表示で確認する。
- **学習パスの選び方**：この[学習パスマップ](#path-map)から、自分のレベルに合った次の課題を選べる。

!!! tip "実際に手を動かす"
    読むだけでなく、`feature/<GitHubユーザー名>/<issue番号>-<short-desc>` 形式のブランチを実際に 1 本作成してみると、以降の STEP でそのまま使えます。

---

## STEP-03：AI ツール導入・活用 { #step-03 }

| 項目 | 内容 |
| ---- | ---- |
| ゴール | 本リポジトリの標準 AI ツールである Claude Code の特性を理解する。あわせて、Beginner の最初の選択課題を標準開発フロー（AI-DLC）を使わずに進め、後続課題で AI-DLC を使った場合との違いを体感できるようになる |
| 推奨レベル | Beginner |
| 推定工数 | 半日〜1 日 |
| AI 活用例 | [ai-tools-guide.md §AI-DLC を使わずに最初の選択課題を進める](./ai-tools-guide.md#checklist) の手順を実際に手を動かして試す |
| 完了条件 | Beginner から選んだ最初の選択課題を、`/aidlc`（AI-DLC エンジン駆動）を使わずに Claude Code へ直接プロンプトして実装する。spec-first（先に `Docs/spec/` を更新する原則）とセルフレビューは AI-DLC を使う場合と同じく行う。完了後、AI-DLC なしで進めて感じた手間を短く振り返り、その選択課題の PR に記載する（後続課題で `/aidlc` を使った場合との対比の起点にする） |

セットアップ、使い方、効果的なプロンプトの書き方、AI 利用ポリシーは [ai-tools-guide.md](./ai-tools-guide.md) を参照してください。

---

## コードベース理解ガイド（随時） { #codebase-understanding }

必須ステップではありません。選択課題（エンハンス課題）に着手する前後で、必要な範囲だけ確認してください。

| 項目 | 内容 |
| ---- | ---- |
| ゴール | 着手する機能について、フロントエンド → BFF → バックエンド → DB の処理の流れと、関連する既存テストの意図を説明できる |
| 推奨タイミング | 選択課題に着手する直前、または実装中に必要になったタイミング |
| AI 活用例 | Claude Code に「〇〇機能の処理フローを説明して」「このテストが検証していない境界値は？」と尋ね、回答を手がかりに実コードを読み解く |
| 確認の目安 | 着手する選択課題の PR に、処理フローの説明やテスト意図のコメントを添える。このガイド専用の PR を別途起票する必要はない |

アーキテクチャ全体像は [ARCHITECTURE.md](../ARCHITECTURE.md)、各レイヤーの責務とテスト規約は [coding-conventions.md](./coding-conventions.md) を参照してください。[標準開発フロー](./dev-workflow.md#flow) でブランチを作成したあと、実装に入る前に確認しておくと、その後の plan mode での計画が立てやすくなります。
