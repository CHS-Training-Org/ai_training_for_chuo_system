package com.example.bookflow.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.bookflow.domain.ReservationCsvRow;
import com.example.bookflow.domain.ReservationStatus;
import com.opencsv.CSVReader;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

/**
 * {@link ReservationCsvWriter} 単体テスト（ADR-018 準拠）。
 *
 * <p>{@link ReservationCsvRow} は record のためリフレクションヘルパーは不要（射影方式の利点）。 テスト命名規約（ADR-018）: {@code
 * methodName_condition_expectedBehavior}
 */
class ReservationCsvWriterTest {

  private final ReservationCsvWriter writer = new ReservationCsvWriter();

  private static ReservationCsvRow makeRow(String purpose, ReservationStatus status) {
    return new ReservationCsvRow(
        UUID.fromString("550e8400-e29b-41d4-a716-446655440030"),
        "第1会議室",
        "山田 太郎",
        LocalDateTime.of(2026, 9, 11, 10, 0),
        LocalDateTime.of(2026, 9, 11, 12, 0),
        purpose,
        status);
  }

  private byte[] writeToBytes(Stream<ReservationCsvRow> rows) throws IOException {
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    writer.write(out, rows);
    return out.toByteArray();
  }

  @Nested
  class Bom {
    @Test
    void write_always_writesUtf8BomAtHead() throws IOException {
      byte[] bytes = writeToBytes(Stream.of(makeRow("週次ミーティング", ReservationStatus.APPROVED)));

      assertThat(bytes[0]).isEqualTo((byte) 0xEF);
      assertThat(bytes[1]).isEqualTo((byte) 0xBB);
      assertThat(bytes[2]).isEqualTo((byte) 0xBF);
    }
  }

  @Nested
  class Header {
    @Test
    void write_always_writesJapaneseHeaderRow() throws IOException {
      byte[] bytes = writeToBytes(Stream.empty());
      String csv = new String(bytes, 3, bytes.length - 3, StandardCharsets.UTF_8);

      assertThat(csv.lines().findFirst())
          .contains("\"予約ID\",\"リソース名\",\"申請者名\",\"開始日時\",\"終了日時\",\"目的\",\"承認状態\"");
    }
  }

  @Nested
  class Row {
    @Test
    void write_givenOneRow_writesSevenColumnsInOrder() throws IOException {
      byte[] bytes = writeToBytes(Stream.of(makeRow("週次ミーティング", ReservationStatus.APPROVED)));
      String csv = new String(bytes, 3, bytes.length - 3, StandardCharsets.UTF_8);
      List<String> lines = csv.lines().toList();

      assertThat(lines).hasSize(2);
      assertThat(lines.get(1))
          .isEqualTo(
              "\"550e8400-e29b-41d4-a716-446655440030\",\"第1会議室\",\"山田 太郎\","
                  + "\"2026/09/11 10:00\",\"2026/09/11 12:00\",\"週次ミーティング\",\"承認済み\"");
    }

    @Test
    void write_givenEmptyStream_writesBomAndHeaderOnly() throws IOException {
      byte[] bytes = writeToBytes(Stream.empty());
      String csv = new String(bytes, 3, bytes.length - 3, StandardCharsets.UTF_8);

      assertThat(csv.lines().toList()).hasSize(1);
    }
  }

  @Nested
  class DateTimeFormat {
    @Test
    void write_givenDateTime_formatsAsSlashSeparatedMinutePrecision() throws IOException {
      byte[] bytes = writeToBytes(Stream.of(makeRow("週次ミーティング", ReservationStatus.APPROVED)));
      String csv = new String(bytes, 3, bytes.length - 3, StandardCharsets.UTF_8);

      assertThat(csv).contains("2026/09/11 10:00").contains("2026/09/11 12:00");
    }
  }

