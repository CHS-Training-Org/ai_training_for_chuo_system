# Code Structure — calendar-view（カレンダービュー）スコープ限定調査

> 本ファイルは Issue #27「カレンダービュー」の実装に必要な範囲に限定した Reverse Engineering 成果物である。既存の `code-structure-*.md`（resource-search・resource-sort・resource-detail-info・e2e-test-coverage の各ユニット向け）はそれぞれ別スコープのため変更しない。

## 1. リソース詳細画面の現状構造

`frontend/src/app/(authenticated)/resources/[id]/page.tsx` が唯一のファイル（配下に子コンポーネントなし）。

- **Server Component**（`async function ResourceDetailPage`、`"use client"` なし）
- 処理フロー（同ファイル内で完結）:
  - `params` から `id` を取得し `getResourceAction(id)` でリソース詳細を取得
  - `now`〜`now+7日` を `from`/`to`（`toISOString().slice(0, 19)` 形式）としてデフォルト範囲を算出
  - `getAvailabilityAction(id, fromStr, toStr)` を呼び出し、失敗時は空配列のまま握りつぶす
  - `resource.isActive` が true の場合のみ「このリソースを予約する」ボタンを表示。`Link href={`/reservations/new?resourceId=${resource.id}`}` で **resourceId のみ**を引き継ぐ
  - 「空き状況」セクション：`slots`（占有スロット配列）が空なら「空き状況良好」、そうでなければ `<ul>` で `startAt`〜`endAt` を `toLocaleString("ja-JP")` 表示する単純リスト。カレンダー表示・グレーアウト・クリック可能枠は現状存在しない

兄弟ディレクトリ（`[id]/` の外）: `resources/ResourceFilterForm.tsx`（一覧画面用フィルタ）、`resources/page.tsx`（一覧画面）、`resources/empty-state.ts`（一覧の空状態メッセージ）。いずれも本課題のスコープ外。

## 2. 既存の空き確認 API 呼び出し経路

### フロント BFF（`frontend/src/server/actions/resources.ts`）

```ts
export async function getAvailabilityAction(id: string, from: string, to: string) {
  const client = createApiClient(getAccessToken);
  return client.getArray(`/resources/${id}/availability`, AvailabilitySlotSchema, { from, to });
}
```

`from`/`to` は共に `string`（呼び出し元で `toISOString().slice(0, 19)` 形式に整形したもの）。`getArray` はクエリパラメータとして `{ from, to }` をそのまま URL に付与し、レスポンスを Zod の配列スキーマでパースする。

### 型定義（`frontend/src/lib/types/api.ts`）

```ts
export const AvailabilitySlotSchema = z.object({
  reservationId: z.string().uuid(),
  startAt: z.string(),
  endAt: z.string(),
});
export type AvailabilitySlot = z.infer<typeof AvailabilitySlotSchema>;
```

### バックエンド

- Controller（`backend/.../presentation/ResourceController.java`）:
  ```java
  @GetMapping("/{id}/availability")
  public List<OccupiedSlot> availability(
      @PathVariable UUID id, @RequestParam LocalDateTime from, @RequestParam LocalDateTime to) {
    return resourceService.availability(id, from, to);
  }
  ```
  `from`/`to` は共に `LocalDateTime` 必須（Spring 標準バインディング、`2026-10-11T09:00:00` のようなオフセットなしの ISO_LOCAL_DATE_TIME 形式）。
- Service（`backend/.../application/ResourceService.java`）: `status IN ('PENDING', 'APPROVED')` の予約のうち、指定期間と重なる（半開区間 `[start, end)`、隣接は非重複）ものだけを返す。**空きスロットの算出（占有スロットの"間"を空きとみなす処理）はフロント側の責務**とコード上明記されている。返却リストはソートされていない。

### 週表示・月表示の from/to 計算

- 週表示：表示中の週の開始日 00:00:00 〜 次週開始日 00:00:00
- 月表示：月初日 00:00:00 〜 翌月初日 00:00:00
- いずれも境界は半開区間でよい（境界日の予約も正しく拾える）。`LocalDateTime` 形式の文字列（秒まで、オフセットなし）への変換が必要で、既存の `toISOString().slice(0, 19)` パターンがそのまま使える。
- 日付計算ライブラリは未導入（後述）のため、ネイティブ `Date` で計算するか新規導入するかの判断が必要。

