/**
 * ReservationForm のコンポーネントテスト（React Testing Library）。
 *
 * 空き状況カレンダーの空き枠クリック経由の `defaultStartAt`（`?startAt=` クエリパラメータ）が
 * 開始日時入力欄の初期値として反映されることを検証する（本ユニットの新規追加分）。
 * フォーム送信・バリデーション等の既存ロジックは本ユニットの変更対象外のため検証しない。
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReservationForm } from "@/app/(authenticated)/reservations/new/ReservationForm";
import type { ResourceResponse } from "@/lib/types/api";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

vi.mock("@/server/actions/reservations", () => ({
  createReservationAction: vi.fn(),
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
  it("defaultStartAt が指定されている場合、開始日時入力欄の初期値として反映される", () => {
    render(<ReservationForm resources={RESOURCES} defaultStartAt="2026-01-15T09:00" />);

    expect(screen.getByLabelText("開始日時 *")).toHaveValue("2026-01-15T09:00");
  });

  it("defaultStartAt が未指定の場合、開始日時入力欄は空のまま", () => {
    render(<ReservationForm resources={RESOURCES} />);

    expect(screen.getByLabelText("開始日時 *")).toHaveValue("");
  });
});
