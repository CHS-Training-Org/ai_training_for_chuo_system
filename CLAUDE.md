# CLAUDE.md — BookFlow リポジトリコンテキスト

社内 AI 駆動開発チュートリアル。施設・備品予約システム **BookFlow** の学習用モノレポ。

---

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | Next.js 15（App Router） / React 19 / TypeScript |
| スタイリング | Tailwind CSS v4 |
| UI コンポーネント | shadcn/ui |
| 認証クライアント | Better Auth + Cognito |
| フォーム | React Hook Form + Zod |
| 状態管理 | Zustand（クライアント最小限） |
| バックエンド | Spring Boot 4.0 / Java 25 |
| ビルドツール | Gradle（Kotlin DSL） |
| ORM | Spring Data JPA（PostgreSQL） |
| DB マイグレーション | Flyway |
| API ドキュメント | Springdoc OpenAPI |
| 認証・認可 | Spring Security + OAuth2 Resource Server |
| テスト（FE） | Vitest + Playwright + MSW |
| テスト（BE） | JUnit 5 + H2 + Mockito |
| Lint / Format | oxlint + oxfmt（FE）/ Spotless + Checkstyle（BE） |
| パッケージ管理 | pnpm（FE） / Gradle wrapper（BE） |
| ドキュメントサイト | Zensical / uv（Python） |

---

## ディレクトリ構成

```
.devcontainer/          # DevContainer + Docker Compose
.github/                # CI workflows / Issue・PR テンプレート
frontend/               # Next.js App Router（BFF + UI）
  src/app/              # ページ・レイアウト
  src/components/       # UI コンポーネント
  src/server/actions/   # Server Actions（BFF 層）
  src/lib/              # 型定義・auth・定数
  tests/unit/           # Vitest テスト
  tests/e2e/            # Playwright テスト
backend/                # Spring Boot
  src/main/java/com/example/bookflow/
    domain/             # エンティティ・Repository インターフェース
    application/        # ユースケース Service
    presentation/       # Controller・DTO
    infrastructure/     # JPA 実装・外部連携
  src/main/resources/
    db/migration/       # Flyway SQL
Docs/                   # 設計ドキュメント・ADR（Zensical でサイト化）
zensical.toml           # ドキュメントサイト設定
pyproject.toml          # Python / uv 管理（docs ビルド用）
```

---

## よく使うコマンド

```bash
# フロントエンド
cd frontend
pnpm dev              # 開発サーバー起動（http://localhost:3000）
pnpm build            # プロダクションビルド
pnpm test             # Vitest ユニットテスト
pnpm test <pattern>   # 単一ファイル/パターンのみ実行（例: pnpm test reservations）
pnpm test:e2e         # Playwright E2E テスト
pnpm lint             # oxlint 実行
pnpm format           # oxfmt フォーマット
pnpm format:check     # フォーマット検証のみ（CI で使用）

# バックエンド
cd backend
./gradlew bootRun                # Spring Boot 起動（http://localhost:8080）
./gradlew test                   # JUnit テスト
./gradlew test --tests "*ReservationServiceTest"  # 特定テストクラスのみ実行
./gradlew spotlessApply          # コードフォーマット
./gradlew checkstyleMain         # Checkstyle 実行

# ローカルサービス
docker compose -f .devcontainer/docker-compose.yml up -d

# ドキュメントサイト（Zensical）
# serve は devcontainer 起動時に docs サービスが自動起動（http://localhost:8000）
docker compose exec docs uv run zensical build    # 手動ビルド（site/ に出力）
```

---

## ローカル環境セットアップ（Gotcha）

```bash
# フロントエンド環境変数の初期化
cp frontend/.env.local.example frontend/.env.local

# Cognito ユーザープール作成（初回のみ）
bash scripts/provision-cognito.sh
# → 出力された COGNITO_USER_POOL_ID / COGNITO_CLIENT_ID を frontend/.env.local に記入
```

**ブラウザサインインはローカルでは動作しない**（cognito-local が http:// のため Better Auth の OAuth リダイレクトが失敗する）。  
動作確認はサインイン画面の「開発専用ロール別ログインボタン」（`NODE_ENV !== 'production'` 時のみ表示、`src/server/actions/dev-auth.ts`）を使うこと。

