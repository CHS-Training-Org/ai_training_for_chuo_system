# 03 — サンプルサービスドメイン設計（BookFlow）

> 対象読者：全員（学習者・メンター・管理者）  
> 参照：[ARCHITECTURE.md](../ARCHITECTURE.md) / [PROJECT_PLAN.md](../PROJECT_PLAN.md)

---

## サービス概要

**BookFlow**（ブックフロー）は、社内の施設・備品を予約し、必要に応じて上長承認を経て確定する業務システムである。会議室・社用車・プロジェクターなど複数カテゴリのリソースを一元管理し、予約申請から承認・確定・利用実績の可視化までをカバーする。

### 採用理由

| 観点 | 理由 |
|------|------|
| SIer 案件への近接性 | 施設予約・申請承認ワークフローは官公庁・一般企業を問わず頻出する業務システム。実務で接する要件・用語をそのまま使える |
| アーキテクチャ網羅性 | 認証（Cognito）・承認ワークフロー（Spring Boot）・カレンダーUI（Next.js）・データ集計（PostgreSQL）と全レイヤーを体験できる |
| ビジネスロジックの豊富さ | 重複予約チェック・承認ステート遷移・役割ベースの画面制御など、実装が面白い設計課題を多く含む |
| 発展課題の多様さ | 繰り返し予約・PDF帳票・多段階承認・利用率レポートなど、スキルに応じた課題を幅広く設計できる |

---

## 機能スコープ

### 初期実装に含める機能（ベースサービス）

| 機能 | 概要 |
|------|------|
| ユーザー認証 | Cognito によるサインイン・サインアウト・ロール判定（一般・承認者・管理者） |
| リソース一覧・空き確認 | カテゴリ別リソース一覧、日時を指定した空き確認 |
| 予約申請 | リソース・日時・利用目的を指定して予約申請（承認不要リソースは即時確定） |
| 予約一覧（マイ予約） | 自分の予約申請の一覧・詳細確認・キャンセル |
| 承認ワークフロー | 承認者による承認・却下・コメント付与 |
| 承認待ち一覧 | 承認者向けの承認待ち予約一覧 |
| リソース管理 | 管理者によるリソースの登録・編集・有効/無効切替 |

### 学習者が拡張する領域（課題対象）

| 課題例 | 対象レイヤー |
|--------|------------|
| 繰り返し予約（毎週・毎月）の追加 | frontend + backend |
| カレンダービュー（週/月表示）の実装 | frontend |
| 利用実績の集計・グラフ表示 | frontend + backend |
| CSV / PDF 帳票出力 | backend + frontend |
| 多段階承認フローの設定 | backend |
| 部署ごとの承認者設定（管理者機能） | frontend + backend |
| E2E テストの追加 | frontend |
| OpenAPI Spec からクライアント自動生成 | frontend + backend |

---

## ユーザー種別・権限

| ロール | 権限 |
|--------|------|
| `MEMBER`（一般社員） | リソース閲覧・予約申請・自分の予約管理 |
| `APPROVER`（承認者） | MEMBER の権限 ＋ 担当リソースの承認・却下 |
| `ADMIN`（管理者） | 全権限 ＋ リソース管理・ユーザー管理 |

---

## 主要ユースケース

```
UC-01: 社員がサインインする
UC-02: 社員がリソース一覧と空き状況を確認する
UC-03: 社員がリソースを予約申請する
UC-04: 承認不要リソースの予約が即時確定される
UC-05: 承認必要リソースの予約が承認者に回覧される
UC-06: 承認者が予約を承認 or 却下する
UC-07: 社員が自分の予約一覧を確認・キャンセルする
UC-08: 管理者がリソースを登録・編集する
```

---

## ER 図（簡易）

```
departments
├── id (UUID, PK)
├── name (VARCHAR)
└── parent_id (UUID, FK → departments, nullable)   ← 部署の階層構造

users
├── id (UUID, PK)
├── cognito_sub (VARCHAR, UNIQUE)
├── name (VARCHAR)
├── email (VARCHAR)
├── department_id (UUID, FK → departments)
├── role (VARCHAR)                                   ← MEMBER / APPROVER / ADMIN
└── created_at (TIMESTAMPTZ)

resources
├── id (UUID, PK)
├── name (VARCHAR)
├── category (VARCHAR)                               ← ROOM / EQUIPMENT / VEHICLE
├── capacity (INTEGER, nullable)                    ← 会議室の定員など
├── location (VARCHAR, nullable)                    ← 場所・棚番号など
├── requires_approval (BOOLEAN)                     ← 承認フローを通すか
├── is_active (BOOLEAN)
├── description (TEXT, nullable)
└── created_at (TIMESTAMPTZ)

reservations
├── id (UUID, PK)
├── resource_id (UUID, FK → resources)
├── requester_id (UUID, FK → users)
├── start_at (TIMESTAMPTZ)
├── end_at (TIMESTAMPTZ)
├── purpose (VARCHAR)
├── attendees_count (INTEGER, nullable)
├── status (VARCHAR)                                 ← DRAFT / PENDING / APPROVED / REJECTED / CANCELLED
└── created_at / updated_at (TIMESTAMPTZ)

approval_steps
├── id (UUID, PK)
├── reservation_id (UUID, FK → reservations)
├── approver_id (UUID, FK → users)
├── step_order (INTEGER)                            ← 多段階承認の順序
├── status (VARCHAR)                                ← PENDING / APPROVED / REJECTED
├── comment (TEXT, nullable)
├── decided_at (TIMESTAMPTZ, nullable)
└── created_at (TIMESTAMPTZ)
```

