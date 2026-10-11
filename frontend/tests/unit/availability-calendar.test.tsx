/**
 * AvailabilityCalendar のコンポーネントテスト（React Testing Library）。
 *
 * "use client" コンポーネントであり jsdom 上でレンダリング可能なため、
 * 実際の操作（週/月切り替え・期間移動・セルクリック）を介して検証する。
 * システム時刻は 2026-01-05（月曜日）に固定し、週表示・月表示の境界計算を決定的にする。
 * クリックは fireEvent を使う（userEvent は内部で実時間の待機を伴う部分があり、
 * fake timers と組み合わせるとテストがハングするため）。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AvailabilityCalendar } from "@/app/(authenticated)/resources/[id]/AvailabilityCalendar";
import type { AvailabilitySlot } from "@/lib/types/api";

// RTL の waitFor は setTimeout ベースのポーリングで、fake timers 配下では
// 自動的に時計を進めないため待機が成立しない。vi.waitFor は fake timers 有効時に
// 内部で vi.advanceTimersByTime を呼ぶため、こちらを使う。
const waitFor = vi.waitFor;

const pushMock = vi.fn();
const getAvailabilityActionMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/server/actions/resources", () => ({
  getAvailabilityAction: (...args: unknown[]) => getAvailabilityActionMock(...args),
}));

const RESOURCE_ID = "20000000-0000-0000-0000-000000000001";

function makeSlot(id: string, startAt: string, endAt: string): AvailabilitySlot {
  return { reservationId: id, startAt, endAt };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 0, 5, 10, 0, 0)); // 2026-01-05（月）10:00
  pushMock.mockClear();
  getAvailabilityActionMock.mockReset();
  getAvailabilityActionMock.mockResolvedValue([]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("AvailabilityCalendar", () => {
  it("初期表示は週表示で、当該週の空き状況を取得する", async () => {
    render(<AvailabilityCalendar resourceId={RESOURCE_ID} isActive={true} />);

    await waitFor(() => expect(getAvailabilityActionMock).toHaveBeenCalledTimes(1));
    const [, from, to] = getAvailabilityActionMock.mock.calls[0];
    expect(from).toBe("2026-01-05T00:00:00");
    expect(to).toBe("2026-01-12T00:00:00");
  });

  it("週表示で予約済みの時間帯のセルは無効化され、空いているセルはクリック可能", async () => {
    getAvailabilityActionMock.mockResolvedValue([
      makeSlot("r1", "2026-01-05T10:00:00", "2026-01-05T11:00:00"),
    ]);
    render(<AvailabilityCalendar resourceId={RESOURCE_ID} isActive={true} />);

    await waitFor(() => expect(screen.getByLabelText("1月5日 10:00")).toBeDisabled());
    expect(screen.getByLabelText("1月5日 11:00")).not.toBeDisabled();
    expect(screen.getByLabelText("1月5日 9:00")).not.toBeDisabled();
  });

  it("週表示で空きセルをクリックすると、クリックした時刻を startAt として予約申請フォームへ遷移する", async () => {
    render(<AvailabilityCalendar resourceId={RESOURCE_ID} isActive={true} />);

    await waitFor(() => expect(getAvailabilityActionMock).toHaveBeenCalled());
    fireEvent.click(screen.getByLabelText("1月5日 14:00"));

    expect(pushMock).toHaveBeenCalledTimes(1);
    const pushedUrl = new URL(pushMock.mock.calls[0][0], "http://localhost");
    expect(pushedUrl.pathname).toBe("/reservations/new");
    expect(pushedUrl.searchParams.get("resourceId")).toBe(RESOURCE_ID);
    expect(pushedUrl.searchParams.get("startAt")).toBe("2026-01-05T14:00");
  });

  it("「次週」を押すと、次の週の期間で空き状況を再取得する", async () => {
    render(<AvailabilityCalendar resourceId={RESOURCE_ID} isActive={true} />);

    await waitFor(() => expect(getAvailabilityActionMock).toHaveBeenCalledTimes(1));
    // 直前の取得の isLoading が解消され、ボタンの disabled が外れるのを待ってからクリックする。
    await waitFor(() =>
      expect(screen.getByTestId("availability-calendar-next")).not.toBeDisabled(),
    );
    fireEvent.click(screen.getByTestId("availability-calendar-next"));

    await waitFor(() => expect(getAvailabilityActionMock).toHaveBeenCalledTimes(2));
    const [, from, to] = getAvailabilityActionMock.mock.calls[1];
    expect(from).toBe("2026-01-12T00:00:00");
    expect(to).toBe("2026-01-19T00:00:00");
  });

  it("月表示に切り替えると、当月の期間で空き状況を再取得する", async () => {
    render(<AvailabilityCalendar resourceId={RESOURCE_ID} isActive={true} />);

    await waitFor(() => expect(getAvailabilityActionMock).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByTestId("availability-calendar-mode-month"));

    await waitFor(() => expect(getAvailabilityActionMock).toHaveBeenCalledTimes(2));
    const [, from, to] = getAvailabilityActionMock.mock.calls[1];
    expect(from).toBe("2026-01-01T00:00:00");
    expect(to).toBe("2026-02-01T00:00:00");
  });

  it("月表示で営業時間全体が埋まっている日のみグレーアウトし、一部空きの日はクリック可能", async () => {
    getAvailabilityActionMock.mockResolvedValue([
      // 1/10: 営業時間（8:00〜20:00）を完全に覆う占有
      makeSlot("r1", "2026-01-10T08:00:00", "2026-01-10T20:00:00"),
      // 1/15: 一部のみ占有（8:00〜12:00）
      makeSlot("r2", "2026-01-15T08:00:00", "2026-01-15T12:00:00"),
    ]);
    render(<AvailabilityCalendar resourceId={RESOURCE_ID} isActive={true} />);

    await waitFor(() => expect(getAvailabilityActionMock).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByTestId("availability-calendar-mode-month"));
    await waitFor(() => expect(getAvailabilityActionMock).toHaveBeenCalledTimes(2));

    await waitFor(() => expect(screen.getByLabelText("1月10日")).toBeDisabled());
    expect(screen.getByLabelText("1月15日")).not.toBeDisabled();
  });

  it("月表示で一部空きの日セルをクリックすると、その日の既定時刻（9:00）を startAt として引き継ぐ", async () => {
    getAvailabilityActionMock.mockResolvedValue([
      makeSlot("r2", "2026-01-15T08:00:00", "2026-01-15T12:00:00"),
    ]);
    render(<AvailabilityCalendar resourceId={RESOURCE_ID} isActive={true} />);

    await waitFor(() => expect(getAvailabilityActionMock).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByTestId("availability-calendar-mode-month"));
    await waitFor(() => expect(getAvailabilityActionMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByLabelText("1月15日")).not.toBeDisabled());

    fireEvent.click(screen.getByLabelText("1月15日"));

    expect(pushMock).toHaveBeenCalledTimes(1);
    const pushedUrl = new URL(pushMock.mock.calls[0][0], "http://localhost");
    expect(pushedUrl.searchParams.get("startAt")).toBe("2026-01-15T09:00");
    // 保留中の isLoading 更新を解消してからテストを終える（act 警告防止）。
    await waitFor(() =>
      expect(screen.getByTestId("availability-calendar-next")).not.toBeDisabled(),
    );
  });

  it("isActive が false の場合、空いているセルも無効化され予約導線が作られない", async () => {
    render(<AvailabilityCalendar resourceId={RESOURCE_ID} isActive={false} />);

    await waitFor(() => expect(getAvailabilityActionMock).toHaveBeenCalled());
    expect(screen.getByLabelText("1月5日 14:00")).toBeDisabled();
    await waitFor(() =>
      expect(screen.getByTestId("availability-calendar-next")).not.toBeDisabled(),
    );
  });
});
