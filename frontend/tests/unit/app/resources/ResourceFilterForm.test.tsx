/**
 * ResourceFilterForm のユニットテスト（Vitest + Testing Library）
 *
 * キーワード入力欄について、送信時に URL へ付与される keyword（前後空白の除去、
 * 空白のみなら付与しない）と、初期値の反映を検証する。
 * next/navigation は vi.mock で差し替え、router.push の引数を検査する。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
}));

import { ResourceFilterForm } from "@/app/(authenticated)/resources/ResourceFilterForm";

/** router.push に渡された最後の URL を解析して返す。 */
function lastPushedUrl(): URL {
  expect(push).toHaveBeenCalled();
  const href = push.mock.calls[push.mock.calls.length - 1][0] as string;
  return new URL(href, "http://localhost");
}

describe("ResourceFilterForm: キーワード入力欄", () => {
  beforeEach(() => {
    push.mockClear();
  });

  it("キーワードを入力して送信すると、前後の空白を除いた keyword が URL に付く", async () => {
    const user = userEvent.setup();
    render(<ResourceFilterForm />);

    await user.type(screen.getByTestId("resource-filter-keyword-input"), "  会議 room  ");
    await user.click(screen.getByRole("button", { name: "絞り込む" }));

    const url = lastPushedUrl();
    expect(url.pathname).toBe("/resources");
    expect(url.searchParams.get("keyword")).toBe("会議 room");
  });

  it("全角空白だけを前後に付けても除去される", async () => {
    const user = userEvent.setup();
    render(<ResourceFilterForm />);

    await user.type(screen.getByTestId("resource-filter-keyword-input"), "　会議　");
    await user.click(screen.getByRole("button", { name: "絞り込む" }));

    expect(lastPushedUrl().searchParams.get("keyword")).toBe("会議");
  });

  it("空白のみのキーワードでは keyword が URL に付かない", async () => {
    const user = userEvent.setup();
    render(<ResourceFilterForm />);

    await user.type(screen.getByTestId("resource-filter-keyword-input"), "   ");
    await user.click(screen.getByRole("button", { name: "絞り込む" }));

    expect(lastPushedUrl().searchParams.has("keyword")).toBe(false);
  });

  it("既存の keyword を空白のみにして送信すると、keyword が URL から消える", async () => {
    const user = userEvent.setup();
    render(<ResourceFilterForm defaultKeyword="会議" />);

    const input = screen.getByTestId("resource-filter-keyword-input");
    await user.clear(input);
    await user.type(input, "  ");
    await user.click(screen.getByRole("button", { name: "絞り込む" }));

    expect(lastPushedUrl().searchParams.has("keyword")).toBe(false);
  });

  it("keyword は page を引き継がず、1 ページ目から表示する", async () => {
    const user = userEvent.setup();
    render(<ResourceFilterForm />);

    await user.type(screen.getByTestId("resource-filter-keyword-input"), "会議");
    await user.click(screen.getByRole("button", { name: "絞り込む" }));

    expect(lastPushedUrl().searchParams.has("page")).toBe(false);
  });

  it("defaultKeyword が入力欄の初期値に反映される", () => {
    render(<ResourceFilterForm defaultKeyword="プロジェクター" />);

    expect(screen.getByTestId("resource-filter-keyword-input")).toHaveValue("プロジェクター");
  });

  it("defaultKeyword がなければ入力欄は空である", () => {
    render(<ResourceFilterForm />);

    expect(screen.getByTestId("resource-filter-keyword-input")).toHaveValue("");
  });

  it("初期値のまま送信すると、その keyword が URL に付く", async () => {
    const user = userEvent.setup();
    render(<ResourceFilterForm defaultKeyword="プロジェクター" />);

    await user.click(screen.getByRole("button", { name: "絞り込む" }));

    expect(lastPushedUrl().searchParams.get("keyword")).toBe("プロジェクター");
  });
});
