# Requirements: カレンダービュー

## Intent Analysis Summary

- **User Request**: 「STEP-05 中級課題 Issue #27 カレンダービューに着手します」。Inception として requirements.md と実行計画を作成する
- **Source of Truth**: `docs-next/docs/spec/enhancements/intermediate/calendar-view.md`（RSV-01 から RSV-05、受入条件 6 項目）
- **Request Type**: Enhancement（既存の UC-02 リソース一覧・空き確認の表示拡張）
- **Scope Estimate**: Multiple Components（frontend のみ。リソース詳細画面と予約申請フォーム）
- **Complexity Estimate**: Moderate（日付計算とタイムゾーン、占有判定、期間移動の状態管理がある）
- **Requirements Depth**: Standard
- **制約**: Backend の変更は禁止。既存の `GET /api/resources/{id}/availability` のみを利用する
- **Brownfield 入力**: `Docs/spec/aidlc-docs/inception/reverse-engineering/` を参照

## Clarification Results

| # | 論点 | 決定 | 決定者 |
|---|------|------|--------|
| Q1 | 表示時間帯 | 8:00 から 20:00（8:00-9:00 の枠から 19:00-20:00 の枠まで、12 枠） | 学習者 |
| Q2 | 時間刻み | 1 時間 | 学習者 |
| Q3 | 過去の空き枠 | クリック不可（グレー表示） | 学習者 |
| Q4 | 非アクティブなリソース | 予約不可。空き枠もクリック不可 | 学習者 |
| Q5 | 承認フラグなど追加情報の表示 | 今回は対象外 | 学習者 |
| Q6 | 状態の持ち方 | URL の `searchParams`（Zustand は使わない） | 提案（要確認） |
| Q7 | ライブラリ | 導入しない（shadcn/ui + Tailwind + 標準 `Date` で自作） | 提案（要確認） |
| Q8 | 既存の空き状況リスト | 残して共存させる（RSV-05） | 提案（要確認） |
| Q9 | 週の開始曜日 | 月曜日 | 提案（要確認） |
| Q10 | 時刻の基準（タイムゾーン） | 「現在時刻」「枠の境界」は Asia/Tokyo で扱う。バックエンドの `startAt`/`endAt`（タイムゾーンなし）も Asia/Tokyo の壁時計時刻とみなす | 提案（要確認） |
| Ext-1 | Security Baseline | 有効にしない（読み取り UI のみで、認可は既存のまま） | 提案（要確認） |
| Ext-2 | Resiliency Baseline | 有効にしない | 提案（要確認） |
| Ext-3 | Property-Based Testing | 適用しない | 提案（要確認） |

Q10 の背景：実行環境のタイムゾーンは UTC（`date` で確認）で、既存の詳細ページは `toISOString()`（UTC）で `from`/`to` を作っている。Server Component は実行環境のタイムゾーンで動くため、そのままでは「現在時刻」と「過去判定」が最大 9 時間ずれる。

## Functional Requirements

| # | 要件 | 根拠 |
|---|------|------|
| FR-01 | リソース詳細画面（`/resources/{id}`）に、週単位の時間グリッド形式の空き状況カレンダーを追加する。縦軸は 8:00 から 20:00 の 1 時間枠（12 枠）、横軸は 7 日（月曜から日曜） | RSV-01、Q1、Q2、Q9 |
| FR-02 | 週表示と月表示を切り替えられる。切り替えは URL の `view=week`、`view=month` で表現する（既定は `week`） | RSV-02、Q6 |
| FR-03 | 前へ・次へ・今日のボタンで表示期間を移動できる。週表示は 7 日、月表示は 1 か月単位。移動は URL の `date=YYYY-MM-DD`（表示期間に含まれる日）で表現する | 受入条件 5、Q6 |
| FR-04 | 表示期間が変わるたびに、その期間に合わせた `from`/`to` で `getAvailabilityAction` を呼び、占有スロットを取り直す。週表示は表示 7 日の 0:00 から翌週 0:00 の直前まで、月表示は月グリッドの先頭日から末尾日まで（前後月の日を含む） | RSV-04 |
| FR-05 | `from`/`to` はローカル時刻を `YYYY-MM-DDTHH:mm:ss` に整形して作る（`toISOString()` は使わない） | Q10 |
| FR-06 | 週表示の 1 枠は、枠の時間範囲と重なる占有スロットが 1 件でもあれば「予約済み」とし、グレーアウトして押せなくする。重なりの判定は半開区間（`slot.startAt < 枠終了 かつ slot.endAt > 枠開始`）。枠をまたぐ予約は、重なる全ての枠を予約済みにする | RSV-03、受入条件 4 |
| FR-07 | 予約済みでない枠のうち、開始時刻が現在時刻以降のものを「空き枠」とし、クリック可能にする。クリックで `/reservations/new?resourceId={id}&startAt={開始}&endAt={開始+1 時間}` へ遷移する（値は `datetime-local` 形式 `YYYY-MM-DDTHH:mm`） | RSV-03、受入条件 3 |
| FR-08 | 開始時刻が現在時刻より前の枠は、予約済みでなくてもグレーアウトして押せなくする。予約済みの枠と見分けがつく表示にする（例：予約済みは斜線または「予約済み」の文字、過去は薄いグレー） | Q3、受入条件 4 |
| FR-09 | `resource.isActive` が false のリソースでは、全ての枠を押せなくする（予約済み・過去の表示は FR-06、FR-08 のまま）。既存の「このリソースを予約する」ボタンの非表示と整合させる | Q4 |
| FR-10 | 月表示は日ごとのセルとし、その日の占有スロット件数（`reservationId` の重複なし）を表示する。セルをクリックすると、その日を含む週の週表示へ移動する。月表示では枠単位の予約はしない | RSV-02 |
| FR-11 | 予約申請フォーム（`/reservations/new`）は `startAt`、`endAt` のクエリパラメータを受け取り、開始日時・終了日時の初期値に設定する。値が `datetime-local` 形式でない場合は無視する。`resourceId` の既存の挙動は変えない | 受入条件 3 |
| FR-12 | URL の `view`、`date` が不正な場合は、既定値（`view=week`、`date=今日`）にフォールバックする。エラーにしない | 堅牢性 |
| FR-13 | 空き状況の取得に失敗しても、リソース詳細の表示は維持する（既存の挙動を踏襲）。カレンダー領域には取得失敗の旨を表示する | 既存の挙動 |
| FR-14 | 既存の空き状況リスト（当日から 7 日後）は残し、カレンダーの下に置く。リストの挙動は変えない | RSV-05、Q8 |

