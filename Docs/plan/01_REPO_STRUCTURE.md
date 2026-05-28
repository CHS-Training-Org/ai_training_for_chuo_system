# 01 — リポジトリ構造設計

> 対象読者：メンター・リポジトリ管理者  
> 参照：[ARCHITECTURE.md](../ARCHITECTURE.md) / [PROJECT_PLAN.md](../PROJECT_PLAN.md)

---

## ディレクトリ構成（全体）

```
ai-development-tutorial/          # リポジトリルート
├── .devcontainer/                # DevContainer 設定
│   ├── devcontainer.json
│   └── docker-compose.yml
├── .github/                      # GitHub 設定
│   ├── ISSUE_TEMPLATE/
│   │   ├── required_task.md      # 必須ステップ課題テンプレート
│   │   └── optional_task.md     # 選択課題テンプレート
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── CODEOWNERS
│   └── workflows/
│       ├── ci-frontend.yml
│       ├── ci-backend.yml
│       └── security-scan.yml
├── frontend/                     # Next.js（BFF + フロントエンド）
│   ├── src/
│   │   ├── app/                  # App Router（ページ・レイアウト）
│   │   ├── components/           # UI コンポーネント
│   │   ├── server/               # Server Actions / API Routes（BFF）
│   │   └── lib/                  # 共通ロジック・型定義
│   ├── tests/                    # Vitest / Playwright
│   ├── public/
│   ├── next.config.ts
│   ├── package.json
│   └── tsconfig.json
├── backend/                      # Spring Boot（バックエンド）
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/example/bookflow/
│   │   │   │   ├── domain/       # ドメインモデル・Repository
│   │   │   │   ├── application/  # ユースケース（Service）
│   │   │   │   ├── presentation/ # Controller・DTO
│   │   │   │   └── infrastructure/ # 外部連携（Bedrock, S3 等）
│   │   │   └── resources/
│   │   │       ├── application.yml
│   │   │       └── db/migration/ # Flyway マイグレーション
│   │   └── test/
│   ├── build.gradle.kts          # Gradle（ビルドツール）
│   ├── settings.gradle.kts
│   └── gradlew
├── infra/                        # IaC（Terraform）※将来拡張用
│   └── .gitkeep
├── scripts/                      # ユーティリティスクリプト
│   ├── seed.sql                  # 初期データ投入
│   └── setup-local.sh            # ローカル初期セットアップ
├── Docs/                         # 設計ドキュメント
│   ├── ARCHITECTURE.md
│   ├── PROJECT_PLAN.md
│   ├── plan/                     # 本計画書セット
│   ├── spec/                     # 仕様書
│   ├── guide/                    # 学習者向けガイド
│   └── decision/                 # ADR
├── README.md
├── CONTRIBUTING.md
├── CLAUDE.md                     # Claude Code (CLI) 用コンテキスト
├── .editorconfig
├── .gitignore
└── LICENSE
```

---

## 主要ディレクトリ詳細

### `frontend/`（Next.js）

| ディレクトリ | 内容 |
|------------|------|
| `src/app/` | App Router のページ・レイアウト・loading/error UI |
| `src/components/` | 再利用可能な UI コンポーネント（Server / Client Components）|
| `src/server/` | Server Actions・API Routes（BFF層。バックエンドへのプロキシ・認証トークン管理）|
| `src/lib/` | 型定義・バリデーション・定数・クライアント設定 |
| `tests/` | Vitest（ユニット）+ Playwright（E2E）|

**パッケージマネージャ：pnpm**（高速・ディスク効率）

### `backend/`（Spring Boot / Java 25）

| ディレクトリ | 内容 |
|------------|------|
| `domain/` | エンティティ・値オブジェクト・Repository インターフェース |
| `application/` | ユースケースクラス（Service）。ドメインロジックを呼び出す |
| `presentation/` | REST Controller・リクエスト/レスポンス DTO |
| `infrastructure/` | JPA 実装・Bedrock クライアント・S3 クライアント等 |
| `resources/db/migration/` | Flyway SQL マイグレーションファイル（`V001__init.sql` 等）|

**ビルドツール：Gradle（Kotlin DSL）**（`./gradlew` でラッパー実行。ADR-011 参照）

