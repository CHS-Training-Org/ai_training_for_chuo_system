/**
 * リソース一覧画面（page.tsx）のユニットテスト
 *
 * async Server Component を関数として呼び出し、返された要素を Testing Library で描画する。
 * Server Action と next/navigation は vi.mock で差し替える。
 * keyword が Server Action に渡ること、入力欄の初期値に渡ることを検証する。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MOCK_RESOURCE_LIST_RESPONSE } from "../../msw/handlers";

const { listResourcesAction } = vi.hoisted(() => ({ listResourcesAction: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/server/actions/resources", () => ({ listResourcesAction }));
vi.mock("@/server/actions/auth", () => ({
  getProfileAction: vi.fn().mockResolvedValue({ role: "MEMBER" }),
}));

import ResourcesPage from "@/app/(authenticated)/resources/page";

async function renderPage(searchParams: Record<string, string>) {
  const element = await ResourcesPage({ searchParams: Promise.resolve(searchParams) });
  render(element);
}

describe("ResourcesPage: keyword の受け渡し", () => {
  beforeEach(() => {
    listResourcesAction.mockReset();
    listResourcesAction.mockResolvedValue(MOCK_RESOURCE_LIST_RESPONSE);
  });

  it("URL の keyword を listResourcesAction に渡す", async () => {
    await renderPage({ keyword: "会議", category: "ROOM" });

    expect(listResourcesAction).toHaveBeenCalledWith(
      expect.objectContaining({ keyword: "会議", category: "ROOM" }),
    );
  });

  it("URL の keyword を入力欄の初期値に渡す", async () => {
    await renderPage({ keyword: "会議" });

    expect(screen.getByTestId("resource-filter-keyword-input")).toHaveValue("会議");
  });

  it("keyword がなければ keyword は未指定で渡り、入力欄は空である", async () => {
    await renderPage({});

    expect(listResourcesAction).toHaveBeenCalledWith(
      expect.objectContaining({ keyword: undefined }),
    );
    expect(screen.getByTestId("resource-filter-keyword-input")).toHaveValue("");
  });
});