  @Nested
  class StatusLabel {
    @ParameterizedTest
    @EnumSource(ReservationStatus.class)
    void write_givenEachStatus_writesJapaneseLabel(ReservationStatus status) throws IOException {
      byte[] bytes = writeToBytes(Stream.of(makeRow("目的", status)));
      String csv = new String(bytes, 3, bytes.length - 3, StandardCharsets.UTF_8);

      String expectedLabel =
          switch (status) {
            case DRAFT -> "ドラフト";
            case PENDING -> "承認待ち";
            case APPROVED -> "承認済み";
            case REJECTED -> "却下";
            case CANCELLED -> "キャンセル済み";
          };
      assertThat(csv.lines().toList().get(1)).endsWith("\"" + expectedLabel + "\"");
    }
  }

  @Nested
  class CsvInjection {
    @Test
    void write_givenPurposeStartingWithEquals_prefixesApostrophe() {
      assertThat(ReservationCsvWriter.sanitize("=1+1")).isEqualTo("'=1+1");
    }

    @Test
    void write_givenPurposeStartingWithPlusMinusAt_prefixesApostrophe() {
      assertThat(ReservationCsvWriter.sanitize("+1")).isEqualTo("'+1");
      assertThat(ReservationCsvWriter.sanitize("-1")).isEqualTo("'-1");
      assertThat(ReservationCsvWriter.sanitize("@SUM(A1)")).isEqualTo("'@SUM(A1)");
    }

    @Test
    void write_givenNormalPurpose_doesNotModifyValue() {
      assertThat(ReservationCsvWriter.sanitize("週次ミーティング")).isEqualTo("週次ミーティング");
    }

    @Test
    void write_givenFormulaLikeResourceName_prefixesApostrophe() throws IOException {
      ReservationCsvRow row =
          new ReservationCsvRow(
              UUID.fromString("550e8400-e29b-41d4-a716-446655440030"),
              "=SUM(A1:A10)",
              "山田 太郎",
              LocalDateTime.of(2026, 9, 11, 10, 0),
              LocalDateTime.of(2026, 9, 11, 12, 0),
              "目的",
              ReservationStatus.APPROVED);
      byte[] bytes = writeToBytes(Stream.of(row));
      String csv = new String(bytes, 3, bytes.length - 3, StandardCharsets.UTF_8);

      assertThat(csv).contains("'=SUM(A1:A10)");
    }

    @Test
    void write_always_doesNotSanitizeIdOrDateOrStatus() throws IOException {
      byte[] bytes = writeToBytes(Stream.of(makeRow("目的", ReservationStatus.APPROVED)));
      String csv = new String(bytes, 3, bytes.length - 3, StandardCharsets.UTF_8);
      String dataLine = csv.lines().toList().get(1);

      assertThat(dataLine).doesNotContain("'550e8400").doesNotContain("'2026/09/11");
    }
  }

  @Nested
  class Escaping {
    @Test
    void write_givenPurposeWithCommaAndQuote_isRoundTrippable() throws IOException {
      ReservationCsvRow row = makeRow("会議、\"重要\"", ReservationStatus.APPROVED);
      byte[] bytes = writeToBytes(Stream.of(row));
      String csv = new String(bytes, 3, bytes.length - 3, StandardCharsets.UTF_8);

      try (CSVReader reader = new CSVReader(new StringReader(csv))) {
        reader.readNext(); // ヘッダ行を読み飛ばす
        String[] dataRow = reader.readNext();
        assertThat(dataRow[5]).isEqualTo("会議、\"重要\"");
      } catch (Exception e) {
        throw new IOException(e);
      }
    }
  }

  @Nested
  class LineEnding {
    @Test
    void write_always_usesCrLf() throws IOException {
      byte[] bytes = writeToBytes(Stream.of(makeRow("週次ミーティング", ReservationStatus.APPROVED)));
      String csv = new String(bytes, 3, bytes.length - 3, StandardCharsets.UTF_8);

      assertThat(csv).contains("\r\n");
    }
  }

  @Nested
  class StreamLifecycle {
    @Test
    void write_always_doesNotCloseUnderlyingStream() throws IOException {
      boolean[] closed = {false};
      OutputStream tracking =
          new ByteArrayOutputStream() {
            @Override
            public void close() throws IOException {
              closed[0] = true;
              super.close();
            }
          };

      writer.write(tracking, Stream.of(makeRow("目的", ReservationStatus.APPROVED)));

      assertThat(closed[0]).isFalse();
    }
  }
}