## 3. 予約申請フォームへの日時引き継ぎの現状パターン

`frontend/src/app/(authenticated)/reservations/new/page.tsx`:

- `searchParams` から **`resourceId` のみ**を読み取り `defaultResourceId` としてフォームに渡している
- `ReservationForm.tsx` の props は `resources` と `defaultResourceId` のみ。`startAt`/`endAt` の初期値は常に空文字列で、クエリパラメータから日時を受け取る仕組みは**現状存在しない**
- 日時を渡すクエリパラメータ名の先例はないため、新規に定義する必要がある（例：`startAt`）
- フォームの `<Input type="datetime-local">` が `datetime-local` 形式の文字列を期待している点は、カレンダークリック時に引き継ぐ値のフォーマット設計で考慮が必要

## 4. 使えそうな既存 UI 資産

`frontend/src/components/ui/`: `badge.tsx` `button.tsx` `card.tsx` `dialog.tsx` `form.tsx` `input.tsx` `label.tsx` `pagination-nav.tsx` `select.tsx` `sonner.tsx` `table.tsx` `textarea.tsx`

- `table.tsx`・`dialog.tsx`・`badge.tsx` がカレンダーのグリッド表現やセル詳細ポップアップに転用できる候補
- **日付操作ライブラリ（date-fns・dayjs 等）は未導入**。ネイティブ `Date` のみで日付計算している
- **カレンダー専用ライブラリ（react-big-calendar・@fullcalendar/react 等）は未導入**。ビジネス要求シートの AI 活用ポイント欄も未導入を前提にした記述になっている
- `zustand` は導入済みだが、リソース詳細画面は Server Component のため、週/月切り替えの状態をどこに持つか（`useState` か `zustand` か）は未決定

## 5. 関連する既存のテスト

`frontend/tests/unit/` 配下:

- `resource-detail-page.test.tsx`：`getAvailabilityAction` をモックし空配列に固定しているため、空き状況の表示内容自体は検証対象外（equipment/notes の条件表示のみ検証）
- `server/actions/resources.test.ts`：`getAvailabilityAction` 自体のテスト（正常時・空き期間の場合の2ケース）
- `resource-filter-form.test.tsx`・`resource-management-client.test.tsx`・`resources-empty-state.test.ts`：一覧画面側のテストで本課題と直接の関係は薄い
- `ReservationForm.tsx` 専用のテストファイルは見当たらない

## 実装方針の選択肢（客観整理。採否は Requirements Analysis 以降で確定する）

- **ファイル構成**:
  - A案：`resources/[id]/page.tsx` に直接カレンダー UI を追記・改修する（改修範囲最小）
  - B案：新規 Client Component（例：`resources/[id]/AvailabilityCalendar.tsx`）を切り出し、`page.tsx` は初期データ取得のみ担う。週/月切り替え時の再取得操作を伴うため Client Component 化はほぼ前提になる
- **既存リストとの関係**（ビジネス要求シート RSV-05 で実装者判断とされている）:
  - 共存案：既存の空き状況リストは残し、カレンダーを別セクションとして追加する
  - 置き換え案：既存リストをカレンダーに置き換える（`resource-detail-page.test.tsx` はリストの中身自体を検証していないため、置き換えによる既存テスト破壊リスクは低い）
- **データ取得**:
  - 既存の `getAvailabilityAction(id, from, to)` をそのまま流用し、週/月切り替え時に Client Component 側から呼び出す
  - from/to 計算ロジックの置き場所（ページ内ユーティリティ vs `lib/` 配下）、日付計算ライブラリの新規導入要否は未定
- **予約フォームへの日時引き継ぎ**:
  - 新規クエリパラメータ（例：`startAt`）を `reservations/new/page.tsx` と `ReservationForm.tsx` の両方に追加する改修が必要（先例がないため命名・フォーマットは新規設計事項）
  - `datetime-local` 入力欄のフォーマットとカレンダー側でクリックした枠の開始時刻フォーマットの整合が必要
- **カレンダー UI 実装**:
  - 外部カレンダーライブラリ（react-big-calendar 等）を新規導入する案と、既存の shadcn/ui コンポーネントをベースに自作する案の両方が、ビジネス要求シートの AI 活用ポイント欄でも選択肢として挙がっている
