/**
 * ResourceFilterForm のユニットテスト（キーワード入力欄）
 *
 * next/navigation の useRouter / useSearchParams をモックし、
 * 送信・リセット時の遷移先 URL を検証する。
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

describe("ResourceFilterForm（キーワード）", () => {
  beforeEach(() => {
    push.mockClear();
  });

  it("ラベル「キーワード」とプレースホルダ「名称・説明で検索」の入力欄を表示する", () => {
    render(<ResourceFilterForm />);

    const input = screen.getByLabelText("キーワード");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("placeholder", "名称・説明で検索");
  });

  it("defaultKeyword を入力欄の初期値にする", () => {
    render(<ResourceFilterForm defaultKeyword="会議室" />);

    expect(screen.getByLabelText("キーワード")).toHaveValue("会議室");
  });

  it("入力して「絞り込む」を押すと keyword 付きの URL へ遷移する", async () => {
    const user = userEvent.setup();
    render(<ResourceFilterForm />);

    await user.type(screen.getByLabelText("キーワード"), "プロジェクター");
    await user.click(screen.getByRole("button", { name: "絞り込む" }));

    expect(push).toHaveBeenCalledTimes(1);
    const url = new URL(push.mock.calls[0][0] as string, "http://localhost");
    expect(url.pathname).toBe("/resources");
    expect(url.searchParams.get("keyword")).toBe("プロジェクター");
  });

  it("前後の空白を除いて keyword を付与する", async () => {
    const user = userEvent.setup();
    render(<ResourceFilterForm />);

    await user.type(screen.getByLabelText("キーワード"), "  会議室  ");
    await user.click(screen.getByRole("button", { name: "絞り込む" }));

    const url = new URL(push.mock.calls[0][0] as string, "http://localhost");
    expect(url.searchParams.get("keyword")).toBe("会議室");
  });

  it("空のとき keyword を付与しない", async () => {
    const user = userEvent.setup();
    render(<ResourceFilterForm />);

    await user.click(screen.getByRole("button", { name: "絞り込む" }));

    const url = new URL(push.mock.calls[0][0] as string, "http://localhost");
    expect(url.searchParams.has("keyword")).toBe(false);
  });

  it("空白のみのとき keyword を付与しない", async () => {
    const user = userEvent.setup();
    render(<ResourceFilterForm />);

    await user.type(screen.getByLabelText("キーワード"), "   ");
    await user.click(screen.getByRole("button", { name: "絞り込む" }));

    const url = new URL(push.mock.calls[0][0] as string, "http://localhost");
    expect(url.searchParams.has("keyword")).toBe(false);
  });

  it("送信時の URL に page を含めない（先頭ページから表示する）", async () => {
    const user = userEvent.setup();
    render(<ResourceFilterForm defaultKeyword="会議室" />);

    await user.click(screen.getByRole("button", { name: "絞り込む" }));

    const url = new URL(push.mock.calls[0][0] as string, "http://localhost");
    expect(url.searchParams.get("keyword")).toBe("会議室");
    expect(url.searchParams.has("page")).toBe(false);
  });

  it("「リセット」を押すと /resources へ遷移する（keyword も解除される）", async () => {
    const user = userEvent.setup();
    render(<ResourceFilterForm defaultKeyword="会議室" />);

    await user.click(screen.getByRole("button", { name: "リセット" }));

    expect(push).toHaveBeenCalledWith("/resources");
  });
});
