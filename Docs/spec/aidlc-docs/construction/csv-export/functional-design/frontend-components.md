# Frontend Components — CSV 帳票出力（Unit: csv-export）

## コンポーネント階層

```
/reservations (page.tsx, Server Component・既存)
  └─ isAdmin === true の場合のみ:
       └─ CsvExportControls (新規, Client Component)
```

`page.tsx` はサーバーコンポーネントのまま維持し、`isAdmin` かつ `profile` 取得済みの場合にのみ `CsvExportControls` を描画する。現在の `status` フィルタ（`searchParams.status`）を props として渡す。

## `CsvExportControls`（新規 Client Component）

- **配置**: `frontend/src/app/(authenticated)/reservations/CsvExportControls.tsx`
- **理由**: 期間入力値をボタンの活性/非活性・ダウンロードリンクの `href` に反映するには、クライアント側の状態管理（`useState`）が必要（`AskUserQuestion` で確認済み）。

### Props

| Prop | 型 | 説明 |
|---|---|---|
| `initialFrom` | `string \| undefined` | URL の `searchParams.from`（`datetime-local` 入力の初期値、ISO 8601 の秒なし形式） |
| `initialTo` | `string \| undefined` | 同上（`to`） |
| `statuses` | `string[]` | 現在選択中の `status` フィルタ（複数可・親から引き継ぐ） |

### State

| State | 型 | 初期値 | 説明 |
|---|---|---|---|
| `from` | `string` | `initialFrom ?? ""` | 開始日時入力値 |
| `to` | `string` | `initialTo ?? ""` | 終了日時入力値 |

### 導出値（レンダー時に計算、追加 state は持たない）

- `isValid = (from === "" && to === "") || (from !== "" && to !== "")` — 両方入力または両方空のときのみ `true`
- `downloadHref` — `isValid` の場合のみ、`/api/reports/reservations/csv` に `status`（`statuses` の各値を繰り返しクエリとして付与）・`from`・`to`（入力済みの場合のみ、`toIsoWithSeconds` で秒付きに正規化）を付与した URL。`isValid` が `false` の場合は `undefined`（ボタン `disabled` の根拠にする）。

### ユーザー操作フロー

1. 開始日時 `<input type="datetime-local">` を入力 → `from` state 更新
2. 終了日時 `<input type="datetime-local">` を入力 → `to` state 更新
3. 「CSV ダウンロード」ボタン（`<a>` 要素・`Button asChild` パターンで実装、既存 `Button` コンポーネントを再利用）:
   - `isValid` が `false`（片方のみ入力）→ ボタンを `disabled`（クリック不可・視覚的にも非活性表示）
   - `isValid` が `true` → `href={downloadHref}` でクリック可能。クリックするとブラウザが Route Handler へナビゲートし、ファイルダウンロードが始まる（ページ遷移は発生しない。`Content-Disposition: attachment` のため）

### フォームバリデーション

- クライアント側では「両方入力 or 両方空」の1条件のみをチェックする（`business-rules.md` 参照）。日時の前後関係（`from > to`）はチェックしない。
- サーバー側（バックエンド）のバリデーション（`from`・`to` の同時指定必須）は独立して存在するため、フロントエンドのチェックが漏れても最終的に400で守られる（多層防御。ただし通常のUI操作では到達しない）。

## API 統合ポイント

| コンポーネント | 呼び出し先 | メソッド |
|---|---|---|
| `CsvExportControls` | `/api/reports/reservations/csv`（Next.js Route Handler、新規） | ブラウザの `<a href>` ナビゲーション（`fetch` 呼び出しではない） |
| Route Handler | バックエンド `GET /api/reports/reservations/csv` | `createApiClient(getAccessToken).getRaw(...)` |

## 既存ページ（`page.tsx`）側の変更点

- `isAdmin` ブロック内、既存の「リソースを探す」ボタンと並べて `CsvExportControls` を配置する。
- `searchParams` から `from`・`to` を読み取り、`initialFrom`・`initialTo` として渡す（`status` と同様の URL 駆動の一貫性を保つ）。ただし `from`・`to` の URL 反映（ブラウザバック時の状態復元）は本ユニットの必須要件ではなく、初期値としてのみ利用する。
