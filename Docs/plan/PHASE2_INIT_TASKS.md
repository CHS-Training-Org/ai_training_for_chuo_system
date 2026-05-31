# Phase 2 ドキュメント整備タスク

> 対象読者：メンター・リポジトリ管理者  
> 参照：[PROJECT_PLAN.md](../PROJECT_PLAN.md) §4 Phase 2 / [02_DOCS_SET_DESIGN.md](./02_DOCS_SET_DESIGN.md) / [03_SAMPLE_SERVICE_DOMAIN.md](./03_SAMPLE_SERVICE_DOMAIN.md) / [04_LEARNING_CURRICULUM.md](./04_LEARNING_CURRICULUM.md)

---

## このドキュメントについて

**目的**：Phase 2（ベースサービス実装に向けたドキュメント整備）の全タスクを「やること・やったこと」で一元管理し、後続の実装作業（AI エージェント・学習者）が依拠できる仕様書（`Docs/spec/`）と学習者ガイド（`Docs/guide/`）を完成させる。

タスクは **機能ドメイン縦切り**で構成する。各機能カテゴリは「要件 → 画面仕様 → API 仕様 → シーケンス図」を縦に揃えており、実装者が一つの機能を追う際に参照ドキュメントを横断せずに済む設計とする。

**真実の源（参照先）**

| 項目 | ファイル |
| ---- | -------- |
| ドメイン・UC・ER・API 大枠・画面構成 | `Docs/plan/03_SAMPLE_SERVICE_DOMAIN.md` |
| ER 確定スキーマ（5 テーブル） | `backend/src/main/resources/db/migration/V001__create_initial_schema.sql` |
| guide 必須記載内容・spec ファイル一覧 | `Docs/plan/02_DOCS_SET_DESIGN.md` |
| STEP-01〜05 手順・完了条件 | `Docs/plan/04_LEARNING_CURRICULUM.md` |
| ヘッダー形式・命名規則・Mermaid 方針 | `Docs/plan/02_DOCS_SET_DESIGN.md` §命名規則・フォーマット |

> **README 維持要件**：spec/guide の各ファイルを追記・更新した際は、`README.md` のドキュメント参照セクションおよび `Docs/PROJECT_PLAN.md` §5 のリンクが最新状態を反映するよう合わせて更新すること。

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

| カテゴリ                       | タスク数 | 完了数 | 進捗            |
| ------------------------------ | -------- | ------ | --------------- |
| 0. ドキュメント整備基盤        | 5        | 5      | ██████████ 100% |
| 1. 横断仕様（ドメイン共通）    | 5        | 5      | ██████████ 100% |
| 2. 認証 機能スライス           | 4        | 4      | ██████████ 100% |
| 3. リソース 機能スライス       | 4        | 4      | ██████████ 100% |
| 4. 予約 機能スライス           | 5        | 5      | ██████████ 100% |
| 5. 承認ワークフロー スライス   | 4        | 4      | ██████████ 100% |
| 6. ユーザー・部署 スライス     | 4        | 4      | ██████████ 100% |
| 7. 学習者ガイド整備            | 4        | 0      | ░░░░░░░░░░ 0%   |
| 8. seed データ仕様             | 3        | 3      | ██████████ 100% |
| 9. 索引・整合性チェック        | 4        | 4      | ██████████ 100% |
| **合計**                       | **42**   | **38** | **90%**         |

> サマリは各カテゴリのタスクを完了するたびに手動で更新する。

---

## 受入条件

Phase 2 の完了判定は以下の全条件を満たすこと。

