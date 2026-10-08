import { test, type Page } from "@playwright/test";

/**
 * 実行のエビデンスを残す機構。
 *
 * 結合テストのワークフローでは、学習者はテストコードを読まずに、実行のエビデンスを試験ケースの
 * 「期待結果」「確認箇所」と並べて見て、期待結果が本当に成り立っていたかを判断する。エビデンスは2つある。
 *
 *   - 確認箇所の画面（evidence）：テストの最後の画面を自動で撮るだけでは、確認箇所（たとえば別に開いた
 *     マイ予約一覧）が写らないことがあるため、確認箇所でこの関数を呼ぶ。
 *   - このテストで使った値（usedValue）：画面には「テスト用の利用目的」ではなく実際の文字列が出る。
 *     テストが実際に入れた値を残しておかないと、画面のどの行を見ればよいかが分からない。
 *
 * どちらも、名前の先頭に印を付けてテストの結果に添付する。
 * scripts/e2e-workflow/run.mjs がこの添付を集め、ダッシュボードに表示する。
 */
export const EVIDENCE_PREFIX = "エビデンス:";
export const USED_VALUE_PREFIX = "使った値:";

/**
 * 確認箇所の画面を撮って、テストの結果に添付する。
 *
 * @param page 確認箇所を開いているページ
 * @param label 何の画面か。試験ケースの「確認箇所」の言葉で書く（例：「マイ予約一覧」「予約申請フォームのメッセージ欄」）
 */
export async function evidence(page: Page, label: string): Promise<void> {
  // 実行結果のファイルに画像を埋め込まず、テストの出力場所に保存してその場所を添付する
  const info = test.info();
  const file = info.outputPath(`evidence-${info.attachments.length + 1}.png`);
  // 画面の本体は、高さを画面いっぱいに固定した枠の中でスクロールする。そのままでは、ページ全体を撮っても
  // 見えている範囲しか写らず、一覧の下の行がエビデンスに残らない。撮る間だけ、枠の高さとスクロールを外す
  await page.evaluate(() => {
    const expand = (el: HTMLElement) => {
      if (el.dataset.e2eEvidenceStyle !== undefined) return;
      el.dataset.e2eEvidenceStyle = el.getAttribute("style") ?? "";
      el.style.height = "auto";
      el.style.maxHeight = "none";
      el.style.overflow = "visible";
    };
    for (const el of document.querySelectorAll<HTMLElement>("body *")) {
      const { overflowY } = getComputedStyle(el);
      if ((overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight) {
        for (
          let p: HTMLElement | null = el;
          p && p !== document.documentElement;
          p = p.parentElement
        ) {
          expand(p);
        }
      }
    }
  });
  try {
    await page.screenshot({ path: file, fullPage: true });
  } finally {
    await page.evaluate(() => {
      for (const el of document.querySelectorAll<HTMLElement>("[data-e2e-evidence-style]")) {
        const style = el.dataset.e2eEvidenceStyle ?? "";
        if (style) el.setAttribute("style", style);
        else el.removeAttribute("style");
        delete el.dataset.e2eEvidenceStyle;
      }
    });
  }
  await info.attach(`${EVIDENCE_PREFIX}${label}`, { path: file, contentType: "image/png" });
}

/**
 * このテストで実際に使った値を、テストの結果に添付する。
 *
 * 日時は、画面（マイ予約一覧、予約詳細）と同じ形式（toLocaleString("ja-JP")）にする。
 * 学習者が、エビデンスの画面に出ている文字とそのまま見比べられるようにするためである。
 * テストは日時を UTC の時刻として入力欄に入れ（toDatetimeLocal）、画面はその時刻をそのまま表示する。
 * そのため、テストを動かす環境の時間帯によらず、UTC の時刻として整形する。
 * 空の値は「（空欄）」と残す。
 *
 * @param label 何の値か。試験ケースの言葉で書く（例：「利用目的」「リソース（RSV-NEW-D-01）」「開始日時」）
 * @param value 入れた値、選んだ値、前提として作ったデータの値
 */
export async function usedValue(
  label: string,
  value: string | number | Date | null | undefined,
): Promise<void> {
  const text =
    value instanceof Date
      ? value.toLocaleString("ja-JP", { timeZone: "UTC" })
      : value === null || value === undefined || value === ""
        ? "（空欄）"
        : String(value);
  await test.info().attach(`${USED_VALUE_PREFIX}${label}`, {
    body: text,
    contentType: "text/plain",
  });
}
