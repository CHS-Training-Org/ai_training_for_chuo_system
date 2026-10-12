/**
 * ReservationForm のコンポーネントテスト（React Testing Library）。
 *
 * 空き状況カレンダーの空き枠クリック経由の `defaultStartAt`（`?startAt=` クエリパラメータ）が
 * 開始日時入力欄の初期値として反映されることを検証する。
 * 「下書き保存」ボタン（reservation-draft ユニット）が `draft: true` を付与して送信することを検証する。
 * 繰り返し予約（recurring-reservation ユニット）の入力 UI（種別の Select、条件付きの終了日、検証、
 * 送信ペイロード、件数付きトースト、409 の表示）を検証する。検証ルール自体は
 * reservation-form-schema.test.ts でも画面なしで検証している。
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReservationForm } from "@/app/(authenticated)/reservations/new/ReservationForm";
import { ApiClientError } from "@/lib/api-client";
import type { ResourceResponse } from "@/lib/types/api";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, back: vi.fn() }),
}));

const toastSuccessMock = vi.fn();

vi.mock("sonner", () => ({
  toast: { success: (...args: unknown[]) => toastSuccessMock(...args), error: vi.fn() },
}));

const createReservationActionMock = vi.fn();

vi.mock("@/server/actions/reservations", () => ({
  createReservationAction: (...args: unknown[]) => createReservationActionMock(...args),
}));

const RESOURCES: ResourceResponse[] = [
  {
    id: "20000000-0000-0000-0000-000000000001",
    name: "第1会議室",
    category: "ROOM",
    capacity: 10,
    location: "3F",
    requiresApproval: false,
    isActive: true,
    description: null,
    equipment: null,
    notes: null,
    createdAt: "2025-04-01T09:00:00",
  },
];

/** 空の予約 1 件を返す Server Action のモック（レスポンスは常に配列）。 */
const ONE_RESERVATION = [{}];

beforeAll(() => {
  // Radix Select を jsdom で開くための polyfill（hasPointerCapture 等が jsdom に未実装のため）
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();
  window.HTMLElement.prototype.setPointerCapture = vi.fn();
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

/** 「繰り返し」Select を開いて、指定のラベルの選択肢を選ぶ。 */
async function selectRecurrence(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByTestId("reservation-form-recurrence-type"));
  await user.click(await screen.findByRole("option", { name: label }));
}

/** 必須項目を入力する（リソースは defaultResourceId で選択済み）。 */
async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("開始日時 *"), "2026-01-15T09:00");
  await user.type(screen.getByLabelText("終了日時 *"), "2026-01-15T10:00");
  await user.type(screen.getByLabelText("利用目的 *"), "定例会議");
}

