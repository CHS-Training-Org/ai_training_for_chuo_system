package com.example.bookflow.application;

import com.example.bookflow.domain.Reservation;
import com.example.bookflow.domain.ReservationStatus;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

/**
 * 予約のリストを CSV のバイト列に変換するユーティリティ（api-spec.md §帳票出力 準拠）。
 *
 * <p>形式は UTF-8（BOM 付き）・改行 CRLF・日本語ヘッダ行。日時は {@code yyyy/MM/dd HH:mm}、承認状態は画面と同じ日本語表示名で出力する。
 * カンマ・ダブルクォート・改行を含む値は RFC 4180 に従ってエスケープする。並び順は呼び出し側の責務で、与えられた順に出力する。
 *
 * <p>{@code resource} と {@code requester} は初期化済み（JOIN FETCH 済み）であること。
 */
public final class ReservationCsvWriter {

  private static final byte[] BOM = {(byte) 0xEF, (byte) 0xBB, (byte) 0xBF};

  private static final String CRLF = "\r\n";

  private static final String HEADER = "予約ID,リソース名,申請者名,開始日時,終了日時,目的,承認状態";

  private static final DateTimeFormatter DATE_TIME_FORMAT =
      DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm");

  /** 承認状態の日本語表示名（FE の {@code labels.ts} の {@code RESERVATION_STATUS_LABELS} と同じ文言）。 */
  private static final Map<ReservationStatus, String> STATUS_LABELS =
      Map.of(
          ReservationStatus.DRAFT, "ドラフト",
          ReservationStatus.PENDING, "承認待ち",
          ReservationStatus.APPROVED, "承認済み",
          ReservationStatus.REJECTED, "却下",
          ReservationStatus.CANCELLED, "キャンセル済み");

  private ReservationCsvWriter() {}

  /**
   * 予約のリストを CSV のバイト列にする。
   *
   * @param reservations 予約（出力順のまま。空ならヘッダ行のみ）
   * @return BOM 付き UTF-8 の CSV
   */
  public static byte[] write(List<Reservation> reservations) {
    StringBuilder sb = new StringBuilder(HEADER).append(CRLF);
    for (Reservation r : reservations) {
      sb.append(escape(r.getId().toString()))
          .append(',')
          .append(escape(r.getResource().getName()))
          .append(',')
          .append(escape(r.getRequester().getName()))
          .append(',')
          .append(formatDateTime(r.getStartAt()))
          .append(',')
          .append(formatDateTime(r.getEndAt()))
          .append(',')
          .append(escape(r.getPurpose()))
          .append(',')
          .append(escape(STATUS_LABELS.get(r.getStatus())))
          .append(CRLF);
    }
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    out.writeBytes(BOM);
    out.writeBytes(sb.toString().getBytes(StandardCharsets.UTF_8));
    return out.toByteArray();
  }

  private static String formatDateTime(LocalDateTime value) {
    return value.format(DATE_TIME_FORMAT);
  }

  /** カンマ・ダブルクォート・改行を含む値をダブルクォートで囲み、中のダブルクォートを二重にする（RFC 4180）。 */
  private static String escape(String value) {
    if (value == null) {
      return "";
    }
    if (value.indexOf(',') < 0
        && value.indexOf('"') < 0
        && value.indexOf('\r') < 0
        && value.indexOf('\n') < 0) {
      return value;
    }
    return '"' + value.replace("\"", "\"\"") + '"';
  }
}
