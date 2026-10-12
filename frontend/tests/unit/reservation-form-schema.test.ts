import { describe, expect, it } from "vitest";
import { CreateReservationFormSchema } from "@/lib/schemas/reservation";

/**
 * CreateReservationFormSchema（予約申請フォームの検証スキーマ）の単体テスト。
 *
 * 画面を介さず safeParse で検証する。繰り返し予約の終了日の検証（必須・開始日以降・NONE での不要）と、
 * 既存の「終了日時 > 開始日時」を対象とする。
 */

const RESOURCE_ID = "00000000-0000-0000-0000-000000000010";

function input(overrides: Record<string, unknown> = {}) {
  return {
    resourceId: RESOURCE_ID,
    startAt: "2026-11-02T10:00",
    endAt: "2026-11-02T11:00",
    purpose: "定例会議",
    attendeesCount: null,
    ...overrides,
  };
}

function messagesAt(
  result: ReturnType<typeof CreateReservationFormSchema.safeParse>,
  path: string,
) {
  if (result.success) return [];
  return result.error.issues.filter((i) => i.path.join(".") === path).map((i) => i.message);
}

describe("CreateReservationFormSchema", () => {
  describe("繰り返さない（既存の検証）", () => {
    it("recurrenceType 省略: 通る", () => {
      expect(CreateReservationFormSchema.safeParse(input()).success).toBe(true);
    });

    it("NONE で終了日が空文字: 通る（フォームの初期値）", () => {
      const result = CreateReservationFormSchema.safeParse(
        input({ recurrenceType: "NONE", recurrenceUntil: "" }),
      );
      expect(result.success).toBe(true);
    });

    it("終了日時が開始日時以前: endAt にエラー", () => {
      const result = CreateReservationFormSchema.safeParse(
        input({ startAt: "2026-11-02T11:00", endAt: "2026-11-02T10:00" }),
      );
      expect(messagesAt(result, "endAt")).toEqual(["終了日時は開始日時より後に設定してください"]);
    });
  });

  describe("繰り返し終了日の必須", () => {
    it.each(["WEEKLY", "MONTHLY"])("%s で終了日が空文字: recurrenceUntil にエラー", (type) => {
      const result = CreateReservationFormSchema.safeParse(
        input({ recurrenceType: type, recurrenceUntil: "" }),
      );
      expect(messagesAt(result, "recurrenceUntil")).toEqual(["繰り返し終了日は必須です"]);
    });

    it("WEEKLY で終了日が未指定（null）: recurrenceUntil にエラー", () => {
      const result = CreateReservationFormSchema.safeParse(
        input({ recurrenceType: "WEEKLY", recurrenceUntil: null }),
      );
      expect(messagesAt(result, "recurrenceUntil")).toEqual(["繰り返し終了日は必須です"]);
    });
  });

  describe("繰り返し終了日の範囲", () => {
    it("開始日より前: recurrenceUntil にエラー", () => {
      const result = CreateReservationFormSchema.safeParse(
        input({ recurrenceType: "WEEKLY", recurrenceUntil: "2026-11-01" }),
      );
      expect(messagesAt(result, "recurrenceUntil")).toEqual([
        "繰り返し終了日は開始日以降にしてください",
      ]);
    });

    it("開始日と同じ日: 通る（1 件だけ登録される）", () => {
      const result = CreateReservationFormSchema.safeParse(
        input({ recurrenceType: "WEEKLY", recurrenceUntil: "2026-11-02" }),
      );
      expect(result.success).toBe(true);
    });

    it("開始日より後: 通る", () => {
      const result = CreateReservationFormSchema.safeParse(
        input({ recurrenceType: "MONTHLY", recurrenceUntil: "2027-01-02" }),
      );
      expect(result.success).toBe(true);
    });

    it("開始日時が空のとき: 範囲のエラーは出さず、開始日時の必須だけが出る", () => {
      const result = CreateReservationFormSchema.safeParse(
        input({ startAt: "", recurrenceType: "WEEKLY", recurrenceUntil: "2026-11-01" }),
      );
      expect(messagesAt(result, "recurrenceUntil")).toEqual([]);
      expect(messagesAt(result, "startAt")).toEqual(["開始日時は必須です"]);
    });

    it("開始日のちょうど 2 年後: 通る（上限は 2 年後の同じ日まで）", () => {
      const result = CreateReservationFormSchema.safeParse(
        input({ recurrenceType: "WEEKLY", recurrenceUntil: "2028-11-02" }),
      );
      expect(result.success).toBe(true);
    });

    it("開始日の 2 年後の翌日: recurrenceUntil にエラー", () => {
      const result = CreateReservationFormSchema.safeParse(
        input({ recurrenceType: "WEEKLY", recurrenceUntil: "2028-11-03" }),
      );
      expect(messagesAt(result, "recurrenceUntil")).toEqual([
        "繰り返し終了日は開始日から 2 年以内にしてください",
      ]);
    });

    it("毎月でも 2 年を超えるとエラー", () => {
      const result = CreateReservationFormSchema.safeParse(
        input({ recurrenceType: "MONTHLY", recurrenceUntil: "2029-11-02" }),
      );
      expect(messagesAt(result, "recurrenceUntil")).toEqual([
        "繰り返し終了日は開始日から 2 年以内にしてください",
      ]);
    });

    it("開始日が 2 月 29 日: 上限は 2 年後の 2 月 28 日（平年）で、翌日はエラー", () => {
      // 2028 年はうるう年、2030 年は平年。BE の LocalDate.plusYears と同じ丸め
      const ok = CreateReservationFormSchema.safeParse(
        input({
          startAt: "2028-02-29T10:00",
          endAt: "2028-02-29T11:00",
          recurrenceType: "MONTHLY",
          recurrenceUntil: "2030-02-28",
        }),
      );
      const over = CreateReservationFormSchema.safeParse(
        input({
          startAt: "2028-02-29T10:00",
          endAt: "2028-02-29T11:00",
          recurrenceType: "MONTHLY",
          recurrenceUntil: "2030-03-01",
        }),
      );
      expect(ok.success).toBe(true);
      expect(messagesAt(over, "recurrenceUntil")).toEqual([
        "繰り返し終了日は開始日から 2 年以内にしてください",
      ]);
    });

    it("NONE では終了日の範囲を検証しない", () => {
      const result = CreateReservationFormSchema.safeParse(
        input({ recurrenceType: "NONE", recurrenceUntil: "2026-11-01" }),
      );
      expect(result.success).toBe(true);
    });
  });
});
