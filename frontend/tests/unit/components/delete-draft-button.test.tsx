/**
 * DeleteDraftButton（詳細画面の「この下書きを削除する」）のテスト。
 *
 * 削除は物理削除で元に戻せないため、確認ダイアログで「削除する」を押したときだけ削除する。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
const deleteReservationAction = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, back: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/server/actions/reservations", () => ({
  deleteReservationAction: (...args: unknown[]) => deleteReservationAction(...args),
}));

import { DeleteDraftButton } from "@/app/(authenticated)/reservations/[id]/DeleteDraftButton";

describe("DeleteDraftButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteReservationAction.mockResolvedValue(undefined);
  });

  it("ボタンを押しただけでは削除されず、確認ダイアログが出る", async () => {
    const user = userEvent.setup();
    render(<DeleteDraftButton reservationId="r-1" />);

    await user.click(screen.getByRole("button", { name: "この下書きを削除する" }));

    expect(await screen.findByText("下書きの削除確認")).toBeInTheDocument();
    expect(deleteReservationAction).not.toHaveBeenCalled();
  });

  it("ダイアログの「戻る」を押すと、削除されずにダイアログが閉じる", async () => {
    const user = userEvent.setup();
    render(<DeleteDraftButton reservationId="r-1" />);

    await user.click(screen.getByRole("button", { name: "この下書きを削除する" }));
    await user.click(await screen.findByRole("button", { name: "戻る" }));

    await waitFor(() => expect(screen.queryByText("下書きの削除確認")).not.toBeInTheDocument());
    expect(deleteReservationAction).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("ダイアログの「削除する」を押すと、その予約を削除し、一覧へ遷移する", async () => {
    const user = userEvent.setup();
    render(<DeleteDraftButton reservationId="r-1" />);

    await user.click(screen.getByRole("button", { name: "この下書きを削除する" }));
    await user.click(await screen.findByRole("button", { name: "削除する" }));

    await waitFor(() => expect(deleteReservationAction).toHaveBeenCalledWith("r-1"));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/reservations"));
  });
});