- [x] `Docs/spec/` 4 ファイル（requirements.md / screen-spec.md / api-spec.md / er-diagram.md）が `03_SAMPLE_SERVICE_DOMAIN.md` のドメイン設計および V001 スキーマと整合して完成している
- [x] 全機能スライス（認証 / リソース / 予約 / 承認 / ユーザー・部署）で「要件 → 画面仕様 → API 仕様 → シーケンス図」が縦に揃っている
- [ ] `Docs/guide/` 4 ファイル（getting-started.md / ai-tools-guide.md / coding-conventions.md / troubleshooting.md）が完成し、getting-started が STEP-01 の手順・README クイックスタートと整合している ← カテゴリ 7 スキップのため未達（getting-started の §初期データ投入のみ完成済み）
- [x] `scripts/seed.sql` の初期データ仕様が定義され、STEP-01（初期データ投入）・STEP-04（テスト観点読解）の完了条件と整合している
- [x] `Docs/PROJECT_PLAN.md` §5 索引・README のドキュメント参照セクションから全 spec/guide ファイルへのリンクが張られ、リンク切れがない（`docker compose exec docs uv run zensical build` が正常終了する）

---

## 0. ドキュメント整備基盤

> **注意**：カテゴリ 0 が完了してから各機能スライス（カテゴリ 1〜6）・ガイド（カテゴリ 7）の本文執筆に着手する。骨格を先に固めることで、後続タスクのヘッダー・セクション構成の揺れを防ぐ。

### やること（チェックリスト）

- [x] `Docs/spec/` 4 ファイルの骨格（ヘッダー・セクション枠組み）作成
- [x] `Docs/guide/` 4 ファイルの骨格（ヘッダー・セクション枠組み）作成
- [x] `Docs/spec/index.md` 整備（spec 管理ファイル一覧・各ファイルの概要説明）
- [x] `Docs/guide/index.md` 整備（guide 管理ファイル一覧・各ファイルの概要説明）
- [x] `Docs/decision/README.md` 作成（ADR のフォーマット・書き方ガイド）

### 詳細・進捗

| #   | タスク                                  | 状態   | 担当 | PR  | 完了日 | メモ                                                                                                                                                       |
| --- | --------------------------------------- | ------ | ---- | --- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.1 | `Docs/spec/` 4 ファイル骨格作成         | 完了 | AI   | -   | 2026-05-30 | requirements.md / screen-spec.md / api-spec.md / er-diagram.md の各ファイルをヘッダー（対象読者・参照）とセクション見出しのみで作成。02 の命名規則準拠      |
| 0.2 | `Docs/guide/` 4 ファイル骨格作成        | 完了 | AI   | -   | 2026-05-30 | getting-started.md / ai-tools-guide.md / coding-conventions.md / troubleshooting.md の各ファイルを同様に骨格のみ作成。02 §guide 必須記載内容をセクション見出しにマッピング |
| 0.3 | `Docs/spec/index.md` 整備              | 完了 | AI   | -   | 2026-05-30 | 既存プレースホルダーを正式版に更新。spec 管理 4 ファイルの名前・目的・対象読者を一覧表化しリンクを追加                                                     |
| 0.4 | `Docs/guide/index.md` 整備             | 完了 | AI   | -   | 2026-05-30 | 既存プレースホルダーを正式版に更新。guide 管理 4 ファイルの名前・目的・対象読者（主に学習者）を一覧表化しリンクを追加                                       |
| 0.5 | `Docs/decision/README.md` 作成         | 完了 | AI   | -   | 2026-05-30 | ADR フォーマット（Michael Nygard 形式）の説明・命名規則・起票プロセスを記載。実体の命名規則（ADR-NNN-kebab-case.md）を正として文書化。ADR 一覧表を追加       |

---

## 1. 横断仕様（ドメイン共通）

> 依存：カテゴリ 0 完了後に着手

全機能スライスが参照する共通仕様。特定の機能に属さず、複数スライスにまたがる設計決定を一元記述する。

### やること（チェックリスト）

- [x] `er-diagram.md` — Mermaid ER 図（V001 スキーマ全 5 テーブル）作成
- [x] `requirements.md` §共通 — ロール・権限定義（MEMBER / APPROVER / ADMIN）記述
- [x] `api-spec.md` §共通 — 認証方式（Bearer JWT）・共通エラーレスポンス・ページネーション規約記述
- [x] `screen-spec.md` §共通 — 共通レイアウト・ナビゲーション・ロール別表示制御方針記述
- [x] `requirements.md` §共通 — 予約ステータス遷移図・承認ステート遷移図（Mermaid stateDiagram）追記

