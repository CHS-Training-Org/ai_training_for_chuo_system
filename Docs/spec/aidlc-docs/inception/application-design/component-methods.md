# Component Methods — CSV 帳票出力（Issue #29）

メソッドシグネチャと高水準の目的のみを定義する。詳細な業務ルール（エスケープ処理の具体的な文字集合、日時整合性チェック等）は Functional Design で定義する。

## ReportController

```java
@GetMapping("/reservations/csv")
@PreAuthorize("hasRole('ADMIN')")
public ResponseEntity<byte[]> csv(
    @RequestParam(required = false) List<ReservationStatus> status,
    @RequestParam(required = false) LocalDateTime from,
    @RequestParam(required = false) LocalDateTime to)
```

- **入力**: `status`（複数指定可・省略時は全ステータス）、`from`・`to`（同時指定必須。片方のみ指定時は `ValidationException` → 400。両方省略時は全期間）
- **出力**: `ResponseEntity<byte[]>`。`Content-Type: text/csv; charset=UTF-8`、`Content-Disposition: attachment; filename="reservations.csv"` ヘッダを付与する。
- **委譲先**: `ReportService.generateReservationsCsv(status, from, to)`

## ReportService

```java
public byte[] generateReservationsCsv(
    Collection<ReservationStatus> statuses, LocalDateTime from, LocalDateTime to)
```

- **入力**: `ReportController` と同じ絞り込み条件（バリデーション済み）
- **出力**: UTF-8 BOM（`EF BB BF`）を先頭に付けた CSV テキストのバイト列
- **内部処理の概略**（詳細は Functional Design）:
  1. `from`/`to` の有無・`statuses` の有無に応じて `ReservationRepository` の該当メソッドを呼び分け、対象 `Reservation` 一覧を取得する
  2. 一覧を CSV 行（ヘッダ行 + データ行）に変換する private メソッドに渡す
  3. 変換結果に BOM を付けてバイト列化する

```java
private String buildCsv(List<Reservation> reservations)
```

- **入力**: 取得済みの予約一覧（`resource`・`requester` 初期化済み）
- **出力**: ヘッダ行（日本語）+ データ行（予約 ID・リソース名・申請者名・開始日時・終了日時・目的・承認状態）から成る CSV 文字列（改行コード・カンマ/改行/ダブルクォートのエスケープ処理を含む）

## ReservationRepository（追加分のみ）

```java
@Query(...)
Page<Reservation> findByPeriodFetch(
    @Param("from") LocalDateTime from, @Param("to") LocalDateTime to, Pageable pageable);

@Query(...)
Page<Reservation> findByPeriodAndStatusInFetch(
    @Param("from") LocalDateTime from,
    @Param("to") LocalDateTime to,
    @Param("statuses") Collection<ReservationStatus> statuses,
    Pageable pageable);
```

- **期間フィルタの意味論**: 予約期間 `[startAt, endAt]` が指定期間 `[from, to]` と重なるものを対象とする（`r.startAt < :to AND r.endAt > :from`）。既存の空き状況照会（`ResourceService.overlaps`）と同じ重複判定の考え方。
- **既存メソッドの再利用**: 期間指定なしの場合は既存 `findAllFetch(Pageable.unpaged())` / `findByStatusInFetch(statuses, Pageable.unpaged())` を呼び出し、新規メソッドは追加しない。
- **並び順**: `ORDER BY r.startAt ASC` を付与し、CSV の行順を決定的にする（要求シート・受入条件に明記はないが、レポートとして時系列順が自然という設計判断。Functional Design 時にテストケースとして明記する）。
- **呼び出し元は `Pageable.unpaged()` を渡し、`Page#getContent()` で `List<Reservation>` として扱う**（一覧画面の `Page<ReservationResponse>` 型とは異なり、CSV は全件を一括取得するため）。

## フロントエンド

### `src/app/api/reports/reservations/csv/route.ts`（新規 Route Handler）

```ts
export async function GET(request: Request): Promise<Response>
```

- **入力**: クエリパラメータ（`status`（複数可）・`from`・`to`）をそのままバックエンドへ転送する
- **処理**: `getSession()` でセッション未存在なら 401 相当のレスポンスを返す。セッションが存在すれば `createApiClient(getAccessToken).getRaw(...)` でバックエンドを呼び出し、レスポンスの `status`・`Content-Type`・`Content-Disposition`・ボディをそのまま転送する。
- **出力**: バックエンドのレスポンスを透過した `Response`（CSV バイト列、または 400/403 のエラーレスポンス）

### `createApiClient(...).getRaw`（`api-client.ts` 拡張）

```ts
function getRaw(
  path: string,
  params?: Record<string, string | string[]>,
): Promise<Response>
```

- **入力**: 既存の `get`/`getPaginated` と同じ `path`・`params`
- **出力**: JSON パース・Zod 検証を行わない生の `Response`（呼び出し元が `Content-Type`・ボディをそのまま扱う）
- **既存 `request()` 内部関数を再利用**し、`assertOk` は呼ばない（エラーレスポンスもそのまま Route Handler へ返し、ブラウザ側で 403 等をハンドリングできるようにするため）。

### `/reservations` ページ（`page.tsx` 拡張）

- 新規コンポーネント追加ではなく、`isAdmin` 分岐に以下を追加する:
  - 開始日時・終了日時の `<input type="datetime-local">` 2 つ（`searchParams` の `from`/`to` を初期値とする。既存の `status` フィルタと同様に URL 駆動）
  - 「CSV ダウンロード」リンク（`<a href="/api/reports/reservations/csv?...">`。現在の `status`・`from`・`to` を引き継ぐ）
