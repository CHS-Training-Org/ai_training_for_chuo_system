/**
 * DeleteDraftButton のコンポーネントテスト。
 *
 * 削除は取り消せない操作のため、確認ダイアログを経ずに送信しないことと、
 * 成功後に一覧へ戻ることを検証する。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const deleteReservationAction = vi.fn();
const push = vi.fn();

vi.mock("@/server/actions/reservations", () => ({
  deleteReservationAction: (...args: unknown[]) => deleteReservationAction(...args),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
}));

const { DeleteDraftButton } =
  await import("@/app/(authenticated)/reservations/[id]/DeleteDraftButton");

const RESERVATION_ID = "550e8400-e29b-41d4-a716-446655440030";

describe("DeleteDraftButton", () => {
  beforeEach(() => {
    deleteReservationAction.mockReset();
    push.mockReset();
  });

  it("確認ダイアログを経ずに削除しない", async () => {
    const user = userEvent.setup();
    render(<DeleteDraftButton reservationId={RESERVATION_ID} />);

    await user.click(screen.getByTestId("reservation-detail-delete-draft-button"));

    expect(await screen.findByText("下書きの削除確認")).toBeInTheDocument();
    expect(deleteReservationAction).not.toHaveBeenCalled();
  });

  it("「戻る」を押すと削除せずにダイアログを閉じる", async () => {
    const user = userEvent.setup();
    render(<DeleteDraftButton reservationId={RESERVATION_ID} />);

    await user.click(screen.getByTestId("reservation-detail-delete-draft-button"));
    await screen.findByText("下書きの削除確認");
    await user.click(screen.getByRole("button", { name: "戻る" }));

    await waitFor(() => expect(screen.queryByText("下書きの削除確認")).not.toBeInTheDocument());
    expect(deleteReservationAction).not.toHaveBeenCalled();
  });

  it("「削除する」で対象 ID を渡し、成功後に予約一覧へ遷移する", async () => {
    deleteReservationAction.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<DeleteDraftButton reservationId={RESERVATION_ID} />);

    await user.click(screen.getByTestId("reservation-detail-delete-draft-button"));
    await screen.findByText("下書きの削除確認");
    await user.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => expect(deleteReservationAction).toHaveBeenCalledWith(RESERVATION_ID));
    // 削除後は対象の詳細が存在しないため、同じ画面に留まらず一覧へ戻す
    await waitFor(() => expect(push).toHaveBeenCalledWith("/reservations"));
  });
});
