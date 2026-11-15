/**
 * SubmitDraftButton（詳細画面の「この下書きを正式に申請する」）のテスト。
 *
 * - 押すと、draft を付けずに（= 正式申請として）tryUpdateReservationAction を呼ぶ。
 * - 時間帯が重複したときは、文言を出して画面を再読み込みしない（下書きのまま残る）。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const refresh = vi.fn();
const tryUpdateReservationAction = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh }),
}));
vi.mock("@/server/actions/reservations", () => ({
  tryUpdateReservationAction: (...args: unknown[]) => tryUpdateReservationAction(...args),
}));

import { SubmitDraftButton } from "@/app/(authenticated)/reservations/[id]/SubmitDraftButton";

function renderButton() {
  return render(
    <SubmitDraftButton
      reservationId="r-1"
      startAt="2030-06-10T10:00:00"
      endAt="2030-06-10T12:00:00"
      purpose="週次ミーティング"
      attendeesCount={5}
    />,
  );
}

describe("SubmitDraftButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("押すと、draft を付けずに、日時を 16 文字にそろえて正式申請し、成功したら再読み込みする", async () => {
    tryUpdateReservationAction.mockResolvedValue({ ok: true, reservation: {} });
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole("button", { name: "この下書きを正式に申請する" }));

    await waitFor(() => expect(tryUpdateReservationAction).toHaveBeenCalledTimes(1));
    // 引数は 2 つだけ（3 つ目に { draft: true } を渡すと、下書き保存になってしまう）
    expect(tryUpdateReservationAction).toHaveBeenCalledWith("r-1", {
      startAt: "2030-06-10T10:00",
      endAt: "2030-06-10T12:00",
      purpose: "週次ミーティング",
      attendeesCount: 5,
    });
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/既に予約が入っています/)).not.toBeInTheDocument();
  });

  it("時間帯が重複したら、文言を出し、画面を再読み込みしない", async () => {
    tryUpdateReservationAction.mockResolvedValue({ ok: false, conflict: true });
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole("button", { name: "この下書きを正式に申請する" }));

    expect(await screen.findByText(/既に予約が入っています/)).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("重複の文言は、再度押したときにいったん消える", async () => {
    tryUpdateReservationAction.mockResolvedValueOnce({ ok: false, conflict: true });
    tryUpdateReservationAction.mockResolvedValueOnce({ ok: true, reservation: {} });
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole("button", { name: "この下書きを正式に申請する" }));
    expect(await screen.findByText(/既に予約が入っています/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "この下書きを正式に申請する" }));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/既に予約が入っています/)).not.toBeInTheDocument();
  });
});
