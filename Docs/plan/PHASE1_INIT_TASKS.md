# Phase 1 リポジトリ初期化タスク

> 対象読者：メンター・リポジトリ管理者  
> 参照：[PROJECT_PLAN.md](../PROJECT_PLAN.md) §4 Phase 1 / [01_REPO_STRUCTURE.md](./01_REPO_STRUCTURE.md) / [ARCHITECTURE.md](../ARCHITECTURE.md)

---

## このドキュメントについて

**目的**：Phase 1（リポジトリ初期化）の全タスクを「やること・やったこと」で一元管理し、複数担当者が並行作業しても進捗を一望できる状態を維持する。

> **README 維持要件**：本リポジトリは社内 AI 駆動開発の学習用途であるため、カテゴリ 2・3・4 の実装タスクを進める際は、学習者がローカル環境を自力で再現できるよう **`README.md` の環境構築手順（クイックスタート）を必ず合わせて更新すること**。

**更新ルール**

| アクション           | 操作                                                                       |
| -------------------- | -------------------------------------------------------------------------- |
| タスクを開始する     | 担当者を記入し状態を `着手中` に変更                                       |
| PR を作成する        | PR 番号を記入し状態を `レビュー中` に変更                                  |
| PR がマージされた    | 状態を `完了`・完了日（YYYY-MM-DD）を記入・チェックボックスを `[x]` に変更 |
| 新規タスクが発生した | 該当カテゴリの表末尾に追記（番号体系：`カテゴリ番号.連番`）                |
| ブロッカーが発生した | 状態を `保留` にしメモ欄に理由を記入                                       |

**ステータス値**：`未着手` / `着手中` / `レビュー中` / `完了` / `保留`

---

## 全体進捗サマリ

| カテゴリ                         | タスク数 | 完了数 | 進捗            |
| -------------------------------- | -------- | ------ | --------------- |
| 0. アーキテクチャ詳細選定        | 22       | 22     | ██████████ 100% |
| 1. リポジトリスケルトン          | 4        | 4      | ██████████ 100% |
| 2. フロントエンド初期化          | 7        | 7      | ██████████ 100% |
| 3. バックエンド初期化            | 7        | 7      | ██████████ 100% |
| 4. DevContainer / Docker Compose | 4        | 3      | ███████░░░ 75%  |
| 5. GitHub 設定                   | 7        | 0      | ░░░░░░░░░░ 0%   |
| 6. ルートドキュメント            | 3        | 3      | ██████████ 100% |
| 7. ブランチ戦略・命名規則        | 3        | 2      | ███████░░░ 67%  |
| 8. 起動確認・受入チェック        | 3        | 3      | ██████████ 100% |
| **合計**                         | **60**   | **51** | **85%**         |

> サマリは各カテゴリのタスクを完了するたびに手動で更新する。

---

## 受入条件

Phase 1 の完了判定は以下の全条件を満たすこと。

- [x] カテゴリ 0：F1〜F10 / B1〜B10 の ADR がすべて `Docs/decision/` に配置され、状態が `Accepted`
- [x] カテゴリ 4：`docker compose up` 一発でフルスタック（frontend:3000 / backend:8080 / postgres:5432 / localstack:4566 / cognito-local:9229）が起動する
- [x] カテゴリ 8：全サービスの疎通確認（HTTP 200 / DB 接続 / LocalStack ヘルスチェック）が完了
- [ ] カテゴリ 5：CI ワークフロー（frontend / backend / security-scan）が `main` への PR でグリーンになる（**後続フェーズへ移管**）
- [ ] `README.md` に記載されたクイックスタート手順（3 ステップ以内）で第三者が環境構築できる

---

## 0. アーキテクチャ詳細選定フロー

> **注意**：カテゴリ 0 が完了するまでカテゴリ 2・3 の実装タスクは着手しない。

### 選定プロセス（各論点に共通）

```
[1] 論点の定義
       ↓
[2] 候補ライブラリ列挙（2〜4 個）
       ↓
[3] 評価軸を定義（学習コスト／採用実績／AI 補完精度／メンテ状況／エコシステム整合）
       ↓
[4] 候補 × 評価軸の比較表を作成
       ↓
[5] 仮決定（メンター 1 名 + リポジトリオーナーで合意）
       ↓
[6] ADR 起票（Docs/decision/ADR-XXX-<topic>.md）
       ↓
[7] 本ドキュメントの該当行に「ADR 番号・仮決定」を記入し状態を「完了」
```

