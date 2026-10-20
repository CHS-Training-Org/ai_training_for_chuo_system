package com.example.bookflow.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.bookflow.domain.Reservation;
import com.example.bookflow.domain.ReservationStatus;
import com.example.bookflow.domain.Resource;
import com.example.bookflow.domain.ResourceCategory;
import com.example.bookflow.domain.User;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

/**
 * {@link ReservationCsvWriter} 単体テスト（DB・Spring なし。ADR-018 準拠）。
 *
 * <p>テスト命名規約（ADR-018）: {@code methodName_condition_expectedBehavior}
 */
class ReservationCsvWriterTest {

  private static final String HEADER_LINE = "予約ID,リソース名,申請者名,開始日時,終了日時,利用目的,ステータス\r\n";

  // ---------------------------------------------------------------------------
  // テストデータ生成
  // ---------------------------------------------------------------------------

  private static User user(String name) {
    try {
      Constructor<User> ctor = User.class.getDeclaredConstructor();
      ctor.setAccessible(true);
      User u = ctor.newInstance();
      Field f = User.class.getDeclaredField("name");
      f.setAccessible(true);
      f.set(u, name);
      return u;
    } catch (ReflectiveOperationException e) {
      throw new IllegalStateException(e);
    }
  }

  private static Reservation reservation(
      String resourceName, String requesterName, String purpose, ReservationStatus status) {
    Resource resource =
        Resource.create(resourceName, ResourceCategory.ROOM, null, null, false, true, null);
    return Reservation.create(
        resource,
        user(requesterName),
        LocalDateTime.of(2026, 10, 20, 9, 5, 30),
        LocalDateTime.of(2026, 10, 20, 11, 0),
        purpose,
        null,
        status);
  }

  // ---------------------------------------------------------------------------
  // toCell
  // ---------------------------------------------------------------------------

  @Nested
  class ToCell {

    @Test
    void toCell_plainText_returnsAsIs() {
      assertThat(ReservationCsvWriter.toCell("第1会議室")).isEqualTo("第1会議室");
    }

    @Test
    void toCell_null_returnsEmpty() {
      assertThat(ReservationCsvWriter.toCell(null)).isEmpty();
    }

    @Test
    void toCell_empty_returnsEmpty() {
      assertThat(ReservationCsvWriter.toCell("")).isEmpty();
    }

    @Test
    void toCell_withComma_wrapsInQuotes() {
      assertThat(ReservationCsvWriter.toCell("A,B 会議")).isEqualTo("\"A,B 会議\"");
    }

    @Test
    void toCell_withLf_wrapsInQuotes() {
      assertThat(ReservationCsvWriter.toCell("1行目\n2行目")).isEqualTo("\"1行目\n2行目\"");
    }

    @Test
    void toCell_withCrLf_wrapsInQuotes() {
      assertThat(ReservationCsvWriter.toCell("1行目\r\n2行目")).isEqualTo("\"1行目\r\n2行目\"");
    }

    @Test
    void toCell_withDoubleQuote_doublesQuoteAndWraps() {
      assertThat(ReservationCsvWriter.toCell("\"引用\"")).isEqualTo("\"\"\"引用\"\"\"");
    }

    @Test
    void toCell_startsWithEquals_prefixesApostrophe() {
      assertThat(ReservationCsvWriter.toCell("=1+1")).isEqualTo("'=1+1");
    }

    @Test
    void toCell_startsWithPlus_prefixesApostrophe() {
      assertThat(ReservationCsvWriter.toCell("+81-3-1234")).isEqualTo("'+81-3-1234");
    }

    @Test
    void toCell_startsWithMinus_prefixesApostrophe() {
      assertThat(ReservationCsvWriter.toCell("-1")).isEqualTo("'-1");
    }

    @Test
    void toCell_startsWithAt_prefixesApostrophe() {
      assertThat(ReservationCsvWriter.toCell("@SUM(A1)")).isEqualTo("'@SUM(A1)");
    }

    @Test
    void toCell_startsWithTab_prefixesApostrophe() {
      assertThat(ReservationCsvWriter.toCell("\t=1")).isEqualTo("'\t=1");
    }

    @Test
    void toCell_startsWithCr_prefixesApostropheThenQuotes() {
      // CR は無害化の対象かつ RFC 4180 の引用対象。無害化が先なので記号は引用符の内側に残る。
      assertThat(ReservationCsvWriter.toCell("\r=1")).isEqualTo("\"'\r=1\"");
    }

    @Test
    void toCell_formulaWithComma_sanitizesBeforeQuoting() {
      // 順序の検証：無害化 → 引用。逆順だと先頭が '"' になり無害化が効かない。
      assertThat(ReservationCsvWriter.toCell("=HYPERLINK(\"x\",\"y\")"))
          .isEqualTo("\"'=HYPERLINK(\"\"x\"\",\"\"y\"\")\"");
    }

    @Test
    void toCell_triggerCharacterInMiddle_isNotSanitized() {
      assertThat(ReservationCsvWriter.toCell("a=b")).isEqualTo("a=b");
    }
  }

  // ---------------------------------------------------------------------------
  // formatDateTime / statusLabel
  // ---------------------------------------------------------------------------

  @Nested
  class Formatting {

    @Test
    void formatDateTime_withSeconds_omitsSeconds() {
      assertThat(ReservationCsvWriter.formatDateTime(LocalDateTime.of(2026, 10, 20, 9, 5, 59)))
          .isEqualTo("2026-10-20 09:05");
    }

