---
sidebar_position: 3
title: AI-DLC ガイド
description: AI-DLC が生まれた背景・大事にしている原則・3 フェーズ全ステージの実行条件と、BookFlow での翻案
tags:
  - guide
  - ai-dlc
audience: 学習者
references:
  - ./dev-workflow.md
  - ./no-aidlc-workflow.md
  - ../curriculum.md
  - ../aidlc-adoption.md
last_updated: '2026-08-13T00:00:00+09:00'
---

# AI-DLC ガイド

このガイドは、BookFlow の [標準開発フロー](./dev-workflow.md#flow) を支える **AI-DLC エンジン** が、
どういう考えで作られ、内部で何を行っているかを説明します。  
扱うのは思想と仕組みです。Issue 着手からマージまでの実際の手順は [開発ワークフローガイド](./dev-workflow.md) を参照してください。

AI-DLC（AI-Driven Development Life Cycle）は AWS が 2025 年 7 月に公開した開発方法論で、
のちにワークフロールールが [`awslabs/aidlc-workflows`](https://github.com/awslabs/aidlc-workflows) として OSS 公開されました。  
BookFlow はこのエンジンを **標準ワークフローとして採用**しています（`.claude/skills/aidlc/SKILL.md`）。
エンジンは `/aidlc` の明示起動、または「AI-DLC で進めて」等の意図指定があったときにのみ発動し、
指定のない小修正・質問では発動しません。

---

## なぜ AI-DLC が生まれたか \{#why}

**従来の開発プロセスは、人間のペースで長く回ることを前提に設計されている。**
AWS はこの前提を出発点に置いています。要件定義・設計・実装・テストという段階的な受け渡し、
2 週間単位のスプリント、その間に挟まる計画と会議。AWS の表現では、
プロダクトオーナー・開発者・アーキテクトは「計画、会議、その他の SDLC の儀式といった、
本質的でない活動に時間の大半を費やしている」状態です。  
AI が意図をほぼ即座にコードへ変えられるようになると、この前提と噛み合わなくなります。
速度は上がるのに、品質と確信度は下がるという歪みが生まれます。

**AI の使い方には、両極の失敗がある。** AWS は既存の 2 つのアプローチを名指しで
「速度とソフトウェア品質の両面で最適とは言えない結果を生んでいる」と評価しています。

- **AI-assisted development**：AI をコード補完の道具として使う。人間の進め方は変わらないため、加速の幅が限られる
- **AI-autonomous development**：AI に丸ごと任せる。速いが、人間が検証する場を失うため品質と説明責任が崩れる

**AI-DLC はその中間を、役割分担として定義したもの**です。AI が作業計画を立て、不明点を人間に問い、
重要な判断を人間に委ねる。人間は実装作業から離れ、判断と検証に回る。
この分担を保つために、AI-DLC は 2 週間のスプリントではなく **bolt**（数時間〜数日の作業サイクル）で回します。

ワークフロールールを OSS 公開した際、AWS は解こうとしている問題をさらに 3 つに整理しています。

1. **固定的なワークフロー**：すべてのプロジェクトを同じ手順の列に押し込む「万能型」の進め方
2. **深さの硬直**：段階の重さが調整できず、過剰設計にも検証不足にも振れる
3. **過剰な自動化**：自動化が進むほど、人間が検証と監督から意図せず遠ざけられていく

---

## AI-DLC が大事にしていること \{#principles}

AI-DLC が掲げる 5 つの原則（tenets）と、それを支える 2 つの性質（適応性）は、
BookFlow ではそれぞれ次の形で現れます。

| 原則 | 意味 | BookFlow での現れ方 |
|---|---|---|
| **Human in the loop** | 重要な判断は必ず人間の明示的な確認を要する。「エージェントが提案し、人間が承認する」 | 各ステージ末尾の承認ゲート。CONSTRUCTION では **2 択**（Request Changes / Continue）に固定される |
| **Adaptive workflow** | ワークフローを作業に合わせる。作業をワークフローに合わせない | 条件付きステージの EXECUTE / SKIP 判定（[3 フェーズと全ステージ](#phases)） |
| **深さの適応** | 同じステージでも Minimal / Standard / Comprehensive の深さを使い分ける | 要件分析の深さ判定。AI-DLC 指定のない小修正では `/aidlc` を起動しない運用そのもの |
| **Methodology first** | 特別なインストールを必要としない方法論であること | Markdown（`.claude/skills/aidlc/SKILL.md` と `.aidlc-rule-details/`）だけで成立している |
| **Reproducible** | モデルが違っても結果のばらつきを抑える | 2 択メッセージの固定、計画のチェックボックス更新の強制 |
| **Agnostic** | プラットフォーム・ベンダーに依存しない | BookFlow は Claude Code 専一に翻案（`AGENTS.md` は導入しない） |
| **No duplication** | 単一の真実の源を持ち、派生物はそこから導く | Spec-first（`Docs/spec/` が真実の源）と、上流の逐語スナップショット |

この 7 行のうち、学習者が最も直接触るのは **Human in the loop** です。  
AI-DLC における承認は、確認したという意思表示ではなく**ワークフローの停止条件**です。
承認を返すまでエンジンは次のステージに進みません。逆に言えば、
承認を機械的に返すと AI-DLC の中核が空になります。

---

## 何を解決しうるか \{#value}

BookFlow の文脈で、AI-DLC が解きうる問題は次の 4 つです。  
いずれも [AI-DLC を使わない開発フロー](./no-aidlc-workflow.md) で自力で担保することも可能なので、
STEP-03 と STEP-04 で同じ課題を 2 回実装すると差として観察できます。

- **意図とコードの断絶**  
要求から実装までの変換を、要件・ストーリー・設計・コードという成果物の連なりに分けます。
どこで解釈が変わったかを後から追えます。
- **粒度の過不足**  
条件付きステージのスキップ判定と深さの適応で、変更の規模に応じて工程の重さが変わります。
タイポ修正に要件分析を課すことも、DB スキーマ変更を計画なしで進めることも避けられます。
- **レビュー不能な一括生成**  
コード生成が「計画（番号付き手順）を承認してから生成する」2 段階に割れており、
生成の前に人間が読める粒度の計画が必ず提示されます。
- **記録の欠落**  
どの入力に対して何を判断し、何を承認したかが監査ログに残ります。
PR に AI 活用箇所を明記する運用と噛み合います。

---

## 上流の概念と BookFlow での姿 \{#mapping}

AI-DLC の原典は**複数人のチーム**を前提にしています。プロダクトオーナー・アーキテクト・開発者が
その場に集まり、AI の提案を一緒に検証する儀式が方法論の柱に置かれています。  
BookFlow は学習者 1 人・セルフ承認のため、この部分は形を変えて写像されています。
上流の資料を読むときは次の対応で読み替えてください。

| 上流の概念 | 原典での意味 | BookFlow での姿 |
|---|---|---|
| **Mob Elaboration** | INCEPTION で関係者が集まり、AI が出した要件・ストーリー・作業単位の案を一緒に検証する場 | 学習者 1 人と AI のチャット上のやり取り。承認するのは学習者自身（運営者の承認は不要） |
| **Mob Construction** | CONSTRUCTION で AI の論理設計・コード・テスト案をその場で検証する場 | 各ステージ末尾の 2 択メッセージ（Request Changes / Continue） |
| **Bolt** | スプリントの置き換え。数週間ではなく数時間〜数日で回す作業サイクル | STEP-04（2〜3 時間）・STEP-05（4〜7 時間）という選択課題 1 件あたりの工数設計 |
| **Unit of Work** | ユーザーストーリーを開発単位にまとめた論理グループ | 縦切りの選択課題 Issue（`feature/<GitHubユーザー名>/<issue番号>-<short-desc>` 単位） |
| **質問ファイル**（`[Answer]:` に A〜E で回答） | 専用ファイルに選択肢を書き出し、人間が記入して返す | `AskUserQuestion` ツール（1 回に 4 問以内・選択肢は互いに排他的） |
| **`aidlc-docs/` ツリー** | 生成物・状態ファイルの置き場 | `Docs/spec/aidlc-docs/`（作業用成果物）と `Docs/spec/aidlc-state.md` / `Docs/spec/aidlc-audit.md` |
| **OPERATIONS フェーズ** | デプロイ・監視 | CI 品質ゲート（`CI Frontend` / `CI Backend`） |
| **「Using AI-DLC, ...」で起動** | プロンプトの接頭辞でワークフローを発動する | `/aidlc` の明示起動、または「AI-DLC で進めて」等の意図指定 |

---

## 3 フェーズと全ステージ \{#phases}

エンジンは INCEPTION（WHAT / WHY）→ CONSTRUCTION（HOW）→ OPERATIONS の 3 フェーズで構成されます。  
**必須**のステージは常に実行され、**条件付き**のステージは変更の内容に応じて実行かスキップが判定されます。
判定の根拠は監査ログに残ります。  
以下の一覧は BookFlow が固定している版（VERSION 0.1.8）の `.aidlc-rule-details/` に基づきます。

### INCEPTION フェーズ（WHAT / WHY）
![INCEPTION フェーズ](/diagrams/guide/dev-workflow-inception.drawio.svg)

`/aidlc` 起動後、通常（agent）モードのままワークスペースと要求を分析し、実行計画を提示するところまでを担います。

| ステージ | 区分 | 実行・スキップの条件 | 何を行うか | 承認ゲート |
|---|---|---|---|---|
| Workspace Detection（ワークスペース検出） | 必須 | 常に最初に実行 | 進捗トラッカーの有無を見て新規開始か再開かを判定し、既存コードベースの有無（brownfield / greenfield）を判定する | なし（自動で次へ） |
| Reverse Engineering（既存コード解析） | 条件付き | 既存コードベースがあり、かつ解析成果物が未作成のときに実行 | 業務概要・アーキテクチャ・コード構造・API・コンポーネント一覧・技術スタック・依存関係を洗い出す | あり |
| Requirements Analysis（要件分析） | 必須（深さ適応） | 常に実行。深さは要求の明確さと複雑さで Minimal / Standard / Comprehensive を選ぶ | ビジネス要求シート（`Docs/spec/enhancements/<short-desc>.md`。選択課題ごとに背景・依存関係・要件・受入条件・影響範囲・AI 活用ポイントを定義した文書）の背景・要件・受入条件を入力として要件をまとめる。セキュリティ・レジリエンシー・プロパティベーステストの各拡張を適用するかもここで問われる | あり |
| User Stories（ユーザーストーリー） | 条件付き | ユーザー向け機能の追加・動線の変更・複数ペルソナ・複雑な業務要件・顧客向け API のときに実行。内部リファクタのみ、単純なバグ修正、インフラのみ、ドキュメントのみならスキップ | 計画（Part 1）で作成方針と疑問点を出し、承認後に生成（Part 2）する | あり |
| Workflow Planning（実行計画） | 必須 | 常に実行 | ここまでの文脈を読み、どのステージを実行しどれをスキップするかを決めて図で提示する。**plan-first のゲートはここ**（[plan-first のセルフ承認](#plan-first)） | あり |
| Application Design（コンポーネント設計） | 条件付き | 新しいコンポーネント・サービスが必要、メソッドやサービス層の設計が必要なときに実行。既存の境界内で収まる変更ならスキップ | コンポーネントの責務・メソッド・業務ルール・依存関係を設計する | あり |
| Units Generation（作業単位への分解） | 条件付き | 複数の作業単位に分ける必要があるときに実行。単一の単純な単位ならスキップ | 要求を作業単位（Unit of Work）へ分解する。BookFlow では縦切り Issue に対応するため、選択課題 1 件では通常スキップされる | あり |

### CONSTRUCTION フェーズ（HOW）
![CONSTRUCTION フェーズ](/diagrams/guide/dev-workflow-construction.drawio.svg)

作業単位ごとのループとして回ります。1 つの単位を完了させてから次の単位に移り、
すべての単位が終わってからビルド・テストに進みます。  
このフェーズの完了メッセージは**必ず 2 択**（Request Changes / Continue）です。3 択以上は禁止されています。

| ステージ | 区分 | 実行・スキップの条件 | 何を行うか |
|---|---|---|---|
| Functional Design（機能設計） | 条件付き・単位別 | 新しいデータモデル、複雑な業務ロジック、詳細設計を要する業務ルールがあるときに実行 | 技術に依存しない形で業務ロジックを設計する |
| NFR Requirements（非機能要件） | 条件付き・単位別 | 性能要件・セキュリティ考慮・拡張性の懸念・技術スタック選定があるときに実行 | 非機能要件を洗い出し、技術選定を確認する |
| NFR Design（非機能設計） | 条件付き・単位別 | NFR Requirements を実行した場合に続けて実行 | 非機能要件を満たすパターンと論理コンポーネントに落とす |
| Infrastructure Design（インフラ設計） | 条件付き・単位別 | インフラ構成・デプロイ構成・クラウドリソースの指定が必要なときに実行。BookFlow は Docker Compose / DevContainer で固定のため通常スキップされる | 設計を実際のインフラサービスに対応づける |
| Code Generation（コード生成） | 必須・単位別 | 常に実行 | Part 1 で番号付き・チェックボックス付きの実装計画を作って承認を取り、Part 2 でその計画を実行してコードを生成する |
| Build and Test（ビルド・テスト） | 必須 | 全単位の完了後に実行 | ビルド・テスト手順を `Docs/spec/aidlc-docs/construction/build-and-test/` に生成する |

:::note[Spec-first との接続]

エンジンは INCEPTION の成果を `Docs/spec/aidlc-docs/` に置くだけで、既存の仕様書
（要件定義 `requirements.md`、画面仕様書 `screen-spec.md`、API 仕様書 `api-spec.md`、ER 図 `er-diagram.md`。
いずれも `Docs/spec/` 配下）には統合しません。  
統合は `/update-spec` スキルで行い、**Code Generation より前に**終えます。タイミングの判断は
[標準開発フロー](./dev-workflow.md#flow) のステップ 4・5 を参照してください。

:::

### OPERATIONS フェーズ

エンジンの定義上は将来のデプロイ・監視のためのプレースホルダーで、実装されていません。  
BookFlow では CI 品質ゲート（`CI Frontend` / `CI Backend`）を Operations 相当として運用します。
デプロイ自動化と監視は別タスクで扱います。

---

## plan-first のセルフ承認 \{#plan-first}

AI-DLC の中核は、実装より先に計画を立てて人間が納得してから進める **plan-first** の考え方です。
`/aidlc` を起動すると、エンジンが Workflow Planning で実行計画を提示し、
学習者がその内容に納得したことをチャットで示してから実装に進みます。
計画に問題があればこの段階で修正します。運営者の承認は不要です。

確認する観点は [AI-DLC を使わない開発フロー](./no-aidlc-workflow.md#step-3) の計画確認の表と同じです
（スコープの一致・既存パターンとの整合性・前提の解消・テストの妥当性・リスクの大きい変更への警戒）。
`/aidlc` が計画の形を整えてくれても、**その計画が正しいかを判断するのは学習者側の仕事**です。

---

## BookFlow での実装 \{#bookflow}

- **起動**：エンジン本体は `/aidlc` スキル（`.claude/skills/aidlc/SKILL.md`）に置かれています。
常時読み込まれるのは起動判断だけを担う薄いポインタ（`.claude/rules/aidlc-core.md`）です。
起動すると「👋 Welcome to AI-DLC」の挨拶が応答の冒頭に出ます。
- **Pre-flight**：BookFlow 独自の前置き処理として、エンジン開始より前にブランチの作成漏れを検知し、
対象のビジネス要求シートを特定します。上流のステージ定義には手を加えておらず、承認ゲート・監査ログの対象外です。
- **進捗と記録**：`Docs/spec/aidlc-state.md`（進捗トラッカー）でステージ単位の実行・スキップを追跡し、
`Docs/spec/aidlc-audit.md`（監査ログ・追記専用）に入力と応答を ISO 8601 のタイムスタンプ付きで残します。
セッションが切れても、トラッカーの未完了項目から再開できます。
- **上流の固定**：VERSION 0.1.8（固定コミット `b19c81928bdf1b8d13856f462fcf2ede1720b4cb`）を [`vendor/aidlc-rules/`](https://github.com/CHS-Training-Org/ai_training_for_chuo_system/tree/main/vendor/aidlc-rules) に逐語保存し、
パスを翻案した稼働版を `.aidlc-rule-details/` に置いています。ライセンスは MIT No Attribution です。
- **翻案の全体像**：上流 32 ファイルそれぞれの反映先・採用状態・同期手順は
[AI-DLC 採用台帳](../aidlc-adoption.md) にまとまっています。

---

## 参照先 \{#references}

**BookFlow 側**

- エンジン本体（`/aidlc` スキル）: [`.claude/skills/aidlc/SKILL.md`](https://github.com/CHS-Training-Org/ai_training_for_chuo_system/blob/main/.claude/skills/aidlc/SKILL.md)
- 起動判断のポインタ: [`.claude/rules/aidlc-core.md`](https://github.com/CHS-Training-Org/ai_training_for_chuo_system/blob/main/.claude/rules/aidlc-core.md)
- ステージ詳細（翻案済み）: [`.aidlc-rule-details/`](https://github.com/CHS-Training-Org/ai_training_for_chuo_system/tree/main/.aidlc-rule-details)
- [進捗トラッカー](../aidlc-state.md) / [監査ログ](../aidlc-audit.md) / [採用台帳](../aidlc-adoption.md)

**上流・一次情報**

- [AI-Driven Development Life Cycle: Reimagining Software Engineering](https://aws.amazon.com/blogs/devops/ai-driven-development-life-cycle/)（方法論の初出。背景と 3 フェーズ）
- [Open-Sourcing Adaptive Workflows for AI-DLC](https://aws.amazon.com/blogs/devops/open-sourcing-adaptive-workflows-for-ai-driven-development-life-cycle-ai-dlc/)（適応型ワークフローの狙い）
- [Building with AI-DLC using Amazon Q Developer](https://aws.amazon.com/blogs/devops/building-with-ai-dlc-using-amazon-q-developer/)（別エージェントでの実行例）
- [`awslabs/aidlc-workflows`](https://github.com/awslabs/aidlc-workflows)（ワークフロールール本体）