ADR フォーマット：Michael Nygard 形式（Context / Decision / Status / Consequences）  
命名規則：`ADR-001-frontend-styling.md` のように連番＋ kebab-case

### 評価軸（共通基準）

| 軸                     | 重み | 説明                                                                  |
| ---------------------- | ---- | --------------------------------------------------------------------- |
| 学習コスト             | ★★★  | 新人エンジニアが 1〜2 日でキャッチアップできるか                      |
| AI 補完精度            | ★★★  | Copilot / Claude が正しいコードを生成できるか（採用実績の多さに比例） |
| 公式メンテナンス活性   | ★★   | 直近 6 ヶ月のリリース頻度と Issue 対応                                |
| エコシステム整合       | ★★   | Next.js / Spring Boot 公式推奨またはデファクト                        |
| 社内既存資産との親和性 | ★    | 他プロジェクトでの採用実績                                            |

---

### 0-F. フロントエンド側の選定（Next.js App Router 配下）

#### やること（チェックリスト）

- [x] F1：パッケージマネージャ → ADR 確定（ADR-001: pnpm）
- [x] F2：スタイリング → ADR 確定（ADR-002: Tailwind CSS v4）
- [x] F3：UI コンポーネントライブラリ → ADR 確定（ADR-003: shadcn/ui）
- [x] F4：データ取得戦略 → ADR 確定（ADR-004: Server Actions 主体）
- [x] F5：フォームライブラリ → ADR 確定（ADR-005: React Hook Form）
- [x] F6：バリデーション → ADR 確定（ADR-006: Zod）
- [x] F7：クライアント状態管理 → ADR 確定（ADR-007: Zustand）
- [x] F8：認証クライアント → ADR 確定（ADR-008: Better Auth）
- [x] F9：テスト戦略（MSW 利用範囲含む） → ADR 確定（ADR-009: Vitest + Playwright + MSW）
- [x] F10：Lint / Format → ADR 確定（ADR-010: oxlint + oxfmt）
- [x] 確定した ADR を `Docs/decision/` に配置

#### 詳細・進捗

| #   | 論点                 | 状態 | 候補                                         | 仮決定                    | ADR     | 担当 | 完了日     |
| --- | -------------------- | ---- | -------------------------------------------- | ------------------------- | ------- | ---- | ---------- |
| F1  | パッケージマネージャ | 完了 | pnpm / npm / yarn                            | pnpm                      | ADR-001 | -    | 2026-05-23 |
| F2  | スタイリング         | 完了 | Tailwind CSS / CSS Modules / Vanilla Extract | Tailwind CSS v4           | ADR-002 | -    | 2026-05-23 |
| F3  | UI コンポーネント    | 完了 | shadcn/ui / MUI / Chakra UI / 独自           | shadcn/ui                 | ADR-003 | -    | 2026-05-23 |
| F4  | データ取得戦略       | 完了 | Server Actions 主体 / TanStack Query / SWR   | Server Actions 主体       | ADR-004 | -    | 2026-05-23 |
| F5  | フォームライブラリ   | 完了 | React Hook Form / Conform / 標準 form        | React Hook Form           | ADR-005 | -    | 2026-05-23 |
| F6  | バリデーション       | 完了 | Zod / Valibot / Yup                          | Zod                       | ADR-006 | -    | 2026-05-23 |
| F7  | クライアント状態管理 | 完了 | Zustand / Jotai / React Context のみ         | Zustand                   | ADR-007 | -    | 2026-05-23 |
| F8  | 認証クライアント     | 完了 | Auth.js (NextAuth) / Better Auth / 自前      | Better Auth               | ADR-008 | -    | 2026-05-23 |
| F9  | テスト戦略           | 完了 | Vitest + Playwright 既決 / MSW 利用有無      | Vitest + Playwright + MSW | ADR-009 | -    | 2026-05-23 |
| F10 | Lint / Format        | 完了 | ESLint + Prettier / Biome / oxlint + oxfmt   | oxlint + oxfmt            | ADR-010 | -    | 2026-05-23 |