    @Test
    void formatDateTime_singleDigitParts_zeroPads() {
      assertThat(ReservationCsvWriter.formatDateTime(LocalDateTime.of(2026, 1, 2, 3, 4)))
          .isEqualTo("2026-01-02 03:04");
    }

    @Test
    void statusLabel_allStatuses_matchFrontendLabels() {
      // FE の RESERVATION_STATUS_LABELS（labels.ts）と同一表記であること（M-04）。
      assertThat(ReservationCsvWriter.statusLabel(ReservationStatus.DRAFT)).isEqualTo("ドラフト");
      assertThat(ReservationCsvWriter.statusLabel(ReservationStatus.PENDING)).isEqualTo("承認待ち");
      assertThat(ReservationCsvWriter.statusLabel(ReservationStatus.APPROVED)).isEqualTo("承認済み");
      assertThat(ReservationCsvWriter.statusLabel(ReservationStatus.REJECTED)).isEqualTo("却下");
      assertThat(ReservationCsvWriter.statusLabel(ReservationStatus.CANCELLED))
          .isEqualTo("キャンセル済み");
    }

    @Test
    void statusLabel_everyEnumValue_hasLabel() {
      for (ReservationStatus s : ReservationStatus.values()) {
        assertThat(ReservationCsvWriter.statusLabel(s)).isNotBlank();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // writeBom / writeHeader / writeRows
  // ---------------------------------------------------------------------------

  @Nested
  class Writing {

    @Test
    void writeBom_always_writesUtf8BomBytes() throws IOException {
      ByteArrayOutputStream out = new ByteArrayOutputStream();
      ReservationCsvWriter writer = new ReservationCsvWriter(out);

      writer.writeBom();
      writer.flush();

      assertThat(out.toByteArray()).containsExactly(0xEF, 0xBB, 0xBF);
    }

    @Test
    void writeHeader_always_writesSevenJapaneseColumnsWithCrLf() throws IOException {
      ByteArrayOutputStream out = new ByteArrayOutputStream();
      ReservationCsvWriter writer = new ReservationCsvWriter(out);

      writer.writeHeader();
      writer.flush();

      assertThat(out.toString(StandardCharsets.UTF_8)).isEqualTo(HEADER_LINE);
    }

    @Test
    void writeRows_emptyList_writesNothing() throws IOException {
      ByteArrayOutputStream out = new ByteArrayOutputStream();
      ReservationCsvWriter writer = new ReservationCsvWriter(out);

      writer.writeRows(List.of());
      writer.flush();

      assertThat(out.size()).isZero();
    }

    @Test
    void writeRows_multipleReservations_writesOneCrLfTerminatedLineEachInOrder()
        throws IOException {
      Reservation first = reservation("第1会議室", "山田 太郎", "定例会議", ReservationStatus.APPROVED);
      Reservation second = reservation("社用車A", "佐藤 花子", "A,B 訪問", ReservationStatus.PENDING);
      ByteArrayOutputStream out = new ByteArrayOutputStream();
      ReservationCsvWriter writer = new ReservationCsvWriter(out);

      writer.writeRows(List.of(first, second));
      writer.flush();

      String expected =
          first.getId()
              + ",第1会議室,山田 太郎,2026-10-20 09:05,2026-10-20 11:00,定例会議,承認済み\r\n"
              + second.getId()
              + ",社用車A,佐藤 花子,2026-10-20 09:05,2026-10-20 11:00,\"A,B 訪問\",承認待ち\r\n";
      assertThat(out.toString(StandardCharsets.UTF_8)).isEqualTo(expected);
    }

    @Test
    void writeRows_formulaPurpose_isSanitized() throws IOException {
      Reservation r =
          reservation("第1会議室", "山田 太郎", "=HYPERLINK(\"http://x\")", ReservationStatus.APPROVED);
      ByteArrayOutputStream out = new ByteArrayOutputStream();
      ReservationCsvWriter writer = new ReservationCsvWriter(out);

      writer.writeRows(List.of(r));
      writer.flush();

      assertThat(out.toString(StandardCharsets.UTF_8))
          .contains(",\"'=HYPERLINK(\"\"http://x\"\")\",承認済み\r\n");
    }

    @Test
    void writeRows_nullPurpose_writesEmptyCell() throws IOException {
      Reservation r = reservation("第1会議室", "山田 太郎", null, ReservationStatus.APPROVED);
      ByteArrayOutputStream out = new ByteArrayOutputStream();
      ReservationCsvWriter writer = new ReservationCsvWriter(out);

      writer.writeRows(List.of(r));
      writer.flush();

      assertThat(out.toString(StandardCharsets.UTF_8)).contains("2026-10-20 11:00,,承認済み\r\n");
    }

    @Test
    void writeBomHeaderRows_fullSequence_producesBomThenHeaderThenRows() throws IOException {
      Reservation r = reservation("第1会議室", "山田 太郎", "会議", ReservationStatus.APPROVED);
      ByteArrayOutputStream out = new ByteArrayOutputStream();
      ReservationCsvWriter writer = new ReservationCsvWriter(out);

      writer.writeBom();
      writer.writeHeader();
      writer.writeRows(List.of(r));
      writer.flush();

      byte[] bytes = out.toByteArray();
      assertThat(bytes[0]).isEqualTo((byte) 0xEF);
      assertThat(bytes[1]).isEqualTo((byte) 0xBB);
      assertThat(bytes[2]).isEqualTo((byte) 0xBF);
      String body = new String(bytes, 3, bytes.length - 3, StandardCharsets.UTF_8);
      assertThat(body).startsWith(HEADER_LINE).endsWith("会議,承認済み\r\n");
    }
  }
}
