# Code Generation Plan — ユニット: calendar-view

## ユニットコンテキスト

- **対象ストーリー**: US-01〜US-05（`Docs/spec/aidlc-docs/inception/user-stories/stories.md`）
- **対象要件**: 課題シート RSV-01〜06（内部参照用。正式な spec 要件 ID は `docs-next/docs/spec/requirements.md` の RES-09〜12）
- **依存ユニット**: なし（単一ユニット）
- **インターフェース**: 既存の Server Action `getAvailabilityAction`（`frontend/src/server/actions/resources.ts`）のみを利用。バックエンド・DBへの変更なし
- **ワークスペースルート**: `/workspace`（`Docs/spec/aidlc-state.md` 記載）
- **プロジェクト種別**: Brownfield（既存の Next.js App Router フロントエンドに追加）

## 実行ステップ

- [x] **Step 1 — 依存パッケージ追加**：`react-big-calendar`・`date-fns`（いずれも MIT ライセンス）を `frontend/package.json` に追加する（`pnpm add` 前にライセンス表記を確認する）。型定義 `@types/react-big-calendar` が必要か確認し、必要なら合わせて追加する
- [x] **Step 2 — Business Logic Generation**：純粋関数を新規作成する
  - `frontend/src/lib/calendar/period.ts`：`viewMode`/`anchorDate` から表示期間（週＝月曜始まり7日間、月＝暦月＋前後月パディング）と API 呼び出し用 `from`/`to` を算出する関数、前後移動後の `anchorDate` を算出する関数
  - `frontend/src/lib/calendar/availability-to-events.ts`：`AvailabilitySlot[]` を週表示用の react-big-calendar イベント配列、および月表示用の「日ごとの予約有無」判定に変換する関数
- [x] **Step 3 — Business Logic Unit Testing**：`frontend/tests/unit/lib/calendar/period.test.ts`・`frontend/tests/unit/lib/calendar/availability-to-events.test.ts`（Vitest）を作成し、期間算出・前後移動・重なり判定の境界値（枠の端が一致する場合等）を検証する
- [x] **Step 4 — Business Logic Summary**：`Docs/spec/aidlc-docs/construction/calendar-view/code/business-logic-summary.md` を作成する
- [x] **Step 5 — Frontend Components Generation**：
  - `frontend/src/components/resources/resource-availability-calendar.tsx`（新規 Client Component）を作成する。`functional-design/frontend-components.md` の props/state/react-big-calendar 設定方針に従う
  - `frontend/src/app/(authenticated)/resources/[id]/page.tsx` を変更し、`<ResourceAvailabilityCalendar resourceId={resource.id} />` を追加する（既存の空き確認リストは維持）
  - `frontend/src/app/(authenticated)/reservations/new/page.tsx` を変更し、`searchParams.startAt` を読み取って `ReservationForm` に `defaultStartAt` として渡す
  - `frontend/src/app/(authenticated)/reservations/new/ReservationForm.tsx` を変更し、`defaultStartAt` を `startAt` の `defaultValues` に設定する
  - react-big-calendar のスタイルシート読み込み・最小限のカスタム CSS（グレーアウト・日セル色分け）を追加する
  - インタラクティブ要素（週/月切替・前後移動・クリック可能な枠）に `data-testid` を付与する
- [x] **Step 6 — Frontend Components Unit Testing**：`frontend/tests/unit/` に、変換ロジック（Step 3）で担保しきれないコンポーネント固有の分岐（例：クエリパラメータ生成・`defaultStartAt` のフォーマット整形関数）があれば純粋関数として切り出しテストする。react-big-calendar 自体の描画の単体テストは行わず（既存の `pagination-nav.test.ts` 等と同様、Server/Client Component のレンダリング検証は Playwright E2E 側で担保する方針を踏襲）、Build and Test ステージの Playwright シナリオでカバーする
- [x] **Step 7 — Frontend Components Summary**：`Docs/spec/aidlc-docs/construction/calendar-view/code/frontend-components-summary.md` を作成する
- [x] **Step 8 — Code Generation Summary**：`Docs/spec/aidlc-docs/construction/calendar-view/code/summary.md` を作成する（変更ファイル一覧・新規依存関係・ストーリートレーサビリティ）

## ストーリートレーサビリティ

| ステップ | 対応ストーリー |
|---|---|
| Step 2, 5 | US-01, US-02 |
| Step 5 | US-03, US-04 |
| Step 2, 5 | US-05 |

## 備考

- バックエンド・DBマイグレーションの変更は発生しない（NFR Requirements/Design・Infrastructure Design は SKIP 済み）
- Repository Layer / API Layer 生成ステップは対象外（フロントエンドのみのユニットのため）