---

### 0-B. バックエンド側の選定（Spring Boot 4.0 / Java 25 配下）

#### やること（チェックリスト）

- [x] B1：ビルドツール → ADR 確定（ADR-011: Gradle Kotlin DSL）
- [x] B2：データアクセス（ORM） → ADR 確定（ADR-012: Spring Data JPA）
- [x] B3：DB マイグレーション → ADR 確定（ADR-013: Flyway）
- [x] B4：バリデーション → ADR 確定（ADR-014: Jakarta Bean Validation）
- [x] B5：API ドキュメント → ADR 確定（ADR-015: Springdoc OpenAPI）
- [x] B6：認証・認可 → ADR 確定（ADR-016: Spring Security + OAuth2 RS）
- [x] B7：ロギング戦略 → ADR 確定（ADR-017: Logback + SLF4J + JSON）
- [x] B8：テスト戦略 → ADR 確定（ADR-018: JUnit 5 + H2 + Mockito）
- [x] B9：AWS SDK → スコープ外（ADR 不要・アプリ非使用）
- [x] B10：コード品質ツール → ADR 確定（ADR-019: Spotless + Checkstyle）
- [x] 確定した ADR を `Docs/decision/` に配置

#### 詳細・進捗

| #   | 論点                  | 状態 | 候補                                                   | 仮決定                      | ADR     | 担当 | 完了日     |
| --- | --------------------- | ---- | ------------------------------------------------------ | --------------------------- | ------- | ---- | ---------- |
| B1  | ビルドツール          | 完了 | Maven / Gradle                                         | Gradle (Kotlin DSL)         | ADR-011 | -    | 2026-05-23 |
| B2  | データアクセス（ORM） | 完了 | Spring Data JPA / MyBatis / jOOQ                       | Spring Data JPA             | ADR-012 | -    | 2026-05-23 |
| B3  | DB マイグレーション   | 完了 | Flyway / Liquibase                                     | Flyway                      | ADR-013 | -    | 2026-05-23 |
| B4  | バリデーション        | 完了 | Jakarta Bean Validation (Hibernate Validator)          | Jakarta Bean Validation     | ADR-014 | -    | 2026-05-23 |
| B5  | API ドキュメント      | 完了 | Springdoc OpenAPI / Spring REST Docs                   | Springdoc OpenAPI           | ADR-015 | -    | 2026-05-23 |
| B6  | 認証・認可            | 完了 | Spring Security + OAuth2 Resource Server (Cognito JWT) | Spring Security + OAuth2 RS | ADR-016 | -    | 2026-05-23 |
| B7  | ロギング戦略          | 完了 | Logback + SLF4J + 構造化 JSON / 標準設定               | Logback + SLF4J + JSON      | ADR-017 | -    | 2026-05-23 |
| B8  | テスト戦略            | 完了 | JUnit 5 + H2 + Mockito / Testcontainers                | JUnit 5 + H2 + Mockito      | ADR-018 | -    | 2026-05-23 |
| B9  | AWS SDK               | 完了 | AWS SDK for Java v2（Bedrock / S3 / DynamoDB）         | スコープ外（アプリ非使用）  | -       | -    | 2026-05-23 |
| B10 | コード品質ツール      | 完了 | Spotless + Checkstyle / Spotless のみ                  | Spotless + Checkstyle       | ADR-019 | -    | 2026-05-23 |

---

## 1. リポジトリスケルトン

> 依存：カテゴリ 0 完了後に着手

### やること（チェックリスト）

- [x] ルートディレクトリ雛形の作成（`frontend/` / `backend/`/`scripts/` / `Docs/spec/` / `Docs/guide/` / `Docs/decision/`）
- [x] `.gitignore` 配置（Node / Java / IDE / OS をカバー）
- [x] `.editorconfig` 配置（UTF-8 / LF / indent_size=2 /=4）
- [x] `LICENSE` 配置（社内方針に従う）

### 詳細・進捗

