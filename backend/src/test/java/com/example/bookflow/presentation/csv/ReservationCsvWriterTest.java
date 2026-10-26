package com.example.bookflow.presentation.csv;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.bookflow.application.ReservationCsvRow;
import com.example.bookflow.domain.ReservationStatus;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * {@link ReservationCsvWriter} のユニットテスト（api-spec.md §帳票出力 の CSV 書式規則）。
 *
 * <p>HTTP にも DB にも依存しない純粋なテスト。承認状態の日本語ラベルは、フロントエンドの {@code labels.ts} とは別に、ここで期待する文言を 固定する（バックエンドと
 * フロントエンドをまたぐ自動テストは作らず、変更時は手で揃える）。
 *
 * <p>テスト命名規約（ADR-018）: {@code methodName_condition_expectedBehavior}
 */
class ReservationCsvWriterTest {

  private static final byte[] BOM = {(byte) 0xEF, (byte) 0xBB, (byte) 0xBF};

  private static final String HEADER_LINE = "予約ID,リソース名,申請者名,開始日時,終了日時,目的,承認状態\r\n";

  private static final UUID ID = UUID.fromString("72000000-0000-0000-0000-000000000001");
  private static final LocalDateTime START = LocalDateTime.of(2026, 10, 2, 10, 0, 0);
  private static final LocalDateTime END = LocalDateTime.of(2026, 10, 2, 12, 0, 5);

  private final ReservationCsvWriter writer = new ReservationCsvWriter();

  // ---------------------------------------------------------------------------
  // ヘルパー
  // ---------------------------------------------------------------------------

  private static ReservationCsvRow row(String purpose) {
    return new ReservationCsvRow(
        ID, "第1会議室", "山田 太郎", START, END, purpose, ReservationStatus.PENDING);
  }

  private static ReservationCsvRow row(
      String resourceName, String requesterName, String purpose, ReservationStatus status) {
    return new ReservationCsvRow(ID, resourceName, requesterName, START, END, purpose, status);
  }

  private byte[] writeBytes(List<ReservationCsvRow> rows) throws IOException {
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    writer.write(rows, out);
    return out.toByteArray();
  }

  /** BOM を除いた本文（UTF-8 デコード後）。 */
  private String writeBody(List<ReservationCsvRow> rows) throws IOException {
    byte[] bytes = writeBytes(rows);
    return new String(bytes, BOM.length, bytes.length - BOM.length, StandardCharsets.UTF_8);
  }

  /** 目的以外が固定の行を、期待する目的セルの文字列で組み立てる。 */
  private static String expectedLine(String expectedPurposeCell) {
    return ID
        + ",第1会議室,山田 太郎,2026-10-02 10:00:00,2026-10-02 12:00:05,"
        + expectedPurposeCell
        + ",承認待ち\r\n";
  }

  // ---------------------------------------------------------------------------
  // BOM・ヘッダ・文字コード・改行
  // ---------------------------------------------------------------------------

  @Test
  void write_always_startsWithUtf8Bom() throws IOException {
    byte[] bytes = writeBytes(List.of(row("目的")));

    assertThat(Arrays.copyOfRange(bytes, 0, 3)).containsExactly(BOM);
  }

  @Test
  void write_noRows_outputsBomAndHeaderLineOnly() throws IOException {
    byte[] bytes = writeBytes(List.of());

    assertThat(Arrays.copyOfRange(bytes, 0, 3)).containsExactly(BOM);
    assertThat(writeBody(List.of())).isEqualTo(HEADER_LINE);
  }

  @Test
  void write_oneRow_headerThenRowInColumnOrder() throws IOException {
    String body = writeBody(List.of(row("週次ミーティング")));

    assertThat(body).isEqualTo(HEADER_LINE + expectedLine("週次ミーティング"));
  }

  @Test
  void write_dateTimes_formattedWithSeconds() throws IOException {
    String body = writeBody(List.of(row("目的")));

    assertThat(body).contains("2026-10-02 10:00:00,2026-10-02 12:00:05");
  }

  @Test
  void write_multipleRows_keepsGivenOrderAndCrlf() throws IOException {
    ReservationCsvRow first = row("一件目");
    ReservationCsvRow second = row("二件目");

    String body = writeBody(List.of(first, second));

    assertThat(body).isEqualTo(HEADER_LINE + expectedLine("一件目") + expectedLine("二件目"));
    // 改行はすべて CRLF（単独の LF や CR がない）
    assertThat(body.replace("\r\n", "")).doesNotContain("\n").doesNotContain("\r");
  }

  @Test
  void write_japanese_encodedAsUtf8() throws IOException {
    byte[] bytes = writeBytes(List.of(row("会議室の利用")));

    byte[] expected = "会議室の利用".getBytes(StandardCharsets.UTF_8);
    assertThat(new String(bytes, StandardCharsets.UTF_8)).contains("会議室の利用");
    assertThat(indexOf(bytes, expected)).isGreaterThanOrEqualTo(0);
  }

  @Test
  void write_always_doesNotCloseOutputStream() throws IOException {
    AtomicBoolean closed = new AtomicBoolean(false);
    ByteArrayOutputStream out =
        new ByteArrayOutputStream() {
          @Override
          public void close() throws IOException {
            closed.set(true);
            super.close();
          }
        };

    writer.write(List.of(row("目的")), out);

    assertThat(closed).isFalse();
    assertThat(out.size()).isGreaterThan(BOM.length);
  }

  // ---------------------------------------------------------------------------
  // 承認状態のラベル
  // ---------------------------------------------------------------------------

