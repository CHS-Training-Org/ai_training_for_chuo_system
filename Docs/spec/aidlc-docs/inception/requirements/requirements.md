# Requirements — ユニット: calendar-view（カレンダービュー）

## Intent Analysis Summary

- **User Request**: リソース詳細画面（`/resources/{id}`）に、週表示・月表示を切り替えられるカレンダー形式の空き状況ビューを追加する（Issue #27、ビジネス要求シート `docs-next/docs/spec/enhancements/intermediate/calendar-view.md`）
- **Request Type**: Enhancement（既存機能の表示拡張。ユースケース UC-02 の表示拡張）
- **Scope Estimate**: Single Component（frontend のリソース詳細画面に閉じる。バックエンド変更なし）
- **Complexity Estimate**: Moderate（週/月表示切り替え・期間ナビゲーション・予約フォームへの新規クエリパラメータ設計・カレンダーUIの自作実装が必要）

## 機能要件

| # | 要件 |
|---|------|
| RSV-01 | リソース詳細画面（`/resources/{id}`）にカレンダー形式の空き状況ビューを追加する |
| RSV-02 | カレンダーは週表示・月表示を切り替えられる |
| RSV-03 | カレンダー上で予約済み枠はグレーアウト、空き枠はクリック可能とし、クリックで予約申請フォーム（`/reservations/new`）に開始日時を引き渡す |
| RSV-04 | 表示期間を変更（前週/次週、前月/次月）すると、その期間の空き情報を再取得して更新する |
| RSV-05 | 既存の「空き状況（予約済み一覧）」リスト表示は、カレンダーに**置き換える**（確定事項。詳細は「決定事項」参照） |

## 決定事項（Requirements Analysis で確定）

### 1. 既存リスト表示の扱い：カレンダーへの置き換え

既存の空き状況リスト（`resources/[id]/page.tsx` の `<ul>` によるスロット一覧表示）は削除し、カレンダー表示に置き換える。

- **理由**: ビジネス要求シートの背景説明が「リスト形式では週・月単位での混雑感が把握しにくい」という課題を前提にしており、カレンダーはこの課題を解決する代替手段として位置づけられている。両方を並べて表示すると同じ情報が二重に見え、画面が冗長になる
- **影響**: 既存テスト `resource-detail-page.test.tsx` はリスト表示の中身自体を検証していない（`getAvailabilityAction` を空配列にモックしているのみ）ため、置き換えによる既存テスト破壊リスクは低い

### 2. カレンダーUIの実装方法：shadcn/uiベースの自作

外部カレンダーライブラリ（react-big-calendar・@fullcalendar/react 等）は導入せず、既存の shadcn/ui コンポーネント（`table.tsx` 等）をベースに自作する。

- **理由**: 新規依存を追加しないため、ライセンス確認・バンドルサイズ増加・将来のライブラリアップデート追従といったコストが発生しない。BookFlow の既存 UI トーン（shadcn/ui ベース）とも統一できる
- **影響**: 週7列・月5〜6週分のグリッド表示ロジックを自前で実装する。日付計算ライブラリ（date-fns 等）は新規導入せず、既存パターン（ネイティブ `Date` と `toISOString().slice(0, 19)`）を踏襲する

### 3. 週表示の週の開始曜日：月曜始まり

週表示の最初の列を月曜日とする（日本の業務カレンダーで一般的な週区切りに合わせる）。

- **影響**: 週の開始日計算ロジック（`date.getDay()` を月曜始まりのオフセットに変換する処理）に反映する

### 4. カレンダーの時刻粒度（RSV-03 の具体化）

- 週表示：1時間単位のグリッド（8:00〜20:00）。曜日×時間帯のマス目をクリックするとその時刻が開始日時として引き継がれる
- 月表示：日単位のセル。日をクリックするとその日の既定時刻（9:00）を開始日時として引き継ぎ、正確な時刻は予約申請フォーム側で調整する

- **理由**: 既存データ・spec に「営業時間」の概念はなく新規定義が必要。週表示は時刻クリックの精度を優先し、月表示は混雑状況の概観把握を優先する（正確な時刻入力は週表示またはフォーム側に委ねる）

## 非機能要件

| # | 要件 |
|---|------|
| NFR-01 | 期間移動（前週/次週・前月/次月）のたびに `getAvailabilityAction` を再呼び出しし、表示を更新する（クライアントサイドでの再取得） |
| NFR-02 | 空き枠クリック→予約申請フォーム遷移時、フォームの `開始日時` 入力欄（`datetime-local` 形式）にクリックした枠の開始時刻が反映される。新規クエリパラメータ名は `startAt` とする（`YYYY-MM-DDTHH:mm` 形式、`resourceId` と同じ `searchParams` 経由） |
| NFR-03 | 既存の空き確認 API（`GET /api/resources/{id}/availability`）以外のバックエンド変更を行わない |
| NFR-04 | 新規 npm 依存を追加しない（決定事項2のとおり自作のため） |

## 拡張設定（いずれも不採用）

| Extension | Enabled | 理由 |
|---|---|---|
| Security Baseline | No | 既存APIをそのまま活用するfrontendの表示変更のみで、新たな認証・権限面の変更が発生しない |
| Resiliency Baseline | No | 既存APIの失敗時（空配列）処理はすでにリソース詳細画面で慣行化されており、新たな耐障害性要求はない |
| Property-Based Testing | No | 既存ユニットでも不採用。代表的な境界値（月末・年跨ぎ等）を例挙テストでカバーすれば十分 |

## 受入条件（ビジネス要求シートより。真実の源として再掲のみ）

- [ ] リソース詳細画面でカレンダー形式の空き状況が表示される
- [ ] 週表示と月表示を切り替えられる
- [ ] カレンダー上の空き枠をクリックすると予約申請フォーム（`/reservations/new`）に開始日時が引き渡される
- [ ] 予約済み枠は視覚的に区別されている（色・パターン・テキスト等）
- [ ] 表示期間を前後に移動できる
- [ ] 既存の空き確認 API（`GET /api/resources/{id}/availability`）以外のバックエンド変更が不要である

## 影響ファイル（一次見立て。Code Generation で確定）

- `frontend/src/app/(authenticated)/resources/[id]/page.tsx`（改修：空き状況リストをカレンダー呼び出しに置き換え）
- `frontend/src/app/(authenticated)/resources/[id]/AvailabilityCalendar.tsx`（新規：カレンダー本体、Client Component）
- `frontend/src/app/(authenticated)/reservations/new/page.tsx`（改修：`startAt` クエリパラメータの読み取り追加）
- `frontend/src/app/(authenticated)/reservations/new/ReservationForm.tsx`（改修：`defaultStartAt` の反映）
- `frontend/tests/unit/` 配下への新規・更新テスト

## スコープ外

- バックエンドの変更（`GET /api/resources/{id}/availability` 以外の新規API・既存APIの変更）
- ADMIN ロール向けの特別な表示
- 日付計算ライブラリ・カレンダー専用ライブラリの新規導入
