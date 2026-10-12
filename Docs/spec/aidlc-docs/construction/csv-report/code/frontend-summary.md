# Frontend Summary — csv-report

ADMIN 向けの「CSV ダウンロード」ボタンと、バックエンドの CSV を中継する Route Handler を実装した。設計は `functional-design/` を参照。

## 変更ファイル

- Created: `frontend/src/app/(authenticated)/reservations/CsvDownloadButton.tsx`（Server Component。`status`・`from`・`to` から `href` を組み立てる `<a download>`、`data-testid="reservations-csv-download"`）
- Created: `frontend/src/app/api/reports/reservations/csv/route.ts`（Route Handler。トークン付与、`status`・`from`・`to` のみ転送、`from`/`to` の秒補完、`Accept: */*`、非 2xx の透過、本文はバイト列のまま中継、接続失敗は 502、トークンなしは 401）
- Modified: `frontend/src/app/(authenticated)/reservations/page.tsx`（`isAdmin` のときだけヘッダ行に `CsvDownloadButton` を描画。他の表示・取得ロジックは変更なし）
- Created（テスト）: `tests/unit/csv-download-button.test.tsx`（5 件）、`tests/unit/reports-csv-route.test.ts`（11 件、node 環境）
- Modified（テスト）: `tests/unit/reservations-page.test.tsx`（ADMIN でボタン表示、条件の引き継ぎ、`status` 未指定でクエリなし、MEMBER・APPROVER・未取得で非表示の 6 件を追加）

## 検証

- `pnpm lint`・`pnpm format:check`・`pnpm test`・`NODE_OPTIONS=--max-old-space-size=1536 pnpm build` がすべて成功。テストは 180 件すべて成功（既存 158 件 + 新規 22 件）。`/api/reports/reservations/csv` は動的ルート（ƒ）として登録された
- break-and-verify（実装を一時的に壊して失敗を確認後に復元）：
  - `page.tsx` の `isAdmin &&` を外す → MEMBER・APPROVER・未取得の非表示 3 件が失敗
  - Route Handler が本文を `res.text()` 経由にする → BOM を含むバイト列の保持テストが失敗
  - 秒補完を外す、`Accept` を `text/csv` にする → 転送と秒補完、Authorization と Accept の 2 件が失敗
  - ボタンが `resourceName` を引き継ぐ → ボタンのテスト 2 件とページのテスト 2 件が失敗

## ストーリー対応

- US-01：ボタンの表示・ラベル・`download`・条件の引き継ぎ（`csv-download-button.test.tsx`、`reservations-page.test.tsx`）、`Content-Disposition` の中継（`reports-csv-route.test.ts`）
- US-04：ADMIN のみ表示（`reservations-page.test.tsx`）、トークンなし 401・バックエンドの 400/401/403 の透過（`reports-csv-route.test.ts`）

## 設計との差異

- 計画では `tests/unit/msw/handlers.ts` に CSV 用ハンドラを追加するとしていたが、Route Handler は `BACKEND_URL` の絶対 URL を `fetch` するため、共通ハンドラ（相対 `/api/backend/*`）には載せられない。テストごとに `server.use(http.get(...))` でスタブする方式にし、`handlers.ts` は変更していない
- `toIsoWithSeconds` は `"use server"` ファイルの非公開関数のため、Route Handler に同じ 3 行を複製した（既存の Server Action は変更していない）
