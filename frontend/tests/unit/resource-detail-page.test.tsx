/**
 * ResourceDetailPage（Server Component）のコンポーネントテスト（React Testing Library）。
 *
 * async 関数コンポーネントのため、Next.js のレンダリングパイプラインを介さず
 * 直接呼び出して解決済みの JSX を取得し、render() に渡す形式で検証する。
 * 設備一覧・利用上の注意（equipment/notes）の条件表示（未登録時は非表示）を確認する。
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ResourceDetailPage from "@/app/(authenticated)/resources/[id]/page";
import type { ResourceResponse } from "@/lib/types/api";

const getResourceActionMock = vi.fn();
const getAvailabilityActionMock = vi.fn();

vi.mock("@/server/actions/resources", () => ({
  getResourceAction: (...args: unknown[]) => getResourceActionMock(...args),
  getAvailabilityAction: (...args: unknown[]) => getAvailabilityActionMock(...args),
}));

const BASE_RESOURCE: ResourceResponse = {
  id: "20000000-0000-0000-0000-000000000001",
  name: "第1会議室",
  category: "ROOM",
  capacity: 10,
  location: "3F",
  requiresApproval: false,
  isActive: true,
  description: "プロジェクター完備",
  equipment: "プロジェクター1台、ホワイトボード1台",
  notes: "利用後は椅子を元の位置に戻してください",
  createdAt: "2025-04-01T09:00:00",
};

async function renderPage(resource: ResourceResponse) {
  getResourceActionMock.mockResolvedValue(resource);
  getAvailabilityActionMock.mockResolvedValue([]);
  const jsx = await ResourceDetailPage({ params: Promise.resolve({ id: resource.id }) });
  render(jsx);
}

describe("ResourceDetailPage", () => {
  it("設備一覧・利用上の注意が登録されている場合、両方とも表示される", async () => {
    await renderPage(BASE_RESOURCE);

    expect(screen.getByText("設備一覧")).toBeInTheDocument();
    expect(screen.getByText(BASE_RESOURCE.equipment as string)).toBeInTheDocument();
    expect(screen.getByText("利用上の注意")).toBeInTheDocument();
    expect(screen.getByText(BASE_RESOURCE.notes as string)).toBeInTheDocument();
  });

  it("設備一覧が未登録（null）の場合、設備一覧の見出しは表示されない", async () => {
    await renderPage({ ...BASE_RESOURCE, equipment: null });

    expect(screen.queryByText("設備一覧")).not.toBeInTheDocument();
    expect(screen.getByText("利用上の注意")).toBeInTheDocument();
  });

  it("利用上の注意が未登録（null）の場合、利用上の注意の見出しは表示されない", async () => {
    await renderPage({ ...BASE_RESOURCE, notes: null });

    expect(screen.queryByText("利用上の注意")).not.toBeInTheDocument();
    expect(screen.getByText("設備一覧")).toBeInTheDocument();
  });
});