| #   | タスク                     | 状態 | 担当      | PR  | 完了日     | メモ                                                                                                          |
| --- | -------------------------- | ---- | --------- | --- | ---------- | ------------------------------------------------------------------------------------------------------------- |
| 1.1 | ルートディレクトリ雛形作成 | 完了 | Bizarress | -   | 2026-05-24 | `scripts/` `Docs/spec/` `Docs/guide/` を `.gitkeep` 付きで作成。`frontend/` `backend/` はカテゴリ 2・3 に委任 |
| 1.2 | `.gitignore` 配置          | 完了 | Bizarress | -   | 2026-05-24 | Node + Gradle + IDE + OS を合成。pnpm 採用（ADR-001）に伴い `package-lock.json` / `yarn.lock` 除外            |
| 1.3 | `.editorconfig` 配置       | 完了 | Bizarress | -   | 2026-05-24 | frontend=2sp / backend=4sp                                                                                    |
| 1.4 | `LICENSE` 配置             | 完了 | Bizarress | -   | 2026-05-24 | Proprietary（中央システム株式会社）として配置                                                                 |

---

## 2. フロントエンド（Next.js）初期化

> 依存：カテゴリ 0（F1〜F10 確定）・カテゴリ 1

### やること（チェックリスト）

- [x] `pnpm create next-app` で App Router 雛形生成
- [x] `src/app/` / `src/components/` / `src/server/` / `src/lib/` ディレクトリ構成
- [x] `tests/` ディレクトリ作成（Vitest / Playwright 設定含む）
- [x] ADR で確定したライブラリの導入・初期設定
- [x] `next.config.ts` の環境変数・プロキシ設定
- [x] `tsconfig.json` のパスエイリアス設定（`@/` など）
- [x] `package.json` スクリプト整備（`dev` / `build` / `test` / `lint` / `format`）

### 詳細・進捗

| #   | タスク                            | 状態 | 担当      | PR  | 完了日     | メモ                                                                                                      |
| --- | --------------------------------- | ---- | --------- | --- | ---------- | --------------------------------------------------------------------------------------------------------- |
| 2.1 | Next.js App Router 雛形生成       | 完了 | Bizarress | -   | 2026-05-24 | `package.json` を手動作成（pnpm create はセットアップ手順として README に記載）。Node.js 22 / pnpm 前提   |
| 2.2 | ディレクトリ構成（src 配下）      | 完了 | Bizarress | -   | 2026-05-24 | `src/app/` `src/components/` `src/server/actions/` `src/lib/` を作成。`public/` も配置                    |
| 2.3 | テスト設定（Vitest + Playwright） | 完了 | Bizarress | -   | 2026-05-24 | `vitest.config.ts` `playwright.config.ts` `tests/unit/setup.ts` `tests/unit/msw/` を配置（ADR-009 準拠）  |
| 2.4 | 採用ライブラリ導入（F2〜F10）     | 完了 | Bizarress | -   | 2026-05-24 | `package.json` に全 ADR ライブラリを記載。ESLint 除外、oxlint 採用（ADR-010）。`pnpm install` で実インストール |
| 2.5 | `next.config.ts` 設定             | 完了 | Bizarress | -   | 2026-05-24 | `/api/backend/*` → `BACKEND_URL` へのリバースプロキシ設定。`.env.local.example` も配置                   |
| 2.6 | `tsconfig.json` パスエイリアス    | 完了 | Bizarress | -   | 2026-05-24 | `@/*` → `./src/*` 設定済み                                                                                |
| 2.7 | `package.json` スクリプト整備     | 完了 | Bizarress | -   | 2026-05-24 | `dev` / `build` / `start` / `test` / `test:watch` / `test:e2e` / `lint` / `format` / `format:check`      |

---

## 3. バックエンド（Spring Boot）初期化

> 依存：カテゴリ 0（B1〜B10 確定）・カテゴリ 1

### やること（チェックリスト）

- [x] Spring Initializr で `backend/` 雛形生成（`build.gradle.kts` / `settings.gradle.kts` / `gradlew` 含む）
- [x] `domain/` / `application/` / `presentation/` / `infrastructure/` パッケージ構成
- [x] `resources/application.yml` の基本設定（DB / ポート / ログ）
- [x] `resources/db/migration/V001__create_initial_schema.sql` 雛形作成（Flyway）
- [x] ADR で確定したライブラリの `build.gradle.kts` への追加・初期設定
- [x] `src/test/` のテスト基盤設定（JUnit 5 + Spring Boot Test）
- [x] `./gradlew dependencies` でビルド成功確認

