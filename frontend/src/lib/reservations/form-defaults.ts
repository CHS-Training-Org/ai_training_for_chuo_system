/**
 * 予約申請フォーム（ReservationForm）の初期値組み立てロジック（純粋関数）。
 *
 * resourceId・startAt はリソース詳細画面の空き状況カレンダーからの遷移時にクエリパラメータ
 * （`?resourceId=...&startAt=...`）で渡される（未指定の場合は空欄にする）。
 */
export interface ReservationFormDefaultValues {
  resourceId: string;
  startAt: string;
  endAt: string;
  purpose: string;
  attendeesCount: number | null;
}

export function buildDefaultFormValues(
  defaultResourceId: string | undefined,
  defaultStartAt: string | undefined,
): ReservationFormDefaultValues {
  return {
    resourceId: defaultResourceId ?? "",
    startAt: defaultStartAt ?? "",
    endAt: "",
    purpose: "",
    attendeesCount: null,
  };
}
