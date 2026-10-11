/**
 * ReservationForm のコンポーネントテスト（React Testing Library）。
 *
 * 空き状況カレンダーの空き枠クリック経由の `defaultStartAt`（`?startAt=` クエリパラメータ）が
 * 開始日時入力欄の初期値として反映されることを検証する。
 * 「下書き保存」ボタン（reservation-draft ユニット）が `draft: true` を付与して送信することを検証する。
 * バリデーション等のその他の既存ロジックは本ユニットの変更対象外のため検証しない。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReservationForm } from "@/app/(authenticated)/reservations/new/ReservationForm";
import type { ResourceResponse } from "@/lib/types/api";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, back: vi.fn() }),
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

describe("ReservationForm", () => {
  beforeEach(() => {
    pushMock.mockClear();
    createReservationActionMock.mockClear();
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
    createReservationActionMock.mockResolvedValue({});
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
    createReservationActionMock.mockResolvedValue({});
    const user = userEvent.setup();
    render(<ReservationForm resources={RESOURCES} defaultResourceId={RESOURCES[0].id} />);

    await user.type(screen.getByLabelText("開始日時 *"), "2026-01-15T09:00");
    await user.type(screen.getByLabelText("終了日時 *"), "2026-01-15T10:00");
    await user.type(screen.getByLabelText("利用目的 *"), "通常申請テスト");
    await user.click(screen.getByTestId("reservation-form-submit-button"));

    expect(createReservationActionMock).toHaveBeenCalledTimes(1);
    expect(createReservationActionMock.mock.calls[0][0]).toMatchObject({ draft: false });
  });
});
