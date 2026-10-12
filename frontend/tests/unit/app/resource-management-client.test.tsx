/**
 * 管理画面フォーム（ResourceManagementClient）の設備一覧・利用上の注意のテスト。
 * 送信ペイロード（空欄 → null 変換）と編集時の初期値を検証する。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MOCK_RESOURCE_RESPONSE } from "../msw/handlers";
import type { ResourceResponse } from "@/lib/types/api";

const createResourceAction = vi.fn();
const updateResourceAction = vi.fn();
vi.mock("@/server/actions/resources", () => ({
  createResourceAction: (...args: unknown[]) => createResourceAction(...args),
  updateResourceAction: (...args: unknown[]) => updateResourceAction(...args),
  changeResourceStatusAction: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const { ResourceManagementClient } =
  await import("@/app/(authenticated)/admin/resources/ResourceManagementClient");

const RESOURCE = MOCK_RESOURCE_RESPONSE as ResourceResponse;

describe("ResourceManagementClient 設備一覧・利用上の注意", () => {
  beforeEach(() => {
    createResourceAction.mockReset().mockResolvedValue(RESOURCE);
    updateResourceAction.mockReset().mockResolvedValue(RESOURCE);
  });

  it("新規登録: 入力した equipment / notes が送信される", async () => {
    const user = userEvent.setup();
    render(<ResourceManagementClient resources={[]} />);

    await user.click(screen.getByRole("button", { name: "新規登録" }));
    await user.type(screen.getByLabelText("リソース名 *"), "新会議室");
    await user.type(screen.getByLabelText("設備一覧"), "モニター");
    await user.type(screen.getByLabelText("利用上の注意"), "飲食禁止");
    await user.click(screen.getByRole("button", { name: "登録する" }));

    await waitFor(() => expect(createResourceAction).toHaveBeenCalledTimes(1));
    expect(createResourceAction.mock.calls[0][0]).toMatchObject({
      name: "新会議室",
      equipment: "モニター",
      notes: "飲食禁止",
    });
  });

  it("新規登録: 空欄のまま送信すると equipment / notes は null で送信される", async () => {
    const user = userEvent.setup();
    render(<ResourceManagementClient resources={[]} />);

    await user.click(screen.getByRole("button", { name: "新規登録" }));
    await user.type(screen.getByLabelText("リソース名 *"), "新会議室");
    await user.click(screen.getByRole("button", { name: "登録する" }));

    await waitFor(() => expect(createResourceAction).toHaveBeenCalledTimes(1));
    const payload = createResourceAction.mock.calls[0][0];
    expect(payload.equipment).toBeNull();
    expect(payload.notes).toBeNull();
  });

  it("編集: 既存の equipment / notes が初期値として入る", async () => {
    const user = userEvent.setup();
    render(<ResourceManagementClient resources={[RESOURCE]} />);

    await user.click(screen.getByRole("button", { name: "編集" }));

    expect(screen.getByLabelText("設備一覧")).toHaveValue(RESOURCE.equipment);
    expect(screen.getByLabelText("利用上の注意")).toHaveValue(RESOURCE.notes);
  });

  it("編集: 入力を消して保存すると null で送信される", async () => {
    const user = userEvent.setup();
    render(<ResourceManagementClient resources={[RESOURCE]} />);

    await user.click(screen.getByRole("button", { name: "編集" }));
    await user.clear(screen.getByLabelText("設備一覧"));
    await user.clear(screen.getByLabelText("利用上の注意"));
    await user.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => expect(updateResourceAction).toHaveBeenCalledTimes(1));
    const [id, payload] = updateResourceAction.mock.calls[0];
    expect(id).toBe(RESOURCE.id);
    expect(payload.equipment).toBeNull();
    expect(payload.notes).toBeNull();
  });
});
