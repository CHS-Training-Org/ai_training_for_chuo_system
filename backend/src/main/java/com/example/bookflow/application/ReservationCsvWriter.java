package com.example.bookflow.application;

import com.example.bookflow.domain.ReservationStatus;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * 予約の CSV を組み立てる純粋なクラス（Spring・JPA に依存しない）。
 *
 * <p>出力規則（api-spec.md §帳票出力）：BOM 付き UTF-8、日本語ヘッダ、行区切りは CRLF、RFC 4180 のエスケープ、 数式として実行されうる文字列値（先頭が
 * {@code =} {@code +} {@code -} {@code @}）の無害化。
 */
public final class ReservationCsvWriter {

  private static final String BOM = "﻿";
  private static final String CRLF = "\r\n";
  private static final String HEADER = "予約ID,リソース名,申請者名,開始日時,終了日時,目的,承認状態";
  private static final DateTimeFormatter DATE_TIME =
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

  private ReservationCsvWriter() {}

  /**
   * 予約を CSV のバイト列にする。0 件でもヘッダ行は出力する。
   *
   * @param rows 出力する行（順序はそのまま保持される）
   * @return BOM 付き UTF-8 のバイト列
   */
  public static byte[] write(List<ReservationCsvRow> rows) {
    StringBuilder sb = new StringBuilder(BOM).append(HEADER).append(CRLF);
    for (ReservationCsvRow row : rows) {
      sb.append(row.id())
          .append(',')
          .append(escape(row.resourceName()))
          .append(',')
          .append(escape(row.requesterName()))
          .append(',')
          .append(row.startAt().format(DATE_TIME))
          .append(',')
          .append(row.endAt().format(DATE_TIME))
          .append(',')
          .append(escape(row.purpose()))
          .append(',')
          .append(statusLabel(row.status()))
          .append(CRLF);
    }
    return sb.toString().getBytes(StandardCharsets.UTF_8);
  }

  /**
   * 文字列値を CSV 用にエスケープする。
   *
   * <p>先頭が {@code =} {@code +} {@code -} {@code @} なら先頭に {@code '} を付けて数式化を防ぎ、その後
   * カンマ・改行・二重引用符を含む値を二重引用符で囲む。
   *
   * @param value 値（null は空文字）
   */
  static String escape(String value) {
    if (value == null) {
      return "";
    }
    String safe = value;
    if (!safe.isEmpty() && "=+-@".indexOf(safe.charAt(0)) >= 0) {
      safe = "'" + safe;
    }
    if (safe.indexOf(',') >= 0
        || safe.indexOf('"') >= 0
        || safe.indexOf('\r') >= 0
        || safe.indexOf('\n') >= 0) {
      return "\"" + safe.replace("\"", "\"\"") + "\"";
    }
    return safe;
  }

  /** 予約ステータスの日本語ラベル（画面の表示と同じ）。 */
  static String statusLabel(ReservationStatus status) {
    return switch (status) {
      case PENDING -> "承認待ち";
      case APPROVED -> "承認済み";
      case REJECTED -> "却下";
      case CANCELLED -> "キャンセル済み";
      case DRAFT -> "ドラフト";
    };
  }
}
