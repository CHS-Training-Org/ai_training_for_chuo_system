/**
 * UsageFilterForm（利用実績の期間フィルタ）のコンポーネントテスト。
 *
 * 片方のみの入力と開始日時が終了日時以降の入力が、遷移せずメッセージで止まること、
 * 正常な入力で URL が更新されること、リセットで全期間に戻ることを検証する。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UsageFilterForm } from "@/app/(authenticated)/admin/reports/UsageFilterForm";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

function setValue(testId: string, value: string) {
  fireEvent.change(screen.getByTestId(testId), { target: { value } });
}

describe("UsageFilterForm", () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it("既定値が入力欄に表示される（秒は切り捨てて 16 文字）", () => {
    render(<UsageFilterForm defaultFrom="2030-10-01T00:00:00" defaultTo="2030-10-31T23:59:00" />);

    expect(screen.getByTestId("usage-filter-from-input")).toHaveValue("2030-10-01T00:00");
    expect(screen.getByTestId("usage-filter-to-input")).toHaveValue("2030-10-31T23:59");
  });

  it("両方入力して「集計する」を押すと from・to 付きの URL に遷移する", () => {
    render(<UsageFilterForm />);
    setValue("usage-filter-from-input", "2030-10-01T00:00");
    setValue("usage-filter-to-input", "2030-10-31T23:59");

    fireEvent.click(screen.getByTestId("usage-filter-submit"));

    expect(pushMock).toHaveBeenCalledTimes(1);
    const url = new URL(pushMock.mock.calls[0][0] as string, "http://localhost");
    expect(url.pathname).toBe("/admin/reports");
    expect(url.searchParams.get("from")).toBe("2030-10-01T00:00");
    expect(url.searchParams.get("to")).toBe("2030-10-31T23:59");
    expect(screen.queryByTestId("usage-filter-error")).not.toBeInTheDocument();
  });

  it("両方空で「集計する」を押すと期間なしの URL に遷移する", () => {
    render(<UsageFilterForm defaultFrom="2030-10-01T00:00" defaultTo="2030-10-31T23:59" />);
    setValue("usage-filter-from-input", "");
    setValue("usage-filter-to-input", "");

    fireEvent.click(screen.getByTestId("usage-filter-submit"));

    expect(pushMock).toHaveBeenCalledWith("/admin/reports");
  });

  it("開始日時だけの入力は遷移せずメッセージを表示する", () => {
    render(<UsageFilterForm />);
    setValue("usage-filter-from-input", "2030-10-01T00:00");

    fireEvent.click(screen.getByTestId("usage-filter-submit"));

    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("usage-filter-error")).toHaveTextContent(
      "開始日時と終了日時は両方入力してください。",
    );
  });

  it("終了日時だけの入力は遷移せずメッセージを表示する", () => {
    render(<UsageFilterForm />);
    setValue("usage-filter-to-input", "2030-10-31T00:00");

    fireEvent.click(screen.getByTestId("usage-filter-submit"));

    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("usage-filter-error")).toBeInTheDocument();
  });

  it("開始日時が終了日時より後だと遷移せずメッセージを表示する", () => {
    render(<UsageFilterForm />);
    setValue("usage-filter-from-input", "2030-10-10T12:00");
    setValue("usage-filter-to-input", "2030-10-10T10:00");

    fireEvent.click(screen.getByTestId("usage-filter-submit"));

    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("usage-filter-error")).toHaveTextContent(
      "開始日時は終了日時より前にしてください。",
    );
  });

  it("開始日時と終了日時が同じ値でも遷移せずメッセージを表示する", () => {
    render(<UsageFilterForm />);
    setValue("usage-filter-from-input", "2030-10-10T10:00");
    setValue("usage-filter-to-input", "2030-10-10T10:00");

    fireEvent.click(screen.getByTestId("usage-filter-submit"));

    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("usage-filter-error")).toBeInTheDocument();
  });

  it("エラー表示後に正しい入力で送信するとメッセージが消えて遷移する", () => {
    render(<UsageFilterForm />);
    setValue("usage-filter-from-input", "2030-10-01T00:00");
    fireEvent.click(screen.getByTestId("usage-filter-submit"));
    expect(screen.getByTestId("usage-filter-error")).toBeInTheDocument();

    setValue("usage-filter-to-input", "2030-10-31T00:00");
    fireEvent.click(screen.getByTestId("usage-filter-submit"));

    expect(screen.queryByTestId("usage-filter-error")).not.toBeInTheDocument();
    expect(pushMock).toHaveBeenCalledTimes(1);
  });

  it("「リセット」を押すと期間なしの URL に遷移し、エラー表示も消える", () => {
    render(<UsageFilterForm />);
    setValue("usage-filter-from-input", "2030-10-01T00:00");
    fireEvent.click(screen.getByTestId("usage-filter-submit"));
    expect(screen.getByTestId("usage-filter-error")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("usage-filter-reset"));

    expect(pushMock).toHaveBeenCalledWith("/admin/reports");
    expect(screen.queryByTestId("usage-filter-error")).not.toBeInTheDocument();
  });
});
