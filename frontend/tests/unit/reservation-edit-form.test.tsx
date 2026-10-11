/**
 * ReservationEditForm のコンポーネントテスト（React Testing Library）。
 *
 * `isDraft` プロパティに応じて「正式申請する」ボタンの表示が切り替わること、
 * クリック時に `submit: true` を付与して送信することを検証する（reservation-draft ユニット）。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReservationEditForm } from "@/app/(authenticated)/reservations/[id]/edit/ReservationEditForm";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const updateReservationActionMock = vi.fn();

vi.mock("@/server/actions/reservations", () => ({
  updateReservationAction: (...args: unknown[]) => updateReservationActionMock(...args),
}));

const DEFAULT_VALUES = {
  startAt: "2026-01-15T09:00:00",
  endAt: "2026-01-15T10:00:00",
  purpose: "下書きの目的",
  attendeesCount: null,
};

describe("ReservationEditForm", () => {
  beforeEach(() => {
    pushMock.mockClear();
    updateReservationActionMock.mockClear();
  });

  it("isDraft=false の場合、「正式申請する」ボタンは表示されない", () => {
    render(
      <ReservationEditForm
        reservationId="20000000-0000-0000-0000-000000000001"
        defaultValues={DEFAULT_VALUES}
        resourceName="第1会議室"
      />,
    );

    expect(screen.queryByTestId("reservation-edit-form-submit-button")).not.toBeInTheDocument();
  });

  it("isDraft=true の場合、「正式申請する」ボタンが表示される", () => {
    render(
      <ReservationEditForm
        reservationId="20000000-0000-0000-0000-000000000001"
        defaultValues={DEFAULT_VALUES}
        resourceName="第1会議室"
        isDraft={true}
      />,
    );

    expect(screen.getByTestId("reservation-edit-form-submit-button")).toBeInTheDocument();
  });

  it("「正式申請する」ボタンをクリックすると、submit: true を付与して送信する", async () => {
    updateReservationActionMock.mockResolvedValue({});
    const user = userEvent.setup();
    render(
      <ReservationEditForm
        reservationId="20000000-0000-0000-0000-000000000001"
        defaultValues={DEFAULT_VALUES}
        resourceName="第1会議室"
        isDraft={true}
      />,
    );

    await user.click(screen.getByTestId("reservation-edit-form-submit-button"));

    expect(updateReservationActionMock).toHaveBeenCalledTimes(1);
    expect(updateReservationActionMock.mock.calls[0][1]).toMatchObject({ submit: true });
    expect(pushMock).toHaveBeenCalledWith("/reservations/20000000-0000-0000-0000-000000000001");
  });

  it("「更新する」ボタンをクリックすると、submit: false を付与して送信する", async () => {
    updateReservationActionMock.mockResolvedValue({});
    const user = userEvent.setup();
    render(
      <ReservationEditForm
        reservationId="20000000-0000-0000-0000-000000000001"
        defaultValues={DEFAULT_VALUES}
        resourceName="第1会議室"
        isDraft={true}
      />,
    );

    await user.click(screen.getByTestId("reservation-edit-form-update-button"));

    expect(updateReservationActionMock).toHaveBeenCalledTimes(1);
    expect(updateReservationActionMock.mock.calls[0][1]).toMatchObject({ submit: false });
  });
});