**主な制約**

- 同一リソース・同一時間帯に `status IN (PENDING, APPROVED)` の予約が複数存在することを禁止する（DB レベルのチェック制約またはアプリ層の排他制御）
- `requires_approval = false` のリソースは申請時に即 `APPROVED` へ遷移し `approval_steps` は生成しない

---

## REST API 一覧（大枠）

> 認証：全エンドポイントに `Authorization: Bearer <JWT>` が必要（サインアウト除く）

### 認証

| メソッド | パス | 説明 |
|--------|------|------|
| POST | `/api/auth/signout` | サインアウト |

### リソース

| メソッド | パス | 説明 | 権限 |
|--------|------|------|------|
| GET | `/api/resources` | リソース一覧（カテゴリ・空き日時でフィルタ可）| 全員 |
| POST | `/api/resources` | リソース登録 | ADMIN |
| GET | `/api/resources/{id}` | リソース詳細 | 全員 |
| PUT | `/api/resources/{id}` | リソース更新 | ADMIN |
| PATCH | `/api/resources/{id}/status` | 有効/無効切替 | ADMIN |
| GET | `/api/resources/{id}/availability` | 空き状況照会（日付範囲指定）| 全員 |

### 予約

| メソッド | パス | 説明 | 権限 |
|--------|------|------|------|
| GET | `/api/reservations` | 予約一覧（自分の予約。ADMIN は全件）| 全員 |
| POST | `/api/reservations` | 予約申請 | 全員 |
| GET | `/api/reservations/{id}` | 予約詳細 | 全員（本人 or APPROVER/ADMIN）|
| PUT | `/api/reservations/{id}` | 予約内容更新（DRAFT/PENDING のみ）| 申請者本人 |
| POST | `/api/reservations/{id}/cancel` | キャンセル | 申請者本人 or ADMIN |

### 承認

| メソッド | パス | 説明 | 権限 |
|--------|------|------|------|
| GET | `/api/approvals/pending` | 承認待ち一覧 | APPROVER / ADMIN |
| POST | `/api/approvals/{stepId}/approve` | 承認 | APPROVER / ADMIN |
| POST | `/api/approvals/{stepId}/reject` | 却下 | APPROVER / ADMIN |

### ユーザー・部署

| メソッド | パス | 説明 | 権限 |
|--------|------|------|------|
| GET | `/api/users/me` | 自プロフィール取得 | 全員 |
| GET | `/api/users` | ユーザー一覧 | ADMIN |
| GET | `/api/departments` | 部署一覧 | 全員 |

---

## 画面構成（大枠）

```
/                     → ダッシュボード（マイ予約・承認待ち件数）
/resources            → リソース一覧・空き確認
/resources/{id}       → リソース詳細・予約カレンダー
/reservations/new     → 予約申請フォーム
/reservations         → マイ予約一覧
/reservations/{id}    → 予約詳細・キャンセル
/approvals            → 承認待ち一覧（承認者）
/admin/resources      → リソース管理（管理者）
/admin/users          → ユーザー管理（管理者）
/auth/signin          → サインイン
```

---

## 技術マッピング（ARCHITECTURE.md との対応）

| ARCHITECTURE.md のレイヤー | BookFlow での実装 |
|--------------------------|----------------|
| フロントエンド / BFF（Next.js）| 予約申請・一覧・承認画面 ＋ Server Actions で Spring Boot を呼び出す |
| 認証（Cognito）| サインイン・JWT検証・ロール（MEMBER/APPROVER/ADMIN）判定 |
| バックエンド（Spring Boot）| リソース・予約・承認フローの CRUD API |
| RDS (PostgreSQL) | resources・reservations・approval_steps・users・departments テーブル |
| S3 | リソース画像の保存先（拡張課題） |
| DynamoDB | 操作ログ・監査証跡（拡張課題） |
| Lambda | 承認通知・リマインド（拡張課題） |