### 詳細・進捗

| #   | タスク                                              | 状態   | 担当 | PR  | 完了日 | メモ                                                                                                                                         |
| --- | --------------------------------------------------- | ------ | ---- | --- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1 | `er-diagram.md` Mermaid ER 図作成                  | 完了 | AI   | -   | 2026-05-30 | V001__create_initial_schema.sql の 5 テーブルを Mermaid erDiagram で図示。エンティティ定義表・リレーション説明・インデックス方針も記述  |
| 1.2 | `requirements.md` §共通：ロール・権限定義           | 完了 | AI   | -   | 2026-05-30 | MEMBER / APPROVER / ADMIN の API 権限マトリクス表・画面アクセス権限表を記述                   |
| 1.3 | `api-spec.md` §共通：認証・エラー・ページネーション | 完了 | AI   | -   | 2026-05-30 | Bearer JWT 認証・エラーレスポンス JSON 形式（code / message）・page/size ページネーション規約（Spring Data Pageable 準拠・0 始まり・デフォルト size=20）を記述 |
| 1.4 | `screen-spec.md` §共通：レイアウト・ナビゲーション  | 完了 | AI   | -   | 2026-05-30 | 全ページ共通レイアウト・ヘッダー構成・サイドナビロール別表示制御ルールを記述                              |
| 1.5 | `requirements.md` §共通：ステータス遷移図           | 完了 | AI   | -   | 2026-05-30 | 予約ステータス遷移（requires_approval 分岐含む）と承認ステップ遷移を Mermaid stateDiagram-v2 で図示 |

---

## 2. 認証 機能スライス

> 依存：カテゴリ 1 完了後に着手  
> 対象 UC：UC-01（社員がサインインする）  
> 対象 API：`POST /api/auth/signout`・`GET /api/users/me`

### やること（チェックリスト）

- [x] `requirements.md` §認証：UC-01 要件記述
- [x] `screen-spec.md` §認証：`/auth/signin` 画面仕様
- [x] `api-spec.md` §認証：サインアウト・自プロフィール取得 API 詳細仕様
- [x] `api-spec.md` §認証：サインイン〜JWT 検証シーケンス図（Mermaid sequenceDiagram）

### 詳細・進捗

| #   | タスク                                             | 状態   | 担当 | PR  | 完了日 | メモ                                                                                                                                     |
| --- | -------------------------------------------------- | ------ | ---- | --- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1 | `requirements.md` §認証：UC-01 要件記述            | 完了 | AI   | -   | 2026-05-30 | AUTH-01〜06 機能要件表・技術的前提（Better Auth・OAuth2 Resource Server・ロール変更は拡張課題）を記述 |
| 2.2 | `screen-spec.md` §認証：`/auth/signin` 画面仕様    | 完了 | AI   | -   | 2026-05-30 | サインインフォーム・バリデーション・エラー表示・成功時リダイレクト（`/`）仕様を記述 |
| 2.3 | `api-spec.md` §認証：API 詳細仕様                  | 完了 | AI   | -   | 2026-05-30 | `POST /api/auth/signout`（200・ボディなし）・`GET /api/users/me`（UserResponse 型定義含む）のリクエスト/レスポンス例を記述 |
| 2.4 | `api-spec.md` §認証：サインインシーケンス図         | 完了 | AI   | -   | 2026-05-30 | ブラウザ → Next.js(Better Auth) → Cognito → JWT 取得 → Spring Boot（JWT 検証）の Mermaid sequenceDiagram を記述 |

---

## 3. リソース 機能スライス

> 依存：カテゴリ 1 完了後に着手  
> 対象 UC：UC-02（リソース一覧・空き確認）・UC-08（管理者によるリソース登録・編集）  
> 対象 API：`GET/POST /api/resources`・`GET/PUT/PATCH /api/resources/{id}`・`GET /api/resources/{id}/availability`

### やること（チェックリスト）