### 詳細・進捗

| #   | タスク                            | 状態 | 担当      | PR  | 完了日     | メモ                                                                                                   |
| --- | --------------------------------- | ---- | --------- | --- | ---------- | ------------------------------------------------------------------------------------------------------ |
| 3.1 | Spring Initializr で雛形生成      | 完了 | Bizarress | -   | 2026-05-24 | Spring Initializr API 経由。Spring Boot 4.0.6 / Java 25 / Gradle (Kotlin DSL)。gradle-wrapper.jar 含む |
| 3.2 | パッケージ構成（4 レイヤー）      | 完了 | Bizarress | -   | 2026-05-24 | `domain/` `application/` `presentation/` `infrastructure/` を `.gitkeep` 付きで作成                   |
| 3.3 | `application.yml` 基本設定        | 完了 | Bizarress | -   | 2026-05-24 | DB / Flyway / OAuth2 JWT（jwk-set-uri 使用で起動時 OIDC discovery を回避）/ Swagger / ログ設定を記載  |
| 3.4 | Flyway マイグレーション雛形       | 完了 | Bizarress | -   | 2026-05-24 | 5 テーブル（departments / users / resources / reservations / approval_steps）。H2 PostgreSQL 互換 SQL  |
| 3.5 | 採用ライブラリ導入（B2〜B10）     | 完了 | Bizarress | -   | 2026-05-24 | springdoc 3.0.1 / logstash-logback-encoder 8.0 / spring-security-test / H2 / Spotless 8.5.1 / Checkstyle 13.4.2 |
| 3.6 | テスト基盤設定                    | 完了 | Bizarress | -   | 2026-05-24 | `application-test.yml`（H2 in-memory）/ `BookflowApplicationTests`（@ActiveProfiles("test")）配置     |
| 3.7 | `./gradlew dependencies` 成功確認 | 完了 | Bizarress | -   | 2026-05-24 | ローカルで実行し全依存関係の解決を確認                                                                 |

---

## 4. DevContainer / Docker Compose

> 依存：カテゴリ 2・3

### やること（チェックリスト）

- [x] `docker-compose.yml` 作成（5 サービス：frontend / backend / postgres / localstack / cognito-local）
- [x] `devcontainer.json` 作成（features / extensions / settings / postCreateCommand）
- [x] `scripts/setup-local.sh` 作成（初回セットアップ補助）
- [ ] `docker compose up` での全サービス起動確認（ローカル）

### 詳細・進捗

| #   | タスク                        | 状態   | 担当 | PR  | 完了日 | メモ                                                     |
| --- | ----------------------------- | ------ | ---- | --- | ------ | -------------------------------------------------------- |
| 4.1 | `docker-compose.yml` 作成     | 完了   | Bizarress | -   | 2026-05-24 | 5 サービス構成。backend は postgres ヘルスチェック後に起動。Cognito JWK URI は COGNITO_POOL_ID 変数で差し込み |
| 4.2 | `devcontainer.json` 作成      | 完了   | Bizarress | -   | 2026-05-24 | 01_REPO_STRUCTURE.md 仕様通り。Java 25 / Node 24 / GitHub CLI feature |
| 4.3 | `scripts/setup-local.sh` 作成 | 完了   | Bizarress | -   | 2026-05-24 | cognito-local 起動→API でユーザープール作成→pool ID を .devcontainer/.env に書き出し |
| 4.4 | 全サービス起動確認            | 未着手 | -         | -   | -          | ポート 3000 / 8080 / 5432 / 4566 / 9229（手動検証）                                  |

---

## 5. GitHub 設定

> 依存：カテゴリ 2・3（CI はコードがないと動作確認不可）

> **移管済み**：本カテゴリは後続フェーズへ移管。Phase 1 スコープ外として全タスクを保留扱いとする。

### やること（チェックリスト）

