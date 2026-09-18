# Component Dependency: CSV 帳票出力

## 依存関係マトリクス（バックエンド）

| コンポーネント | 依存先 | 依存の種類 |
|---|---|---|
| `ReportController` | `ReservationReportService` | コンストラクタ注入 |
| `ReservationReportService` | `ReservationRepository`・`ReservationCsvWriter` | コンストラクタ注入 |
| `ReservationCsvWriter` | `ReservationCsvRow`（入力型） | データ依存のみ（Spring 非依存） |
| `ReservationRepository`（追加メソッド） | `ReservationCsvRow`（JPQL コンストラクタ式の FQCN 参照） | データ依存 |

## 依存関係マトリクス（フロントエンド）

| コンポーネント | 依存先 | 依存の種類 |
|---|---|---|
| `ReportExportClient` | `lib/reports.ts`（純関数）・`ApiClientError`（`lib/api-client.ts` から型のみ） | import |
| `page.tsx` | `ReportExportClient` | コンポーネント合成 |
| Route Handler | `lib/session.ts`（`getAccessToken`） | import |
| `nav-items.ts` | なし（純粋なデータ定義への追加） | — |

## データフロー

```mermaid
sequenceDiagram
    participant Admin as 管理者(ADMIN)
    participant Client as ReportExportClient
    participant RH as Route Handler
    participant RC as ReportController
    participant RS as ReservationReportService
    participant Repo as ReservationRepository
    participant Writer as ReservationCsvWriter

    Admin->>Client: 期間・ステータスを入力し「CSVダウンロード」をクリック
    Client->>RH: GET /api/reports/reservations/csv?from&to&status
    RH->>RH: getAccessToken()
    RH->>RC: GET /api/reports/reservations/csv (Authorization付き)
    RC->>RC: @PreAuthorize("hasRole('ADMIN')")
    RC->>RC: from > to を検証（ストリーム開始前）
    RC-->>RH: StreamingResponseBody を返す（非同期コールバック開始）
    RC->>RS: writeReservationCsv(out, from, to, statuses)
    RS->>RS: フィルタ正規化 + @Transactional 開始
    RS->>Repo: streamCsvRowsForReport(from, toExclusive, statuses)
    Repo-->>RS: Stream<ReservationCsvRow>
    RS->>Writer: write(out, rows)
    Writer-->>RS: 書き込み完了
    RS->>RS: Stream クローズ（トランザクション終了）
    RH-->>Client: text/csv をそのまま中継
    Client->>Client: Blob化してダウンロード発火
```

## 通信パターン

- バックエンド内部は同期呼び出し（コンストラクタ注入によるサービス層の一直線な委譲）。非同期性は Spring MVC の `StreamingResponseBody` の内部機構によるものであり、コンポーネント間の通信パターンとしては意識しない
- フロントエンド〜バックエンド間は HTTP（`fetch`）。Route Handler が中間層として1回の中継を行う（api-client.ts の rewrite 経由の呼び出しパターンとは別系統）
