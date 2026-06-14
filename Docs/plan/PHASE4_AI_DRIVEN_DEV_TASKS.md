# Phase 4 AI 駆動開発整備タスク

> 対象読者：メンター・リポジトリ管理者・AI エージェント  
> 参照：[PROJECT_PLAN.md](../PROJECT_PLAN.md) §4 / [Docs/spec/](../spec/index.md) / [Docs/guide/](../guide/index.md) / [ARCHITECTURE.md](../ARCHITECTURE.md)

---

## このドキュメントについて

**目的**：学習者の受け入れ（Phase 5：初回学習実施）に向けた最終整備を「やること・やったこと」で一元管理する。  
スコープは次の 4 本柱。

1. **仕様書の整備** — 実装と `Docs/spec/` の同期・仕様更新ルールの確立
2. **AI 駆動開発ワークフローの整備** — Issue → 実装 → PR → レビューのサイクルを AI ツール前提で定型化
3. **エンハンス要件の策定** — 学習者が取り組む拡張課題（必須ステップ + 選択課題）の要件定義と Issue 登録
4. **学習者ガイドの完成** — `Docs/guide/` 配下に残る未記入セクションの解消

> **背景**：Phase 0〜3（計画策定・リポジトリ初期化・ドキュメント整備・ベースサービス実装）は完了済み。  
> 完了済みフェーズの計画ファイルは削除した（必要な場合は git 履歴を参照）。  
> 旧計画にあった学習カリキュラム・運用ポリシーの設計内容は、本フェーズで `Docs/guide/` 配下の恒久ドキュメントとして再整備する。

**更新ルール**

| アクション           | 操作                                                         |
| -------------------- | ------------------------------------------------------------ |
| タスクを開始する     | 状態を `着手中` に変更                                       |
| 作業が完了した       | 状態を `完了` に変更し、チェックボックスを `[x]` に変更      |
| 新規タスクが発生した | 該当カテゴリの表末尾に追記（番号体系：`カテゴリ番号.連番`）  |
| ブロッカーが発生した | 状態を `保留` にしメモ欄に理由を記入                         |

**ステータス値**：`未着手` / `着手中` / `完了` / `保留`

---

## 全体進捗サマリ

| カテゴリ                                   | タスク数 | 完了数 | 進捗            |
| ------------------------------------------ | -------- | ------ | --------------- |
| 1. 仕様書の整備                            | 4        | 4      | ██████████ 100% |
| 2. 学習者ガイドの完成                      | 4        | 4      | ██████████ 100% |
| 3. AI 駆動開発ワークフローの整備           | 7        | 7      | ██████████ 100% |
| 4. エンハンス要件の策定（学習課題設計）    | 5        | 0      | ░░░░░░░░░░ 0%   |
| 5. 運用・公開整備                          | 4        | 0      | ░░░░░░░░░░ 0%   |
| **合計**                                   | **24**   | **15** | **63%**         |

> サマリは各カテゴリのタスクを完了するたびに手動で更新する。

---

## カテゴリ 1：仕様書の整備

実装コードを「真実の源」とし、`Docs/spec/` がそれを正確に反映している状態を作る。  
以降の機能追加は **Spec-first**（仕様を先に更新してから実装）で進める。

- [x] **1.1 実装と仕様の突合監査**
  - 状態：完了
  - 内容：18 API（`api-spec.md`）・10 画面（`screen-spec.md`）・ER（`er-diagram.md`）を実装コード（Controller / DTO / `app/` ページ / `V001` スキーマ）と突き合わせ、差分を仕様側に反映する。
  - メモ：エンドポイント 18・画面 10・テーブル 5 はすべて実装と総数一致。  
      エラーステータス体系（422 の追加・エラーコード 4 種の補完）・サインアウト挙動・空き確認フィルタ挙動・開発用ログイン等の差分を仕様側に反映済み。  
      レスポンス JSON の日時フォーマット等の動的検証はタスク 1.3（OpenAPI 突合）へ申し送り。
- [x] **1.2 仕様更新ルールの策定**
  - 状態：完了
  - 内容：機能変更時に仕様を先に更新する Spec-first ルール・更新責任・レビューフローを `spec/index.md` に明文化する。
  - メモ：`spec/index.md` に「仕様更新ルール（Spec-first）」セクション（明示アンカー `{ #spec-first }`）を新設。  
      原則（spec を真実の源とし実装より先に更新）・更新責任（実装する本人が更新・メンターがレビュー。  
      冒頭の「更新責任：メンター」も改訂）・更新フロー（仕様更新を先頭コミットにして実装と同一 PR で提出）・メンター向けレビュー観点を明文化。  
      あわせて運用の実行手段として Claude Code スキル `/update-spec`（`.claude/skills/update-spec/SKILL.md` + `references/spec-conventions.md`）を新規作成：変更種別→更新対象ファイルのマッピング・更新後チェックリスト（一覧⇄本文整合・総数表記・アンカー整合・権限マトリクス）・新規仕様ページ作成手順（`spec/enhancements/` 想定・zensical.toml nav 追記含む）・表記規約の実例集（アンカー付与基準・各ファイルのテンプレート・Mermaid 使い分け・文体）を収録。  
      総数は実カウントで検証済み（18 API・10 画面・5 テーブル）。  
      申し送り：CLAUDE.md への Spec-first 導線はタスク 3.4、PR テンプレートへの反映はタスク 3.2 で実施。
