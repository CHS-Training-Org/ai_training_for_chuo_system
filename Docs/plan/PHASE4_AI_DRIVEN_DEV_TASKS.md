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
| 3. AI 駆動開発ワークフローの整備           | 6        | 0      | ░░░░░░░░░░ 0%   |
| 4. エンハンス要件の策定（学習課題設計）    | 5        | 0      | ░░░░░░░░░░ 0%   |
| 5. 運用・公開整備                          | 4        | 0      | ░░░░░░░░░░ 0%   |
| **合計**                                   | **23**   | **8**  | **35%**         |

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
開発フローは AWS Labs の **AI-DLC**（[`awslabs/aidlc-workflows`](https://github.com/awslabs/aidlc-workflows)）を**思考モデルとして**下敷きにし、チュートリアル学習向けに簡素化して適用する。  
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

- [ ] **3.1 開発ワークフローガイドの作成（`guide/dev-workflow.md`）**
  - 状態：未着手
  - 内容：AI-DLC をベースにした BookFlow 標準フローを図解付き（Mermaid flowchart 想定）で日本語で記述する。  
      フローは ビジネス要求シート（Issue）選択 → `feature/<issue番号>-<short-desc>` ブランチ作成 → Claude Code plan mode で AI が実装計画を提示 → メンター承認（第 1 ゲート）→ Spec-first で仕様更新 → 縦切り実装 → セルフレビュー → PR 作成 → メンターレビュー（第 2 ゲート）→ マージ → Issue クローズ。  
      冒頭に AI-DLC（Inception／Construction／Operations）と本フローの写像表を掲載する。  
      `coding-conventions.md`（PR 運用フローの申し送り先）・`ai-tools-guide.md`・`spec/index.md` §Spec-first と相互リンクし、`zensical.toml` の guide nav に追記する。
- [ ] **3.2 ビジネス要求シート テンプレートと配置規約の確立**
  - 状態：未着手
  - 内容：AI-DLC の Inception 成果物（要件・受入条件）を「学習課題 1 件＝ 1 ファイル」のビジネス要求シートとして定型化する。  
      配置は既存の `Docs/spec/enhancements/`（未作成・新設）、構成は **背景／要件／受入条件／影響範囲／AI 活用ポイント**。  
      シートを真実の源とし GitHub Issue はリンク参照する（二重管理しない）方針を明記する。  
      様式は `update-spec` スキルの表記規約に準拠させ、`.claude/skills/update-spec/references/spec-conventions.md` §5「新規仕様ページ作成手順」にビジネス要求シート用テンプレートと記述規約（日本語）を追記する作業を含める。  
      本タスクは**様式と組み込みの定義のみ**を扱い、課題ごとのシート実体はカテゴリ 4 の 4.3、一括 Issue 登録は 4.4 が作成する。
- [ ] **3.3 Issue テンプレートの整備（ビジネス要求シート連携）**
  - 状態：未着手
  - 内容：`.github/ISSUE_TEMPLATE/` に必須課題用・選択課題用の 2 種の Issue Form を作成する。  
      各 Form に 対応するビジネス要求シート（`Docs/spec/enhancements/<課題>.md`）へのリンク欄・ゴール・前提条件・完了条件（受入条件はシート参照）・AI 活用ヒント・推定工数を設ける。  
      Issue 本文は要約＋シートへのリンクとし、詳細はシート側を真実の源とする。  
      3.2 の配置規約・カテゴリ 4 の 4.4 のラベル設計と整合させる（実際の一括登録は 4.4）。
- [ ] **3.4 PR テンプレートの整備（plan mode・AI 活用箇所欄）**
  - 状態：未着手
  - 内容：`.github/PULL_REQUEST_TEMPLATE.md` に 対応 Issue／ビジネス要求シート・実装概要・**AI ツールを使った箇所**（plan mode で提示された計画と承認の有無を含む）・**Spec-first チェック**（仕様更新を先頭コミットにしたか）・動作確認結果・レビュー観点の記入欄を設ける。  
      3.1 のフロー（第 2 ゲート＝ PR レビュー）と 3.5 の AI 利用ポリシー（AI 活用箇所明記の必須化）に整合させる。
- [ ] **3.5 AI 利用ポリシーの恒久文書化と CLAUDE.md の AI-DLC 導線整備**
  - 状態：未着手
  - 内容：（旧 3.4 ＋ 3.5 を統合）① `guide/ai-tools-guide.md` の一節として AI 利用ポリシーを正式化する（利用範囲：補完・解説・テスト／ドキュメント生成は ○、機密情報入力は ✗／生成コードの責任はマージした開発者が負う／PR への AI 活用箇所明記の必須化。  
      2.2 §禁止事項と連携）。  
      ② `CLAUDE.md` に AI-DLC 前提の開発導線を追記する（`Docs/spec/` を真実の源とする参照導線・plan mode で計画提示 → 承認するゲート運用・縦切り実装の標準パターン・検証コマンド（テスト・lint）・Spec-first ルール・`dev-workflow.md` へのリンク）。  
      `AGENTS.md` は導入しない（Claude Code 専一・タスク 2.2 の決定に従う）旨を `CLAUDE.md` に 1 行明記する。
- [ ] **3.6 CI 品質ゲートの確認・整備**
  - 状態：未着手
  - 内容：`ci-frontend` / `ci-backend` / `security-scan` ワークフローの動作確認と green 化、ブランチ保護（CI 必須・1 名以上 Approve）の設定。  
      AI-DLC の Operations フェーズに相当する自動品質ゲートとして位置づける。  
      `security-scan` は未設定のため新規作成が必要（既存は `ci-frontend.yml`／`ci-backend.yml`／`docs.yml`）。

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

## 受入条件（Phase 4 完了の定義）

- [ ] `Docs/spec/` が実装と一致し、Spec-first の更新ルールが明文化されている
- [ ] `Docs/guide/` 配下の未記入プレースホルダーがすべて解消されている
- [ ] PR / Issue テンプレート・ラベル・課題 Issue が登録され、新人が STEP-01 から自走で開始できる
- [ ] CI 品質ゲート（lint・テスト・セキュリティスキャン）が green で運用されている
- [ ] ドキュメントサイトが公開され、最新の Docs を参照できる
