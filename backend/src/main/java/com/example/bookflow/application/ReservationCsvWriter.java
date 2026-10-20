package com.example.bookflow.application;

import com.example.bookflow.domain.Reservation;
import com.example.bookflow.domain.ReservationStatus;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * 予約一覧を CSV（UTF-8・BOM 付き・CRLF）として書き出す。
 *
 * <p>Spring・JPA に依存しない純粋なクラス。リクエストごとに {@code new} で生成する（出力先を保持するため）。
 * ストリームのクローズは行わない（レスポンスのストリームはコンテナが閉じる）。
 *
 * <p>セル変換（{@link #toCell}・{@link #formatDateTime}・{@link #statusLabel}）は static の純粋関数で、単体テストの対象。
 */
public class ReservationCsvWriter {

  private static final String CRLF = "\r\n";
  private static final DateTimeFormatter DATE_TIME_FORMAT =
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
  private static final String HEADER =
      String.join(",", "予約ID", "リソース名", "申請者名", "開始日時", "終了日時", "利用目的", "ステータス");

  private final BufferedWriter writer;

  public ReservationCsvWriter(OutputStream out) {
    this.writer = new BufferedWriter(new OutputStreamWriter(out, StandardCharsets.UTF_8));
  }

  /** UTF-8 の BOM（{@code EF BB BF}）を書く。先頭で 1 回だけ呼ぶ。 */
  public void writeBom() throws IOException {
    writer.write('﻿');
  }

  /** 7 列の日本語ヘッダ行を書く。 */
  public void writeHeader() throws IOException {
    writer.write(HEADER);
    writer.write(CRLF);
  }

  /** 予約 1 件につき 1 行を書く。 */
  public void writeRows(List<Reservation> reservations) throws IOException {
    for (Reservation r : reservations) {
      writer.write(r.getId().toString());
      writer.write(',');
      writer.write(toCell(r.getResource().getName()));
      writer.write(',');
      writer.write(toCell(r.getRequester().getName()));
      writer.write(',');
      writer.write(formatDateTime(r.getStartAt()));
      writer.write(',');
      writer.write(formatDateTime(r.getEndAt()));
      writer.write(',');
      writer.write(toCell(r.getPurpose()));
      writer.write(',');
      writer.write(statusLabel(r.getStatus()));
      writer.write(CRLF);
    }
  }

  /** バッファをストリームへ押し出す（ページごとに呼ぶ）。 */
  public void flush() throws IOException {
    writer.flush();
  }

  /**
   * 文字列セルを CSV の 1 セルに変換する。
   *
   * <p>順序が重要：(1) 先頭が {@code =} {@code +} {@code -} {@code @}・タブ・CR なら {@code '} を付けて数式注入を無害化し、 (2)
   * その後に RFC 4180 のエスケープ（カンマ・改行・{@code "} を含む場合は {@code "} で囲み、値中の {@code "} は {@code ""}）を行う。
   * 逆順だと無害化の記号が引用符の内側で意味を失うおそれがある。
   *
   * @param raw 元の値（null は空文字列として扱う）
   * @return CSV セル
   */
  static String toCell(String raw) {
    String value = raw == null ? "" : raw;
    if (!value.isEmpty() && isFormulaTrigger(value.charAt(0))) {
      value = "'" + value;
    }
    if (value.indexOf(',') >= 0
        || value.indexOf('"') >= 0
        || value.indexOf('\r') >= 0
        || value.indexOf('\n') >= 0) {
      return '"' + value.replace("\"", "\"\"") + '"';
    }
    return value;
  }

  private static boolean isFormulaTrigger(char c) {
    return c == '=' || c == '+' || c == '-' || c == '@' || c == '\t' || c == '\r';
  }

  /** 日時を {@code yyyy-MM-dd HH:mm}（秒なし・タイムゾーン変換なし）に整形する。 */
  static String formatDateTime(LocalDateTime value) {
    return value.format(DATE_TIME_FORMAT);
  }

  /** 予約ステータスの日本語ラベル。FE の {@code RESERVATION_STATUS_LABELS}（labels.ts）と同一表記。変更時は両方を直す。 */
  static String statusLabel(ReservationStatus status) {
    return switch (status) {
      case DRAFT -> "ドラフト";
      case PENDING -> "承認待ち";
      case APPROVED -> "承認済み";
      case REJECTED -> "却下";
      case CANCELLED -> "キャンセル済み";
    };
  }
}