- [x] **1.3 Springdoc OpenAPI と api-spec.md の整合確認**
  - 状態：完了
  - 内容：`/v3/api-docs`（Springdoc）の出力と `api-spec.md` を突き合わせ、Swagger UI の参照方法を `spec/index.md` に掲載する。
  - メモ：bootRun + curl で `/v3/api-docs` を取得し全 18 エンドポイントを突合。  
      パス・メソッド・ステータスコード（POST 系 201）・リクエスト/レスポンススキーマ・バリデーション制約はすべて一致。  
      差分 2 件を仕様側に反映：①ページネーションレスポンスの未記載フィールド（`numberOfElements`/`pageable`/`sort`/`empty`）を §共通に補完、②日時フォーマット規約（ISO 8601 ローカル日時・オフセットなし・小数秒可変・オフセット付き入力は 400）を実 API 検証のうえ §共通に新設（1.1 申し送りの動的検証を完了）。  
      OpenAPI 自動生成の制限（`@CurrentUser`/`Pageable` のクエリパラメータ化・エラーレスポンスの一律表示・enum 非表示）は `spec/index.md` の注意書きに明記。  
      申し送り：springdoc 向けアノテーション付与（`@Parameter(hidden=true)` 等）による OpenAPI 出力の改善はコード変更を伴うため別タスク候補。
- [x] **1.4 ドメインルール・用語集の spec への集約**
  - 状態：完了
  - 内容：旧計画（`03_SAMPLE_SERVICE_DOMAIN.md`、git 履歴参照）に残っていた恒久的なドメイン知識（ユースケース一覧・ロール定義・学習者拡張領域）を `spec/requirements.md` または新規ページへ移植する。
  - メモ：git 履歴（`8346f18^`）の旧 03 全文と `requirements.md` を突合した結果、サービス概要・採用理由・機能スコープ・学習者拡張領域・ロール定義・用語定義は移植済みであることを確認（新規ページは作成不要と判断）。  
      残ギャップ 2 件を `requirements.md` に反映：①「主要ユースケース一覧」（UC-01〜08 の集約表）を新設し、各 UC 見出しに明示アンカー（`{ #uc-01 }` 等。  
      日本語見出しはアンカー非生成のため）を付与、`api-spec.md` の UC-05 参照をアンカーリンク化。  
      ②「技術マッピング」（ARCHITECTURE.md レイヤー × BookFlow 実装の対応。  
      S3/DynamoDB/Lambda は拡張課題の実装先と明記）を移植。  
      旧 03 の ER 簡易図・API 一覧・画面構成は `er-diagram.md` / `api-spec.md` / `screen-spec.md` が正（1.1・1.3 で実装と突合済み）のため移植対象外。

## カテゴリ 2：学習者ガイドの完成

旧 Phase 2 カテゴリ 7 で未着手のままスキップされた `Docs/guide/` のプレースホルダー（`<!-- Batch 5 で記述 -->`）を解消する。

- [x] **2.1 getting-started.md の完成・読みやすさ改善**
  - 状態：完了
  - 内容：推奨ホストスペック・動作確認手順・よくあるトラブルの未記入セクションを記述。  
      手順をステップ構成 + OS 別コンテンツタブ + admonition で再構成し、サイトのナビゲーションにも表示されるよう `zensical.toml` を修正。
- [x] **2.2 ai-tools-guide.md の本文作成**
  - 状態：完了
  - 内容：Claude Code（セットアップ・`CLAUDE.md` 連携・DevContainer 内での使い方・効果的なプロンプトの書き方）、状況別の活用チェックリスト（STEP-03 の回答フォームを兼ねる）、禁止事項（機密情報入力禁止・無検証コミット禁止 等）を記述する。
  - メモ：対象 AI ツールを Claude Code のみに変更（ユーザー判断）。  
      これに伴い GitHub Copilot の記載をリポジトリ横断で削除（`Docs/index.md`・`PROJECT_PLAN.md`・`ARCHITECTURE.md`（図・表は Claude Code に置換）・`guide/index.md`・`troubleshooting.md` のプレースホルダー。  
      ADR-002 は過去の意思決定の記録のため対象外）。  
      ガイドは「Claude Code とは／セットアップ（DevContainer 組み込み済み・`~/.claude` マウントによる認証共有）／基本的な使い方／効果的なプロンプトの書き方／活用チェックリスト（STEP-03 回答フォーム・明示アンカー `{ #checklist }`）／禁止事項」で構成。  
      禁止事項はタスク 3.5 で AI 利用ポリシーとして正式化予定。  
      STEP-03 の課題名は「AI ツール導入・活用」と表記（タスク 4.1 の curriculum.md 作成時に整合させる）。
- [x] **2.3 coding-conventions.md の本文作成**
  - 状態：完了
  - 内容：共通方針（Conventional Commits・ブランチ命名）、FE 規約（ADR-001〜010 反映）、BE 規約（4 層アーキテクチャ・ADR-011〜019 反映）、テスト規約（Vitest + Playwright + MSW / JUnit 5 + H2 + Mockito）を記述する。
  - メモ：規約は ADR の引き写しではなく、実装・設定ファイル（`oxlint.json`・`build.gradle.kts`・`checkstyle.xml`・実コード）から抽出した「実際に守られているルール + 実在ファイルからのコード例」で構成（採用理由は各 ADR へリンク）。  
      冒頭に「迷ったら既存コードに合わせる」原則を明記。  
      FE は Server Actions パターン（`xxxAction` 命名・`'use server'` ファイルから Zod スキーマを export できない制約と `lib/schemas/` 分離）、BE は 4 層の依存方向（Mermaid 図）・DTO record + `from()`・例外の GlobalExceptionHandler 一元化・生 SQL 原則禁止・Flyway 命名を記載。  
      カバレッジは数値基準が未設定のため設けず「新規・変更コードにテスト必須」とした。  
      セクション参照用の明示アンカー（`{ #common }`・`{ #commit-pr }`）と `ai-tools-guide.md` §禁止事項への `{ #prohibited }` アンカーを付与。  
      PR 運用フロー・PR テンプレートの詳細はタスク 3.1 / 3.2 へ申し送り（本文 HTML コメントにも記載）。