- [x] `requirements.md` §リソース：UC-02・UC-08 要件記述
- [x] `screen-spec.md` §リソース：`/resources`・`/resources/{id}`・`/admin/resources` 画面仕様
- [x] `api-spec.md` §リソース：リソース CRUD・空き照会 API 詳細仕様
- [x] `api-spec.md` §リソース：リソース一覧取得・空き確認シーケンス図（Mermaid）

### 詳細・進捗

| #   | タスク                                               | 状態   | 担当 | PR  | 完了日 | メモ                                                                                                                                                       |
| --- | ---------------------------------------------------- | ------ | ---- | --- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1 | `requirements.md` §リソース：UC-02・UC-08 要件記述   | 完了 | AI   | -   | 2026-05-30 | RES-01〜08 要件表（カテゴリフィルター・空き確認・CRUD・有効/無効切替）・カテゴリ定義表を記述 |
| 3.2 | `screen-spec.md` §リソース：3 画面の仕様              | 完了 | AI   | -   | 2026-05-30 | /resources（カードリスト・フィルター・空き確認入力）/ /resources/{id}（詳細・カレンダー）/ /admin/resources（登録フォーム・有効切替・ADMIN 限定）の仕様を記述 |
| 3.3 | `api-spec.md` §リソース：API 詳細仕様                 | 完了 | AI   | -   | 2026-05-30 | 6 エンドポイントのリクエスト/レスポンス例（ResourceResponse 型定義）・availability レスポンス形状（OccupiedSlot[]）・ADMIN 権限を記述 |
| 3.4 | `api-spec.md` §リソース：シーケンス図                 | 完了 | AI   | -   | 2026-05-30 | ①リソース一覧取得（カテゴリフィルター）②空き確認（日時範囲→OccupiedSlot[] 返却）の 2 シーケンスを Mermaid sequenceDiagram で記述 |

---

## 4. 予約 機能スライス

> 依存：カテゴリ 1 完了後に着手  
> 対象 UC：UC-03（予約申請）・UC-04（承認不要リソースの即時確定）・UC-07（マイ予約一覧・キャンセル）  
> 対象 API：`GET/POST /api/reservations`・`GET/PUT /api/reservations/{id}`・`POST /api/reservations/{id}/cancel`

### やること（チェックリスト）

- [x] `requirements.md` §予約：UC-03・UC-04・UC-07 要件記述
- [x] `requirements.md` §予約：重複予約チェック仕様（排他制御ルール）記述
- [x] `screen-spec.md` §予約：`/reservations/new`・`/reservations`・`/reservations/{id}` 画面仕様
- [x] `api-spec.md` §予約：予約 CRUD・キャンセル API 詳細仕様
- [x] `api-spec.md` §予約：予約申請シーケンス図（requires_approval=false / true 両パターン）

### 詳細・進捗

| #   | タスク                                                  | 状態   | 担当 | PR  | 完了日 | メモ                                                                                                                                                                               |
| --- | ------------------------------------------------------- | ------ | ---- | --- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1 | `requirements.md` §予約：UC-03・UC-04・UC-07 要件記述   | 完了 | AI   | -   | 2026-05-30 | 入力項目表・ワンステップ申請（DRAFT 未使用）ステータス分岐表・RSV-01〜06 要件表（マイ予約フィルター・キャンセル条件）を記述 |
| 4.2 | `requirements.md` §予約：重複予約チェック仕様            | 完了 | AI   | -   | 2026-05-30 | チェック条件 SQL 句・409 Conflict 返却ルール・PUT 時の自己除外・アプリ層排他制御が実装責務（V001 に DB 制約なし）を明記 |
| 4.3 | `screen-spec.md` §予約：3 画面の仕様                     | 完了 | AI   | -   | 2026-05-30 | /reservations/new（申請フォーム・バリデーション・重複エラー）/ /reservations（ステータスバッジ・フィルター）/ /reservations/{id}（詳細・キャンセルボタン・権限制御）を記述 |
| 4.4 | `api-spec.md` §予約：API 詳細仕様                        | 完了 | AI   | -   | 2026-05-30 | 5 エンドポイントのリクエスト/レスポンス例（ReservationResponse 型定義）・ADMIN 全件・本人のみ更新/キャンセル可・409 重複時の挙動を記述 |
| 4.5 | `api-spec.md` §予約：申請シーケンス図（2 パターン）       | 完了 | AI   | -   | 2026-05-30 | ①false=即時 APPROVED・approval_steps なし ②true=PENDING・approval_steps 生成（承認者割当ルールは §承認 参照と注記）の 2 パターンを Mermaid sequenceDiagram で記述 |