- [ ] `ISSUE_TEMPLATE/required_task.md` 作成
- [ ] `ISSUE_TEMPLATE/optional_task.md` 作成
- [ ] `PULL_REQUEST_TEMPLATE.md` 作成
- [ ] `CODEOWNERS` 作成
- [ ] `workflows/ci-frontend.yml` 骨格作成（pnpm build + test）
- [ ] `workflows/ci-backend.yml` 骨格作成（mvnw test）
- [ ] `workflows/security-scan.yml` 骨格作成（Dependabot / コードスキャン）

### 詳細・進捗

| #   | タスク                            | 状態   | 担当 | PR  | 完了日 | メモ                                   |
| --- | --------------------------------- | ------ | ---- | --- | ------ | -------------------------------------- |
| 5.1 | `ISSUE_TEMPLATE/required_task.md` | 保留 | -    | -   | -      | 後続フェーズへ移管 |
| 5.2 | `ISSUE_TEMPLATE/optional_task.md` | 保留 | -    | -   | -      | 後続フェーズへ移管 |
| 5.3 | `PULL_REQUEST_TEMPLATE.md`        | 保留 | -    | -   | -      | 後続フェーズへ移管 |
| 5.4 | `CODEOWNERS`                      | 保留 | -    | -   | -      | 後続フェーズへ移管 |
| 5.5 | `workflows/ci-frontend.yml`       | 保留 | -    | -   | -      | 後続フェーズへ移管 |
| 5.6 | `workflows/ci-backend.yml`        | 保留 | -    | -   | -      | 後続フェーズへ移管 |
| 5.7 | `workflows/security-scan.yml`     | 保留 | -    | -   | -      | 後続フェーズへ移管 |

---

## 6. ルートドキュメント

> 依存：カテゴリ 0（スタックが確定してから記述内容が確定）

### やること（チェックリスト）

- [x] `README.md` 作成（概要 / クイックスタート / 学習の始め方 / ドキュメント一覧 / コントリビュート）
- [x] `CLAUDE.md` 作成（リポジトリ目的 / スタック / コマンド / 規約 / 参照先）
- [x] `CONTRIBUTING.md` 作成（ブランチ命名 / Conventional Commits / PR 手順 / レビュー依頼方法）

### 詳細・進捗

| #   | タスク            | 状態 | 担当      | PR  | 完了日     | メモ                                                                        |
| --- | ----------------- | ---- | --------- | --- | ---------- | --------------------------------------------------------------------------- |
| 6.1 | `README.md`       | 完了 | Bizarress | -   | 2026-05-24 | DevContainer クイックスタート（3 ステップ）+ 手動セットアップ手順を記載     |
| 6.2 | `CLAUDE.md`       | 完了 | Bizarress | -   | 2026-05-24 | スタック・ディレクトリ構成・コマンド・規約・設計書参照先を網羅              |
| 6.3 | `CONTRIBUTING.md` | 完了 | Bizarress | -   | 2026-05-24 | ブランチ命名・Conventional Commits・PR 手順・セルフレビュー・保護ルールを記載 |

---

## 7. ブランチ戦略・命名規則の運用反映

> 依存：カテゴリ 6（CONTRIBUTING.md に記載するため）

> **一部移管**：7.1（ブランチ保護ルール設定）は CI 整備（カテゴリ 5）完了後に設定可能なため後続フェーズへ移管。

### やること（チェックリスト）

- [ ] GitHub リポジトリの `main` ブランチ保護ルール設定（直接 push 禁止・PR 必須・CI 通過必須）
- [x] 命名規則（ブランチ / コミット / Issue タイトル）を `CONTRIBUTING.md` に反映
- [x] Branch protection rules の設定内容を `CONTRIBUTING.md` の注意書きに追記

### 詳細・進捗

| #   | タスク                            | 状態   | 担当 | PR  | 完了日 | メモ                                              |
| --- | --------------------------------- | ------ | ---- | --- | ------ | ------------------------------------------------- |
| 7.1 | `main` ブランチ保護ルール設定     | 保留   | -         | -   | -          | 後続フェーズへ移管（CI 整備完了後に設定）         |
| 7.2 | 命名規則を CONTRIBUTING.md に記載 | 完了   | Bizarress | -   | 2026-05-24 | ブランチ命名・Conventional Commits・Issue タイトル規則を記載（6.3 と同時対応） |
| 7.3 | ブランチ保護設定の周知追記        | 完了   | Bizarress | -   | 2026-05-24 | CONTRIBUTING.md 末尾に「ブランチ保護について」注記を追記（直接 push 禁止・PR 必須・CI 必須・1 名承認） |