## Non-Functional Requirements

- **Backend 変更禁止**：`backend/` と `api-spec.md` の API 定義は変更しない。`getAvailabilityAction` も変更しない
- **Server Components 優先**：カレンダーは Server Component で描画し、移動・切り替えは `<Link>` で行う。`"use client"` は付けない（必要になった場合は理由を計画に記録する）
- **状態管理**：Zustand は使わない（URL が単一の状態源）
- **依存**：新しいライブラリは追加しない。追加が必要になった場合は、`pnpm add` の前にライセンスを確認し、計画を更新して承認を得る
- **アクセシビリティ**：空き枠はリンク、押せない枠は非リンクの要素とし、予約済み・過去・無効の状態を色だけに頼らず文字や属性でも示す（`aria-label`、`aria-disabled`）
- **品質**：oxlint、oxfmt（`pnpm format:check`）、`pnpm test`、`pnpm build` を通す。既存テストは引き続き pass する
- **性能**：新たな要件なし（1 回の取得は 1 週間または 1 か月分）

## Out of Scope

- Backend の変更、新しい API の追加
- 承認フラグ（`requiresApproval`）など追加情報のカレンダー上の表示（Q5）
- 営業時間の外（8:00 より前、20:00 より後）の表示。この範囲の予約は枠として表示されない（月表示の件数には含まれる）
- 日表示、ドラッグでの時間範囲選択、複数枠の連続選択
- 予約の作成・取消そのもの（予約フォームは既存のまま。初期値の受け取りのみ追加する）
- 既存の空き状況リストの UTC によるずれの修正（FR-14 のとおり変更しない。気付いた点として記録する）
- E2E テストの追加（後続課題 `e2e-test-coverage`）

## Acceptance Criteria

シートの受入条件 6 項目を採用する（真実の源はシート側）。

- [ ] リソース詳細画面でカレンダー形式の空き状況が表示される
- [ ] 週表示と月表示を切り替えられる
- [ ] カレンダー上の空き枠をクリックすると予約申請フォーム（`/reservations/new`）に開始日時が引き渡される
- [ ] 予約済み枠は視覚的に区別されている（色・パターン・テキスト等）
- [ ] 表示期間を前後に移動できる
- [ ] 既存の空き確認 API（`GET /api/resources/{id}/availability`）以外のバックエンド変更が不要である

## 追加の受入観点（本ステージの提案）

- 過去の枠、非アクティブなリソースの全枠が押せない（FR-08、FR-09）
- 占有スロットが枠をまたぐ場合、境界ちょうど（例：10:00 終了と 10:00 開始）で隣の枠を巻き込まない（FR-06）
- 週・月をまたぐ移動（12 月から 1 月、月末の週）で `from`/`to` が正しい（FR-03、FR-04）
- 実行環境が UTC でも、枠と「過去」の判定が Asia/Tokyo 基準で正しい（FR-05、Q10）
- 不正な `view`、`date` で画面が壊れない（FR-12）
- 予約フォームに `startAt`、`endAt` が初期値として入り、不正な値は無視される（FR-11）

## Spec Updates Required（Spec-first）

- `docs-next/docs/spec/screen-spec.md` §`/resources/{id}`：カレンダー UI（週・月、移動、グレーアウト、クリック動作、`view`/`date`）。§`/reservations/new`：`startAt`/`endAt` の受け取り
- `docs-next/docs/spec/requirements.md`：カレンダービューの要件の追記（反映要否は `/update-spec` で判断する）
- `api-spec.md`、`er-diagram.md`：変更なし
- 反映は `/update-spec` で Code Generation の前に行う
