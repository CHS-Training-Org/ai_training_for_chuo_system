/**
 * ResourceManagementClient のコンポーネントテスト（React Testing Library）。
 *
 * "use client" コンポーネントであり jsdom 上でレンダリング可能なため、
 * 実際のフォーム操作（ダイアログ展開・入力・送信）を介して
 * equipment/notes（設備一覧・利用上の注意）の初期値反映・null変換ロジックを検証する。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResourceManagementClient } from "@/app/(authenticated)/admin/resources/ResourceManagementClient";
import type { ResourceResponse } from "@/lib/types/api";

const refreshMock = vi.fn();
const createResourceActionMock = vi.fn();
const updateResourceActionMock = vi.fn();
const changeResourceStatusActionMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("@/server/actions/resources", () => ({
  createResourceAction: (...args: unknown[]) => createResourceActionMock(...args),
  updateResourceAction: (...args: unknown[]) => updateResourceActionMock(...args),
  changeResourceStatusAction: (...args: unknown[]) => changeResourceStatusActionMock(...args),
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

describe("ResourceManagementClient", () => {
  beforeEach(() => {
    refreshMock.mockClear();
    createResourceActionMock.mockClear();
    updateResourceActionMock.mockClear();
    changeResourceStatusActionMock.mockClear();
    createResourceActionMock.mockResolvedValue(BASE_RESOURCE);
    updateResourceActionMock.mockResolvedValue(BASE_RESOURCE);
  });

  it("編集ダイアログを開くと、既存の設備一覧・利用上の注意が初期値として表示される", async () => {
    const user = userEvent.setup();
    render(<ResourceManagementClient resources={[BASE_RESOURCE]} />);

    await user.click(screen.getByRole("button", { name: "編集" }));

    const dialog = await screen.findByRole("dialog", { name: "リソース編集" });
    expect(within(dialog).getByLabelText("設備一覧")).toHaveValue(BASE_RESOURCE.equipment);
    expect(within(dialog).getByLabelText("利用上の注意")).toHaveValue(BASE_RESOURCE.notes);
  });

  it("新規登録時に設備一覧・利用上の注意を入力すると、その値で createResourceAction を呼び出す", async () => {
    const user = userEvent.setup();
    render(<ResourceManagementClient resources={[]} />);

    await user.click(screen.getByRole("button", { name: "新規登録" }));
    const dialog = await screen.findByRole("dialog", { name: "リソース新規登録" });

    await user.type(within(dialog).getByLabelText("リソース名 *"), "新会議室");
    await user.type(within(dialog).getByLabelText("設備一覧"), "プロジェクター1台");
    await user.type(
      within(dialog).getByLabelText("利用上の注意"),
      "貸出時は電源ケーブルも一緒にお渡しください",
    );
    await user.click(within(dialog).getByRole("button", { name: "登録する" }));

    expect(createResourceActionMock).toHaveBeenCalledTimes(1);
    expect(createResourceActionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        equipment: "プロジェクター1台",
        notes: "貸出時は電源ケーブルも一緒にお渡しください",
      }),
    );
  });

  it("設備一覧・利用上の注意を空欄のまま新規登録すると、null として createResourceAction を呼び出す", async () => {
    const user = userEvent.setup();
    render(<ResourceManagementClient resources={[]} />);

    await user.click(screen.getByRole("button", { name: "新規登録" }));
    const dialog = await screen.findByRole("dialog", { name: "リソース新規登録" });

    await user.type(within(dialog).getByLabelText("リソース名 *"), "新会議室");
    await user.click(within(dialog).getByRole("button", { name: "登録する" }));

    expect(createResourceActionMock).toHaveBeenCalledTimes(1);
    expect(createResourceActionMock).toHaveBeenCalledWith(
      expect.objectContaining({ equipment: null, notes: null }),
    );
  });

  it("編集ダイアログで設備一覧を入力してから消去すると、null として updateResourceAction を呼び出す", async () => {
    const user = userEvent.setup();
    render(<ResourceManagementClient resources={[BASE_RESOURCE]} />);

    await user.click(screen.getByRole("button", { name: "編集" }));
    const dialog = await screen.findByRole("dialog", { name: "リソース編集" });

    const equipmentInput = within(dialog).getByLabelText("設備一覧");
    await user.type(equipmentInput, "一時入力");
    await user.clear(equipmentInput);
    await user.click(within(dialog).getByRole("button", { name: "保存する" }));

    expect(updateResourceActionMock).toHaveBeenCalledTimes(1);
    expect(updateResourceActionMock).toHaveBeenCalledWith(
      BASE_RESOURCE.id,
      expect.objectContaining({ equipment: null }),
    );
  });

  it("編集時に設備一覧・利用上の注意を書き換えて保存すると、新しい値で updateResourceAction を呼び出す", async () => {
    const user = userEvent.setup();
    render(<ResourceManagementClient resources={[BASE_RESOURCE]} />);

    await user.click(screen.getByRole("button", { name: "編集" }));
    const dialog = await screen.findByRole("dialog", { name: "リソース編集" });

    const equipmentInput = within(dialog).getByLabelText("設備一覧");
    await user.clear(equipmentInput);
    await user.type(equipmentInput, "プロジェクター1台、ホワイトボード2台");
    await user.click(within(dialog).getByRole("button", { name: "保存する" }));

    expect(updateResourceActionMock).toHaveBeenCalledTimes(1);
    expect(updateResourceActionMock).toHaveBeenCalledWith(
      BASE_RESOURCE.id,
      expect.objectContaining({ equipment: "プロジェクター1台、ホワイトボード2台" }),
    );
  });
});
