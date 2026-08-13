/**
 * ResourceFilterForm の送信時 URL 生成テスト。
 *
 * 並び替え（sort）がデフォルト値のときは URL に sort パラメータを付与しない、
 * デフォルト値以外のときは付与するという分岐（handleSubmit 内のロジック）を検証する。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResourceFilterForm } from "@/app/(authenticated)/resources/ResourceFilterForm";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("ResourceFilterForm", () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it("既定の並び替え（createdAt,asc）のまま送信すると、URL に sort パラメータが付かない", async () => {
    const user = userEvent.setup();
    render(<ResourceFilterForm />);

    await user.click(screen.getByRole("button", { name: "絞り込む" }));

    expect(pushMock).toHaveBeenCalledTimes(1);
    const url = pushMock.mock.calls[0][0] as string;
    expect(url).toBe("/resources?");
    expect(url).not.toContain("sort=");
  });

  it("既定以外の並び替え（name,asc）で送信すると、URL に sort パラメータが付く", async () => {
    const user = userEvent.setup();
    render(<ResourceFilterForm defaultSort="name,asc" />);

    await user.click(screen.getByRole("button", { name: "絞り込む" }));

    expect(pushMock).toHaveBeenCalledTimes(1);
    const url = pushMock.mock.calls[0][0] as string;
    expect(url).toBe("/resources?sort=name%2Casc");
  });
});
