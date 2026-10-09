/**
 * SubmitDraftButton のコンポーネントテスト。
 *
 * 正式申請の本体である `status="PENDING"` の受け渡しと、409 を受けたときの分岐を検証する。
 * どちらも純関数に切り出せない（Server Action の呼び出しとダイアログの状態に閉じた）振る舞いのため、
 * @testing-library/react でレンダリングして確認する（ADR-009）。
 *
 * 409 以外のエラーを再スローする分岐はテストしていない。startTransition の中から投げた例外は
 * React のエラーバウンダリに渡らず未処理の rejection になるため、テストランナー側で
 * 握りつぶす以外に観測する手段がない。実アプリではこの経路が Next.js のエラー画面に出ることを
 * ブラウザで確認済み（build-and-test/manual-verification.md シナリオ6）。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiClientError } from "@/lib/api-client";

const updateReservationAction = vi.fn();
const refresh = vi.fn();

vi.mock("@/server/actions/reservations", () => ({
  updateReservationAction: (...args: unknown[]) => updateReservationAction(...args),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push: vi.fn() }),
}));

const { SubmitDraftButton } =
  await import("@/app/(authenticated)/reservations/[id]/SubmitDraftButton");

const RESERVATION_ID = "550e8400-e29b-41d4-a716-446655440030";
const VALUES = {
  startAt: "2026-12-15T10:00:00",
  endAt: "2026-12-15T12:00:00",
  purpose: "下書きの確認",
  attendeesCount: 4,
};

function renderButton() {
  return render(<SubmitDraftButton reservationId={RESERVATION_ID} values={VALUES} />);
}

/** ダイアログを開いて「申請する」を押す。 */
async function openAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId("reservation-detail-submit-draft-button"));
  await screen.findByText("正式申請の確認");
  await user.click(screen.getByRole("button", { name: "申請する" }));
}

describe("SubmitDraftButton", () => {
  beforeEach(() => {
    updateReservationAction.mockReset();
    refresh.mockReset();
  });

  it("確認ダイアログを経ずに送信しない", async () => {
    const user = userEvent.setup();
    renderButton();

    expect(screen.queryByText("正式申請の確認")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("reservation-detail-submit-draft-button"));

    expect(await screen.findByText("正式申請の確認")).toBeInTheDocument();
    expect(updateReservationAction).not.toHaveBeenCalled();
  });

  it("正式申請では status に 'PENDING' を渡す", async () => {
    updateReservationAction.mockResolvedValue({ id: RESERVATION_ID, status: "PENDING" });
    const user = userEvent.setup();
    renderButton();

    await openAndSubmit(user);

    await waitFor(() => {
      expect(updateReservationAction).toHaveBeenCalledWith(RESERVATION_ID, VALUES, "PENDING");
    });
  });

  it("成功時はダイアログを閉じて画面を再描画する", async () => {
    updateReservationAction.mockResolvedValue({ id: RESERVATION_ID, status: "PENDING" });
    const user = userEvent.setup();
    renderButton();

    await openAndSubmit(user);

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText("正式申請の確認")).not.toBeInTheDocument());
  });

  it("409 のときはダイアログ内にメッセージを出し、編集画面への導線に切り替える", async () => {
    updateReservationAction.mockRejectedValue(
      new ApiClientError("RESERVATION_CONFLICT", "重複予約があります", 409),
    );
    const user = userEvent.setup();
    renderButton();

    await openAndSubmit(user);

    expect(await screen.findByText(/既に予約が入っています/)).toBeInTheDocument();
    // 同じ日時で再試行しても同じ 409 になるため、「申請する」は編集画面へのリンクに置き換わる
    const link = screen.getByRole("link", { name: "日時を変更する" });
    expect(link).toHaveAttribute("href", `/reservations/${RESERVATION_ID}/edit`);
    expect(screen.queryByRole("button", { name: "申請する" })).not.toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });
});