- [x] **2.4 troubleshooting.md の残セクション作成**
  - 状態：完了
  - 内容：依存インストール失敗・起動/ポート競合・Flyway マイグレーション失敗・AI ツールが DevContainer 内で動かない場合、の各セクションを記述する。
  - メモ：標準環境（Windows + VS Code + Rancher Desktop + WSL2 上配置 + DevContainer 内 Claude Code）を主シナリオとして記述。  
      §DevContainer に Rancher Desktop 起因のトラブル（WSL Integration 未設定による docker.sock 接続エラー・containerd ランタイム設定・`k8s_` コンテナの注記）を追加。  
      確認コマンドは実環境で検証し、実行場所（コンテナ内 / WSL2 / Windows PowerShell）を全項目で明記（冒頭に tip も追加）。  
      コンテナ内に `ps`/`ss`/`lsof` が無いため、ポート競合は「ターミナル一覧確認 → Rebuild」「`netstat -ano`（Windows 側）」の手順とした。  
      ポート 9229 は Node デバッグではなく cognito-local である旨を明記。  
      DB リセットは `DROP SCHEMA` 方式（`docker compose down -v` は volume 全削除のため禁止と warning）。  
      各 h2 に明示アンカー（`#devcontainer`/`#install`/`#startup`/`#database`/`#ai-tools`）を付与し、getting-started.md §よくあるトラブルの表（AI ツール行も追加）と ai-tools-guide.md からの参照をアンカーリンク化。  
      あわせて getting-started.md の「backend コンテナが自動起動する」という旧構成の記述 2 箇所を現行 compose（バックエンドは開発コンテナ内で手動起動）に合わせて修正。

## カテゴリ 3：AI 駆動開発ワークフローの整備