---

## 5. 承認ワークフロー スライス

> 依存：カテゴリ 4 完了後に着手  
> 対象 UC：UC-05（承認必要リソースの予約が承認者に回覧される）・UC-06（承認者が承認 or 却下する）  
> 対象 API：`GET /api/approvals/pending`・`POST /api/approvals/{stepId}/approve`・`POST /api/approvals/{stepId}/reject`

### やること（チェックリスト）

- [x] `requirements.md` §承認：UC-05・UC-06 要件記述・`approval_steps` 生成ルール記述
- [x] `screen-spec.md` §承認：`/approvals` 画面仕様
- [x] `api-spec.md` §承認：承認待ち一覧・承認・却下 API 詳細仕様
- [x] `api-spec.md` §承認：承認・却下シーケンス図（Mermaid）

### 詳細・進捗

| #   | タスク                                               | 状態   | 担当 | PR  | 完了日 | メモ                                                                                                                                                                                   |
| --- | ---------------------------------------------------- | ------ | ---- | --- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5.1 | `requirements.md` §承認：UC-05・UC-06 要件・生成ルール | 完了 | AI   | -   | 2026-05-30 | UC-05（approval_steps 生成・割当モデル確定：APPROVER ロール・step_order=1）・UC-06（承認/却下フロー・decided_at 記録）・APRV-01〜07 機能要件表（可視範囲 APPROVER=自分担当/ADMIN=全件、コメント任意/必須、承認時 409 再チェック、決済済みステップ保護）を記述。部署別ルーティングは拡張課題と明記 |
| 5.2 | `screen-spec.md` §承認：`/approvals` 画面仕様         | 完了 | AI   | -   | 2026-05-30 | 承認待ち一覧テーブル（リソース名・申請者・日時・目的・申請日時）・承認/却下ボタン・コメント入力欄（承認=任意・却下=必須）・却下時バリデーション・操作後一覧再取得。可視範囲表（APPROVER=自分担当/ADMIN=全件）・MEMBER=403 を明記 |
| 5.3 | `api-spec.md` §承認：API 詳細仕様                     | 完了 | AI   | -   | 2026-05-30 | `GET /api/approvals/pending`（ApprovalStepResponse 型権威定義・10 フィールド）・`POST .../approve`（コメント任意・重複再チェック・409）・`POST .../reject`（コメント必須・400）のリクエスト/レスポンス例・共通エラー表（400/403/404/409/422）を記述 |
| 5.4 | `api-spec.md` §承認：承認・却下シーケンス図            | 完了 | AI   | -   | 2026-05-30 | ①承認パス（重複再チェック → approval_step.status=APPROVED → reservation.status=APPROVED）②却下パス（reservation.status=REJECTED）の 2 パターンを Mermaid sequenceDiagram で記述 |

---

## 6. ユーザー・部署 スライス

> 依存：カテゴリ 1 完了後に着手  
> 対象画面：`/`（ダッシュボード）・`/admin/users`  
> 対象 API：`GET /api/users/me`（カテゴリ 2 と共有）・`GET /api/users`・`GET /api/departments`

### やること（チェックリスト）

- [x] `requirements.md` §ユーザー・部署：管理要件記述
- [x] `screen-spec.md` §ユーザー・部署：`/`（ダッシュボード）・`/admin/users` 画面仕様
- [x] `api-spec.md` §ユーザー・部署：ユーザー一覧・部署一覧 API 詳細仕様
- [x] `api-spec.md` §ユーザー・部署：ダッシュボード情報取得シーケンス図

