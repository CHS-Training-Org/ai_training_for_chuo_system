/**
 * リソース詳細画面（resources/[id]/page.tsx）の設備一覧・利用上の注意の表示分岐テスト。
 * 受入条件「未登録時は非表示」を検証する。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MOCK_RESOURCE_RESPONSE } from "../msw/handlers";

const getResourceAction = vi.fn();
const getAvailabilityAction = vi.fn();
vi.mock("@/server/actions/resources", () => ({
  getResourceAction: (...args: unknown[]) => getResourceAction(...args),
  getAvailabilityAction: (...args: unknown[]) => getAvailabilityAction(...args),
}));

const { default: ResourceDetailPage } = await import("@/app/(authenticated)/resources/[id]/page");

async function renderPage() {
  const ui = await ResourceDetailPage({
    params: Promise.resolve({ id: MOCK_RESOURCE_RESPONSE.id }),
  });
  render(ui);
}

describe("ResourceDetailPage 設備一覧・利用上の注意", () => {
  beforeEach(() => {
    getAvailabilityAction.mockResolvedValue([]);
  });

  it("equipment / notes があれば見出しと本文を表示する", async () => {
    getResourceAction.mockResolvedValue({
      ...MOCK_RESOURCE_RESPONSE,
      equipment: "プロジェクター1台",
      notes: "利用後は消灯してください",
    });
    await renderPage();

    expect(screen.getByRole("heading", { name: "設備一覧" })).toBeInTheDocument();
    expect(screen.getByText("プロジェクター1台")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "利用上の注意" })).toBeInTheDocument();
    expect(screen.getByText("利用後は消灯してください")).toBeInTheDocument();
  });

  it("equipment / notes が null なら見出しごと表示しない", async () => {
    getResourceAction.mockResolvedValue({
      ...MOCK_RESOURCE_RESPONSE,
      equipment: null,
      notes: null,
    });
    await renderPage();

    expect(screen.queryByRole("heading", { name: "設備一覧" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "利用上の注意" })).not.toBeInTheDocument();
  });

  it("片方だけ登録されていれば、その項目のみ表示する", async () => {
    getResourceAction.mockResolvedValue({
      ...MOCK_RESOURCE_RESPONSE,
      equipment: "ホワイトボード",
      notes: null,
    });
    await renderPage();

    expect(screen.getByRole("heading", { name: "設備一覧" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "利用上の注意" })).not.toBeInTheDocument();
  });
});