### `.devcontainer/`（DevContainer フルスタック一括）

#### 起動サービス一覧

| サービス | イメージ | ポート | 役割 |
|---------|---------|--------|------|
| `frontend` | Node.js 22 | 3000 | Next.js dev server |
| `backend` | Eclipse Temurin 25 | 8080 | Spring Boot |
| `postgres` | postgres:16 | 5432 | RDB |
| `localstack` | localstack/localstack | 4566 | S3・DynamoDB・Lambda・API GW |
| `cognito-local` | jagregory/cognito-local | 9229 | Cognito モック |

#### `devcontainer.json` の主要設定

```json
{
  "name": "BookFlow Full Stack",
  "dockerComposeFile": "docker-compose.yml",
  "service": "frontend",
  "workspaceFolder": "/workspace",
  "features": {
    "ghcr.io/devcontainers/features/java:1": { "version": "25" },
    "ghcr.io/devcontainers/features/node:2.0.0": { "version": "24" },
    "ghcr.io/devcontainers/features/github-cli:1": {}
  },
  "customizations": {
    "vscode": {
      "extensions": [
        "GitHub.copilot",
        "GitHub.copilot-chat",
        "vmware.vscode-spring-boot",
        "Pivotal.vscode-spring-boot",
        "bradlc.vscode-tailwindcss",
        "esbenp.prettier-vscode",
        "dbaeumer.vscode-eslint",
        "ms-azuretools.vscode-docker"
      ],
      "settings": {
        "editor.formatOnSave": true,
        "java.jdt.ls.java.home": "/usr/local/sdkman/candidates/java/current"
      }
    }
  },
  "postCreateCommand": "cd frontend && pnpm install && cd ../backend && ./gradlew dependencies -q"
}
```

**推奨ホストスペック：** RAM 16GB 以上、ストレージ 20GB 以上の空き

---

## ルートファイル仕様

### `README.md`（エントリポイント）

記載すべき内容：
1. リポジトリの概要（1〜2行）
2. クイックスタート（DevContainer 起動手順のみ、3ステップ以内）
3. 学習の始め方（`Docs/guide/getting-started.md` へのリンク）
4. ドキュメント一覧（`Docs/PROJECT_PLAN.md` へのリンク）
5. コントリビュート方法（`CONTRIBUTING.md` へのリンク）

### `CLAUDE.md`（Claude Code 用コンテキスト）

Claude Code (CLI) が自動読込するコンテキストファイル。記載内容：
- リポジトリの目的と技術スタック（箇条書き）
- ディレクトリ構成の概要
- よく使うコマンド（`pnpm dev`・`./mvnw spring-boot:run`・`docker compose up`）
- コーディング規約の要点
- 設計書の参照先（`Docs/ARCHITECTURE.md` 等へのパス）

### `CONTRIBUTING.md`

- ブランチ命名規則：`feature/<issue-number>-<short-desc>`
- コミットメッセージ：Conventional Commits 形式（`feat:`, `fix:`, `docs:` 等）
- PR 提出の手順と必須チェック項目
- メンターへのレビュー依頼方法

---

## ブランチ戦略

```
main                    # 常に動作する最新状態
└── feature/<issue>-*   # 各課題の実装ブランチ（学習者が作成）
```

- 学習者は `main` から `feature/` ブランチを切って作業する
- Fork 方式は採用しない（同一リポジトリ内のブランチで管理）
- `main` への直接 push は禁止。PR 経由でマージ

---

## 命名規則

| 対象 | 規則 | 例 |
|------|------|----|
| ブランチ | `feature/<issue番号>-<kebab-case>` | `feature/42-add-tag-search` |
| コミット | Conventional Commits | `feat: add tag search API` |
| Java クラス | PascalCase | `PostService`, `TagRepository` |
| TypeScript | camelCase（変数）/ PascalCase（型・コンポーネント）| `fetchPosts()`, `PostCard` |
| SQL（Flyway）| `V<3桁連番>__<snake_case>.sql` | `V001__create_posts_table.sql` |
| GitHub Issue | `[Level: Beginner] <機能概要>` | `[Level: Beginner] タグ検索を実装する` |
