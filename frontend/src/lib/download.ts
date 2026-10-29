/**
 * ブラウザでのファイルダウンロード用ユーティリティ（クライアント側のみで使用）。
 */

/**
 * `Content-Disposition` ヘッダからファイル名を取り出す。
 *
 * `filename="reservations_20261001_20261031.csv"` 形式を想定する。取り出せない場合は null。
 */
export function parseContentDispositionFileName(header: string | null): string | null {
  if (!header) return null;
  const match = /filename="?([^";]+)"?/i.exec(header);
  return match ? match[1] : null;
}

/**
 * Blob を指定のファイル名で保存する（一時的な `<a download>` をクリックする）。
 */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
