/**
 * CSV 帳票出力のフロントエンド純関数ヘルパ。
 *
 * Route Handler（`app/api/reports/reservations/csv/route.ts`）経由でダウンロードするための
 * URL 組み立て・ファイル名抽出・ダウンロード発火を担う。
 */

/** CSV ダウンロードを仲介する Route Handler のパス。 */
export const CSV_EXPORT_PATH = "/api/reports/reservations/csv";

export interface CsvExportFilter {
  /** 開始日（`type="date"` の値、"YYYY-MM-DD"）。未指定可。 */
  from?: string;
  /** 終了日（`type="date"` の値、"YYYY-MM-DD"）。未指定可。 */
  to?: string;
  /** 予約ステータス。未指定または "ALL" は絞り込みなし。 */
  status?: string;
}

/**
 * 絞り込み条件から CSV ダウンロード URL を組み立てる。
 *
 * バックエンドは `from`/`to` を TIMESTAMP（オフセットなし ISO 8601）で受けるため、
 * `type="date"` の入力（日付のみ）を、from は当日 00:00:00、to は当日 23:59:59 に正規化する
 * （両端を含む閉区間のため、to は当日の最後の瞬間まで含める）。
 */
export function buildCsvDownloadUrl(filter: CsvExportFilter): string {
  const params = new URLSearchParams();

  if (filter.from) {
    params.set("from", `${filter.from}T00:00:00`);
  }
  if (filter.to) {
    params.set("to", `${filter.to}T23:59:59`);
  }
  if (filter.status && filter.status !== "ALL") {
    params.set("status", filter.status);
  }

  const query = params.toString();
  return query ? `${CSV_EXPORT_PATH}?${query}` : CSV_EXPORT_PATH;
}

/**
 * `Content-Disposition` ヘッダからファイル名を取り出す。
 *
 * バックエンドは ASCII のみのファイル名（`filename="reservations_....csv"`）を返す設計のため、
 * RFC 5987 の `filename*=UTF-8''...`（非 ASCII ファイル名）形式は解釈しない
 * （発生し得ない分岐を書かない）。ヘッダが無い・解析できない場合は `fallback` を返す。
 */
export function parseFilenameFromContentDisposition(
  header: string | null,
  fallback: string,
): string {
  if (!header) {
    return fallback;
  }
  const match = header.match(/filename="([^"]+)"/);
  return match ? match[1] : fallback;
}

/**
 * Blob を一時 object URL 経由でブラウザにダウンロードさせる（副作用のみ・テスト対象外）。
 */
export function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
