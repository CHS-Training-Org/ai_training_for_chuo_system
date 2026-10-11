# Domain Entities — calendar-view

## 結論：新規エンティティ・スキーマ変更なし

本ユニットは既存の `AvailabilitySlot`（`frontend/src/lib/types/api.ts` の `AvailabilitySlotSchema`）をそのまま利用する。DBスキーマ・バックエンドのドメインモデルへの変更は一切ない（requirements.md NFR-03 のとおり）。

## 既存エンティティの再確認

```ts
export const AvailabilitySlotSchema = z.object({
  reservationId: z.string().uuid(),
  startAt: z.string(),
  endAt: z.string(),
});
```

## 本ユニットで新規に導入するフロントエンド限定の値オブジェクト（DBには永続化しない）

以下はコンポーネント内部のローカルな型であり、永続化層・API契約には影響しない。

- `CalendarMode`: `"week" | "month"`
- `WeekCell`: `{ date: Date; hour: number }`（週表示のグリッドセル）
- `MonthCell`: `{ date: Date | null }`（月表示のグリッドセル。`date: null` は前後月の空白セル）
- `CellAvailability`: `"available" | "occupied"`（セルの占有判定結果）