  @ParameterizedTest
  @CsvSource({"DRAFT,ドラフト", "PENDING,承認待ち", "APPROVED,承認済み", "REJECTED,却下", "CANCELLED,キャンセル済み"})
  void write_status_usesJapaneseLabel(ReservationStatus status, String label) throws IOException {
    String body = writeBody(List.of(row("第1会議室", "山田 太郎", "目的", status)));

    assertThat(body).endsWith("," + label + "\r\n");
  }

  // ---------------------------------------------------------------------------
  // RFC 4180 のエスケープ
  // ---------------------------------------------------------------------------

  @Test
  void write_valueWithComma_isQuoted() throws IOException {
    String body = writeBody(List.of(row("A,B")));

    assertThat(body).isEqualTo(HEADER_LINE + expectedLine("\"A,B\""));
  }

  @Test
  void write_valueWithDoubleQuote_isQuotedAndQuotesDoubled() throws IOException {
    String body = writeBody(List.of(row("彼は\"OK\"と言った")));

    assertThat(body).isEqualTo(HEADER_LINE + expectedLine("\"彼は\"\"OK\"\"と言った\""));
  }

  @Test
  void write_valueWithLf_isQuoted() throws IOException {
    String body = writeBody(List.of(row("一行目\n二行目")));

    assertThat(body).isEqualTo(HEADER_LINE + expectedLine("\"一行目\n二行目\""));
  }

  @Test
  void write_valueWithCrInMiddle_isQuoted() throws IOException {
    String body = writeBody(List.of(row("一行目\r二行目")));

    assertThat(body).isEqualTo(HEADER_LINE + expectedLine("\"一行目\r二行目\""));
  }

  @Test
  void write_plainValue_isNotQuoted() throws IOException {
    String body = writeBody(List.of(row("Plain text 日本語")));

    assertThat(body).isEqualTo(HEADER_LINE + expectedLine("Plain text 日本語"));
  }

  @Test
  void write_commaInResourceName_isQuoted() throws IOException {
    String body = writeBody(List.of(row("会議室A,B", "山田 太郎", "目的", ReservationStatus.PENDING)));

    assertThat(body).contains(",\"会議室A,B\",山田 太郎,");
  }

  // ---------------------------------------------------------------------------
  // CSV インジェクション対策
  // ---------------------------------------------------------------------------

  static Stream<Arguments> formulaPrefixCases() {
    return Stream.of(
        Arguments.of("=1+1", "'=1+1"),
        Arguments.of("+1", "'+1"),
        Arguments.of("-1", "'-1"),
        Arguments.of("@SUM(A1)", "'@SUM(A1)"),
        // 先頭の ' を付けた後に、ダブルクォートを含むため RFC 4180 のエスケープも適用される
        Arguments.of(
            "=HYPERLINK(\"http://example.com\")", "\"'=HYPERLINK(\"\"http://example.com\"\")\""));
  }

  @ParameterizedTest
  @MethodSource("formulaPrefixCases")
  void write_formulaPrefix_prependsSingleQuote(String purpose, String expectedCell)
      throws IOException {
    String body = writeBody(List.of(row(purpose)));

    assertThat(body).isEqualTo(HEADER_LINE + expectedLine(expectedCell));
  }

  @Test
  void write_tabPrefix_prependsSingleQuote() throws IOException {
    String body = writeBody(List.of(row("\tcmd")));

    assertThat(body).isEqualTo(HEADER_LINE + expectedLine("'\tcmd"));
  }

  @Test
  void write_crPrefix_prependsSingleQuoteThenQuotes() throws IOException {
    String body = writeBody(List.of(row("\rcmd")));

    // 先頭が CR のため ' を付け、その結果 CR を含むので RFC 4180 で囲まれる
    assertThat(body).isEqualTo(HEADER_LINE + expectedLine("\"'\rcmd\""));
  }

  @Test
  void write_formulaPrefixWithComma_prependsSingleQuoteThenQuotes() throws IOException {
    String body = writeBody(List.of(row("=a,b")));

    assertThat(body).isEqualTo(HEADER_LINE + expectedLine("\"'=a,b\""));
  }

  @ParameterizedTest
  @ValueSource(strings = {"abc", "日本語", "1+1", "a=b", "x-y", "#tag", "'quoted"})
  void write_nonFormulaPrefix_isNotChanged(String purpose) throws IOException {
    String body = writeBody(List.of(row(purpose)));

    assertThat(body).isEqualTo(HEADER_LINE + expectedLine(purpose));
  }

  @Test
  void write_leadingSpaceBeforeEquals_isNotChanged() throws IOException {
    String body = writeBody(List.of(row(" =1+1")));

    assertThat(body).isEqualTo(HEADER_LINE + expectedLine(" =1+1"));
  }

  @Test
  void write_formulaPrefixInNameColumns_prependsSingleQuote() throws IOException {
    String body = writeBody(List.of(row("=リソース", "+申請者", "目的", ReservationStatus.PENDING)));

    assertThat(body).contains(",'=リソース,'+申請者,");
  }

  // ---------------------------------------------------------------------------
  // null
  // ---------------------------------------------------------------------------

  @Test
  void write_nullValues_becomeEmptyCells() throws IOException {
    String body = writeBody(List.of(row(null, null, null, ReservationStatus.APPROVED)));

    assertThat(body)
        .isEqualTo(HEADER_LINE + ID + ",,,2026-10-02 10:00:00,2026-10-02 12:00:05,,承認済み\r\n");
  }

  // ---------------------------------------------------------------------------
  // 内部ユーティリティ
  // ---------------------------------------------------------------------------

  private static int indexOf(byte[] haystack, byte[] needle) {
    for (int i = 0; i <= haystack.length - needle.length; i++) {
      boolean match = true;
      for (int j = 0; j < needle.length; j++) {
        if (haystack[i + j] != needle[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        return i;
      }
    }
    return -1;
  }
}
