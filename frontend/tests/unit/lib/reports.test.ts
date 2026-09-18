import { describe, it, expect } from "vitest";
import {
  buildCsvDownloadUrl,
  parseFilenameFromContentDisposition,
  CSV_EXPORT_PATH,
} from "@/lib/reports";

describe("buildCsvDownloadUrl", () => {
  it("条件をすべて省略した場合はクエリなしのパスを返す", () => {
    expect(buildCsvDownloadUrl({})).toBe(CSV_EXPORT_PATH);
  });

  it("from のみ指定した場合は当日 00:00:00 に正規化される", () => {
    expect(buildCsvDownloadUrl({ from: "2026-09-01" })).toBe(
      `${CSV_EXPORT_PATH}?from=2026-09-01T00%3A00%3A00`,
    );
  });

  it("to のみ指定した場合は当日 23:59:59 に正規化される", () => {
    expect(buildCsvDownloadUrl({ to: "2026-09-30" })).toBe(
      `${CSV_EXPORT_PATH}?to=2026-09-30T23%3A59%3A59`,
    );
  });

  it("status が ALL の場合はクエリに含めない", () => {
    expect(buildCsvDownloadUrl({ status: "ALL" })).toBe(CSV_EXPORT_PATH);
  });

  it("status が空文字の場合はクエリに含めない", () => {
    expect(buildCsvDownloadUrl({ status: "" })).toBe(CSV_EXPORT_PATH);
  });

  it("status を指定した場合はクエリに含める", () => {
    expect(buildCsvDownloadUrl({ status: "APPROVED" })).toBe(`${CSV_EXPORT_PATH}?status=APPROVED`);
  });

  it("from・to・status をすべて指定した場合は from → to → status の順で生成される", () => {
    expect(buildCsvDownloadUrl({ from: "2026-09-01", to: "2026-09-30", status: "APPROVED" })).toBe(
      `${CSV_EXPORT_PATH}?from=2026-09-01T00%3A00%3A00&to=2026-09-30T23%3A59%3A59&status=APPROVED`,
    );
  });
});

describe("parseFilenameFromContentDisposition", () => {
  it('filename="..." 形式からファイル名を取り出す', () => {
    expect(
      parseFilenameFromContentDisposition(
        'attachment; filename="reservations_20260901120000.csv"',
        "fallback.csv",
      ),
    ).toBe("reservations_20260901120000.csv");
  });

  it("ヘッダが null の場合は fallback を返す", () => {
    expect(parseFilenameFromContentDisposition(null, "fallback.csv")).toBe("fallback.csv");
  });

  it("filename が含まれない場合は fallback を返す", () => {
    expect(parseFilenameFromContentDisposition("attachment", "fallback.csv")).toBe("fallback.csv");
  });
});