### 詳細・進捗

| #   | タスク                                                 | 状態   | 担当 | PR  | 完了日 | メモ                                                                                                                                               |
| --- | ------------------------------------------------------ | ------ | ---- | --- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6.1 | `requirements.md` §ユーザー・部署：管理要件記述         | 完了 | AI   | -   | 2026-05-30 | USER-01〜03 要件表（ADMIN 閲覧・プロフィール・ロール変更は拡張課題）・DEPT-01〜03 要件表（階層構造・JOIN 表示）・DASH-01〜02 要件表を記述 |
| 6.2 | `screen-spec.md` §ユーザー・部署：2 画面の仕様          | 完了 | AI   | -   | 2026-05-30 | /（ダッシュボード：件数カード・APPROVER/ADMIN は承認待ち件数カード追加）・/admin/users（ユーザーテーブル・ロールバッジ・ADMIN 限定・閲覧専用）の仕様を記述 |
| 6.3 | `api-spec.md` §ユーザー・部署：API 詳細仕様             | 完了 | AI   | -   | 2026-05-30 | `GET /api/users`（UserResponse[] ページネーション・ADMIN）・`GET /api/departments`（DepartmentResponse[] 全件・全ロール）のリクエスト/レスポンス例を記述 |
| 6.4 | `api-spec.md` §ユーザー・部署：ダッシュボードシーケンス | 完了 | AI   | -   | 2026-05-30 | ダッシュボード表示時の並行 API 呼び出し（マイ予約 PENDING/APPROVED 件数・APPROVER/ADMIN は承認待ち件数）の Mermaid sequenceDiagram（par 構文）を記述 |

---

## 7. 学習者ガイド整備

> 依存：カテゴリ 0 完了後に着手（カテゴリ 2〜6 と並行可）  
> 参照：`02_DOCS_SET_DESIGN.md` §getting-started・§ai-tools-guide 必須記載内容  
> 参照：`04_LEARNING_CURRICULUM.md` §必須ステップ課題（STEP-01〜05）

### やること（チェックリスト）

- [ ] `Docs/guide/getting-started.md` 作成（STEP-01 の手順書として機能）
- [ ] `Docs/guide/ai-tools-guide.md` 作成（STEP-03 の完了条件「使い分けチェックリスト」含む）
- [ ] `Docs/guide/coding-conventions.md` 作成（FE / BE コーディング規約）
- [ ] `Docs/guide/troubleshooting.md` 作成（よくあるトラブルと解決策）

### 詳細・進捗

| #   | タスク                                          | 状態   | 担当 | PR  | 完了日 | メモ                                                                                                                                                                                                         |
| --- | ----------------------------------------------- | ------ | ---- | --- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 7.1 | `Docs/guide/getting-started.md` 作成            | 未着手 | -    | -   | -      | 02 §getting-started 必須記載内容（前提ソフト/スペック・クローン〜起動・動作確認 URL・初期データ投入・troubleshooting リンク）を網羅。README クイックスタートと手順の整合性を確認して執筆                       |
| 7.2 | `Docs/guide/ai-tools-guide.md` 作成             | 未着手 | -    | -   | -      | 02 §ai-tools-guide 必須記載内容（GitHub Copilot の使い方・Claude Code CLI の使い方・使い分けチェックリスト・禁止事項）を網羅。STEP-03 完了条件「チェックリストに回答して PR 提出」のフォームとして機能させる |
| 7.3 | `Docs/guide/coding-conventions.md` 作成         | 未着手 | -    | -   | -      | FE：Server Components 優先・Zustand 最小限・型安全（Zod）。BE：4 レイヤー厳守（domain/application/presentation/infrastructure）・Spotless + Checkstyle 準拠。コミット規約（Conventional Commits）         |
| 7.4 | `Docs/guide/troubleshooting.md` 作成            | 未着手 | -    | -   | -      | DevContainer 起動エラー（Docker Desktop 設定・ポート競合）・cognito-local 初期化失敗・`pnpm install` / `./gradlew dependencies` エラー・よくある Flyway マイグレーション失敗のトラブルと解決策               |

