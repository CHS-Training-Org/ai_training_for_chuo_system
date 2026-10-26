package com.example.bookflow.presentation.csv;

import com.example.bookflow.application.ReservationCsvRow;
import com.example.bookflow.domain.ReservationStatus;
import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

/**
 * 予約一覧を CSV として書き出す（api-spec.md §帳票出力 準拠）。
 *
 * <p>BOM 付き UTF-8、日本語のヘッダ行、CRLF 区切り。値の整形は次の順で行う。
 *
 * <ol>
 *   <li>CSV インジェクション対策：先頭が {@code =} {@code +} {@code -} {@code @}、タブ、CR のセルは、先頭に {@code '} を付ける
 *   <li>RFC 4180 のエスケープ：カンマ、ダブルクォート、CR、LF を含むセルはダブルクォートで囲み、値中のダブルクォートは 2 つ重ねる
 * </ol>
 *
 * <p>HTTP にも DB にも依存しない。出力先の {@link OutputStream} は閉じない（呼び出し側の責務）。
 */
@Component
public class ReservationCsvWriter {

  /** UTF-8 の BOM（Excel での文字化けを防ぐ）。 */
  private static final byte[] BOM = {(byte) 0xEF, (byte) 0xBB, (byte) 0xBF};

  private static final String CRLF = "\r\n";

  private static final DateTimeFormatter DATE_TIME =
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

  private static final List<String> HEADER =
      List.of("予約ID", "リソース名", "申請者名", "開始日時", "終了日時", "目的", "承認状態");

  /** 先頭に付いていると表計算ソフトが数式として解釈しうる文字。 */
  private static final String FORMULA_PREFIXES = "=+-@\t\r";

  /** 承認状態の日本語ラベル（フロントエンドの {@code labels.ts} の {@code RESERVATION_STATUS_LABELS} と同じ文言）。 */
  private static final Map<ReservationStatus, String> STATUS_LABELS =
      new EnumMap<>(ReservationStatus.class);

  static {
    STATUS_LABELS.put(ReservationStatus.DRAFT, "ドラフト");
    STATUS_LABELS.put(ReservationStatus.PENDING, "承認待ち");
    STATUS_LABELS.put(ReservationStatus.APPROVED, "承認済み");
    STATUS_LABELS.put(ReservationStatus.REJECTED, "却下");
    STATUS_LABELS.put(ReservationStatus.CANCELLED, "キャンセル済み");
  }

  /**
   * BOM、ヘッダ行、各行を CRLF 区切りの UTF-8 として書き出す。
   *
   * @param rows 出力する行（0 件ならヘッダ行のみ）
   * @param out 出力先（閉じない）
   * @throws IOException 書き込みに失敗したとき
   */
  public void write(List<ReservationCsvRow> rows, OutputStream out) throws IOException {
    out.write(BOM);
    Writer writer = new OutputStreamWriter(out, StandardCharsets.UTF_8);
    writeLine(writer, HEADER);
    for (ReservationCsvRow row : rows) {
      writeLine(writer, toCells(row));
    }
    writer.flush();
  }

  private static List<String> toCells(ReservationCsvRow row) {
    return List.of(
        String.valueOf(row.id()),
        nullToEmpty(row.resourceName()),
        nullToEmpty(row.requesterName()),
        row.startAt() == null ? "" : row.startAt().format(DATE_TIME),
        row.endAt() == null ? "" : row.endAt().format(DATE_TIME),
        nullToEmpty(row.purpose()),
        row.status() == null ? "" : STATUS_LABELS.get(row.status()));
  }

  private static void writeLine(Writer writer, List<String> cells) throws IOException {
    StringBuilder line = new StringBuilder();
    for (int i = 0; i < cells.size(); i++) {
      if (i > 0) {
        line.append(',');
      }
      line.append(escape(neutralizeFormula(cells.get(i))));
    }
    line.append(CRLF);
    writer.write(line.toString());
  }

  /** 先頭が数式として解釈されうる文字なら、先頭に {@code '} を付ける。 */
  private static String neutralizeFormula(String value) {
    if (!value.isEmpty() && FORMULA_PREFIXES.indexOf(value.charAt(0)) >= 0) {
      return "'" + value;
    }
    return value;
  }

  /** RFC 4180：カンマ、ダブルクォート、CR、LF を含むなら囲み、ダブルクォートは 2 つ重ねる。 */
  private static String escape(String value) {
    boolean needsQuote =
        value.indexOf(',') >= 0
            || value.indexOf('"') >= 0
            || value.indexOf('\r') >= 0
            || value.indexOf('\n') >= 0;
    if (!needsQuote) {
      return value;
    }
    return '"' + value.replace("\"", "\"\"") + '"';
  }

  private static String nullToEmpty(String value) {
    return value == null ? "" : value;
  }
}
