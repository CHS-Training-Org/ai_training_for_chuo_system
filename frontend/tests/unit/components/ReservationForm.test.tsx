/**
 * ReservationForm の下書き保存に関するコンポーネントテスト。
 *
 * 「下書き保存」と「予約を申請する」の違いは、Server Action に渡す `draft` と成功後の遷移先だけであり、
 * どちらも純関数に切り出せない。ボタンの取り違えを検出するためレンダリングして確認する（ADR-009）。
 *
 * リソース選択は `defaultResourceId` で与える。Radix の Select は jsdom でのポインタ操作が不安定で、
 * ここで検証したい分岐（draft の受け渡し）とも関係しないため。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ResourceResponse } from "@/lib/types/api";

const createReservationAction = vi.fn();
const push = vi.fn();
const back = vi.fn();

vi.mock("@/server/actions/reservations", () => ({
  createReservationAction: (...args: unknown[]) => createReservationAction(...args),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, back, refresh: vi.fn() }),
}));

const { ReservationForm } = await import("@/app/(authenticated)/reservations/new/ReservationForm");

const RESOURCE_ID = "550e8400-e29b-41d4-a716-446655440020";
const CREATED_ID = "550e8400-e29b-41d4-a716-446655440030";

const RESOURCES = [
  {
    id: RESOURCE_ID,
    name: "第1会議室",
    category: "ROOM",
    location: "3階 東",
    capacity: 10,
    requiresApproval: true,
    isActive: true,
    description: null,
    createdAt: "2026-04-01T09:00:00",
  },
] as unknown as ResourceResponse[];

/** 必須項目を埋める（リソースは defaultResourceId で選択済み）。 */
async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  const datetimes = document.querySelectorAll<HTMLInputElement>('input[type="datetime-local"]');
  await user.type(datetimes[0], "2026-12-15T10:00");
  await user.type(datetimes[1], "2026-12-15T12:00");
  await user.type(screen.getByRole("textbox", { name: /利用目的/ }), "下書きの確認");
}

function renderForm() {
  return render(<ReservationForm resources={RESOURCES} defaultResourceId={RESOURCE_ID} />);
}

describe("ReservationForm", () => {
  beforeEach(() => {
    createReservationAction.mockReset();
    push.mockReset();
  });

  it("「下書き保存」は draft=true を渡し、作成した予約の詳細画面へ遷移する", async () => {
    createReservationAction.mockResolvedValue({ id: CREATED_ID, status: "DRAFT" });
    const user = userEvent.setup();
    renderForm();

    await fillForm(user);
    await user.click(screen.getByTestId("reservation-form-save-draft-button"));

    await waitFor(() => expect(createReservationAction).toHaveBeenCalledTimes(1));
    expect(createReservationAction.mock.calls[0][1]).toBe(true);
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/reservations/${CREATED_ID}`));
  });

  it("「予約を申請する」は draft=false を渡し、予約一覧へ遷移する", async () => {
    createReservationAction.mockResolvedValue({ id: CREATED_ID, status: "PENDING" });
    const user = userEvent.setup();
    renderForm();

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "予約を申請する" }));

    await waitFor(() => expect(createReservationAction).toHaveBeenCalledTimes(1));
    expect(createReservationAction.mock.calls[0][1]).toBe(false);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/reservations"));
  });

  it("未入力のまま「下書き保存」を押しても送信しない", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByTestId("reservation-form-save-draft-button"));

    expect(await screen.findByText("開始日時は必須です")).toBeInTheDocument();
    expect(createReservationAction).not.toHaveBeenCalled();
  });
});
