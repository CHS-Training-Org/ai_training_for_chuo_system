package com.example.bookflow.application;

import com.example.bookflow.domain.ReservationCsvRow;
import com.example.bookflow.domain.ReservationStatus;
import com.opencsv.CSVWriter;
import com.opencsv.ICSVWriter;
import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.stream.Stream;
import org.springframework.stereotype.Component;

/**
 * 予約 CSV の生成ロジック（Spring 非依存・単体テスト可能）。
 *
 * <p>ADR-033 のとおり opencsv を用いる。opencsv には数式インジェクション対策機能がないため、{@link #sanitize} で自前実装する。
 */
@Component
public class ReservationCsvWriter {

  /** Excel が UTF-8 と判定するための BOM。 */
  private static final byte[] UTF8_BOM = {(byte) 0xEF, (byte) 0xBB, (byte) 0xBF};

  /** 日本語ヘッダ行（RPT-02 の 7 項目）。 */
  static final String[] HEADER = {"予約ID", "リソース名", "申請者名", "開始日時", "終了日時", "目的", "承認状態"};

  /** Excel が日時として認識できる形式（帳票専用。JSON API の ISO 8601 とは意図的に分ける）。 */
  private static final DateTimeFormatter DATE_TIME =
      DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm");

  /** 数式インジェクション対策で先頭にアポストロフィを付与する開始文字（BR-04）。 */
  private static final String INJECTION_PREFIXES = "=+-@\t\r";

  /**
   * BOM・ヘッダ行・データ行の順に CSV を書き出す。
   *
   * <p>{@code out} は close しない。Spring の {@code StreamingResponseBody} 実行機構が {@code writeTo()} の直後に
   * {@code outputStream.flush()} を呼ぶため、ここで close するとコンテナ実装によってはその flush が例外になる。{@link
   * ICSVWriter#checkError()}（flush を兼ねる）で確認するに留める。
   *
   * @param out 出力先（クローズしない）
   * @param rows 帳票行のストリーム（クローズは呼び出し側の責務）
   * @throws IOException 書き込み失敗
   */
  public void write(OutputStream out, Stream<ReservationCsvRow> rows) throws IOException {
    out.write(UTF8_BOM);
    Writer writer = new OutputStreamWriter(out, StandardCharsets.UTF_8);
    CSVWriter csv =
        new CSVWriter(
            writer,
            ICSVWriter.DEFAULT_SEPARATOR,
            ICSVWriter.DEFAULT_QUOTE_CHARACTER,
            ICSVWriter.DEFAULT_ESCAPE_CHARACTER,
            ICSVWriter.RFC4180_LINE_END);
    csv.writeNext(HEADER);
    rows.forEach(row -> csv.writeNext(toLine(row)));
    // CSVWriter#writeNext は IOException を内部で握り潰して保持するため、明示的に確認する
    // （checkError() は flush も兼ねる）。クライアント切断等をここで検出できる。
    if (csv.checkError()) {
      throw csv.getException();
    }
  }

  private static String[] toLine(ReservationCsvRow row) {
    return new String[] {
      row.id().toString(),
      sanitize(row.resourceName()),
      sanitize(row.requesterName()),
      DATE_TIME.format(row.startAt()),
      DATE_TIME.format(row.endAt()),
      sanitize(row.purpose()),
      statusLabel(row.status())
    };
  }

  /**
   * ユーザー自由入力セルの数式インジェクション対策（BR-04）。
   *
   * <p>先頭が {@code = + - @} またはタブ・CR の場合、アポストロフィを付与して Excel 等の表計算ソフトが数式として解釈することを 防ぐ。ダブルクォートによる CSV
   * エスケープはこの対策にならない（Excel はパース時にクォートを外してから評価するため）。
   *
   * @param value 対象値
   * @return サニタイズ後の値
   */
  static String sanitize(String value) {
    if (value == null || value.isEmpty()) {
      return "";
    }
    return INJECTION_PREFIXES.indexOf(value.charAt(0)) >= 0 ? "'" + value : value;
  }

  private static String statusLabel(ReservationStatus status) {
    // フロントエンドの RESERVATION_STATUS_LABELS（labels.ts）と表記を統一する。
    return switch (status) {
      case DRAFT -> "ドラフト";
      case PENDING -> "承認待ち";
      case APPROVED -> "承認済み";
      case REJECTED -> "却下";
      case CANCELLED -> "キャンセル済み";
    };
  }
}
