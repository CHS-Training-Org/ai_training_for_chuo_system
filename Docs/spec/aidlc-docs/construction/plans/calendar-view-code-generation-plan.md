# Code Generation Plan — ユニット: calendar-view（カレンダービュー）

## Unit Context

- **Stories implemented**: US-01〜US-04（`Docs/spec/aidlc-docs/inception/user-stories/stories.md`）
- **Dependencies**: なし（既存の空き確認API `GET /api/resources/{id}/availability` のみに依存。前提課題なし）
- **Database entities owned**: なし（スキーマ変更なし）
- **Service boundaries**: frontend の `resources/[id]/` と `reservations/new/` 配下に閉じる。バックエンド（`backend/`）は変更しない

## 技術判断の参照先

Functional Design（`Docs/spec/aidlc-docs/construction/calendar-view/functional-design/`）で確定済みのロジック・業務ルールをそのまま実装する。本プランでは再掲せず参照にとどめる：

- `business-logic-model.md`：from-to算出・グリッドセル生成・占有判定・クリック時の日時組み立てロジック
- `business-rules.md`：BR-01〜08
- `frontend-components.md`：コンポーネント構成・props/state・改修ファイルの変更点

## 実行ステップ

- [x] **Step 1: 仕様書更新**
  - `docs-next/docs/spec/screen-spec.md` §`/resources/{id}`：「空き状況リスト」の行を「カレンダー表示」に置き換え、週表示/月表示切り替え・期間ナビゲーション・空き枠クリックでの予約申請フォーム連携を追記
  - 同ファイル §`/reservations/new`：`startAt` クエリパラメータによる開始日時の初期値設定を追記（既存の `resourceId` の記載に合わせる）
  - frontmatter の `last_updated` を更新
  - Story mapping: US-01, US-02, US-03

- [x] **Step 2: AvailabilityCalendar コンポーネント生成**
  - `frontend/src/app/(authenticated)/resources/[id]/AvailabilityCalendar.tsx` を新規作成（`"use client"`）
  - `frontend-components.md` のprops/state定義に従う。週/月のfrom-to算出・グリッドセル生成・占有判定・クリック時の日時組み立て（`business-logic-model.md` ロジック1〜4）を実装
  - 週表示グリッド（7日×8-20時）・月表示グリッド（当月＋前後月空白セル）をそれぞれ描画する内部コンポーネント（同ファイル内）を実装
  - 自動化しやすいUIにするため、週/月切り替えボタン・前後移動ボタン・各セルに `data-testid` を付与する（命名規則：`availability-calendar-{要素}`）
  - Story mapping: US-01, US-02, US-03, US-04

- [x] **Step 3: リソース詳細画面への組み込み**
  - `frontend/src/app/(authenticated)/resources/[id]/page.tsx` を改修：既存の「空き状況」リスト表示（`<ul>` によるスロット一覧）と、その取得のための `getAvailabilityAction` 呼び出し・`from`/`to` 算出コードを削除し、`<AvailabilityCalendar resourceId={resource.id} isActive={resource.isActive} />` を描画する
  - Story mapping: US-01

- [x] **Step 4: 予約申請フォームへの日時引き継ぎ**
  - `frontend/src/app/(authenticated)/reservations/new/page.tsx` を改修：`searchParams` から `startAt` を読み取り `defaultStartAt` として `ReservationForm` に渡す
  - `frontend/src/app/(authenticated)/reservations/new/ReservationForm.tsx` を改修：props に `defaultStartAt?: string` を追加し、開始日時入力欄の初期値に反映する
  - Story mapping: US-03

- [x] **Step 5: ユニットテスト**
  - `frontend/tests/unit/availability-calendar.test.tsx` を新規作成：week/month切り替え、期間ナビゲーション時の再取得、セルの占有判定（週表示の半開区間重なり・月表示の営業時間完全被覆）、クリック時の遷移先URL組み立て（週表示・月表示それぞれ）、`isActive=false` 時にクリックが無効であることを検証する
  - `frontend/tests/unit/resource-detail-page.test.tsx` を更新：削除した空き状況リスト表示の検証を除去し、`AvailabilityCalendar` が描画されることを検証する内容に更新
  - `ReservationForm.tsx` の `defaultStartAt` 反映について、既存の関連テストファイルがあれば更新し、なければ新規にテストケースを追加する
  - Story mapping: US-01, US-02, US-03, US-04

- [x] **Step 6: Frontend 層サマリ**
  - 変更点を `Docs/spec/aidlc-docs/construction/calendar-view/code/frontend-summary.md` に記録（本ユニットは backend 変更なしのため backend-summary.md は作成しない）

## スコープ外（本プランに含めない）

- バックエンドの変更（`GET /api/resources/{id}/availability` 以外の新規API・既存APIの変更）
- 外部カレンダーライブラリ・日付計算ライブラリの導入
- ADMIN ロール向けの特別な表示

## 本プランが Code Generation の唯一の正とする

本ステップ順序・内容が Part 2（Generation）実行の単一の正とする。逸脱する場合は本ファイルを更新してから実行する。
