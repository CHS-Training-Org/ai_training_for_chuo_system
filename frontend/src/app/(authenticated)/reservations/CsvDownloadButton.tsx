import { Button } from "@/components/ui/button";

/**
 * 予約一覧の CSV ダウンロードボタン（ADMIN 専用。呼び出し側が ADMIN のときだけ描画する）。
 *
 * 現在の絞り込み（status・from・to）を引き継いだ Route Handler（/api/reports/reservations/csv）への
 * ダウンロードリンクを描画する。resourceName・page は CSV の対象外のため引き継がない。
 * status が未選択の場合はクエリに含めず、バックエンドの既定（DRAFT を除く4ステータス）に委ねる。
 */

const CSV_ENDPOINT = "/api/reports/reservations/csv";

interface CsvDownloadButtonProps {
  /** 画面で選択中のステータス（未選択は空配列）。 */
  status: string[];
  /** 期間の開始日時（datetime-local の値。秒補完は Route Handler が行う）。 */
  from?: string;
  /** 期間の終了日時（同上）。 */
  to?: string;
}

export function CsvDownloadButton({ status, from, to }: CsvDownloadButtonProps) {
  const params = new URLSearchParams();
  for (const s of status) params.append("status", s);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString();
  const href = query ? `${CSV_ENDPOINT}?${query}` : CSV_ENDPOINT;

  return (
    <Button asChild variant="outline">
      <a href={href} download data-testid="reservations-csv-download">
        CSV ダウンロード
      </a>
    </Button>
  );
}
