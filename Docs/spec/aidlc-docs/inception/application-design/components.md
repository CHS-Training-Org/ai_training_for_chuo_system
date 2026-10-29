# Components（CSV 帳票出力）

## Backend

### ReportController（presentation、新規）
- **Purpose**: `GET /api/reports/reservations/csv` の受付。
- **Responsibilities**: クエリパラメータの受け取り（`status` 複数、`from`、`to`）、`from > to` の検証（400）、レスポンスヘッダ（`Content-Type`、`Content-Disposition`）とファイル名の組み立て。`@PreAuthorize("hasRole('ADMIN')")` で ADMIN に限定する。
- **Interfaces**: HTTP のみ。

### ReportService（application、新規）
- **Purpose**: 帳票出力のユースケース。
- **Responsibilities**: 期間の日付を日時範囲へ変換（`from` は当日 0 時以上、`to` は翌日 0 時未満）、予約の検索、CSV 行への変換、`ReservationCsvWriter` の呼び出し。読み取り専用トランザクション内で完結する。

### ReservationCsvWriter（application、新規）
- **Purpose**: CSV のバイト列を作る純粋なクラス（Spring と JPA に依存しない）。
- **Responsibilities**: 日本語ヘッダ、BOM 付き UTF-8、CRLF、RFC 4180 のエスケープ、数式対策（先頭が `=`、`+`、`-`、`@` の文字列に `'` を付ける）、日時書式（`yyyy-MM-dd HH:mm`）、ステータスの日本語ラベル変換。

### ReservationCsvRow（application、新規）
- **Purpose**: 書き出し用の値オブジェクト（record）。エンティティの LAZY 関連に触れずにライターを単体テストするための境界。

### ReservationSpecifications（domain、新規）
- **Purpose**: 予約の検索条件を合成する（`ResourceSpecifications` と同じ流儀）。
- **Responsibilities**: 開始日時の範囲、ステータス群、`resource` と `requester` の fetch join。

### ReservationRepository（domain、変更）
- **Change**: `JpaSpecificationExecutor<Reservation>` を継承に追加する。既存メソッドは変更しない。

## Frontend

### Route Handler `api/reports/reservations/csv/route.ts`（新規）
- **Purpose**: JWT を持つサーバー側でバックエンドを呼び、CSV をブラウザに中継する。
- **Responsibilities**: クエリの転送、`Content-Type` と `Content-Disposition` の引き継ぎ、バックエンドのエラー（`{ code, message }` と HTTP ステータス）をそのまま返す。

### api-client の拡張（変更）
- **Change**: 非 JSON 応答を `Response` のまま返す `getRaw` を追加する。既存メソッドは変更しない。

### `admin/reservations/page.tsx`（新規、サーバーコンポーネント）
- **Purpose**: 「予約帳票」ページの見出しと説明、フォームの配置。ADMIN ガードは既存の `admin/layout.tsx` が担う。

### `ReservationReportForm.tsx`（新規、クライアントコンポーネント）
- **Purpose**: 期間（`type="date"` 2 つ）とステータス（チェックボックス）の入力と、ダウンロードの実行。
- **Responsibilities**: `from > to` の事前検証、`fetch` による取得、Blob からのダウンロード、失敗時の sonner トースト。

### nav-items（変更）
- **Change**: ADMIN のメニューに「予約帳票」（`/admin/reservations`）を追加する。

## 既知の制約
- CSV はメモリ上で組み立てるため、件数の上限は設けないが、極端に大量の予約には向かない。必要になった時点でストリーミング出力（`StreamingResponseBody`）に切り替える。
