package com.example.bookflow.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.bookflow.domain.ReservationStatus;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * {@link ReservationCsvWriter} のユニットテスト（DB・Spring コンテキスト不要）。
 *
 * <p>テスト命名規約（ADR-018）: {@code methodName_condition_expectedBehavior}
 */
class ReservationCsvWriterTest {

  private static final UUID ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
  private static final String HEADER = "予約ID,リソース名,申請者名,開始日時,終了日時,目的,承認状態";

  private static ReservationCsvRow row(String resource, String requester, String purpose) {
    return new ReservationCsvRow(
        ID,
        resource,
        requester,
        LocalDateTime.of(2026, 10, 2, 9, 5),
        LocalDateTime.of(2026, 10, 2, 12, 0),
        purpose,
        ReservationStatus.APPROVED);
  }

  private static String text(byte[] bytes) {
    return new String(bytes, StandardCharsets.UTF_8);
  }

  @Test
  void write_startsWithUtf8Bom() {
    byte[] bytes = ReservationCsvWriter.write(List.of());

    assertThat(bytes[0]).isEqualTo((byte) 0xEF);
    assertThat(bytes[1]).isEqualTo((byte) 0xBB);
    assertThat(bytes[2]).isEqualTo((byte) 0xBF);
  }

  @Test
  void write_noRows_returnsHeaderOnly() {
    String csv = text(ReservationCsvWriter.write(List.of()));

    assertThat(csv).isEqualTo("﻿" + HEADER + "\r\n");
  }

  @Test
  void write_oneRow_formatsColumnsAndDateTime() {
    String csv = text(ReservationCsvWriter.write(List.of(row("第1会議室", "山田 太郎", "週次ミーティング"))));

    assertThat(csv)
        .isEqualTo(
            "﻿"
                + HEADER
                + "\r\n"
                + ID
                + ",第1会議室,山田 太郎,2026-10-02 09:05,2026-10-02 12:00,週次ミーティング,承認済み\r\n");
  }

  @Test
  void write_multipleRows_keepsOrderAndUsesCrlf() {
    String csv =
        text(ReservationCsvWriter.write(List.of(row("A室", "甲", "一番"), row("B室", "乙", "二番"))));

    String[] lines = csv.split("\r\n");
    assertThat(lines).hasSize(3);
    assertThat(lines[1]).contains("A室");
    assertThat(lines[2]).contains("B室");
    assertThat(csv).doesNotContain("\n\n").endsWith("\r\n");
  }

  @Test
  void escape_valueWithComma_isQuoted() {
    assertThat(ReservationCsvWriter.escape("a,b")).isEqualTo("\"a,b\"");
  }

  @Test
  void escape_valueWithDoubleQuote_isQuotedAndDoubled() {
    assertThat(ReservationCsvWriter.escape("say \"hi\"")).isEqualTo("\"say \"\"hi\"\"\"");
  }

  @Test
  void escape_valueWithNewline_isQuoted() {
    assertThat(ReservationCsvWriter.escape("line1\nline2")).isEqualTo("\"line1\nline2\"");
    assertThat(ReservationCsvWriter.escape("line1\r\nline2")).isEqualTo("\"line1\r\nline2\"");
  }

  @Test
  void escape_plainValue_isUnchanged() {
    assertThat(ReservationCsvWriter.escape("週次ミーティング")).isEqualTo("週次ミーティング");
  }

  @Test
  void escape_nullAndEmpty_becomeEmpty() {
    assertThat(ReservationCsvWriter.escape(null)).isEmpty();
    assertThat(ReservationCsvWriter.escape("")).isEmpty();
  }

  @Test
  void escape_formulaPrefix_isNeutralizedWithApostrophe() {
    assertThat(ReservationCsvWriter.escape("=1+1")).isEqualTo("'=1+1");
    assertThat(ReservationCsvWriter.escape("+1")).isEqualTo("'+1");
    assertThat(ReservationCsvWriter.escape("-1")).isEqualTo("'-1");
    assertThat(ReservationCsvWriter.escape("@SUM(A1)")).isEqualTo("'@SUM(A1)");
  }

  @Test
  void escape_formulaWithComma_isNeutralizedThenQuoted() {
    assertThat(ReservationCsvWriter.escape("=HYPERLINK(\"x\",\"y\")"))
        .isEqualTo("\"'=HYPERLINK(\"\"x\"\",\"\"y\"\")\"");
  }

  @Test
  void escape_formulaCharInMiddle_isUnchanged() {
    assertThat(ReservationCsvWriter.escape("a=b")).isEqualTo("a=b");
  }

  @Test
  void write_formulaInPurpose_isNeutralized() {
    String csv = text(ReservationCsvWriter.write(List.of(row("会議室", "山田", "=cmd|' /C calc'!A0"))));

    assertThat(csv).contains(",'=cmd|' /C calc'!A0,承認済み");
  }

  @Test
  void statusLabel_allStatuses_haveJapaneseLabels() {
    assertThat(ReservationCsvWriter.statusLabel(ReservationStatus.PENDING)).isEqualTo("承認待ち");
    assertThat(ReservationCsvWriter.statusLabel(ReservationStatus.APPROVED)).isEqualTo("承認済み");
    assertThat(ReservationCsvWriter.statusLabel(ReservationStatus.REJECTED)).isEqualTo("却下");
    assertThat(ReservationCsvWriter.statusLabel(ReservationStatus.CANCELLED)).isEqualTo("キャンセル済み");
    assertThat(ReservationCsvWriter.statusLabel(ReservationStatus.DRAFT)).isEqualTo("ドラフト");
  }
}
