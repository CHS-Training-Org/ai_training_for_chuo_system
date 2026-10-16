# Components — CSV 帳票出力（ユニット: csv-export）

深さ: Minimal。確認質問（`plans/application-design-plan.md`）の回答 Q1=A / Q2=A / Q3=A / Q4=B / Q5=A を反映する。業務ルールの詳細は `requirements.md` の FR-03〜13 に委ね、ここでは再定義しない。

## 1. コンポーネント一覧

| # | 層 | コンポーネント | 新規 / 変更 | 配置 |
|---|---|---|---|---|
| C1 | BE presentation | `ReportController` | 新規 | `presentation/ReportController.java` |
| C2 | BE application | `ReservationReportService` | 新規 | `application/ReservationReportService.java` |
| C3 | BE application | `ReservationCsvWriter` | 新規 | `application/ReservationCsvWriter.java` |
| C4 | BE domain | `ReservationRepository` | 変更 | `domain/ReservationRepository.java`（メソッド 1 件追加） |
| C5 | FE route | CSV 中継 Route Handler | 新規 | `frontend/src/app/api/reports/reservations/csv/route.ts` |
| C6 | FE page | 帳票出力ページ | 新規 | `frontend/src/app/(authenticated)/admin/reports/page.tsx` |
| C7 | FE nav | `nav-items.ts` | 変更 | `ADMIN_ITEMS` に 1 件追加 |
| C8 | FE lib | 日時ユーティリティ | 新規（抽出） | `frontend/src/lib/datetime.ts`（`toIsoWithSeconds` を移設） |

新規 DTO・新規例外クラス・新規 `ErrorCode` は作らない（CSV はストリームで返す。例外は既存の `ValidationException` と `GlobalExceptionHandler` を使う）。

## 2. 責務と公開インタフェース

### C1 `ReportController`（BE presentation）

- **責務**: HTTP の入出力に限定する。パラメータ受付、`@PreAuthorize("hasRole('ADMIN')")` による認可、**書き出し開始前の検証呼び出し**、レスポンスヘッダの設定、`StreamingResponseBody` の返却。
- **インタフェース**: `GET /api/reports/reservations/csv`（`status` 複数可 / `from` / `to`、すべて任意）。
- **持たないもの**: CSV の組み立て、DB アクセス、トランザクション管理。

### C2 `ReservationReportService`（BE application）

- **責務**: 条件の検証（`from` >= `to` → `ValidationException`）、条件の正規化（`status` 未指定 = 全ステータス）、500 件ずつのページ読み出しループ、Writer への受け渡し。
- **トランザクション**: クラスには `@Transactional` を付けない（既存 `ReservationService` と異なる点）。ページ読み出しの短い読み取り専用トランザクションは C4 のクエリメソッド側が持つ（理由は `services.md` §3）。
- **持たないもの**: CSV 書式、HTTP の知識。

### C3 `ReservationCsvWriter`（BE application、Spring Bean ではない）

- **責務**: BOM・ヘッダ・データ行の書き出し。RFC 4180 エスケープ（FR-13）、数式注入対策（FR-12）、日時書式（FR-04）、ステータスの日本語ラベル（FR-05、`switch` 式で全値を網羅。Q3=A）。
- **性質**: Spring / JPA に依存しない。リクエストごとに `new ReservationCsvWriter(OutputStream)` で生成する（出力先を保持するためシングルトンにしない）。セル変換は `static` の純粋関数として単体テスト可能にする（NFR-05 / NFR-07）。
- **持たないもの**: DB アクセス、検証、ストリームのクローズ（レスポンスのストリームはコンテナが閉じる）。

### C4 `ReservationRepository`（BE domain、変更）

- **責務**: 期間・ステータス条件つきで、`resource` / `requester` を `JOIN FETCH` した予約を `start_at` 昇順・`id` 昇順で `Slice` として返すクエリを 1 件追加する（FR-09 / FR-10、NFR-03 / NFR-04）。
- **注意**: 任意の `from` / `to` は PostgreSQL の null バインド変数の型推論エラー（#76）を避けるため `CAST` を付ける。実 PostgreSQL での検証は Build and Test に含める。

### C5 CSV 中継 Route Handler（FE route）

- **責務**: セッションから JWT を取得し、BE へ中継して CSV をストリーミングのまま返す（FR-17）。成功（200）時は BE のヘッダを引き継ぐ。BE が 400 / 401 / 403 / 5xx を返したとき、または JWT が無いときは、`/admin/reports?error=<コード>` へ 303 リダイレクトする（Q4=B）。`from` / `to` は `toIsoWithSeconds` で秒を補い、空文字は BE に渡さない（Q5=A）。
- **ADR-004 の例外理由**: Server Action は Response のストリーミング配信（`Content-Disposition` 付きのファイル応答）に向かない。`architecture.md` の「App Router + API Routes」の範囲内であり、JWT をサーバー側に閉じ込める BFF 方針（NFR-06）は保たれる。例外はこの Route Handler 1 箇所に限る。

### C6 帳票出力ページ（FE page）

- **責務**: `/admin/reports`。Server Component として、期間（`datetime-local` 2 つ）・ステータス（チェックボックス）・「CSV ダウンロード」ボタンを持つ、`method="GET"` の通常フォームを描画する（クライアント JavaScript なし）。`searchParams.error` を読み取り、**許可リストに載ったコードだけ**を日本語の警告に変換して表示する。ADMIN ガードは既存 `admin/layout.tsx`。
- **表示補足**: 「終了日時は含みません（開始日時が期間内の予約を出力）」の説明を併記する（Q5=A の注意点）。

### C7 `nav-items.ts`（FE nav、変更）

- `ADMIN_ITEMS` に `{ label: "帳票出力", href: "/admin/reports" }` を追加する。表示制御は既存の `navItemsForRole` のまま。

### C8 日時ユーティリティ（FE lib、抽出）

- `src/server/actions/reservations.ts` の非公開関数 `toIsoWithSeconds` を `src/lib/datetime.ts` へ移し、`reservations.ts` と C5 の両方から使う。`"use server"` ファイルは非同期関数以外を公開できないため、共通ライブラリへ抽出する。規則の二重実装を避けるのが目的で、挙動は変えない。
