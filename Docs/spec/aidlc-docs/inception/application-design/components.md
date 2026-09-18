# Components: CSV 帳票出力

## バックエンド

### ReportController（presentation）
- **Purpose**: 帳票出力の REST エンドポイントを公開する
- **Responsibilities**: ADMIN 限定の認可（`@PreAuthorize`）、クエリパラメータの検証（`from > to`）、`StreamingResponseBody` のレスポンスヘッダ組み立て
- **Interfaces**: `GET /api/reports/reservations/csv`

### ReservationReportService（application）
- **Purpose**: 帳票出力のユースケースを実行する
- **Responsibilities**: フィルタ条件の正規化（null → 番兵値）、トランザクション境界の確立、`Stream` のオープン・クローズ
- **Interfaces**: `writeReservationCsv(OutputStream, LocalDateTime, LocalDateTime, Collection<ReservationStatus>)`

### ReservationCsvWriter（application）
- **Purpose**: CSV 本文を生成する
- **Responsibilities**: UTF-8 BOM・日本語ヘッダー・行データの書き出し、CSV インジェクション対策、日時・ステータスの表示用フォーマット変換
- **Interfaces**: `write(OutputStream, Stream<ReservationCsvRow>)`

### ReservationCsvRow（domain）
- **Purpose**: CSV 1行分の読み取り専用データモデル
- **Responsibilities**: JPQL コンストラクタ式の射影ターゲットとなり、LAZY 関連を一切保持しない
- **Interfaces**: record（`id`, `resourceName`, `requesterName`, `startAt`, `endAt`, `purpose`, `status`）

### ReservationRepository（domain、既存クラスへのメソッド追加）
- **Purpose**: 予約データへのアクセス
- **Responsibilities**（追加分）: 期間・ステータス条件で `ReservationCsvRow` をストリーム取得する

## フロントエンド

### Route Handler（`app/api/reports/reservations/csv/route.ts`）
- **Purpose**: ブラウザからの認証付きダウンロードを仲介する BFF
- **Responsibilities**: サーバー側トークン取得、許可リストによるクエリ転送、バックエンドのレスポンス（成功・エラーとも）をそのまま中継
- **Interfaces**: `GET`（Next.js Route Handler）

### reports.ts（`lib/reports.ts`）
- **Purpose**: フロントエンドの純関数ヘルパ
- **Responsibilities**: ダウンロード URL の組み立て（日付の正規化）、`Content-Disposition` からのファイル名抽出、ブラウザへのダウンロード発火
- **Interfaces**: `buildCsvDownloadUrl`・`parseFilenameFromContentDisposition`・`triggerBrowserDownload`

### ReportExportClient（`app/(authenticated)/admin/reports/ReportExportClient.tsx`）
- **Purpose**: 帳票出力ページの操作 UI
- **Responsibilities**: 期間・ステータスの入力、ダウンロードボタンの発火、エラー時のトースト表示
- **Interfaces**: Client Component（props なし。ページから独立して完結）

### page.tsx（`app/(authenticated)/admin/reports/page.tsx`）
- **Purpose**: 帳票出力ページの入り口
- **Responsibilities**: 見出し・説明の表示、`ReportExportClient` の描画。ロール判定は既存の `admin/layout.tsx` に委ねる
- **Interfaces**: Server Component
