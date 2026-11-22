/**
 * 予約申請フォーム（ReservationForm）の「下書き保存」「予約を申請する」のテスト。
 * 送信ペイロードの draft 有無と、必須項目未入力時に送信されないことを検証する。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MOCK_RESOURCE_RESPONSE } from "../msw/handlers";
import type { ResourceResponse } from "@/lib/types/api";

const createReservationAction = vi.fn();
vi.mock("@/server/actions/reservations", () => ({
  createReservationAction: (...args: unknown[]) => createReservationAction(...args),
}));
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, back: vi.fn(), refresh: vi.fn() }),
}));

const { ReservationForm } = await import("@/app/(authenticated)/reservations/new/ReservationForm");

const RESOURCE = MOCK_RESOURCE_RESPONSE as ResourceResponse;

function fillRequired(purpose = "打合せ") {
  fireEvent.change(screen.getByLabelText("開始日時 *"), { target: { value: "2025-07-01T10:00" } });
  fireEvent.change(screen.getByLabelText("終了日時 *"), { target: { value: "2025-07-01T12:00" } });
  fireEvent.change(screen.getByLabelText("利用目的 *"), { target: { value: purpose } });
}

describe("ReservationForm 下書き保存", () => {
  beforeEach(() => {
    createReservationAction.mockReset().mockResolvedValue({});
    push.mockReset();
  });

  it("「下書き保存」で draft: true が送信され、一覧へ遷移する", async () => {
    const user = userEvent.setup();
    render(<ReservationForm resources={[RESOURCE]} defaultResourceId={RESOURCE.id} />);
    fillRequired();

    await user.click(screen.getByTestId("reservation-form-draft-button"));

    await waitFor(() => expect(createReservationAction).toHaveBeenCalledTimes(1));
    expect(createReservationAction.mock.calls[0][0]).toMatchObject({
      resourceId: RESOURCE.id,
      purpose: "打合せ",
      draft: true,
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith("/reservations"));
  });

  it("「予約を申請する」では draft が送信されない", async () => {
    const user = userEvent.setup();
    render(<ReservationForm resources={[RESOURCE]} defaultResourceId={RESOURCE.id} />);
    fillRequired();

    await user.click(screen.getByTestId("reservation-form-submit-button"));

    await waitFor(() => expect(createReservationAction).toHaveBeenCalledTimes(1));
    expect(createReservationAction.mock.calls[0][0]).not.toHaveProperty("draft");
  });

  it("必須項目（利用目的）が未入力の「下書き保存」は送信されない", async () => {
    const user = userEvent.setup();
    render(<ReservationForm resources={[RESOURCE]} defaultResourceId={RESOURCE.id} />);
    fillRequired("");

    await user.click(screen.getByTestId("reservation-form-draft-button"));

    expect(await screen.findByText("利用目的は必須です")).toBeInTheDocument();
    expect(createReservationAction).not.toHaveBeenCalled();
  });
});
