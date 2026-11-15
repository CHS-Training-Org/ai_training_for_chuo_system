/**
 * 予約の新規画面（ReservationForm）の送信先の分岐テスト。
 *
 * 「下書き保存」は draft: true を付けて作成し、「予約を申請する」は付けない。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
const createReservationAction = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, back: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/server/actions/reservations", () => ({
  createReservationAction: (...args: unknown[]) => createReservationAction(...args),
}));

import { ReservationForm } from "@/app/(authenticated)/reservations/new/ReservationForm";
import type { ResourceResponse } from "@/lib/types/api";

const resources = [
  { id: "00000000-0000-4000-8000-000000000001", name: "会議室A", requiresApproval: false },
] as unknown as ResourceResponse[];

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("開始日時 *"), "2030-06-10T10:00");
  await user.type(screen.getByLabelText("終了日時 *"), "2030-06-10T12:00");
  await user.type(screen.getByLabelText("利用目的 *"), "週次ミーティング");
}

describe("ReservationForm（新規）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createReservationAction.mockResolvedValue({});
  });

  it("「下書き保存」を押すと、draft: true 付きで作成し、下書きタブへ遷移する", async () => {
    const user = userEvent.setup();
    render(<ReservationForm resources={resources} defaultResourceId={resources[0].id} />);
    await fillForm(user);

    await user.click(screen.getByRole("button", { name: "下書き保存" }));

    await waitFor(() => expect(createReservationAction).toHaveBeenCalledTimes(1));
    expect(createReservationAction).toHaveBeenCalledWith(
      expect.objectContaining({ resourceId: resources[0].id, purpose: "週次ミーティング" }),
      { draft: true },
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/reservations?status=DRAFT"));
  });

  it("「予約を申請する」を押すと、draft を付けずに作成する", async () => {
    const user = userEvent.setup();
    render(<ReservationForm resources={resources} defaultResourceId={resources[0].id} />);
    await fillForm(user);

    await user.click(screen.getByRole("button", { name: "予約を申請する" }));

    await waitFor(() => expect(createReservationAction).toHaveBeenCalledTimes(1));
    expect(createReservationAction).toHaveBeenCalledWith(expect.anything());
    await waitFor(() => expect(push).toHaveBeenCalledWith("/reservations"));
  });
});