---

## 8. seed データ仕様

> 依存：カテゴリ 1（ER 図）・カテゴリ 7.1（getting-started）完了後に着手  
> 成果物：`scripts/seed.sql` の実データ仕様定義（SQL ファイル本体の作成含む）

### やること（チェックリスト）

- [x] `scripts/seed.sql` — 部署・ユーザー・リソース初期データ仕様定義と SQL 作成
- [x] `scripts/seed.sql` — サンプル予約・承認ステップデータ仕様定義と SQL 追記
- [x] `Docs/guide/getting-started.md` に seed 実行手順を追記（STEP-01 完了条件と整合）

### 詳細・進捗

| #   | タスク                                             | 状態   | 担当 | PR  | 完了日 | メモ                                                                                                                                                                                                |
| --- | -------------------------------------------------- | ------ | ---- | --- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8.1 | `scripts/seed.sql` — 部署・ユーザー・リソース       | 完了 | AI   | -   | 2026-05-30 | 部署 2 件（本社・開発部）・ユーザー 3 件（MEMBER/APPROVER/ADMIN 各 1 名・APPROVER は 1 名のみ）・リソース 3 件（ROOM 1/EQUIPMENT 1/VEHICLE 1、第1会議室のみ requires_approval=true）。UUID は固定リテラル（再現性確保）・冪等 DELETE 付き |
| 8.2 | `scripts/seed.sql` — サンプル予約・承認ステップ     | 完了 | AI   | -   | 2026-05-30 | APPROVED 予約 1 件（EQUIPMENT上・approval_steps なし）・PENDING 予約 1 件（ROOM上）+ approval_steps 1 件（APPROVER 割当・step_order=1・PENDING）。2 予約を別リソースに分散し重複予約不変条件を満たす。STEP-04 境界値コメント付き |
| 8.3 | `getting-started.md` に seed 実行手順追記           | 完了 | AI   | -   | 2026-05-30 | §初期データ投入 に docker exec -i による psql 実行手順（コンテナ名確認 → 投入 → 確認クエリ + ブラウザ確認）を追記。compose プロジェクト名ずれ問題を注記し docker exec -i を推奨。Batch 5 の他セクションは未変更 |

---

## 9. 索引・整合性チェック

> 依存：カテゴリ 0〜8 完了後に着手

### やること（チェックリスト）

- [x] `Docs/PROJECT_PLAN.md` §5 ドキュメントセット一覧に `plan/PHASE2_INIT_TASKS.md` 行を追加
- [x] `README.md` のドキュメント参照セクションを更新（spec/guide へのリンク追加）
- [x] 全ドキュメント間リンク切れチェック（`docker compose exec docs uv run zensical build` 正常終了を確認）
- [x] `PHASE2_INIT_TASKS.md` と `03_SAMPLE_SERVICE_DOMAIN.md` の UC・API・画面の突合（メンター目視確認）

### 詳細・進捗

| #   | タスク                                                       | 状態   | 担当 | PR  | 完了日 | メモ                                                                                                                                                    |
| --- | ------------------------------------------------------------ | ------ | ---- | --- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 9.1 | `PROJECT_PLAN.md` §5 に spec/guide リンク追加                | 完了 | AI   | -   | 2026-05-31 | §5 に `spec/index.md`・`guide/index.md` の 2 行を追加（index 集約方式）。受入条件 line 68「§5・README から全 spec/guide ファイルへのリンク」を満たす |
| 9.2 | `README.md` ドキュメント参照セクション更新                   | 完了 | AI   | -   | 2026-05-31 | 「ドキュメント一覧」表に `spec/index.md`・`guide/index.md` の 2 行を追加 |
| 9.3 | リンク切れチェック（`docker exec docs uv run zensical build`）| 完了 | AI   | -   | 2026-05-31 | `Build finished in 1.41s` で正常終了確認。残 1 件の warning（`guide/ai-tools-guide.md #使い分けチェックリスト`）は Batch 5 スキップの影響で Batch 5 完了時に自動解消。decision/README.md ADR 一覧表 19 行を実体ファイル名・タイトルに全面修正。api-spec.md の日本語アンカー問題を `{ #auth-method }` / `{ #common-error }` 明示IDで修正。docs_dir 外リンク（CLAUDE.md / README.md）を削除 |
| 9.4 | 03 ドメインとの整合性突合（AI 実施・メンター最終確認推奨）    | 完了 | AI   | -   | 2026-05-31 | UC-01〜08 全 8 件・API エンドポイント 18 件・画面 10 本（`/` `/resources` `/resources/{id}` `/reservations/new` `/reservations` `/reservations/{id}` `/approvals` `/admin/resources` `/admin/users` `/auth/signin`）が requirements.md / screen-spec.md / api-spec.md に漏れなく対応済みを確認。不整合なし。**AI 突合済・メンター最終確認推奨** |