describe("ReservationForm", () => {
  beforeEach(() => {
    pushMock.mockClear();
    createReservationActionMock.mockReset();
    createReservationActionMock.mockResolvedValue(ONE_RESERVATION);
    toastSuccessMock.mockClear();
  });

  it("defaultStartAt が指定されている場合、開始日時入力欄の初期値として反映される", () => {
    render(<ReservationForm resources={RESOURCES} defaultStartAt="2026-01-15T09:00" />);

    expect(screen.getByLabelText("開始日時 *")).toHaveValue("2026-01-15T09:00");
  });

  it("defaultStartAt が未指定の場合、開始日時入力欄は空のまま", () => {
    render(<ReservationForm resources={RESOURCES} />);

    expect(screen.getByLabelText("開始日時 *")).toHaveValue("");
  });

  it("「下書き保存」ボタンをクリックすると、draft: true を付与して送信する", async () => {
    // Radix Select（リソース選択）は jsdom では hasPointerCapture 未実装のため開けない
    // （Playwright E2E で別途検証済み）。ここでは defaultResourceId でリソース選択済みの
    // 状態を再現し、下書き保存ボタンの送信ロジックのみを検証する。
    createReservationActionMock.mockResolvedValue(ONE_RESERVATION);
    const user = userEvent.setup();
    render(<ReservationForm resources={RESOURCES} defaultResourceId={RESOURCES[0].id} />);

    await user.type(screen.getByLabelText("開始日時 *"), "2026-01-15T09:00");
    await user.type(screen.getByLabelText("終了日時 *"), "2026-01-15T10:00");
    await user.type(screen.getByLabelText("利用目的 *"), "下書きテスト");
    await user.click(screen.getByTestId("reservation-form-draft-button"));

    expect(createReservationActionMock).toHaveBeenCalledTimes(1);
    expect(createReservationActionMock.mock.calls[0][0]).toMatchObject({ draft: true });
    expect(pushMock).toHaveBeenCalledWith("/reservations?status=DRAFT");
  });

  it("「予約を申請する」ボタンをクリックすると、draft: false を付与して送信する", async () => {
    createReservationActionMock.mockResolvedValue(ONE_RESERVATION);
    const user = userEvent.setup();
    render(<ReservationForm resources={RESOURCES} defaultResourceId={RESOURCES[0].id} />);

    await user.type(screen.getByLabelText("開始日時 *"), "2026-01-15T09:00");
    await user.type(screen.getByLabelText("終了日時 *"), "2026-01-15T10:00");
    await user.type(screen.getByLabelText("利用目的 *"), "通常申請テスト");
    await user.click(screen.getByTestId("reservation-form-submit-button"));

    expect(createReservationActionMock).toHaveBeenCalledTimes(1);
    expect(createReservationActionMock.mock.calls[0][0]).toMatchObject({ draft: false });
    expect(pushMock).toHaveBeenCalledWith("/reservations");
  });

  describe("繰り返し予約", () => {
    it("初期値は「繰り返さない」で、繰り返し終了日の入力欄は表示されない", () => {
      render(<ReservationForm resources={RESOURCES} />);

      expect(screen.getByTestId("reservation-form-recurrence-type")).toHaveTextContent(
        "繰り返さない",
      );
      expect(screen.queryByTestId("reservation-form-recurrence-until")).not.toBeInTheDocument();
    });

    it("「毎週」を選ぶと、繰り返し終了日の入力欄が現れる", async () => {
      const user = userEvent.setup();
      render(<ReservationForm resources={RESOURCES} />);

      await selectRecurrence(user, "毎週");

      expect(screen.getByTestId("reservation-form-recurrence-until")).toBeInTheDocument();
      expect(screen.getByLabelText("繰り返し終了日 *")).toHaveAttribute("type", "date");
    });

    it("「繰り返さない」に戻すと、繰り返し終了日の入力欄が消える", async () => {
      const user = userEvent.setup();
      render(<ReservationForm resources={RESOURCES} />);

      await selectRecurrence(user, "毎月");
      expect(screen.getByTestId("reservation-form-recurrence-until")).toBeInTheDocument();
      await selectRecurrence(user, "繰り返さない");

      expect(screen.queryByTestId("reservation-form-recurrence-until")).not.toBeInTheDocument();
    });

    it("「毎週」で終了日が未入力のまま送信すると、エラーを表示して送信しない", async () => {
      const user = userEvent.setup();
      render(<ReservationForm resources={RESOURCES} defaultResourceId={RESOURCES[0].id} />);
      await fillRequiredFields(user);
      await selectRecurrence(user, "毎週");

      await user.click(screen.getByTestId("reservation-form-submit-button"));

      expect(await screen.findByText("繰り返し終了日は必須です")).toBeInTheDocument();
      expect(createReservationActionMock).not.toHaveBeenCalled();
    });

    it("終了日が開始日より前だと、エラーを表示して送信しない", async () => {
      const user = userEvent.setup();
      render(<ReservationForm resources={RESOURCES} defaultResourceId={RESOURCES[0].id} />);
      await fillRequiredFields(user);
      await selectRecurrence(user, "毎週");
      fireEvent.change(screen.getByTestId("reservation-form-recurrence-until"), {
        target: { value: "2026-01-14" },
      });

      await user.click(screen.getByTestId("reservation-form-submit-button"));

      expect(
        await screen.findByText("繰り返し終了日は開始日以降にしてください"),
      ).toBeInTheDocument();
      expect(createReservationActionMock).not.toHaveBeenCalled();
    });

    it("終了日が開始日から 2 年を超えると、エラーを表示して送信しない", async () => {
      const user = userEvent.setup();
      render(<ReservationForm resources={RESOURCES} defaultResourceId={RESOURCES[0].id} />);
      await fillRequiredFields(user); // 開始日は 2026-01-15。2 年後は 2028-01-15
      await selectRecurrence(user, "毎週");
      fireEvent.change(screen.getByTestId("reservation-form-recurrence-until"), {
        target: { value: "2028-01-16" },
      });

      await user.click(screen.getByTestId("reservation-form-submit-button"));

      expect(
        await screen.findByText("繰り返し終了日は開始日から 2 年以内にしてください"),
      ).toBeInTheDocument();
      expect(createReservationActionMock).not.toHaveBeenCalled();
    });

    it("「毎週」と終了日を入力して送信すると、種別と終了日を付けて送信し、件数付きのトーストを出す", async () => {
      createReservationActionMock.mockResolvedValue([{}, {}, {}, {}]);
      const user = userEvent.setup();
      render(<ReservationForm resources={RESOURCES} defaultResourceId={RESOURCES[0].id} />);
      await fillRequiredFields(user);
      await selectRecurrence(user, "毎週");
      fireEvent.change(screen.getByTestId("reservation-form-recurrence-until"), {
        target: { value: "2026-02-05" },
      });

      await user.click(screen.getByTestId("reservation-form-submit-button"));

      await waitFor(() => expect(createReservationActionMock).toHaveBeenCalledTimes(1));
      expect(createReservationActionMock.mock.calls[0][0]).toMatchObject({
        recurrenceType: "WEEKLY",
        recurrenceUntil: "2026-02-05",
        draft: false,
      });
      expect(toastSuccessMock).toHaveBeenCalledWith("4 件の予約を登録しました");
      expect(pushMock).toHaveBeenCalledWith("/reservations");
    });

    it("「繰り返さない」では、終了日を送らず、「1 件の予約を登録しました」と知らせる", async () => {
      const user = userEvent.setup();
      render(<ReservationForm resources={RESOURCES} defaultResourceId={RESOURCES[0].id} />);
      await fillRequiredFields(user);

      await user.click(screen.getByTestId("reservation-form-submit-button"));

      await waitFor(() => expect(createReservationActionMock).toHaveBeenCalledTimes(1));
      const sent = createReservationActionMock.mock.calls[0][0];
      expect(sent).toMatchObject({ recurrenceType: "NONE" });
      expect(sent).not.toHaveProperty("recurrenceUntil");
      expect(toastSuccessMock).toHaveBeenCalledWith("1 件の予約を登録しました");
    });

    it("「毎週」を選んだ後に「繰り返さない」に戻して送信すると、入力済みの終了日も送らない", async () => {
      const user = userEvent.setup();
      render(<ReservationForm resources={RESOURCES} defaultResourceId={RESOURCES[0].id} />);
      await fillRequiredFields(user);
      await selectRecurrence(user, "毎週");
      fireEvent.change(screen.getByTestId("reservation-form-recurrence-until"), {
        target: { value: "2026-02-05" },
      });
      await selectRecurrence(user, "繰り返さない");

      await user.click(screen.getByTestId("reservation-form-submit-button"));

      await waitFor(() => expect(createReservationActionMock).toHaveBeenCalledTimes(1));
      expect(createReservationActionMock.mock.calls[0][0]).not.toHaveProperty("recurrenceUntil");
    });

    it("繰り返しと「下書き保存」の併用: draft: true と終了日を送り、下書きの一覧へ遷移する", async () => {
      createReservationActionMock.mockResolvedValue([{}, {}]);
      const user = userEvent.setup();
      render(<ReservationForm resources={RESOURCES} defaultResourceId={RESOURCES[0].id} />);
      await fillRequiredFields(user);
      await selectRecurrence(user, "毎月");
      fireEvent.change(screen.getByTestId("reservation-form-recurrence-until"), {
        target: { value: "2026-02-15" },
      });

      await user.click(screen.getByTestId("reservation-form-draft-button"));

      await waitFor(() => expect(createReservationActionMock).toHaveBeenCalledTimes(1));
      expect(createReservationActionMock.mock.calls[0][0]).toMatchObject({
        recurrenceType: "MONTHLY",
        recurrenceUntil: "2026-02-15",
        draft: true,
      });
      expect(toastSuccessMock).toHaveBeenCalledWith("2 件の予約を登録しました");
      expect(pushMock).toHaveBeenCalledWith("/reservations?status=DRAFT");
    });

    it("409（重複）: 固定文言を表示し、入力を保持して、遷移もトーストもしない", async () => {
      createReservationActionMock.mockRejectedValue(
        new ApiClientError("RESERVATION_CONFLICT", "重複予約があります", 409),
      );
      const user = userEvent.setup();
      render(<ReservationForm resources={RESOURCES} defaultResourceId={RESOURCES[0].id} />);
      await fillRequiredFields(user);
      await selectRecurrence(user, "毎週");
      fireEvent.change(screen.getByTestId("reservation-form-recurrence-until"), {
        target: { value: "2026-02-05" },
      });

      await user.click(screen.getByTestId("reservation-form-submit-button"));

      expect(
        await screen.findByText(
          "指定した時間帯は既に予約が入っています。別の時間帯を選択してください。",
        ),
      ).toBeInTheDocument();
      expect(screen.getByLabelText("開始日時 *")).toHaveValue("2026-01-15T09:00");
      expect(screen.getByLabelText("利用目的 *")).toHaveValue("定例会議");
      expect(screen.getByTestId("reservation-form-recurrence-until")).toHaveValue("2026-02-05");
      expect(toastSuccessMock).not.toHaveBeenCalled();
      expect(pushMock).not.toHaveBeenCalled();
    });
  });
});
