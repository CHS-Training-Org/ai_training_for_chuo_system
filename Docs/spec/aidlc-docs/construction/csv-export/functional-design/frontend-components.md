# Frontend Components: CSV 帳票出力

## コンポーネント階層

```
app/(authenticated)/admin/reports/
├── page.tsx                  （Server Component）
└── ReportExportClient.tsx    （Client Component）
```

## page.tsx

- **Props**: なし
- **State**: なし（サーバー取得データを持たない）
- **責務**: 見出し・説明文の表示と `<ReportExportClient />` の描画のみ

## ReportExportClient

- **Props**: なし
- **State**:
  - `from: string`（`type="date"` の値、初期値は空文字）
  - `to: string`（同上）
  - `status: string`（`Select` の値、初期値 `"ALL"`）
  - `isPending: boolean`（`useTransition` 由来）
- **UI 要素**: `Label` + `Input type="date"` × 2、`Label` + `Select`（`ALL` + 5ステータス）、「CSV ダウンロード」ボタン、「リセット」ボタン
- **ユーザー操作フロー**:
  1. 期間・ステータスを入力する（未入力可）
  2. 「CSV ダウンロード」をクリックする
  3. `isPending` が `true` になりボタンが disabled になる
  4. 成功時：ブラウザにファイルがダウンロードされ、`toast.success` が表示される
  5. 失敗時：`toast.error` が表示される（403/401/その他で文言を出し分け）
- **フォームバリデーション**: なし（`from > to` の検証はバックエンドに一本化し、フロントエンドで重複した検証ロジックを持たない。エラーはバックエンドからの 400 応答をそのままトーストに反映する）

## API 連携ポイント

`ReportExportClient` は `fetch(buildCsvDownloadUrl({from, to, status}))` で `GET /api/reports/reservations/csv`（Route Handler 経由）を呼び出す。既存の Server Actions（`createApiClient` 経由）は使わない（Application Design の判断を参照）。
