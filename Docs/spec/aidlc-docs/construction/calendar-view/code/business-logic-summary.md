# Business Logic Summary — calendar-view

## 生成したファイル

| ファイル | 役割 |
|---|---|
| `frontend/src/lib/calendar/period.ts` | 週/月表示の期間算出・API用 from/to 文字列変換・前後移動後の基準日算出（純粋関数） |
| `frontend/src/lib/calendar/availability-to-events.ts` | `AvailabilitySlot[]` → 週表示イベント配列への変換、重なり判定（BR-01）、月表示の日単位「予約あり」判定（BR-04） |

## テスト

| ファイル | 件数 | 結果 |
|---|---|---|
| `frontend/tests/unit/lib/calendar/period.test.ts` | 10 | 全件成功 |
| `frontend/tests/unit/lib/calendar/availability-to-events.test.ts` | 9 | 全件成功 |

`pnpm test calendar` で計19件全て成功を確認済み。

## 設計との対応

- `business-logic-model.md` の期間算出ロジック（月曜始まりの暦週、月表示のグリッドパディング）を `period.ts` に実装
- `business-rules.md` の BR-01（重なり判定・端が一致するだけは重なりとみなさない）・BR-04（日単位の予約有無判定、日をまたぐ占有枠への対応）を `availability-to-events.ts` に実装
