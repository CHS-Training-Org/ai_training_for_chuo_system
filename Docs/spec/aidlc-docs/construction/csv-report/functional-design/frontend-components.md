# Frontend Components — csv-report

パス略記：`F/` = `frontend/src/`。

## コンポーネント構成

```text
F/app/(authenticated)/reservations/page.tsx            (既存・変更)  ヘッダ行に ADMIN のときだけボタンを描画
  +- F/app/(authenticated)/reservations/CsvDownloadButton.tsx  (新規)  Server Component。<a download> を描画

F/app/api/reports/reservations/csv/route.ts            (新規)  Route Handler。バックエンドの CSV を中継
```

Client Component・状態管理（Zustand 等）・Blob 処理は使わない。ボタンは `page.tsx` が持つ `searchParams` から `href` をサーバー側で組み立てる。

## 1. `CsvDownloadButton.tsx`（新規）

- **種別**：Server Component（`"use client"` なし）
- **Props**：`status: string[]`（選択中のステータス、未選択は空配列）、`from?: string`、`to?: string`
- **描画**：shadcn/ui の `Button`（`variant="outline"`、`asChild`）の中に `<a>` を置く。`href` は `/api/reports/reservations/csv` に、値のある項目だけクエリを付ける（`status` は項目ごとに繰り返し、`from`/`to` は `URLSearchParams` で組み立てる）。`download` 属性を付け、`data-testid="reservations-csv-download"`、ラベルは「CSV ダウンロード」
- **しないこと**：`resourceName`・`page` のクエリ化（BR-14）、`from`/`to` の秒補完（Route Handler が行う）、ADMIN 判定（呼び出し側が行う）

## 2. `page.tsx`（既存・変更）

- 既存の `isAdmin`（`profile?.role === "ADMIN"`）が真のときだけ、ヘッダ行の右側（「リソースを探す」の隣）に `CsvDownloadButton` を描画する
- 渡す値：`status={selectedStatuses}`（`ALL_STATUSES` で補った `statusFilter` ではなく、画面で選択中の値）、`from`、`to`
- ヘッダ行の右側は「リソースを探す」と CSV ボタンを `flex gap-2` で並べる。それ以外の表示・取得ロジックは変更しない

## 3. Route Handler `route.ts`（新規）

- **パス**：`GET /api/reports/reservations/csv`（Next の `app/api/reports/reservations/csv/route.ts`）。既存の `/api/backend/*` の rewrite と `/api/auth/*` の Better Auth とは衝突しない
- **処理**：business-logic-model.md §3.2 のとおり（トークン取得 → 3 項目の転送と秒補完 → `fetch` → 透過または中継）
- **API 統合点**：バックエンド `GET /api/reports/reservations/csv`。共通の `createApiClient` は JSON 前提のため使わず、`fetch` を直接呼ぶ（BE URL は `process.env.BACKEND_URL ?? "http://localhost:8080"`、トークンは `getAccessToken`）
- **ヘッダ**：応答の `Content-Type`・`Content-Disposition` はバックエンドの値を引き継ぐ。`Cache-Control: no-store`
- **エラー**：トークンなしは 401（JSON）、`fetch` 例外は 502（JSON）、バックエンドの非 2xx は透過

## 4. バリデーション

フロントでの入力検証は追加しない。`from`/`to` の整合（片方だけの指定）はバックエンドの 400 が扱い、既存の `ReservationFilterForm` と同じ前提になる。

## 5. テスト（`frontend/tests/unit/`）

- `reservations-page.test.tsx`（既存へ追加）：ADMIN でボタンが表示される、MEMBER では表示されない。`getProfileAction` のモックでロールを切り替える
- `csv-download-button.test.tsx`（新規）：`href` が `status`（複数）・`from`・`to` を含み `resourceName`・`page` を含まない、値がないときクエリが付かない
- `reports-csv-route.test.ts`（新規）：トークンなしで 401、`status`・`from`・`to` の転送と秒補完、Authorization と `Accept: */*` の付与、非 2xx の透過、BOM を含むバイト列の保持、`fetch` 例外で 502。MSW ハンドラ（`tests/unit/msw/handlers.ts`）に CSV 用の応答を追加し、`@/lib/session` を mock する
