/**
 * ReservationNewPage（Server Component）のコンポーネントテスト（React Testing Library）。
 *
 * async 関数コンポーネントのため、Next.js のレンダリングパイプラインを介さず
 * 直接呼び出して解決済みの JSX を取得し、render() に渡す形式で検証する。
 *
 * `?startAt=` クエリパラメータを `ReservationForm` の `defaultStartAt` として
 * 実際に中継していることを検証する（page.tsx → ReservationForm の配線自体のテスト）。
 * `ReservationForm` 単体の `defaultStartAt` 反映ロジックは reservation-form.test.tsx、
 * カレンダー側の startAt 付与ロジックは availability-calendar.test.tsx で別途検証する。
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ReservationNewPage from "@/app/(authenticated)/reservations/new/page";
import type { ResourceResponse } from "@/lib/types/api";

const listResourcesActionMock = vi.fn();

vi.mock("@/server/actions/resources", () => ({
  listResourcesAction: (...args: unknown[]) => listResourcesActionMock(...args),
}));

vi.mock("@/server/actions/reservations", () => ({
  createReservationAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

const RESOURCE: ResourceResponse = {
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
};

async function renderPage(searchParams: Record<string, string | undefined>) {
  listResourcesActionMock.mockResolvedValue({
    content: [RESOURCE],
    totalElements: 1,
    totalPages: 1,
    page: 0,
    size: 100,
  });
  const jsx = await ReservationNewPage({ searchParams: Promise.resolve(searchParams) });
  render(jsx);
}

describe("ReservationNewPage", () => {
  it("?startAt= が指定されている場合、開始日時入力欄の初期値として中継される", async () => {
    await renderPage({ resourceId: RESOURCE.id, startAt: "2026-01-15T09:00" });

    expect(screen.getByLabelText("開始日時 *")).toHaveValue("2026-01-15T09:00");
  });

  it("?startAt= が未指定の場合、開始日時入力欄は空のまま", async () => {
    await renderPage({ resourceId: RESOURCE.id });

    expect(screen.getByLabelText("開始日時 *")).toHaveValue("");
  });
});
