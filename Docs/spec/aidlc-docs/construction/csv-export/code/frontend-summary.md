# Frontend Code Generation Summary — Unit: csv-export

## 変更ファイル

- **編集**: `frontend/src/lib/api-client.ts`
  - `request()` に `skipAssertOk` オプションを追加（実装中に判明：既存 `assertOk` は常時呼ばれる構造だったため、エラーレスポンスを透過するには必須の変更だった）
  - `getRaw(path, params): Promise<Response>` を追加（JSON パース・Zod 検証を行わない生レスポンス、`skipAssertOk: true` で呼び出す）
- **編集**: `frontend/src/app/(authenticated)/reservations/page.tsx`
  - `CsvExportControls` を import し、`isAdmin` 表示時のヘッダ領域に配置
  - `searchParams` から `from`/`to` を読み取り `initialFrom`/`initialTo` として渡す

## 新規ファイル

- `frontend/src/app/api/reports/reservations/csv/route.ts`
  - `getSession()` によるセッション検証（未認証時は401 JSON）
  - `createApiClient(getAccessToken).getRaw(...)` でバックエンド呼び出し、`status`・`Content-Type`・`Content-Disposition`・ボディを透過転送
- `frontend/src/app/(authenticated)/reservations/CsvExportControls.tsx`
  - `useState` による `from`/`to` 管理、両方入力/両方空のみ `isValid`、`downloadHref` 導出
  - `Button asChild` + `<a>` で実装。`isValid=false` 時は `href` 未設定・`aria-disabled="true"`・`onClick` で `preventDefault`（CSS の `pointer-events-none` に依存せず、jsdom 環境でも機能的に無効化されることを保証）
- `frontend/tests/unit/app/reservations/CsvExportControls.test.tsx`
  - 両方空で活性・片方入力でaria-disabled・両方入力時のクエリ反映・初期値反映の4テスト

## テスト・検証結果

| コマンド | 結果 |
|---|---|
| `pnpm test`（全93件） | 成功（新規4件含む） |
| `pnpm lint`（oxlint） | 成功（警告0） |
| `pnpm format`（oxfmt） | 適用（新規2ファイルの整形のみ、ロジック変更なし） |
| `pnpm build` | 成功（型チェック含む、`/api/reports/reservations/csv` ルートが認識されることを確認） |

## 実装中に発見した訂正

- `api-client.ts` の `request()` 内部関数は無条件に `assertOk` を呼ぶ構造だった（Application Design/Functional Design 時点では認識していなかった実装詳細）。`getRaw` がエラーレスポンス（400/403）を透過転送する設計（`frontend-components.md`・`application-design.md` の設計判断）を成立させるため、`skipAssertOk` オプションを追加する変更が必要だった。既存の `get`/`getPaginated`/`getArray`/`post` 等の動作には影響しない（デフォルトで `assertOk` が呼ばれる挙動を維持）。

## 未実施（本ステップの対象外）

- `docs-next/docs/spec/screen-spec.md` への反映（Build and Test完了後の `/update-spec` に委譲）
- Playwright E2E テスト（`csv-export.md` の推奨着手順序に記載の `e2e-test-coverage.md` は別課題）
