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
pnpm test:e2e         # Playwright E2E テスト
pnpm lint             # oxlint 実行
pnpm format           # oxfmt フォーマット

# バックエンド
cd backend
./gradlew bootRun                # Spring Boot 起動（http://localhost:8080）
./gradlew test                   # JUnit テスト
./gradlew spotlessApply          # コードフォーマット
./gradlew checkstyleMain         # Checkstyle 実行

# ローカルサービス
docker compose -f .devcontainer/docker-compose.yml up -d

# ドキュメントサイト（Zensical）
# serve は devcontainer 起動時に docs サービスが自動起動（http://localhost:8000）
docker compose exec docs uv run zensical build    # 手動ビルド（site/ に出力）
```

---

## コーディング規約

- **フロントエンド**: Server Components 優先。クライアント状態は Zustand で最小限に管理。
- **バックエンド**: 4 レイヤーアーキテクチャ（domain / application / presentation / infrastructure）を厳守。
- **コミット**: Conventional Commits（`feat:`, `fix:`, `docs:` 等）
- **ブランチ**: `feature/<issue番号>-<short-desc>`

---

## 設計書の参照先

- アーキテクチャ全体: `Docs/ARCHITECTURE.md`
- 実装仕様（要件・画面・API・ER 図）: `Docs/spec/`
- 今後の計画（AI 駆動開発整備）: `Docs/plan/PHASE4_AI_DRIVEN_DEV_TASKS.md`
- ADR 一覧: `Docs/decision/`
