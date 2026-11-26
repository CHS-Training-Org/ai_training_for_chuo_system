/**
 * ResourceFilterForm のユニットテスト（screen-spec.md §/resources のキーワード検索欄）。
 * 送信時に URL の searchParams がどう組み立てられるかを確認する。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
}));

import { ResourceFilterForm } from "@/app/(authenticated)/resources/ResourceFilterForm";

/** router.push に渡された最後の URL を解析する。 */
function lastPushedUrl(): URL {
  const target = push.mock.calls.at(-1)?.[0] as string;
  return new URL(target, "http://localhost");
}

describe("ResourceFilterForm", () => {
  beforeEach(() => {
    push.mockClear();
  });

  it("キーワードを入力して絞り込むと、keyword を URL パラメータに付けて遷移する", async () => {
    const user = userEvent.setup();
    render(<ResourceFilterForm />);

    await user.type(screen.getByLabelText("キーワード"), "会議");
    await user.click(screen.getByRole("button", { name: "絞り込む" }));

    const url = lastPushedUrl();
    expect(url.pathname).toBe("/resources");
    expect(url.searchParams.get("keyword")).toBe("会議");
  });

  it("キーワード欄を空にして絞り込むと、keyword パラメータを付けない（条件の解除）", async () => {
    const user = userEvent.setup();
    render(<ResourceFilterForm defaultKeyword="会議" />);

    await user.clear(screen.getByLabelText("キーワード"));
    await user.click(screen.getByRole("button", { name: "絞り込む" }));

    expect(lastPushedUrl().searchParams.has("keyword")).toBe(false);
  });

  it("カテゴリ・期間と同時に指定でき、すべてを URL パラメータに載せる", async () => {
    const user = userEvent.setup();
    render(
      <ResourceFilterForm
        defaultCategory="ROOM"
        defaultFrom="2025-06-01T09:00:00"
        defaultTo="2025-06-01T18:00:00"
      />,
    );

    await user.type(screen.getByLabelText("キーワード"), "プロジェクター");
    await user.click(screen.getByRole("button", { name: "絞り込む" }));

    const params = lastPushedUrl().searchParams;
    expect(params.get("keyword")).toBe("プロジェクター");
    expect(params.get("category")).toBe("ROOM");
    expect(params.get("from")).toBe("2025-06-01T09:00");
    expect(params.get("to")).toBe("2025-06-01T18:00");
  });

  it("URL のキーワードを入力欄の初期値として表示する", () => {
    render(<ResourceFilterForm defaultKeyword="会議" />);

    expect(screen.getByLabelText("キーワード")).toHaveValue("会議");
  });

  it("リセットすると、条件なしの /resources へ遷移する", async () => {
    const user = userEvent.setup();
    render(<ResourceFilterForm defaultKeyword="会議" defaultCategory="ROOM" />);

    await user.click(screen.getByRole("button", { name: "リセット" }));

    expect(push).toHaveBeenCalledWith("/resources");
  });
});
