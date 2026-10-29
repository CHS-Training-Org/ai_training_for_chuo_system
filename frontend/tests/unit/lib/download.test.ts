/**
 * download.ts のユニットテスト（Content-Disposition の解析と Blob の保存）
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { parseContentDispositionFileName, saveBlob } from "@/lib/download";

describe("parseContentDispositionFileName", () => {
  it("引用符付きの filename を取り出す", () => {
    expect(
      parseContentDispositionFileName('attachment; filename="reservations_20261001_20261031.csv"'),
    ).toBe("reservations_20261001_20261031.csv");
  });

  it("引用符なしの filename を取り出す", () => {
    expect(parseContentDispositionFileName("attachment; filename=reservations_20261029.csv")).toBe(
      "reservations_20261029.csv",
    );
  });

  it("ヘッダが null または filename を含まない場合は null", () => {
    expect(parseContentDispositionFileName(null)).toBeNull();
    expect(parseContentDispositionFileName("attachment")).toBeNull();
  });
});

describe("saveBlob", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("指定のファイル名で a[download] をクリックし、オブジェクト URL を解放する", () => {
    const createObjectURL = vi.fn().mockReturnValue("blob:test");
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    saveBlob(new Blob(["a"], { type: "text/csv" }), "x.csv");

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");
    // 一時的な a 要素は DOM に残らない
    expect(document.querySelector("a[download]")).toBeNull();
  });
});
