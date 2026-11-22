/**
 * 下書きの「正式申請」「削除」ボタンのクリック動作テスト。
 * 正式申請: 成功時の再読込 / 409・承認者不在のメッセージ / 想定外エラーの再 throw。
 * 削除: 確認ダイアログ後の削除実行と一覧への遷移。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiClientError } from "@/lib/api-client";

const submitReservationAction = vi.fn();
const deleteReservationAction = vi.fn();
vi.mock("@/server/actions/reservations", () => ({
  submitReservationAction: (...args: unknown[]) => submitReservationAction(...args),
  deleteReservationAction: (...args: unknown[]) => deleteReservationAction(...args),
}));
const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh, back: vi.fn() }),
}));

const { SubmitDraftButton } =
  await import("@/app/(authenticated)/reservations/[id]/SubmitDraftButton");
const { DeleteDraftButton } =
  await import("@/app/(authenticated)/reservations/[id]/DeleteDraftButton");

const ID = "40000000-0000-0000-0000-000000000001";
const VALUES = {
  startAt: "2025-07-01T10:00:00",
  endAt: "2025-07-01T12:00:00",
  purpose: "週次ミーティング",
  attendeesCount: 5,
};

describe("SubmitDraftButton", () => {
  beforeEach(() => {
    submitReservationAction.mockReset();
    push.mockReset();
    refresh.mockReset();
  });

  it("成功時: 保存済みの内容で申請し、画面を再読込する", async () => {
    submitReservationAction.mockResolvedValue({});
    const user = userEvent.setup();
    render(<SubmitDraftButton reservationId={ID} values={VALUES} />);

    await user.click(screen.getByTestId("reservation-detail-submit-button"));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(submitReservationAction).toHaveBeenCalledWith(ID, VALUES);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("409 RESERVATION_CONFLICT: 重複メッセージを表示し、再読込しない", async () => {
    submitReservationAction.mockRejectedValue(new ApiClientError("RESERVATION_CONFLICT", "x", 409));
    const user = userEvent.setup();
    render(<SubmitDraftButton reservationId={ID} values={VALUES} />);

    await user.click(screen.getByTestId("reservation-detail-submit-button"));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "指定した時間帯は既に予約が入っています",
    );
    expect(refresh).not.toHaveBeenCalled();
  });

  it("422 APPROVER_NOT_AVAILABLE: 承認者不在メッセージを表示し、再読込しない", async () => {
    submitReservationAction.mockRejectedValue(
      new ApiClientError("APPROVER_NOT_AVAILABLE", "x", 422),
    );
    const user = userEvent.setup();
    render(<SubmitDraftButton reservationId={ID} values={VALUES} />);

    await user.click(screen.getByTestId("reservation-detail-submit-button"));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "承認者が存在しないため正式申請できません。管理者に連絡してください。",
    );
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("DeleteDraftButton", () => {
  beforeEach(() => {
    deleteReservationAction.mockReset().mockResolvedValue(undefined);
    push.mockReset();
  });

  it("確認ダイアログで「削除する」を押すと削除し、一覧へ遷移する", async () => {
    const user = userEvent.setup();
    render(<DeleteDraftButton reservationId={ID} />);

    await user.click(screen.getByTestId("reservation-detail-delete-button"));
    expect(deleteReservationAction).not.toHaveBeenCalled();
    await user.click(await screen.findByTestId("reservation-delete-confirm-button"));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/reservations"));
    expect(deleteReservationAction).toHaveBeenCalledWith(ID);
  });

  it("「戻る」を押すと削除せず遷移もしない", async () => {
    const user = userEvent.setup();
    render(<DeleteDraftButton reservationId={ID} />);

    await user.click(screen.getByTestId("reservation-detail-delete-button"));
    await user.click(await screen.findByRole("button", { name: "戻る" }));

    expect(deleteReservationAction).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
});
