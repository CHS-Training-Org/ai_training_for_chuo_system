# Code Structure — usage-report（利用実績の集計・グラフ表示）スコープ限定調査

> 本ファイルは Issue #28「利用実績の集計・グラフ表示」の実装に必要な範囲に限定した Reverse Engineering 成果物である。既存の `code-structure-*.md`（他ユニット向け）は変更しない。
> 調査はコード変更なしの読み取りのみ。`backend/` と `frontend/` の調査はサブエージェントの報告に基づき、次の 4 点は本体側で再確認済み：(1) 集計ライブラリ（recharts 等）が `frontend/package.json` にない、(2) backend に `GROUP BY` / `SUM(` / `Duration` / `ChronoUnit` がない、(3) requirements.md の `DASH-01`/`DASH-02` が既存（ダッシュボード件数）、(4) `globals.css` に `--chart-1..5` がある。`【推測】` は未検証。

パス略記：`B/` = `backend/src/main/java/com/example/bookflow/`、`T/` = `backend/src/test/java/com/example/bookflow/`、`F/` = `frontend/src/`。

## 1. バックエンド

### 1.1 予約実績の取得

- `B/domain/ReservationRepository.java`：JPA 派生 2 件（`findByResource_IdAndStatusIn` 等）、JOIN FETCH 付きのページ付き JPQL 多数、CSV 用の `List` 取得 2 件（`findAllForReportByStatusIn`、`findAllForReportByPeriodAndStatusIn`）。**集計系（`GROUP BY` / `SUM`）は 0 件**
- `PERIOD_MATCH = "r.startAt < :to AND r.endAt > :from"`（半開区間の期間重複）は集計でも再利用できる
- ステータスは `DRAFT` / `PENDING` / `APPROVED` / `REJECTED` / `CANCELLED`。「実績 = APPROVED」のコード上の既存定義はなく、シート（DASH-01）にのみ記載がある。既存の status 定義は重複チェックの対象（PENDING・APPROVED）と CSV の既定（DRAFT 除く 4 値）だけ

### 1.2 集計・時間差

- 時間差・合計時間の既存実装はない。ダッシュボードの件数は画面側が `GET /api/reservations` の `totalElements` 等から取っており、専用の件数 API はない
- DB は `TIMESTAMP`（`er-diagram.md`・V001 の注記：H2 PostgreSQL 互換モードで動くため PostgreSQL 固有型を使わない）。`start_at`/`end_at` は NOT NULL、`chk_reservations_time`（`end_at > start_at`）
- 【推測】`end_at - start_at`・`EXTRACT(EPOCH ...)` は H2 と PostgreSQL で方言が割れるため、ネイティブ SQL は避ける。取得（JPQL）と合算（Service で Java の `Duration`）を分ける方式が最も安全

### 1.3 再利用できるもの

- `ReservationService.list`：Page 返却と本人・ADMIN の分岐があり、集計には不向き
- `ReservationReportService.exportCsv`・`ReportCondition`：`@Transactional(readOnly = true)`（`open-in-view: false` と LAZY のため必須）、`status` 既定値の処理、`from`/`to` の record は形を踏襲できる
- `ResourceRepository`：`findByIsActiveTrue()` 等の `List` 取得はあるが、集計クエリはない

### 1.4 権限制御とテスト

- ロール制御は URL ではなく Controller メソッドの `@PreAuthorize("hasRole('ADMIN')")`（`ReportController`・`UserController`・`ResourceController`）。403 は `{code:"FORBIDDEN"}`、401 は `{code:"UNAUTHORIZED"}`
- 403・401 のテスト雛形：`T/presentation/ReportControllerTest.java`（`BaseControllerTest`、`@WithMockAdmin` 等、JdbcTemplate で seed、users 行も必要）
- UUID プレフィックスの使用済み：00・10・20・30・60・61・70・71・72。**73 以降が未使用**
- Checkstyle：`ParameterNumber` 最大 7、`MethodLength` 最大 150。Spotless：googleJavaFormat 1.28.0。Springdoc は導入済み（`springdoc-openapi-starter-webmvc-ui:3.0.1`）

## 2. フロントエンド

- `/admin` 配下は `resources` と `users` のみ。統計・レポートの画面はない。`F/app/(authenticated)/admin/layout.tsx` が ADMIN ガード（403 画面を表示、redirect しない）で、新しい `/admin/*` はこれを継承する
- `F/components/layout/nav-items.ts`：`ADMIN_ITEMS` に 1 行足せばナビに出る。`tests/unit/layout/nav-items.test.ts` の `adminHrefs`（ハードコード）の更新が必要
- ダッシュボード `F/app/(authenticated)/page.tsx` は全ロール共通で ADMIN 専用の領域がない。統計的表示は `Card` による件数のみ（グラフなし）
- **グラフライブラリは未導入**（`recharts`・`chart.js`・`d3`・`visx` なし）。shadcn の `chart.tsx` もない。`components/ui/` は badge・button・card・dialog・form・input・label・pagination-nav・select・sonner・table・textarea の 12 個。`globals.css` に `--chart-1..5` のトークンはある
- 【推測】recharts を入れる場合は React 19 対応の版（v3 系の見込み）の確認が必要。`pnpm-workspace.yaml` の `allowBuilds` の影響も確認する。チャートは `"use client"` の別ファイルに切る
- API 呼び出し：`F/lib/api-client.ts` の `createApiClient`。非ページングの配列は `getArray`、単一オブジェクトは `get`。Server Component から Server Action を直接 `await` する。Zod スキーマは `F/lib/types/api.ts`（日時は `z.string()`）
- フィルタの既存パターン：`reservations/page.tsx` が `searchParams`（Promise）を読み、`ReservationFilterForm`（Client）が `router.push` で URL を更新する
- テスト：jsdom に `ResizeObserver` の polyfill がない。【推測】recharts の `ResponsiveContainer` はテストで落ちる見込み。チャートをモックして props を検証するか、表を併記して表で検証する。`tests/unit/msw/handlers.ts` に集計用のハンドラ追加が必要

## 3. 仕様側の現状と乖離

- `api-spec.md` に集計・統計系の記載はない（あるのは §帳票出力）。`screen-spec.md` のダッシュボードは件数のみ
- **ID・UC 番号の衝突**：シートの `DASH-01`〜`05` は requirements.md の既存 `DASH-01`/`02`（ダッシュボードの件数表示）と衝突する。シートの「UC-08（利用統計・管理）」も requirements.md の UC-08（リソース登録・編集）と別物。直近の UC は UC-09（CSV 出力）で、新しい UC 番号と要件 ID の接頭辞の採番が必要
- シートは次を定めていない：期間の解釈と按分、`from`/`to` の同時指定、利用率の分母、0 件のリソースの扱い、`is_active=false` の扱い
