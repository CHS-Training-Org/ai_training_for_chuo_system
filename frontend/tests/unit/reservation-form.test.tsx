/**
 * ReservationForm の defaultStartAt 初期値反映（RSV-09）を検証する。
 *
 * リソース選択欄（Radix Select）のマウント自体は対象とするが、選択操作のクリック挙動は
 * resource-filter-form.test.ts と同じ理由（jsdomでの不安定さ）でテスト対象外とする。
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReservationForm } from "@/app/(authenticated)/reservations/new/ReservationForm";
import type { ResourceResponse } from "@/lib/types/api";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

// createReservationAction は @/lib/session 経由で Better Auth（Cognito）設定を読み込むため、
// レンダリングのみを検証するこのテストでは実体を読み込まずモックする。
vi.mock("@/server/actions/reservations", () => ({
  createReservationAction: vi.fn(),
}));

const RESOURCES: ResourceResponse[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "会議室A",
    category: "ROOM",
    capacity: null,
    location: null,
    requiresApproval: false,
    isActive: true,
    description: null,
    createdAt: "2026-01-01T00:00:00",
  },
];

describe("ReservationForm", () => {
  it("defaultStartAtが指定されている場合、開始日時欄の初期値に反映される", () => {
    render(
      <ReservationForm
        resources={RESOURCES}
        defaultResourceId={RESOURCES[0].id}
        defaultStartAt="2026-08-20T14:00"
      />,
    );

    const startAtInput = screen.getByLabelText("開始日時 *") as HTMLInputElement;
    expect(startAtInput.value).toBe("2026-08-20T14:00");
  });

  it("defaultStartAtが未指定の場合、開始日時欄は空のままになる", () => {
    render(<ReservationForm resources={RESOURCES} />);

    const startAtInput = screen.getByLabelText("開始日時 *") as HTMLInputElement;
    expect(startAtInput.value).toBe("");
  });
});
