/**
 * resources/empty-state.ts の resolveEmptyResourceMessage ユニットテスト
 *
 * page.tsx 本体は getProfileAction 等のサーバー専用モジュールを import しており、
 * Server Component のレンダリングテストには Next.js のサーバー実行環境が必要なため、
 * 0 件時メッセージの分岐ロジックのみを依存のない純関数として切り出して検証する。
 */
import { describe, it, expect } from "vitest";
import { resolveEmptyResourceMessage } from "@/app/(authenticated)/resources/empty-state";

describe("resolveEmptyResourceMessage", () => {
  it("keyword のみ指定時: 絞り込み条件に一致するリソースがない旨を返す", () => {
    expect(resolveEmptyResourceMessage({ keyword: "存在しない名前" })).toBe(
      "絞り込み条件に一致するリソースがありません。",
    );
  });

  it("keyword と from/to の両方指定時: keyword 側のメッセージを優先する", () => {
    expect(
      resolveEmptyResourceMessage({
        keyword: "存在しない名前",
        from: "2025-06-01T09:00:00",
        to: "2025-06-01T18:00:00",
      }),
    ).toBe("絞り込み条件に一致するリソースがありません。");
  });

  it("keyword が空白のみの場合: 未指定として扱い from/to 側のメッセージにフォールバックする", () => {
    expect(
      resolveEmptyResourceMessage({
        keyword: "   ",
        from: "2025-06-01T09:00:00",
        to: "2025-06-01T18:00:00",
      }),
    ).toBe("指定した時間帯に空きのあるリソースがありません。");
  });

  it("from/to のみ指定時: 時間帯のメッセージを返す", () => {
    expect(
      resolveEmptyResourceMessage({
        from: "2025-06-01T09:00:00",
        to: "2025-06-01T18:00:00",
      }),
    ).toBe("指定した時間帯に空きのあるリソースがありません。");
  });

  it("from のみ指定（to 欠落）時: 時間帯条件は不成立として扱い既定文言を返す", () => {
    expect(resolveEmptyResourceMessage({ from: "2025-06-01T09:00:00" })).toBe(
      "リソースがありません。",
    );
  });

  it("いずれも未指定時: 既定文言を返す", () => {
    expect(resolveEmptyResourceMessage({})).toBe("リソースがありません。");
  });
});
