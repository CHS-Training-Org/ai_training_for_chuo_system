/**
 * /admin/reports ページのユニットテスト（Server Component を async 関数として呼んで描画する）
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AdminReportsPage from "@/app/(authenticated)/admin/reports/page";
import { RESERVATION_STATUS_LABELS } from "@/lib/labels";

async function renderPage(sp: Record<string, string | string[] | undefined> = {}) {
  const ui = await AdminReportsPage({ searchParams: Promise.resolve(sp) });
  return render(ui);
}

describe("AdminReportsPage", () => {
  it("フォームは GET で Route Handler に送信する", async () => {
    await renderPage();

    const form = screen.getByTestId("reports-form");
    expect(form).toHaveAttribute("method", "GET");
    expect(form).toHaveAttribute("action", "/api/reports/reservations/csv");
  });

  it("期間の入力欄にラベルが関連付けられている", async () => {
    await renderPage();

    const from = screen.getByLabelText("開始日時");
    const to = screen.getByLabelText("終了日時");
    expect(from).toHaveAttribute("type", "datetime-local");
    expect(from).toHaveAttribute("name", "from");
    expect(to).toHaveAttribute("type", "datetime-local");
    expect(to).toHaveAttribute("name", "to");
  });

  it("「終了日時は含みません」の説明を併記する", async () => {
    await renderPage();

    expect(screen.getByText(/終了日時は含みません/)).toBeInTheDocument();
  });

  it("全ステータス分のチェックボックスを同じ name で出し、ラベルから操作できる", async () => {
    await renderPage();

    for (const [value, label] of Object.entries(RESERVATION_STATUS_LABELS)) {
      const checkbox = screen.getByLabelText(label);
      expect(checkbox).toHaveAttribute("type", "checkbox");
      expect(checkbox).toHaveAttribute("name", "status");
      expect(checkbox).toHaveAttribute("value", value);
    }
  });

  it("「CSV ダウンロード」ボタンがある", async () => {
    await renderPage();

    expect(screen.getByRole("button", { name: "CSV ダウンロード" })).toHaveAttribute(
      "type",
      "submit",
    );
  });

  it("error が無いときは警告を表示しない", async () => {
    await renderPage();

    expect(screen.queryByTestId("reports-error-alert")).not.toBeInTheDocument();
  });

  it.each([
    ["VALIDATION_ERROR", "期間の指定が正しくありません"],
    ["UNAUTHORIZED", "ログインの有効期限が切れています"],
    ["FORBIDDEN", "権限がありません"],
    ["INTERNAL_SERVER_ERROR", "サーバーでエラーが発生しました"],
  ])("許可リストのコード %s は定型の日本語警告に変換する", async (code, expected) => {
    await renderPage({ error: code });

    expect(screen.getByRole("alert")).toHaveTextContent(expected);
  });

  it("許可リスト外の値は汎用メッセージにし、値そのものを画面に出さない", async () => {
    const { container } = await renderPage({ error: "<script>alert(1)</script>" });

    expect(screen.getByRole("alert")).toHaveTextContent("CSV のダウンロードに失敗しました");
    expect(container.innerHTML).not.toContain("alert(1)");
    expect(container.querySelector("script")).toBeNull();
  });

  it("Object のプロトタイプ名（constructor 等）も許可リスト外として扱う", async () => {
    await renderPage({ error: "constructor" });

    expect(screen.getByRole("alert")).toHaveTextContent("CSV のダウンロードに失敗しました");
  });

  it("error が配列で渡されたときは先頭の値で判定する", async () => {
    await renderPage({ error: ["FORBIDDEN", "x"] });

    expect(screen.getByRole("alert")).toHaveTextContent("権限がありません");
  });
});
