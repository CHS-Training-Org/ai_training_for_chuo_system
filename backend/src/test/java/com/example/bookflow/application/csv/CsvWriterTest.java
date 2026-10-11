package com.example.bookflow.application.csv;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

/**
 * {@link CsvWriter} 単体テスト（ADR-018 準拠）。
 *
 * <p>BOM・CRLF・RFC 4180 エスケープ・数式インジェクション対策を検証する。テスト命名規約（ADR-018）: {@code
 * methodName_condition_expectedBehavior}
 */
class CsvWriterTest {

  private static String decodeWithoutBom(byte[] bytes) {
    return new String(Arrays.copyOfRange(bytes, 3, bytes.length), StandardCharsets.UTF_8);
  }

  @Nested
  class ToBytes {

    @Test
    void toBytes_anyInput_startsWithUtf8Bom() {
      byte[] bytes = CsvWriter.toBytes(List.of("a"), List.of());

      assertThat(bytes[0]).isEqualTo((byte) 0xEF);
      assertThat(bytes[1]).isEqualTo((byte) 0xBB);
      assertThat(bytes[2]).isEqualTo((byte) 0xBF);
    }

    @Test
    void toBytes_headerAndRows_joinsWithCommaAndEndsEveryLineWithCrlf() {
      byte[] bytes =
          CsvWriter.toBytes(
              List.of("ID", "名前"), List.of(List.of("1", "山田 太郎"), List.of("2", "佐藤 花子")));

      assertThat(decodeWithoutBom(bytes)).isEqualTo("ID,名前\r\n1,山田 太郎\r\n2,佐藤 花子\r\n");
    }

    @Test
    void toBytes_noRows_returnsHeaderLineOnly() {
      byte[] bytes = CsvWriter.toBytes(List.of("ID", "名前"), List.of());

      assertThat(decodeWithoutBom(bytes)).isEqualTo("ID,名前\r\n");
    }

    @Test
    void toBytes_japaneseText_isEncodedAsUtf8() {
      byte[] bytes = CsvWriter.toBytes(List.of("目的"), List.of(List.of("定例会議")));

      byte[] expectedBody = "目的\r\n定例会議\r\n".getBytes(StandardCharsets.UTF_8);
      assertThat(bytes).hasSize(3 + expectedBody.length);
      assertThat(Arrays.copyOfRange(bytes, 3, bytes.length)).isEqualTo(expectedBody);
    }

    @Test
    void toBytes_nullCell_isTreatedAsEmpty() {
      byte[] bytes = CsvWriter.toBytes(List.of("a", "b"), List.of(Arrays.asList("x", null)));

      assertThat(decodeWithoutBom(bytes)).isEqualTo("a,b\r\nx,\r\n");
    }

    @Test
    void toBytes_headerStartingWithFormulaTrigger_isNotNeutralized() {
      byte[] bytes = CsvWriter.toBytes(List.of("=header"), List.of());

      assertThat(decodeWithoutBom(bytes)).isEqualTo("=header\r\n");
    }

    @Test
    void toBytes_headerContainingComma_isQuoted() {
      byte[] bytes = CsvWriter.toBytes(List.of("a,b"), List.of());

      assertThat(decodeWithoutBom(bytes)).isEqualTo("\"a,b\"\r\n");
    }

    @Test
    void toBytes_cellsWithSpecialCharacters_keepColumnCountPerLine() {
      byte[] bytes =
          CsvWriter.toBytes(List.of("a", "b"), List.of(List.of("会議, 来客 \"A社\"", "1行目\n2行目")));

      assertThat(decodeWithoutBom(bytes))
          .isEqualTo("a,b\r\n\"会議, 来客 \"\"A社\"\"\",\"1行目\n2行目\"\r\n");
    }
  }

  @Nested
  class Escape {

    @Test
    void escape_plainText_isUnchanged() {
      assertThat(CsvWriter.escape("定例会議")).isEqualTo("定例会議");
    }

    @Test
    void escape_emptyString_isUnchanged() {
      assertThat(CsvWriter.escape("")).isEmpty();
    }

    @Test
    void escape_null_returnsEmptyString() {
      assertThat(CsvWriter.escape(null)).isEmpty();
    }

    @Test
    void escape_containsComma_isQuoted() {
      assertThat(CsvWriter.escape("a,b")).isEqualTo("\"a,b\"");
    }

    @Test
    void escape_containsDoubleQuote_isQuotedAndQuoteDoubled() {
      assertThat(CsvWriter.escape("say \"hi\"")).isEqualTo("\"say \"\"hi\"\"\"");
    }

    @Test
    void escape_containsLineFeed_isQuoted() {
      assertThat(CsvWriter.escape("a\nb")).isEqualTo("\"a\nb\"");
    }

    @Test
    void escape_containsCarriageReturnInTheMiddle_isQuoted() {
      assertThat(CsvWriter.escape("a\rb")).isEqualTo("\"a\rb\"");
    }

    @Test
    void escape_startsWithEquals_prefixesApostrophe() {
      assertThat(CsvWriter.escape("=SUM(A1:A9)")).isEqualTo("'=SUM(A1:A9)");
    }

    @Test
    void escape_startsWithPlus_prefixesApostrophe() {
      assertThat(CsvWriter.escape("+1")).isEqualTo("'+1");
    }

    @Test
    void escape_startsWithMinus_prefixesApostrophe() {
      assertThat(CsvWriter.escape("-1")).isEqualTo("'-1");
    }

    @Test
    void escape_startsWithAt_prefixesApostrophe() {
      assertThat(CsvWriter.escape("@cmd")).isEqualTo("'@cmd");
    }

    @Test
    void escape_startsWithTab_prefixesApostrophe() {
      assertThat(CsvWriter.escape("\tx")).isEqualTo("'\tx");
    }

    @Test
    void escape_startsWithCarriageReturn_prefixesApostropheAndQuotes() {
      assertThat(CsvWriter.escape("\rx")).isEqualTo("\"'\rx\"");
    }

    @Test
    void escape_formulaWithComma_prefixesApostropheThenQuotes() {
      assertThat(CsvWriter.escape("=1,2")).isEqualTo("\"'=1,2\"");
    }

    @Test
    void escape_triggerCharacterNotAtStart_isUnchanged() {
      assertThat(CsvWriter.escape("a=b+c")).isEqualTo("a=b+c");
    }
  }
}
