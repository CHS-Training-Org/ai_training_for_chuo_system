/**
 * ReservationFilterForm のコンポーネントテスト（React Testing Library）。
 *
 * "use client" コンポーネントであり jsdom 上でレンダリング可能なため、
 * 実際のフォーム操作（入力・送信・リセット）を介して resourceName の trim・付与ロジックと、
 * 既存のステータスタブ（status パラメータ）を失わずに転記する挙動を検証する。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReservationFilterForm } from "@/app/(authenticated)/reservations/ReservationFilterForm";

const pushMock = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => mockSearchParams,
}));

describe("ReservationFilterForm", () => {
  beforeEach(() => {
    pushMock.mockClear();
    mockSearchParams = new URLSearchParams();
  });

  it("リソース名を入力して絞り込むと、trim した値を resourceName パラメータとして付与する", async () => {
    const user = userEvent.setup();
    render(<ReservationFilterForm />);

    await user.type(
      screen.getByTestId("reservation-filter-form-resource-name-input"),
      "  会議室  ",
    );
    await user.click(screen.getByRole("button", { name: "絞り込む" }));

    expect(pushMock).toHaveBeenCalledTimes(1);
    const pushedUrl = new URL(pushMock.mock.calls[0][0], "http://localhost");
    expect(pushedUrl.pathname).toBe("/reservations");
    expect(pushedUrl.searchParams.get("resourceName")).toBe("会議室");
  });

  it("リソース名が空白のみの場合、resourceName パラメータを付与しない", async () => {
    const user = userEvent.setup();
    render(<ReservationFilterForm />);

    await user.type(screen.getByTestId("reservation-filter-form-resource-name-input"), "   ");
    await user.click(screen.getByRole("button", { name: "絞り込む" }));

    expect(pushMock).toHaveBeenCalledTimes(1);
    const pushedUrl = new URL(pushMock.mock.calls[0][0], "http://localhost");
    expect(pushedUrl.searchParams.has("resourceName")).toBe(false);
  });

  it("defaultResourceName/defaultFrom/defaultTo が指定されている場合、各入力欄の初期値として反映される", () => {
    render(
      <ReservationFilterForm
        defaultResourceName="第1会議室"
        defaultFrom="2025-08-01T10:00"
        defaultTo="2025-08-01T12:00"
      />,
    );

    expect(
      (screen.getByTestId("reservation-filter-form-resource-name-input") as HTMLInputElement).value,
    ).toBe("第1会議室");
    expect(
      (screen.getByTestId("reservation-filter-form-from-input") as HTMLInputElement).value,
    ).toBe("2025-08-01T10:00");
    expect((screen.getByTestId("reservation-filter-form-to-input") as HTMLInputElement).value).toBe(
      "2025-08-01T12:00",
    );
  });

  it("現在選択中の status が URL にある状態で絞り込むと、status を失わず resourceName と共に転記する", async () => {
    mockSearchParams = new URLSearchParams("status=PENDING&status=APPROVED");
    const user = userEvent.setup();
    render(<ReservationFilterForm />);

    await user.type(screen.getByTestId("reservation-filter-form-resource-name-input"), "会議室");
    await user.click(screen.getByRole("button", { name: "絞り込む" }));

    expect(pushMock).toHaveBeenCalledTimes(1);
    const pushedUrl = new URL(pushMock.mock.calls[0][0], "http://localhost");
    expect(pushedUrl.searchParams.getAll("status")).toEqual(["PENDING", "APPROVED"]);
    expect(pushedUrl.searchParams.get("resourceName")).toBe("会議室");
  });

  it("リセットボタンを押すと、status を含むすべてのフィルタを解除して /reservations（既定表示）に遷移する（US-04）", async () => {
    mockSearchParams = new URLSearchParams("status=APPROVED");
    const user = userEvent.setup();
    render(
      <ReservationFilterForm
        defaultResourceName="会議室"
        defaultFrom="2025-08-01T10:00"
        defaultTo="2025-08-01T12:00"
      />,
    );

    await user.click(screen.getByRole("button", { name: "リセット" }));

    expect(pushMock).toHaveBeenCalledWith("/reservations");
  });

  it("from/to を入力して絞り込むと、from/to パラメータとして付与する", async () => {
    const user = userEvent.setup();
    render(<ReservationFilterForm />);

    const fromInput = screen.getByTestId("reservation-filter-form-from-input");
    const toInput = screen.getByTestId("reservation-filter-form-to-input");
    await user.type(fromInput, "2025-08-01T10:00");
    await user.type(toInput, "2025-08-01T12:00");
    await user.click(screen.getByRole("button", { name: "絞り込む" }));

    expect(pushMock).toHaveBeenCalledTimes(1);
    const pushedUrl = new URL(pushMock.mock.calls[0][0], "http://localhost");
    expect(pushedUrl.searchParams.get("from")).toBe("2025-08-01T10:00");
    expect(pushedUrl.searchParams.get("to")).toBe("2025-08-01T12:00");
  });

  it("from/to 未入力の場合、from/to パラメータを付与しない", async () => {
    const user = userEvent.setup();
    render(<ReservationFilterForm />);

    await user.click(screen.getByRole("button", { name: "絞り込む" }));

    expect(pushMock).toHaveBeenCalledTimes(1);
    const pushedUrl = new URL(pushMock.mock.calls[0][0], "http://localhost");
    expect(pushedUrl.searchParams.has("from")).toBe(false);
    expect(pushedUrl.searchParams.has("to")).toBe(false);
  });
});