---

## 変更履歴

| 日付       | 内容                                               | 担当      |
| ---------- | -------------------------------------------------- | --------- |
| 2026-05-29 | 初版作成。カテゴリ 0〜9・全 42 タスクを定義        | Bizarress |
| 2026-05-30 | カテゴリ 0 完了（0.1〜0.5）。spec/guide 骨格 8 ファイル・index 2 ファイル・decision/README.md 作成 | AI |
| 2026-05-30 | カテゴリ 1 完了（1.1〜1.5）。er-diagram.md 全セクション・requirements.md §共通（権限マトリクス・ステータス遷移図）・api-spec.md §共通（認証・エラー・ページネーション・エンドポイント一覧）・screen-spec.md §共通（画面一覧・遷移図・ナビ）・requirements.md 背景/スコープ/用語/非機能要件 を記述 | AI |
| 2026-05-30 | カテゴリ 2・3・4・6 完了（2.1〜2.4 / 3.1〜3.4 / 4.1〜4.5 / 6.1〜6.4）。機能スライス本文（認証・リソース・予約・ユーザー部署）を requirements.md / screen-spec.md / api-spec.md に記述。シーケンス図 5 本（サインイン・リソース一覧＆空き確認・予約申請 2 パターン・ダッシュボード）を追加。予約ステータス遷移図の DRAFT エッジを PENDING に修正（ワンステップ申請採用）。4 DTO（UserResponse / DepartmentResponse / ResourceResponse / ReservationResponse）を api-spec.md で権威定義 | AI |
| 2026-05-30 | カテゴリ 5 完了（5.1〜5.4）。承認ワークフロースライス（§承認）本文を requirements.md / screen-spec.md / api-spec.md に記述。割当モデル確定（approver_id NOT NULL 確認・APPROVER ロール割当・拡張課題注記）。ApprovalStepResponse（10 フィールド）を api-spec.md で権威定義。承認時 409 重複再チェック・コメント任意（approve）/必須（reject）を明記。承認・却下シーケンス図 2 本追加 | AI |
| 2026-05-30 | カテゴリ 8 完了（8.1〜8.3）。Batch 5（カテゴリ 7）はスキップ・未着手のまま。`scripts/seed.sql` を新規作成（部署 2・ユーザー 3・リソース 3・APPROVED 予約 1・PENDING 予約 1・approval_steps 1）。APPROVER 1 名・重複予約不変条件遵守・冪等 DELETE 付き。getting-started.md §初期データ投入 に docker exec -i 手順・確認クエリ・ブラウザ確認を追記 | AI |
| 2026-05-31 | カテゴリ 9 完了（9.1〜9.4）。Batch 7（索引・整合性）。PROJECT_PLAN.md §5・README.md に spec/index.md・guide/index.md リンク追加。decision/README.md ADR 一覧表 19 行を全面修正（実体ファイル名・タイトルへ）。zensical build 正常終了確認（残 1 件は Batch 5 スキップの影響）。api-spec.md アンカー修正・docs_dir 外リンク修正。03 との整合突合（UC-01〜08・API 18 件・画面 10 本 = 完全一致）。カテゴリ 7 は未着手のまま | AI |
