/**
 * ReservationEditForm の送信先の分岐テスト。
 *
 * 下書きの編集画面では、Enter キーでの送信を「下書き保存」に向け、
 * 取り消せない正式申請は「申請する」ボタンを押したときだけ行う。
 * この分岐（どの操作で `draft: true` を付けるか）を、実際のフォームを描画して確認する。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
const updateReservationAction = vi.fn();
const tryUpdateReservationAction = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, back: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/server/actions/reservations", () => ({
  updateReservationAction: (...args: unknown[]) => updateReservationAction(...args),
  tryUpdateReservationAction: (...args: unknown[]) => tryUpdateReservationAction(...args),
}));

import { ReservationEditForm } from "@/app/(authenticated)/reservations/[id]/edit/ReservationEditForm";

const defaultValues = {
  startAt: "2030-06-10T10:00:00",
  endAt: "2030-06-10T12:00:00",
  purpose: "週次ミーティング",
  attendeesCount: 5,
};

function renderForm(status: "DRAFT" | "PENDING") {
  return render(
    <ReservationEditForm
      reservationId="r-1"
      status={status}
      defaultValues={defaultValues}
      resourceName="会議室A"
    />,
  );
}

describe("ReservationEditForm（下書き）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateReservationAction.mockResolvedValue({});
    tryUpdateReservationAction.mockResolvedValue({ ok: true, reservation: {} });
  });

  it("入力欄で Enter を押すと、draft: true 付きで下書き保存され、正式申請は行われない", async () => {
    const user = userEvent.setup();
    renderForm("DRAFT");

    await user.type(screen.getByPlaceholderText("例: 10"), "{Enter}");

    await waitFor(() => expect(updateReservationAction).toHaveBeenCalledTimes(1));
    expect(updateReservationAction).toHaveBeenCalledWith(
      "r-1",
      expect.objectContaining({ purpose: "週次ミーティング" }),
      { draft: true },
    );
    expect(tryUpdateReservationAction).not.toHaveBeenCalled();
  });

  it("「下書き保存」を押すと、draft: true 付きで更新される", async () => {
    const user = userEvent.setup();
    renderForm("DRAFT");

    await user.click(screen.getByRole("button", { name: "下書き保存" }));

    await waitFor(() => expect(updateReservationAction).toHaveBeenCalledTimes(1));
    expect(updateReservationAction).toHaveBeenCalledWith("r-1", expect.anything(), {
      draft: true,
    });
    expect(tryUpdateReservationAction).not.toHaveBeenCalled();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/reservations/r-1"));
  });

  it("「申請する」を押すと、draft を付けずに正式申請される", async () => {
    const user = userEvent.setup();
    renderForm("DRAFT");

    await user.click(screen.getByRole("button", { name: "申請する" }));

    await waitFor(() => expect(tryUpdateReservationAction).toHaveBeenCalledTimes(1));
    expect(tryUpdateReservationAction).toHaveBeenCalledWith("r-1", expect.anything());
    expect(updateReservationAction).not.toHaveBeenCalled();
  });

  it("正式申請で時間帯が重複したら、重複の文言を表示し、画面遷移しない", async () => {
    tryUpdateReservationAction.mockResolvedValue({ ok: false, conflict: true });
    const user = userEvent.setup();
    renderForm("DRAFT");

    await user.click(screen.getByRole("button", { name: "申請する" }));

    expect(await screen.findByText(/既に予約が入っています/)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});

describe("ReservationEditForm（承認待ち）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tryUpdateReservationAction.mockResolvedValue({ ok: true, reservation: {} });
  });

  it("「更新する」だけが出て、押しても draft は付かない", async () => {
    const user = userEvent.setup();
    renderForm("PENDING");

    expect(screen.queryByRole("button", { name: "下書き保存" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "更新する" }));

    await waitFor(() => expect(tryUpdateReservationAction).toHaveBeenCalledTimes(1));
    expect(tryUpdateReservationAction).toHaveBeenCalledWith("r-1", expect.anything());
    expect(updateReservationAction).not.toHaveBeenCalled();
  });
});
