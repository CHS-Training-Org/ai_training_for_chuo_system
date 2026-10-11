# Frontend 層サマリ — ユニット: calendar-view（カレンダービュー）

## 変更ファイル一覧

### 新規作成

| ファイル | 内容 |
|---|---|
| `frontend/src/app/(authenticated)/resources/[id]/AvailabilityCalendar.tsx` | 空き状況カレンダー本体（`"use client"`）。週表示（月曜始まり、8:00〜20:00の1時間グリッド）・月表示の切り替え、期間ナビゲーション、セルの占有判定、クリック時の予約申請フォームへの日時引き継ぎを実装 |
| `frontend/tests/unit/availability-calendar.test.tsx` | `AvailabilityCalendar` のコンポーネントテスト（8ケース） |
| `frontend/tests/unit/reservation-form.test.tsx` | `ReservationForm` の `defaultStartAt` 反映テスト（2ケース、新規） |

### 変更

| ファイル | 変更内容 |
|---|---|
| `frontend/src/app/(authenticated)/resources/[id]/page.tsx` | 既存の空き状況リスト表示（`<ul>`）と、そのための `getAvailabilityAction` 呼び出し・from/to算出コードを削除し、`<AvailabilityCalendar resourceId={resource.id} isActive={resource.isActive} />` に置き換え |
| `frontend/src/app/(authenticated)/reservations/new/page.tsx` | `searchParams` から `startAt` を読み取り `defaultStartAt` として `ReservationForm` に渡す |
| `frontend/src/app/(authenticated)/reservations/new/ReservationForm.tsx` | props に `defaultStartAt?: string` を追加し、開始日時入力欄の初期値（`defaultValues.startAt`）に反映 |
| `frontend/tests/unit/resource-detail-page.test.tsx` | 削除した空き状況リスト表示の検証を除去し、カレンダーが描画されることを検証する内容に更新。`AvailabilityCalendar` の `useRouter` 呼び出しに対応する `next/navigation` モックを追加。`AvailabilityCalendar` の非同期初期取得が解決されるのを待つよう `renderPage` ヘルパーを更新（act 警告防止） |
| `docs-next/docs/spec/screen-spec.md` | §`/resources/{id}`：「空き状況リスト」の行を「カレンダー表示」に置き換え、操作方法（期間移動・クリック連携・月表示のグレーアウト判定基準・`is_active=false`時の扱い）を追記。§`/reservations/new`：`startAt` クエリパラメータの説明を追記 |

## 実装したロジック（Functional Design の確定内容をそのまま実装）

- **週/月のfrom-to算出**：週は月曜始まり7日間、月は月初〜翌月初（いずれも半開区間）。`toISOString().slice(0, 19)` という既存パターンをそのまま踏襲し、新規の日付計算ライブラリは導入していない
- **占有判定**：既存バックエンド（`ResourceService#availability`）と同じ半開区間の重なり判定 `aStart < bEnd && bStart < aEnd` をフロント側に実装。週表示はセル単位（1時間）で判定、月表示は営業時間（8:00〜20:00）が占有スロットで完全に覆われている場合のみ「予約済み」と判定する区間マージ判定（`isFullyCovered`）を実装
- **クリック時の日時組み立て**：週表示はクリックしたセルの時刻そのまま、月表示はクリックした日の9:00を既定値として、`YYYY-MM-DDTHH:mm` 形式で `/reservations/new?resourceId=...&startAt=...` に遷移
- **状態管理**：`useState` のみ使用（`mode`・`anchorDate`・`slots`・`isLoading`・`error`）。画面内に閉じたローカル状態のため `zustand` は使わない
- **業務ルール**：`isActive=false` のリソースではカレンダーは表示するが空き枠クリックは無効化（既存の「このリソースを予約する」ボタンの非表示と一貫させる）。期間移動時の取得失敗時は直前のデータを保持し、エラーメッセージを表示する（空扱いへの巻き戻しによる誤表示を防ぐ）

## テスト実装上の技術的な注意点

- **`vi.useFakeTimers()` と `@testing-library/react` の `waitFor` の非互換**：RTL の `waitFor` は内部で `setTimeout` を使ってポーリングするが、fake timers 配下ではこの `setTimeout` が自動的に進まず、テストがハングする（実際に最初の実装でタイムアウトが発生した）。Vitest 本体が提供する `vi.waitFor` は、fake timers が有効なときに内部で `vi.advanceTimersByTime` を自動的に呼び出す実装になっているため、こちらを使うことで解決した
- **`userEvent` と fake timers の組み合わせでのハング**：`userEvent.setup({ advanceTimers: ... })` を使っても `user.click()` がフェイクタイマー環境下でハングする事象が発生したため、単純なクリック操作には `fireEvent.click()`（同期的でタイマーに依存しない）を使うよう統一した
- **ボタンの `disabled` 状態を待たずにクリックすると操作が無視される**：期間ナビゲーションボタンは直前の取得中（`isLoading`）は無効化されるため、取得完了（`isLoading` が `false` に戻る）を待ってからクリックする必要がある。待たずにテストを書いた結果、クリックが実行されず呼び出し回数のアサーションが失敗する不具合を実際に踏んだ
- **システム時刻の固定**：`vi.setSystemTime(new Date(2026, 0, 5, 10, 0, 0))`（2026-01-05 月曜日）に固定し、週/月の境界計算を決定的にした

## 自己検証（break-and-verify）

占有判定ロジック（`isOverlapping`）を一時的に無効化（常に `false` を返すよう改変）し、`availability-calendar.test.tsx` の週表示・月表示の占有判定テスト2件が red になることを確認したうえで復元し、再度 green になることを確認した。

## 動作確認（手動・ブラウザ）

ローカルの `pnpm dev` 環境で、MEMBER ロールでサインインし、リソース詳細画面（「第1会議室」）を実際に開いて確認した。

- 週表示：2026/10/5（月）〜10/11（日）、8:00〜19:00のグリッドが表示される
- 月表示：2026年10月の月間グリッド（前月の空白セルを含む）が正しく表示される
- 週表示のセル（10月6日 10:00）をクリックすると、`/reservations/new?resourceId=...&startAt=2026-10-06T10%3A00` へ遷移し、開始日時入力欄に `2026-10-06T10:00` が反映されることを確認した

## スコープ外（本ユニットで対応していない）

- バックエンドの変更（`GET /api/resources/{id}/availability` 以外の新規API・既存APIの変更）
- 外部カレンダーライブラリ・日付計算ライブラリの導入
- ADMIN ロール向けの特別な表示

## backend-summary.md について

本ユニットは frontend の表示拡張のみでバックエンドのコード変更がないため、`backend-summary.md` は作成していない。
