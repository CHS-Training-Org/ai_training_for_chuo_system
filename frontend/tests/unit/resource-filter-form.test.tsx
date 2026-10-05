/**
 * ResourceFilterForm のコンポーネントテスト（React Testing Library）。
 *
 * "use client" コンポーネントであり jsdom 上でレンダリング可能なため、
 * PaginationNav（Server Component）のような純関数抽出ではなく、
 * 実際のフォーム操作（入力・送信）を介して keyword の trim・付与ロジックを検証する。
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

  it("キーワードを入力して絞り込むと、trim した値を keyword パラメータとして付与する", async () => {
    const user = userEvent.setup();
    render(<ResourceFilterForm />);

    await user.type(screen.getByTestId("resource-filter-form-keyword-input"), "  会議室  ");
    await user.click(screen.getByRole("button", { name: "絞り込む" }));

    expect(pushMock).toHaveBeenCalledTimes(1);
    const pushedUrl = new URL(pushMock.mock.calls[0][0], "http://localhost");
    expect(pushedUrl.pathname).toBe("/resources");
    expect(pushedUrl.searchParams.get("keyword")).toBe("会議室");
  });

  it("キーワードが空白のみの場合、keyword パラメータを付与しない", async () => {
    const user = userEvent.setup();
    render(<ResourceFilterForm />);

    await user.type(screen.getByTestId("resource-filter-form-keyword-input"), "   ");
    await user.click(screen.getByRole("button", { name: "絞り込む" }));

    expect(pushMock).toHaveBeenCalledTimes(1);
    const pushedUrl = new URL(pushMock.mock.calls[0][0], "http://localhost");
    expect(pushedUrl.searchParams.has("keyword")).toBe(false);
  });

  it("キーワード未入力の場合、keyword パラメータを付与しない", async () => {
    const user = userEvent.setup();
    render(<ResourceFilterForm />);

    await user.click(screen.getByRole("button", { name: "絞り込む" }));

    expect(pushMock).toHaveBeenCalledTimes(1);
    const pushedUrl = new URL(pushMock.mock.calls[0][0], "http://localhost");
    expect(pushedUrl.searchParams.has("keyword")).toBe(false);
  });

  it("defaultKeyword が指定されている場合、入力欄の初期値として反映される", () => {
    render(<ResourceFilterForm defaultKeyword="プロジェクタ" />);

    const input = screen.getByTestId("resource-filter-form-keyword-input") as HTMLInputElement;
    expect(input.value).toBe("プロジェクタ");
  });

  it("リセットボタンを押すと、入力したキーワードを含めず /resources に遷移する", async () => {
    const user = userEvent.setup();
    render(<ResourceFilterForm defaultKeyword="会議室" />);

    await user.click(screen.getByRole("button", { name: "リセット" }));

    expect(pushMock).toHaveBeenCalledWith("/resources");
  });

  it("並び順が未選択（デフォルト）のまま送信すると、sort パラメータを付与しない", async () => {
    // RES-03: 「登録日時順（デフォルト）」選択時は sort を URL に付けない
    const user = userEvent.setup();
    render(<ResourceFilterForm />);

    await user.click(screen.getByRole("button", { name: "絞り込む" }));

    expect(pushMock).toHaveBeenCalledTimes(1);
    const pushedUrl = new URL(pushMock.mock.calls[0][0], "http://localhost");
    expect(pushedUrl.searchParams.has("sort")).toBe(false);
  });

  it("defaultSort が指定されている場合、送信時に sort パラメータとして付与する", async () => {
    // RES-03: デフォルト以外の選択値は sort として付与する
    const user = userEvent.setup();
    render(<ResourceFilterForm defaultSort="name,asc" />);

    await user.click(screen.getByRole("button", { name: "絞り込む" }));

    expect(pushMock).toHaveBeenCalledTimes(1);
    const pushedUrl = new URL(pushMock.mock.calls[0][0], "http://localhost");
    expect(pushedUrl.searchParams.get("sort")).toBe("name,asc");
  });
});
