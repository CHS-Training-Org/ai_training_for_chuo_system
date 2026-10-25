# Components: CSV 帳票出力（Issue #29）

4 層構成は変えない。新規コンポーネントは BE 4 つ（Controller、Service、CSV 生成部品、Specification）と FE 2 つ（Server Action、ダイアログ）。既存コンポーネントの変更は BE 1 つ（`ReservationRepository`）と FE 2 つ（`api-client.ts`、`reservations/page.tsx`）。

## Backend（`com.example.bookflow`）

### ReportController（presentation、新規）
- **Purpose**: `GET /api/reports/reservations/csv` の受付
- **Responsibilities**:
  - `@PreAuthorize("hasRole('ADMIN')")` で ADMIN 以外を 403 にする（RPT-04、D3）
  - `from` / `to` の片方だけの指定と `from` ≧ `to` を `ValidationException` で 400 にする（RPT-03、D4）
  - Service が返した CSV のバイト列を `ResponseEntity<byte[]>` で返す。`Content-Type: text/csv; charset=UTF-8`、`Content-Disposition: attachment; filename="reservations_yyyyMMdd.csv"`（Q2、Q6、D10）
- **Interfaces**: HTTP（クエリ `from`、`to`、`status` 複数可）

### ReservationReportService（application、新規）
- **Purpose**: 予約一覧 CSV 出力のユースケース
- **Responsibilities**: 絞り込み条件から Specification を組み立てて予約を全件取得し（開始日時の昇順）、CSV 生成部品でバイト列にする。読み取り専用トランザクション内で完結させる
- **Interfaces**: `exportReservationsCsv(...)`（`component-methods.md`）

### ReservationCsvWriter（application、新規）
- **Purpose**: 予約のリストを CSV のバイト列に変換する部品（Spring に依存しない純粋なクラス）
- **Responsibilities**（RPT-02、仮定 A3、Q3・Q4・Q7）:
  - 先頭に UTF-8 の BOM、1 行目に日本語ヘッダ行「予約ID,リソース名,申請者名,開始日時,終了日時,目的,承認状態」
  - 日時は `yyyy/MM/dd HH:mm`、承認状態は日本語表示名（対応表をこの部品の中に持つ。文言は FE の `labels.ts` と同じ）
  - RFC 4180 のエスケープ（カンマ・ダブルクォート・改行を含む値をダブルクォートで囲み、中のダブルクォートを二重にする）
  - 改行コードは CRLF
  - 0 件ならヘッダ行だけ
- **Interfaces**: `write(List<Reservation>)`（`component-methods.md`）

### ReservationSpecifications（domain、新規）
- **Purpose**: 予約の検索条件を Specification として部品化する（Q1、`ResourceSpecifications` と同じ方式）
- **Responsibilities**: 開始日時の下限（`>= from`）、開始日時の上限（`< to`）、ステータスの集合、`resource` と `requester` の JOIN FETCH（CSV 生成時の N+1 を避ける）

### ReservationRepository（domain、変更）
- **Change**: `JpaSpecificationExecutor<Reservation>` を継承に追加する。既存のメソッドは変えない

## Frontend（`frontend/src`）

### api-client.ts（lib、変更）
- **Change**: JSON ではない応答を受け取るメソッド `getText` を追加する。BOM を残してデコードし、応答ヘッダと一緒に返す（D11）。既存メソッドの挙動は変えない

### reports.ts（server/actions、新規）
- **Purpose**: CSV 取得の Server Action（D1）
- **Responsibilities**: `datetime-local` の値を秒付きの ISO 形式に正規化し、`GET /reports/reservations/csv` を呼ぶ。`Content-Disposition` からファイル名を取り出し、CSV の文字列と一緒に返す。エラーは `ApiClientError` のまま投げる

### CsvExportDialog.tsx（app/(authenticated)/reservations、新規、`'use client'`）
- **Purpose**: CSV ダウンロードのダイアログ（Q5、D8）
- **Responsibilities**: 「CSV ダウンロード」ボタンでダイアログを開く。開始日時・終了日時（`datetime-local`、D5）とステータス 4 種のチェックボックス（D9）を入力させ、Server Action の結果を Blob にしてブラウザにダウンロードさせる。失敗時は `toast.error`（D6）

### reservations/page.tsx（変更）
- **Change**: `isAdmin` のときだけ `CsvExportDialog` を表示する（RPT-05、AC-4.1）。それ以外の表示は変えない