学習者が「**ビジネス要求シート（Issue）→ AI が計画を提示 → メンター承認 → 実装 → PR → レビュー → マージ**」のサイクルを迷わず回せる状態を作る。  
開発フローは AWS Labs の **AI-DLC**（[`awslabs/aidlc-workflows`](https://github.com/awslabs/aidlc-workflows)）を**思考モデルとして**下敷きにし、成果物の出力先・対象エージェントを BookFlow の既存資産（`Docs/spec/`・`CLAUDE.md`・plan mode 等）に合わせてカスタマイズして適用する。plan-first ゲート・Spec-first・セルフレビューといった**プロセスの厳格さは簡略化しない**。  
AI-DLC は Inception（WHAT/WHY）・Construction（HOW）・Operations の 3 フェーズ、plan-first の承認ゲート、units of work（並行可能な作業単位）を柱とする方法論。

AI-DLC の `aidlc-docs/` 成果物ツリーは導入せず、成果物は既存の `Docs/spec/`（真実の源）・`Docs/guide/`・`CLAUDE.md`・Claude Code の plan mode に写像する。  
これにより既存の Spec-first ルール（`Docs/spec/` を真実の源とする）・`update-spec` スキルと衝突させず、リポジトリの Markdown-as-truth パターンに揃える。  
AI-DLC の各要素と BookFlow での実体の対応は次のとおり。

| AI-DLC の要素 | BookFlow チュートリアルでの実体 | 衝突回避の扱い |
| ------------- | ------------------------------- | -------------- |
| Inception（要件・ユーザーストーリー・受入条件） | **ビジネス要求シート**（`Docs/spec/enhancements/<課題>.md`：背景／要件／受入条件／影響範囲／AI 活用ポイント） | `aidlc-docs/inception/` は作らず既存 `Docs/spec/` に統合し、`update-spec` スキルに乗せる |
| units of work（並行可能な作業単位） | 縦切り課題 Issue ＝ `feature/<issue番号>-<short-desc>` 単位 | 既存のブランチ命名・課題粒度を流用 |
| plan-first の承認ゲート | Claude Code plan mode で AI が計画を提示 → メンター承認（第 1 ゲート）。PR レビューが第 2 ゲート | `aidlc-state.md`／`audit.md` は作らず、plan mode と Issue／PR の既存導線で代替 |
| Construction（設計・コード生成） | Spec-first で仕様更新 → 縦切り実装 → セルフレビュー | ユニット別の design ツリーは作らず、設計は既存 spec に反映 |
| Operations | CI 品質ゲート（3.6）にスコープを縮小 | フル Operations は非採用。デプロイ自動化はカテゴリ 5 で別途 |
| `CLAUDE.md`／`AGENTS.md` 連携 | `CLAUDE.md` のみを統合点とする | `AGENTS.md` は非採用（タスク 2.2 で Claude Code 専一と決定済み） |
| `aidlc-docs/` 成果物ツリー | 作成しない。`Docs/spec/`・`Docs/guide/` に集約 | 並行ドキュメントストアを作らないことが非衝突の核 |

> **Issue とシートの関係**：ビジネス要求シート（`Docs/spec/enhancements/<課題>.md`）を真実の源とし、GitHub Issue はシートをリンク参照する（内容を二重管理しない）。  
> これが「Issue の内容をファイルとしても管理可能とする」の実体。
>
> **カテゴリ 3 とカテゴリ 4 の境界**：カテゴリ 3 は**仕組み・テンプレート・ワークフロー定義**のみを扱う。  
> 課題ごとのビジネス要求シート作成はカテゴリ 4 の 4.3、ラベル設計と課題 Issue の一括登録は 4.4 が担う（カテゴリ 4 は本再構成では編集しない）。  
> 3.2 で定めた `Docs/spec/enhancements/` の様式を 4.3 が、3.3 の Issue テンプレートを 4.4 が使用する。

- [x] **3.1 開発ワークフローガイドの作成（`guide/dev-workflow.md`）**
  - 状態：完了
  - 内容：AI-DLC をベースにした BookFlow 標準フローを図解付き（Mermaid flowchart 想定）で日本語で記述する。  
      フローは ビジネス要求シート（Issue）選択 → `feature/<issue番号>-<short-desc>` ブランチ作成 → Claude Code plan mode で AI が実装計画を提示 → メンター承認（第 1 ゲート）→ Spec-first で仕様更新 → 縦切り実装 → セルフレビュー → PR 作成 → メンターレビュー（第 2 ゲート）→ マージ → Issue クローズ。  
      冒頭に AI-DLC（Inception／Construction／Operations）と本フローの写像表を掲載する。  
      `coding-conventions.md`（PR 運用フローの申し送り先）・`ai-tools-guide.md`・`spec/index.md` §Spec-first と相互リンクし、`zensical.toml` の guide nav に追記する。
  - メモ：`Docs/guide/dev-workflow.md` を新規作成。  
      冒頭に AI-DLC（Inception／Construction／Operations・plan-first ゲート）と BookFlow 実体の対応表（`{ #aidlc-mapping }`）を本ファイル §AI-DLC 写像表（136-144 行）と矛盾しない内容で掲載。  
      標準フロー（`{ #flow }`）は Mermaid `flowchart TD` で 2 つの承認ゲートを菱形ノードで表現し、各ステップを H3 で解説。  
      `coding-conventions.md#commit-pr`・`ai-tools-guide.md#checklist` / `#prohibited`・`spec/index.md#spec-first` と相互リンク（plan mode 専用アンカーが無いため `#checklist` 経由で参照）。  
      ビジネス要求シート・Issue/PR テンプレートは未作成のため本文ではリンクせず、HTML コメントで後続タスクへの申し送りのみ記載。  
      `Docs/guide/index.md` の管理ファイル一覧と `zensical.toml` の guide nav（coding-conventions と troubleshooting の間）に追記。
- [x] **3.2 ビジネス要求シート テンプレートと配置規約の確立**
  - 状態：完了
  - 内容：AI-DLC の Inception 成果物（要件・受入条件）を「学習課題 1 件＝ 1 ファイル」のビジネス要求シートとして定型化する。  
      配置は既存の `Docs/spec/enhancements/`（未作成・新設）、構成は **背景／要件／受入条件／影響範囲／AI 活用ポイント**。  
      シートを真実の源とし GitHub Issue はリンク参照する（二重管理しない）方針を明記する。  
      様式は `update-spec` スキルの表記規約に準拠させ、`.claude/skills/update-spec/references/spec-conventions.md` §5「新規仕様ページ作成手順」にビジネス要求シート用テンプレートと記述規約（日本語）を追記する作業を含める。  
      本タスクは**様式と組み込みの定義のみ**を扱い、課題ごとのシート実体はカテゴリ 4 の 4.3、一括 Issue 登録は 4.4 が作成する。
  - メモ：`Docs/spec/enhancements/index.md` を新規作成し、ディレクトリ新設・配置規約（1 課題 1 ファイル）・原則（シート=真実の源、Issue はリンク参照）・シート一覧（プレースホルダー、4.3 で追記）を記述。  
      テンプレート本体は実態調査の結果、`spec-conventions.md` に「§5」見出しが存在せず「新規仕様ページの作成手順」は `SKILL.md` 側の §5 にあったため、`spec-conventions.md`「## 各ファイルの記述フォーマット」配下に `### enhancements/<課題>.md — ビジネス要求シートのテンプレート`（5 節ぴったり・受入条件はチェックリスト形式）として新設し、`SKILL.md` §5 からそこへ誘導する形に整理（三重管理を避けるため内容はテンプレート本体＝spec-conventions.md、原則・一覧＝enhancements/index.md、誘導のみ＝SKILL.md に役割分割）。  
      `SKILL.md` §2 マッピング表にもエンハンス課題の行を追加。  
      `Docs/spec/index.md` 管理ファイル一覧表・`zensical.toml` nav（`仕様 (Spec)`）に `spec/enhancements/index.md` を追記。  
      Zensical ビルド検証は本環境の docs コンテナが起動せず（`No pyproject.toml found`）実施不可（環境要因、申し送り）。  
      `dev-workflow.md` の Issue テンプレ申し送りコメントは 3.3 未完のため未変更。
- [x] **3.3 Issue テンプレートの整備（ビジネス要求シート連携）**
  - 状態：完了
  - 内容：`.github/ISSUE_TEMPLATE/` に必須課題用・選択課題用の 2 種の Issue Form を作成する。  
      各 Form に 対応するビジネス要求シート（`Docs/spec/enhancements/<課題>.md`）へのリンク欄・ゴール・前提条件・完了条件（受入条件はシート参照）・AI 活用ヒント・推定工数を設ける。  
      Issue 本文は要約＋シートへのリンクとし、詳細はシート側を真実の源とする。  
      3.2 の配置規約・カテゴリ 4 の 4.4 のラベル設計と整合させる（実際の一括登録は 4.4）。
  - メモ：`required-task.yml`（必須課題（STEP）用、`labels: [required]`）・`optional-task.yml`（選択課題（エンハンス）用、`labels: [optional]`）を新規作成。  
      共通フィールドは「対応する要件ドキュメント／ビジネス要求シートへのリンク（必須課題は `curriculum.md` 該当 STEP または `enhancements/<課題>.md`、選択課題は `enhancements/<課題>.md`）・ゴール・前提条件・完了条件（詳細はドキュメント/シート参照と明記）・AI 活用ヒント・推定工数（半日／1日／2〜3日／1週間以上）」。  
      選択課題用には補助項目として難易度（Beginner/Intermediate/Advanced）ドロップダウンを追加し、対応する `level:*` ラベルは 4.4 でメンターが付与する旨を選択肢説明に明記。  
      `required`/`optional` ラベルはフォーム種別で一意に決まるため先行宣言、`level:*`/`type:*`/`sequential`/`in-progress` 等の体系整備・付与は 4.4 へ申し送り。  
      `config.yml`（`blank_issues_enabled: false`）を追加し自由記述 Issue を無効化。  
      `dev-workflow.md` §1（旧プレースホルダーコメント）を Issue テンプレートからの起票案内＋`spec/enhancements/index.md` への参照に置き換え、`enhancements/index.md` にも対応する Issue Form（選択課題）からの起票案内を追記し相互リンク化。
- [x] **3.4 PR テンプレートの整備（plan mode・AI 活用箇所欄）**
  - 状態：完了
  - 内容：`.github/PULL_REQUEST_TEMPLATE.md` に 対応 Issue／ビジネス要求シート・実装概要・**AI ツールを使った箇所**（plan mode で提示された計画と承認の有無を含む）・**Spec-first チェック**（仕様更新を先頭コミットにしたか）・動作確認結果・レビュー観点の記入欄を設ける。  
      3.1 のフロー（第 2 ゲート＝ PR レビュー）と 3.5 の AI 利用ポリシー（AI 活用箇所明記の必須化）に整合させる。
  - メモ：`.github/PULL_REQUEST_TEMPLATE.md` を新規作成（対応 Issue／ビジネス要求シート・実装概要・AI ツールを使った箇所〈必須・plan mode 計画＋メンター承認の有無＝第1ゲート〉・Spec-first チェック・動作確認結果・セルフレビュー〈coding-conventions.md §commit-pr のミラー〉・レビュー観点の7セクション構成。  
      受入条件はビジネス要求シート／Issue 側を真実の源としリンク参照に留め、再掲しない。  
      GitHub.com 上で表示されるため mkdocs の明示アンカー（`{ #x }`）は効かず、リンクはリポジトリ相対のファイルパスのみとした。  
      あわせて「PR の内容も AI に作らせる」というユーザー方針に基づき、PR 文面の下書き生成スキル `/draft-pr`（`.claude/skills/draft-pr/SKILL.md`）を新規作成：本スキルはテンプレート様式に沿った PR タイトル・本文の生成・提示のみを行い、コミット・push・PR 作成（gh）は行わない（本リポジトリには gh / GitHub MCP は未導入のため）。  
      自動充填対象（実装概要・対応 Issue・Spec-first チェック＝先頭コミットの履歴検証）と、人が確認すべき項目（メンター承認の有無・動作確認結果・セルフレビュー）を明確に分離し、AI が断定しない設計とした（学習ガードレール）。  
      様式の二重管理を避けるため `references/` は作成せず、`PULL_REQUEST_TEMPLATE.md` 本体を唯一の真実の源とした。  
      プレースホルダー2件を修正：`dev-workflow.md` §7 のコメントを実リンク＋ `/draft-pr` 案内に置換、`coding-conventions.md` §commit-pr の古い「タスク 3.2」表記を整理。  
      申し送り：PR 作成の AI 駆動運用は `/draft-pr` で対応済みのため、3.5 の `CLAUDE.md` 導線整備では PR ワークフローを再定義せず `/draft-pr` を参照すること。
- [x] **3.5 AI 利用ポリシーの恒久文書化と CLAUDE.md の AI-DLC 導線整備**
  - 状態：完了
  - 内容：（旧 3.4 ＋ 3.5 を統合）① `guide/ai-tools-guide.md` の一節として AI 利用ポリシーを正式化する（利用範囲：補完・解説・テスト／ドキュメント生成は ○、機密情報入力は ✗／生成コードの責任はマージした開発者が負う／PR への AI 活用箇所明記の必須化。  
      2.2 §禁止事項と連携）。  
      ② `CLAUDE.md` に AI-DLC 前提の開発導線を追記する（`Docs/spec/` を真実の源とする参照導線・plan mode で計画提示 → 承認するゲート運用・縦切り実装の標準パターン・検証コマンド（テスト・lint）・Spec-first ルール・`dev-workflow.md` へのリンク）。  
      `AGENTS.md` は導入しない（Claude Code 専一・タスク 2.2 の決定に従う）旨を `CLAUDE.md` に 1 行明記する。
  - メモ：`ai-tools-guide.md` §禁止事項（`{ #prohibited }`）を「AI 利用ポリシー」に拡充。  
      旧プレースホルダーコメントを削除し、利用範囲の ○/✗ 表（補完・解説・テスト/ドキュメント生成＝○、機密情報入力・無検証コミット＝✗）・既存3 admonition・PR への AI 活用箇所明記必須化（PR テンプレート §AI ツールを使った箇所への導線）を追記。  
      アンカー `{ #prohibited }` は `coding-conventions.md`・`dev-workflow.md` からの参照が壊れないよう維持。  
      `CLAUDE.md` に新セクション「AI 駆動開発の進め方」を追加：Spec-first・plan-first 承認ゲート・縦切り実装・PR（`/draft-pr`）の要点をリンク中心で記述し、`AGENTS.md` 非採用を1行明記。  
      写像表の実体は `dev-workflow.md` を唯一の源とし、CLAUDE.md 側は重複させていない。  
      申し送り：ワークフローファイル（AI-DLC `aidlc-rules/`）のインストールはタスク 3.7 として新設（本タスクの範囲外）。
- [x] **3.6 CI 品質ゲートの確認・整備**
  - 状態：完了
  - 内容：`ci-frontend` / `ci-backend` / `security-scan` ワークフローの動作確認と green 化、ブランチ保護（CI 必須・1 名以上 Approve）の設定。  
      AI-DLC の Operations フェーズに相当する自動品質ゲートとして位置づける。  
      `security-scan` は未設定のため新規作成が必要（既存は `ci-frontend.yml`／`ci-backend.yml`／`docs.yml`）。
  - メモ：`.github/workflows/security-scan.yml` を新規作成（Trivy `scan-type: fs`、ジョブ id `trivy`）。  
      当初は CodeQL + dependency-review-action を検討したが、リポジトリ（`Bizarress/AI-Development-Tutorial`）の公開設定が不明で、private + GHAS 無しだと毎回失敗し学習者の PR を全ブロックしてしまうため不採用（将来 public 化・GHAS 導入時の選択肢として申し送り）。  
      Trivy は GHAS 不要で public/private いずれでも動作し、Java25 環境での CodeQL ビルド追随リスクも回避できる。  
      `scanners: vuln`（依存関係の既知脆弱性、`severity: HIGH,CRITICAL` + `ignore-unfixed: true`）をブロッキング（`exit-code: 1`）、`scanners: misconfig`（Dockerfile/compose/ワークフロー等の設定ミス）は `continue-on-error: true` で非ブロッキング（参考情報）に分離。  
      理由：misconfig はローカルで Trivy を実行できず（本開発環境ではバイナリ取得が制限され検証不可）、`.devcontainer/docker-compose.yml` に healthcheck 未設定のサービスがあるなど初回実行で未知の HIGH 検出により学習者 PR を全ブロックするリスクを排除できなかったため。初回 Actions 実行結果を見てメンターが misconfig 側のブロッキング化や閾値調整を判断する。  
      注：Trivy `fs` の依存スキャンは FE（`pnpm-lock.yaml`）が対象。BE は `dependencyLocking` 未導入で `gradle.lockfile` が存在しないため、現状 Gradle 依存は実質スキャン対象外（このタスクでは Gradle locking 自体は導入しない。必要なら別タスク）。  
      vuln ゲートを green 化するため、`pnpm audit --audit-level high` で検出した fixable な CRITICAL/HIGH（vitest の脆弱性、推移的依存 esbuild の脆弱性）を解消：`vitest` を既存 semver 範囲内（`^3.2.6`）で 3.2.4→3.2.6 に更新、`esbuild` は `pnpm-workspace.yaml` の `overrides` で `>=0.28.1` に固定（package.json への直接依存ではないため override が必要）。これは依存修正として CI/ドキュメント変更とは別コミットに分離する。  
      `ci-frontend.yml` に `pnpm format:check`（oxfmt --check）ステップを Lint の直後に追加し、`PULL_REQUEST_TEMPLATE.md` の動作確認欄にも反映（ADR-010 で「CI のフォーマットチェックは `oxfmt --check .` で実施する」と定義済みだが未導入だった差分）。  
      導入時、既存コード71ファイルが oxfmt のデフォルト書式（ダブルクォート・セミコロンあり）に未準拠だったため `pnpm format` で一括整形（ロジック変更なし。別コミットに分離）し `format:check` を green 化。  
      `ci-backend.yml` は既存で `./gradlew test`（テスト18本）→ `spotlessCheck` → `checkstyleMain` を実行済みのため変更不要（新規 backend CI ジョブは不要と判断）。  
      `dev-workflow.md` §8（第2ゲート）に、ブランチ保護で必須化する status check 名（`CI Frontend / ci`・`CI Backend / ci`・`Security Scan / trivy`）と Approve 1名以上の admonition を追加（MkDocs 形式 `!!! note` に統一）。  
      CODEOWNERS は学習リポジトリには不要と判断し作成せず。  
      申し送り：ブランチ保護ルールの実設定（GitHub Settings）はリポジトリ管理者作業のため本タスクの範囲外。`security-scan` の vuln/misconfig 双方の実 Actions 実行結果（`aquasecurity/trivy-action@0.33.1` のタグ解決含む）はメンターが初回確認すること（misconfig が常に green であれば、必須 status check への追加・ブロッキング化を検討）。  
      ローカル検証は `pnpm audit --audit-level high`（FE のみ。Trivy の DB とは異なるため参考情報）で clean を確認済みだが、Trivy vuln ゲート自体の green は未確認（初回 Actions 実行で確認）。  
      vuln はブロッキングのため、今後も fixable な推移的 CVE が出るたびに同様の依存修正が必要になる。メンテナンス負荷が高い場合は misconfig と同様に非ブロッキング化を検討する余地がある旨を留意点として残す。  
      Playwright E2E の CI 化は見送り（別タスク候補）。  
      security-scan の実 Actions 実行は本環境からトリガー不可のため、GitHub 上での初回実行確認をメンターに申し送り。
- [x] **3.7 AI-DLC 実ファイルの取り込み・再構成・台帳化・上流同期**
  - 状態：完了
  - 内容：[AI-DLC 概説資料（aidlc-overview.html）](./aidlc-overview.html) で提示した3案のうち「案B改良（vendoring＋再構成＋台帳＋上流同期）」を採用。3層構成で実装：  
      ①**vendoring（L1）**：公式 [`awslabs/aidlc-workflows`](https://github.com/awslabs/aidlc-workflows)（固定コミット `b19c81928bdf1b8d13856f462fcf2ede1720b4cb`、VERSION 0.1.8、MIT-0）の `aidlc-rules/aws-aidlc-rule-details/common/` 全11ファイルを `vendor/aidlc-rules/common/` に逐語コピー（出典は `vendor/aidlc-rules/PROVENANCE.md`）。`Docs/` 外・Zensical nav 外に配置。  
      ②**再構成（L2）**：思考ガードレール4ファイル（`overconfidence-prevention`・`content-validation`・`depth-levels`・`ascii-diagram-standards`）を `.claude/rules/aidlc-guardrails.md` に、`question-format-guide` を `.claude/rules/aidlc-questions.md` にBookFlow向けに翻案（`paths`フロントマターなし＝起動時auto-load）。`CLAUDE.md` §AI駆動開発の進め方・§設計書の参照先に追記のみ（上書きなし）。  
      ③**採用台帳（L3）**：`Docs/spec/aidlc-adoption.md` に全11ファイルの反映先・採用状態（rules化/参照のみ/非該当）・根拠を記載。`Docs/spec/index.md`・`zensical.toml` nav に登録。  
      ④**上流同期手順**：台帳内に diff→反映→ピン更新の手順を文書化（専用スキル・CIは設けない）。  
      非活性化ファイル（`process-overview`・`error-handling`・`session-continuity`・`terminology`・`welcome-message`・`workflow-changes`）は「簡素化」ではなく、AI-DLCワークフローエンジン（`aidlc-state.md`/`audit.md`/units）固有または既に `dev-workflow.md` で写像済みという根拠を台帳に明記。`inception/reverse-engineering.md` は今後の候補として台帳に記録のみ。

## カテゴリ 4：エンハンス要件の策定（学習課題設計）

学習者向けの課題を要件として文書化し、GitHub Issue に登録する。

- [ ] **4.1 学習カリキュラムの文書化（`guide/curriculum.md`）**
  - 状態：未着手
  - 内容：学習パスマップ（新人：STEP-01〜05 を順に必須 → 選択課題、中堅：STEP-01〜03 任意確認 → 中級以上の選択課題）と必須ステップ課題 5 件（環境構築 / コードベース把握 / AI ツール導入 / 既存機能読解 / 小規模改修）の定義を記述する。
- [ ] **4.2 選択課題カタログの策定**
  - 状態：未着手
  - 内容：Beginner / Intermediate / Advanced 各 5 件程度（例：リソース詳細表示、繰り返し予約、利用実績集計、カレンダービュー、多段階承認 等）を難易度・推定工数・対象レイヤー付きで一覧化する。
- [ ] **4.3 エンハンス要件書の作成（`spec/enhancements/`）**
  - 状態：未着手
  - 内容：選択課題ごとに要件定義（背景・要件・受入条件・影響範囲・AI 活用ポイント）を `Docs/spec/enhancements/` 配下に 1 課題 1 ファイルで作成する。
- [ ] **4.4 ラベル設計と GitHub Issue 一括登録**
  - 状態：未着手
  - 内容：ラベル体系（`required` / `optional` / `sequential` / `level:*` / `type:*` / `in-progress`）を整備し、必須 + 選択課題を Issue として一括登録する（3.3 のテンプレート使用）。
- [ ] **4.5 評価基準・レビュー観点の文書化**
  - 状態：未着手
  - 内容：完了条件チェックリスト方式の評価基準と、新人/中堅で重み付けを変えたレビュー観点表（動作確認・可読性・既存パターン整合性・テスト妥当性・AI 活用の適切さ）をメンター向けに文書化する。

## カテゴリ 5：運用・公開整備

- [ ] **5.1 運用ガイドの恒久文書化**
  - 状態：未着手
  - 内容：役割分担（オーナー / メンター / 学習者）・質問サポートフロー（Issue コメント優先）・レビュー SLA を `guide/` 配下のメンター向けページとして記述する。
- [ ] **5.2 依存更新ポリシーの運用開始**
  - 状態：未着手
  - 内容：Dependabot の有効化（pnpm / Gradle / Docker / GitHub Actions）と更新サイクル（FE・BE 月次、ベースイメージ四半期）の設定。
- [ ] **5.3 ドキュメントサイトの公開**
  - 状態：未着手
  - 内容：Zensical ビルドを GitHub Pages へデプロイする workflow を作成する（`site_url` は設定済み）。
- [ ] **5.4 学習効果測定の準備**
  - 状態：未着手
  - 内容：定量指標（課題完了数・PR サイクルタイム）と満足度アンケート（環境構築のしやすさ・難易度感・AI ツールの有用性）のフォーマットを準備する。

---

## 検討事項（未決事項）

Phase 4 のタスク遂行と並行して意思決定が必要な論点を記録する。  
ここはタスク（やること）ではなく**未決の論点**を扱うため、冒頭の全体進捗サマリには含めない。  
解決した検討事項は、結論を踏まえて冒頭の更新ルールに従い該当カテゴリ末尾にタスクとして追記する。

### 検討 A：成果物レビューをどう回すか

学習者の PR（第 2 ゲート）を誰が・どうレビューするか。

- **案 1：人力でやる** — メンターが PR をレビューする。
  - 論点：レビュー担当者を誰が務めるか／務められるか（人数・スキル・工数）。3.6 で前提化したブランチ保護「1 名以上 Approve」が成立する体制か。レビュー SLA は 5.1 で扱う。
- **案 2：AI にやらせる** — PR 作成をトリガーに GitHub Actions で成果物を自動レビューさせる。レビュー観点（ルール）は別リポジトリに配置して参照する。
  - 論点：レビュー観点リポジトリの整合（下記 追加 D）。学習者は同一リポジトリのブランチ運用（追加 C）のため、フォーク PR 特有の実行基盤制約は生じない。
- 両案は排他ではない（AI で一次レビュー → 人力で最終承認、といった併用も選択肢）。

**（参考）たたき台案 — 案 1 ＋案 2 の併用**：PR 作成をトリガーに AI が一次レビュー（規約整合・テスト有無・Spec-first 遵守・明らかな不具合といった機械的観点）し、メンターが最終 Approve（第 2 ゲート＝学習者の理解度・設計判断・AI 活用の妥当性という教育的観点）を行う。  
メンター工数が限られる学習リポジトリで、機械的チェックを AI に肩代わりさせつつ第 2 ゲートの人手承認（3.6）を残せる。3.4 PR テンプレート・3.6 CI ゲート・3.7 ガードレールと自然に接続する。  
レビュー観点（ルール）の置き場は下記 追加 D の判断（評価基準を学習者に見せるか）に依存するため、ここでは確定しない（元案は「別リポジトリ」前提だが、可視性という別軸での再検討の余地がある）。

関連：3.6（CI 品質ゲート・ブランチ保護）／5.1（レビュー SLA・役割分担）。

### 検討 B：メンテナンス方針

チュートリアル公開後の継続的な維持運用の方針。

- **エンハンスタスクの追加** — 学習課題（カテゴリ 4）を運用開始後に追加していく手順・責任者。
- **main ブランチの更新** — エンハンス機能の追加バージョン整備、ライブラリ更新、AI エージェント関連（`vendor/aidlc-rules/` の上流同期＝3.7、Claude Code 周辺）のメンテナンス。学習者の作業ベースである main の更新を、進行中の学習にどう反映するか。
- **学習者からの要望** — 要望・フィードバックの受付経路（Issue／アンケート＝5.4）と、改善への取り込みフロー。

**（参考）たたき台案**：
- エンハンス追加：3.2／3.3 の様式（ビジネス要求シート＋Issue Form）に乗せてメンターが起票。定期（四半期等）に課題カタログ（4.2）を棚卸しする。
- main 更新：5.2 Dependabot（FE・BE 月次／ベースイメージ四半期）＋ 3.7 の上流同期手順で定期化する。学習中の学習者には main 更新を強制せず、進行中の feature ブランチへの取り込みは任意、新規開始者は最新 main から始める運用とする。
- 学習者要望：受付経路を Issue／5.4 アンケートに一本化し、定期トリアージで採否を判断する（採用分は冒頭の更新ルールに従いタスク化）。

関連：3.7（AI-DLC 上流同期手順）／5.1（役割分担）／5.2（依存更新ポリシー・Dependabot）／5.4（学習効果測定）。  
既存タスクと重複する運用詳細はそれぞれの該当タスクを真実の源とし、ここでは方針レベルの未決点のみを扱う。

### 追加検討事項（整合性チェックで洗い出し）

検討 A・B の前提となる関連論点（追加 C は決定済み）。

- **追加 C（決定済み）：学習者の作業モデル** — 同一リポジトリからブランチ（`feature/<issue番号>-<short-desc>`）を生やして作業する運用に確定。これにより 3.6 のブランチ保護・「1 名以上 Approve」がそのまま成立し、フォーク PR 特有の GitHub Actions secrets・外部リポジトリ参照の制限は発生しない（検討 A 案 2 を実行基盤の面では阻害しない）。
- **追加 D：レビュー観点（評価基準）をどこに置くか — 学習者に見せるか** — 追加 C の決定で学習者はリポジトリ全体に読み取りアクセスを持つため、これは単なる「外部依存の是非」ではなく「評価される側に評価基準を見せるか」の判断になる（4.5「評価基準・レビュー観点の文書化」と直結）。
  - **in-repo（公開）**：透明・運用が単純で 3.7 の in-repo パターンとも整合するが、評価される学習者がルーブリックを読める（gaming の余地）。
  - **別リポジトリ／非公開の場所**：ルーブリックを学習者から隠せる（検討 A 案 2 の元案「別リポジトリに配置」はこの方向）が、外部リポジトリ依存と secrets・クロスリポジトリ参照の手当てが必要。
- **追加 E：リポジトリの公開／非公開の確定** — 3.6・3.7 で「公開設定が不明」と申し送られている。public/private の確定は、AI レビュー基盤・セキュリティスキャン（3.6 の CodeQL/GHAS 不採用判断）の前提となる。

---

## 受入条件（Phase 4 完了の定義）

- [ ] `Docs/spec/` が実装と一致し、Spec-first の更新ルールが明文化されている
- [ ] `Docs/guide/` 配下の未記入プレースホルダーがすべて解消されている
- [ ] PR / Issue テンプレート・ラベル・課題 Issue が登録され、新人が STEP-01 から自走で開始できる
- [ ] CI 品質ゲート（lint・テスト・セキュリティスキャン）が green で運用されている
- [ ] ドキュメントサイトが公開され、最新の Docs を参照できる
