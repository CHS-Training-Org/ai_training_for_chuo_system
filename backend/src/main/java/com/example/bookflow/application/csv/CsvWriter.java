package com.example.bookflow.application.csv;

import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * CSV 本文を組み立てる純粋なユーティリティ（api-spec.md §帳票出力 準拠）。
 *
 * <p>出力形式は UTF-8（先頭に BOM）・改行 CRLF（最終行にも付ける）。セルは RFC 4180 に従ってエスケープし、 CSV 数式インジェクションを避けるため先頭が {@code
 * = + - @}・タブ・CR のデータセルには {@code '} を付ける。フレームワークにもエンティティにも依存しない。
 */
public final class CsvWriter {

  private static final byte[] UTF8_BOM = {(byte) 0xEF, (byte) 0xBB, (byte) 0xBF};
  private static final String CRLF = "\r\n";
  private static final String FORMULA_TRIGGERS = "=+-@\t\r";

  private CsvWriter() {}

  /**
   * ヘッダ行とデータ行から BOM 付き UTF-8 の CSV を作る。
   *
   * <p>ヘッダは固定文字列のため数式の無害化は行わず、RFC 4180 のエスケープのみ適用する。データ行は両方を適用する。
   *
   * @param header ヘッダ行のセル
   * @param rows データ行（各行のセル。{@code null} のセルは空文字として扱う）
   * @return BOM + UTF-8 の CSV バイト列
   */
  public static byte[] toBytes(List<String> header, List<List<String>> rows) {
    StringBuilder body = new StringBuilder();
    appendLine(body, header, false);
    for (List<String> row : rows) {
      appendLine(body, row, true);
    }
    byte[] content = body.toString().getBytes(StandardCharsets.UTF_8);
    byte[] result = new byte[UTF8_BOM.length + content.length];
    System.arraycopy(UTF8_BOM, 0, result, 0, UTF8_BOM.length);
    System.arraycopy(content, 0, result, UTF8_BOM.length, content.length);
    return result;
  }

  /**
   * データセルを CSV 用に整える（数式の無害化 → RFC 4180 エスケープの順）。
   *
   * @param cell セルの値（{@code null} は空文字として扱う）
   * @return エスケープ済みのセル
   */
  static String escape(String cell) {
    return quoteIfNeeded(neutralizeFormula(cell == null ? "" : cell));
  }

  private static void appendLine(StringBuilder out, List<String> cells, boolean isData) {
    for (int i = 0; i < cells.size(); i++) {
      if (i > 0) {
        out.append(',');
      }
      String cell = cells.get(i);
      out.append(isData ? escape(cell) : quoteIfNeeded(cell == null ? "" : cell));
    }
    out.append(CRLF);
  }

  private static String neutralizeFormula(String cell) {
    if (!cell.isEmpty() && FORMULA_TRIGGERS.indexOf(cell.charAt(0)) >= 0) {
      return "'" + cell;
    }
    return cell;
  }

  private static String quoteIfNeeded(String cell) {
    boolean needsQuote =
        cell.indexOf(',') >= 0
            || cell.indexOf('"') >= 0
            || cell.indexOf('\r') >= 0
            || cell.indexOf('\n') >= 0;
    if (!needsQuote) {
      return cell;
    }
    return "\"" + cell.replace("\"", "\"\"") + "\"";
  }
}
