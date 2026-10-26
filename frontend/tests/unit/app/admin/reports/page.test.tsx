/**
 * 帳票出力画面（page.tsx）のユニットテスト
 *
 * async Server Component を関数として呼び出し、返された要素を Testing Library で描画する。
 * Route Handler が付ける error クエリの値ごとにメッセージが決まること、
 * 未知の値をそのまま画面に出さないことを検証する。
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AdminReportsPage from "@/app/(authenticated)/admin/reports/page";

async function renderPage(searchParams: Record<string, string | string[] | undefined>) {
  const element = await AdminReportsPage({ searchParams: Promise.resolve(searchParams) });
  render(element);
}

describe("AdminReportsPage", () => {
  it("見出し「帳票出力」と出力フォームを表示する", async () => {
    await renderPage({});

    expect(screen.getByRole("heading", { level: 1, name: "帳票出力" })).toBeInTheDocument();
    expect(screen.getByTestId("report-form")).toBeInTheDocument();
  });

  it("error がなければエラーメッセージを表示しない", async () => {
    await renderPage({});

    expect(screen.queryByTestId("report-error-message")).not.toBeInTheDocument();
  });

  it("error=FORBIDDEN なら権限がない旨を表示する", async () => {
    await renderPage({ error: "FORBIDDEN" });

    expect(screen.getByTestId("report-error-message")).toHaveTextContent(
      "CSV を出力する権限がありません。",
    );
  });

  it("error=VALIDATION_ERROR なら条件が不正な旨を表示する", async () => {
    await renderPage({ error: "VALIDATION_ERROR" });

    expect(screen.getByTestId("report-error-message")).toHaveTextContent("出力条件が不正です。");
  });

  it("error=INTERNAL_SERVER_ERROR や HTTP_500 は出力に失敗した旨の汎用メッセージを表示する", async () => {
    await renderPage({ error: "HTTP_500" });

    expect(screen.getByTestId("report-error-message")).toHaveTextContent(
      "CSV の出力に失敗しました。",
    );
  });

  it("未知の値はそのまま画面に出さず、汎用メッセージを表示する", async () => {
    await renderPage({ error: "<script>alert(1)</script>" });

    const message = screen.getByTestId("report-error-message");
    expect(message).toHaveTextContent("CSV の出力に失敗しました。");
    expect(message).not.toHaveTextContent("script");
  });

  it("Object のプロパティ名（constructor）が来ても汎用メッセージになる", async () => {
    await renderPage({ error: "constructor" });

    expect(screen.getByTestId("report-error-message")).toHaveTextContent(
      "CSV の出力に失敗しました。",
    );
  });

  it("error が複数あれば最初の値で判定する", async () => {
    await renderPage({ error: ["FORBIDDEN", "VALIDATION_ERROR"] });

    expect(screen.getByTestId("report-error-message")).toHaveTextContent(
      "CSV を出力する権限がありません。",
    );
  });
});