---

## コーディング規約

- **フロントエンド**: Server Components 優先。クライアント状態は Zustand で最小限に管理。
- **バックエンド**: 4 レイヤーアーキテクチャ（domain / application / presentation / infrastructure）を厳守。
- **コミット**: Conventional Commits（`feat:`, `fix:`, `docs:` 等）
- **ブランチ**: `feature/<GitHubユーザー名>/<issue番号>-<short-desc>`
- **Docs frontmatter**：`Docs/` 配下の全 Markdown は OKF 準拠 frontmatter（`type` 必須）を持つ。スキーマ・`type` 語彙は `Docs/decision/ADR-021-okf-frontmatter-adoption.md` および `Docs/decision/README.md` を参照。

---

## AI 駆動開発の進め方

本リポジトリは AWS Labs の **AI-DLC エンジン**（[`awslabs/aidlc-workflows`](https://github.com/awslabs/aidlc-workflows)、VERSION 0.1.8）を **BookFlow の標準ワークフローとして採用**し、Claude Code を前提とした開発フローを実装しています。`AGENTS.md` は導入しません（Claude Code 専一）。

- **AI-DLC エンジン**：`.claude/skills/aidlc/SKILL.md`（`/aidlc` スキル）が BookFlow 翻案版オーケストレーション。ソフトウェア開発要求に対して INCEPTION（要件分析・設計）→ CONSTRUCTION（実装・テスト）→ OPERATIONS（CI）の 3 フェーズを駆動する。`/aidlc` の明示起動、または「AI-DLC で進めて」等の意図指定があったときに発動し（指定のない小修正・質問では発動しない）、各ステージで承認ゲートを挟む。
- **Spec-first**：実装より先に `Docs/spec/` を更新する。これが真実の源。`/update-spec` スキルで更新対象を特定する。
- **plan-first**：`/aidlc` 起動時、通常（agent）モードでエンジンが INCEPTION フェーズを実行し Workflow Planning を提示する。学習者自身がチャットで計画に納得したことを示してから実装に進む（メンターの承認は不要）。
- **縦切り実装**：フロントエンド・バックエンドにまたがる変更は機能単位でまとめて実装する（units of work = 縦切り Issue 単位）。
- **PR**：`/draft-pr` スキルで下書きを生成し、AI 活用箇所を明記する。PR テンプレートのセルフレビュー項目を満たしたら自分でマージする（メンターレビューは必須ではない。メンターは任意のタイミングで Issue・PR にコメントする）。
- 検証は「よく使うコマンド」の lint・テストを実行する。
- **思考ガードレール**：過信防止・出力粒度・コンテンツ検証・確認質問の様式は `.claude/rules/`（`aidlc-guardrails.md` / `aidlc-questions.md`）に定義する。
- **AI-DLC 状態管理**：進捗トラッカーは `Docs/spec/aidlc-state.md`、監査ログは `Docs/spec/aidlc-audit.md`（追記専用）。

標準フローの詳細は [`Docs/guide/dev-workflow.md`](Docs/guide/dev-workflow.md)、AI 利用ポリシーは [`Docs/guide/ai-tools-guide.md`](Docs/guide/ai-tools-guide.md#prohibited) を参照。

---

## 設計書の参照先

- リポジトリ概要（目的・対象者・役割・用語集）: `Docs/spec/overview.md`
- アーキテクチャ全体: `Docs/ARCHITECTURE.md`
- 実装仕様（要件・画面・API・ER 図）: `Docs/spec/`
- ADR 一覧: `Docs/decision/`
- AI-DLC 採用台帳（32 ファイル全カバレッジ）: `Docs/spec/aidlc-adoption.md`
- AI-DLC 採用転換 ADR: `Docs/decision/ADR-020-aidlc-engine-adoption.md`
- OKF frontmatter 部分採用 ADR: `Docs/decision/ADR-021-okf-frontmatter-adoption.md`
- AI-DLC エンジン本体（`/aidlc` スキル）: `.claude/skills/aidlc/SKILL.md`
- AI-DLC 進捗トラッカー: `Docs/spec/aidlc-state.md`
- AI-DLC 監査ログ: `Docs/spec/aidlc-audit.md`
