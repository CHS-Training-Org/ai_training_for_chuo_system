/**
 * ReservationCsvExportForm のユニットテスト（Vitest + Testing Library）
 *
 * GET フォームの送信先と入力項目、開始日 > 終了日のときに送信を止めること、
 * ステータスの選択が送信データ（FormData）に反映されることを検証する。
 * jsdom ではフォーム送信（ナビゲーション）が未実装のため、document の submit リスナーで
 * defaultPrevented を記録したうえで送信を止める（React のハンドラの後に呼ばれる）。
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReservationCsvExportForm } from "@/app/(authenticated)/admin/reports/ReservationCsvExportForm";

let submitPrevented: boolean | null = null;

function recordSubmit(e: Event) {
  submitPrevented = e.defaultPrevented;
  e.preventDefault(); // jsdom の未実装ナビゲーションを起こさない
}

function setDate(testId: string, value: string) {
  fireEvent.change(screen.getByTestId(testId), { target: { value } });
}

describe("ReservationCsvExportForm", () => {
  beforeEach(() => {
    submitPrevented = null;
    document.addEventListener("submit", recordSubmit);
  });

  afterEach(() => {
    document.removeEventListener("submit", recordSubmit);
  });

  describe("フォームの構成", () => {
    it("GET で /api/reports/reservations/csv に送信する", () => {
      render(<ReservationCsvExportForm />);

      const form = screen.getByTestId("report-form");
      expect(form).toHaveAttribute("method", "get");
      expect(form).toHaveAttribute("action", "/api/reports/reservations/csv");
    });

    it("開始日と終了日が name=from / name=to の日付入力である", () => {
      render(<ReservationCsvExportForm />);

      const from = screen.getByTestId("report-from-input");
      const to = screen.getByTestId("report-to-input");
      expect(from).toHaveAttribute("name", "from");
      expect(from).toHaveAttribute("type", "date");
      expect(to).toHaveAttribute("name", "to");
      expect(to).toHaveAttribute("type", "date");
      expect(screen.getByLabelText("開始日")).toBe(from);
      expect(screen.getByLabelText("終了日")).toBe(to);
    });

    it("ステータスは 4 種のチェックボックス（name=status）で、日本語ラベルが付く", () => {
      render(<ReservationCsvExportForm />);

      const expected: Record<string, string> = {
        PENDING: "承認待ち",
        APPROVED: "承認済み",
        REJECTED: "却下",
        CANCELLED: "キャンセル済み",
      };
      for (const [value, label] of Object.entries(expected)) {
        const checkbox = screen.getByTestId(`report-status-${value}`);
        expect(checkbox).toHaveAttribute("type", "checkbox");
        expect(checkbox).toHaveAttribute("name", "status");
        expect(checkbox).toHaveAttribute("value", value);
        expect(screen.getByLabelText(label)).toBe(checkbox);
      }
    });

    it("ドラフトは選択肢に出ない", () => {
      render(<ReservationCsvExportForm />);

      expect(screen.queryByTestId("report-status-DRAFT")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("ドラフト")).not.toBeInTheDocument();
    });

    it("「CSV ダウンロード」の送信ボタンがある", () => {
      render(<ReservationCsvExportForm />);

      const button = screen.getByRole("button", { name: "CSV ダウンロード" });
      expect(button).toHaveAttribute("type", "submit");
    });
  });

  describe("開始日と終了日の前後チェック", () => {
    it("開始日が終了日より後なら送信せず、メッセージを表示する", async () => {
      const user = userEvent.setup();
      render(<ReservationCsvExportForm />);

      setDate("report-from-input", "2037-04-30");
      setDate("report-to-input", "2037-04-01");
      await user.click(screen.getByTestId("report-submit-button"));

      expect(submitPrevented).toBe(true);
      expect(screen.getByTestId("report-form-error")).toHaveTextContent(
        "開始日は終了日以前の日付を指定してください。",
      );
    });

    it("同じ日付なら送信できる", async () => {
      const user = userEvent.setup();
      render(<ReservationCsvExportForm />);

      setDate("report-from-input", "2037-04-15");
      setDate("report-to-input", "2037-04-15");
      await user.click(screen.getByTestId("report-submit-button"));

      expect(submitPrevented).toBe(false);
      expect(screen.queryByTestId("report-form-error")).not.toBeInTheDocument();
    });

    it("開始日が終了日より前なら送信できる", async () => {
      const user = userEvent.setup();
      render(<ReservationCsvExportForm />);

      setDate("report-from-input", "2037-04-01");
      setDate("report-to-input", "2037-04-30");
      await user.click(screen.getByTestId("report-submit-button"));

      expect(submitPrevented).toBe(false);
      expect(screen.queryByTestId("report-form-error")).not.toBeInTheDocument();
    });

    it("開始日だけ、終了日だけ、どちらも未入力のいずれでも送信できる", async () => {
      const user = userEvent.setup();
      render(<ReservationCsvExportForm />);

      setDate("report-from-input", "2037-04-01");
      await user.click(screen.getByTestId("report-submit-button"));
      expect(submitPrevented).toBe(false);

      setDate("report-from-input", "");
      setDate("report-to-input", "2037-04-30");
      await user.click(screen.getByTestId("report-submit-button"));
      expect(submitPrevented).toBe(false);

      setDate("report-to-input", "");
      await user.click(screen.getByTestId("report-submit-button"));
      expect(submitPrevented).toBe(false);
      expect(screen.queryByTestId("report-form-error")).not.toBeInTheDocument();
    });

    it("エラー表示のあとに条件を直して送信すると、メッセージが消える", async () => {
      const user = userEvent.setup();
      render(<ReservationCsvExportForm />);

      setDate("report-from-input", "2037-04-30");
      setDate("report-to-input", "2037-04-01");
      await user.click(screen.getByTestId("report-submit-button"));
      expect(screen.getByTestId("report-form-error")).toBeInTheDocument();

      setDate("report-to-input", "2037-05-31");
      await user.click(screen.getByTestId("report-submit-button"));

      expect(submitPrevented).toBe(false);
      expect(screen.queryByTestId("report-form-error")).not.toBeInTheDocument();
    });
  });

  describe("送信データ", () => {
    it("選んだステータスが status として複数送られ、日付が from / to で送られる", async () => {
      const user = userEvent.setup();
      render(<ReservationCsvExportForm />);

      setDate("report-from-input", "2037-04-01");
      setDate("report-to-input", "2037-04-30");
      await user.click(screen.getByTestId("report-status-APPROVED"));
      await user.click(screen.getByTestId("report-status-PENDING"));

      const data = new FormData(screen.getByTestId("report-form") as HTMLFormElement);
      expect(data.get("from")).toBe("2037-04-01");
      expect(data.get("to")).toBe("2037-04-30");
      expect(data.getAll("status")).toEqual(["PENDING", "APPROVED"]);
    });

    it("ステータスを 1 つも選ばなければ status は送られない（全ステータスが対象）", () => {
      render(<ReservationCsvExportForm />);

      const data = new FormData(screen.getByTestId("report-form") as HTMLFormElement);
      expect(data.getAll("status")).toEqual([]);
      expect(
        screen.getByText("1 つも選ばなければ、すべてのステータスが対象です。"),
      ).toBeInTheDocument();
    });
  });
});