---

## 8. 起動確認・受入チェック

> 依存：カテゴリ 4（DevContainer 完成後）

### やること（チェックリスト）

- [x] `docker compose up` で全 5 サービス起動確認
- [x] 各サービスの疎通確認（HTTP / DB / LocalStack / cognito-local）
- [x] `postCreateCommand`（`pnpm install` + `./gradlew dependencies`）が成功することを確認

### 詳細・進捗

| #   | タスク                             | 状態   | 担当 | PR  | 完了日 | メモ                                                                                |
| --- | ---------------------------------- | ------ | ---- | --- | ------ | ----------------------------------------------------------------------------------- |
| 8.1 | `docker compose up` 全サービス起動 | 完了   | Bizarress | -   | 2026-05-28 | 全 5 サービス起動・ポート競合なし・ヘルスチェック通過を確認 |
| 8.2 | 疎通確認（全サービス）             | 完了   | Bizarress | -   | 2026-05-28 | frontend:3000 / backend:8080 / postgres:5432 / localstack:4566 / cognito-local:9229 全て応答確認 |
| 8.3 | `postCreateCommand` の成功確認     | 完了   | Bizarress | -   | 2026-05-28 | `pnpm install` + `./gradlew dependencies` の手動実行で成功を確認 |

---

## 変更履歴

| 日付       | 内容                                                                                                                                                                     | 担当      |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| 2026-05-20 | 初版作成                                                                                                                                                                 | -         |
| 2026-05-24 | B1〜B10 選定完了・ADR 配置完了を反映。Gradle / H2+Mockito / ADR-019 に合わせて Category 3・5・8 の Maven 参照を修正                                                      | -         |
| 2026-05-24 | カテゴリ 1（リポジトリスケルトン）完了。LICENSE は中央システム株式会社の Proprietary 表記で配置。`infra/` `scripts/` `Docs/spec/` `Docs/guide/` を `.gitkeep` 付きで追加 | Bizarress |
| 2026-05-24 | カテゴリ 2（フロントエンド初期化）完了。`frontend/` に package.json・tsconfig・next.config.ts・postcss.config.mjs・vitest/playwright 設定・oxlint.json・src/・tests/ を配置。README 維持要件をプランファイルに追記 | Bizarress |
| 2026-05-24 | カテゴリ 6（ルートドキュメント）完了。README.md（クイックスタート含む）・CLAUDE.md・CONTRIBUTING.md をルートに配置 | Bizarress |
| 2026-05-24 | カテゴリ 3（バックエンド初期化）完了。Spring Initializr（Boot 3.5.0）で雛形生成、4 レイヤーパッケージ構成・application.yml・logback-spring.xml・V001 Flyway SQL・application-test.yml（H2）・checkstyle.xml・build.gradle.kts（ADR 全依存追加）を配置。`./gradlew dependencies` 成功確認 | Bizarress |
| 2026-05-24 | カテゴリ 4（DevContainer / Docker Compose）3 タスク完了。`.devcontainer/docker-compose.yml`（5 サービス）・`devcontainer.json`（仕様準拠）・`scripts/setup-local.sh`（cognito-local ユーザープール初期化対応）を配置。`frontend/package.json` の dev スクリプトに `--hostname 0.0.0.0` を追加。README.md の手動セットアップ手順を更新。4.4（起動確認）は手動検証のため未着手 | Bizarress |
| 2026-05-28 | タスク 7.2・7.3 を完了に更新（CONTRIBUTING.md 作成（6.3）時に対応済みと確認）。カテゴリ 5 のタスク数を 6→7 に修正（CODEOWNERS 計上漏れ修正）。カテゴリ 8（8.1〜8.3）の手動検証完了を反映。カテゴリ 5（GitHub 設定）・7.1（ブランチ保護）を後続フェーズへ移管し保留に変更。受入条件のカテゴリ 4・8 達成チェック。合計タスク数 59→60・完了数 46→51・進捗 78%→85% に更新 | Bizarress |
