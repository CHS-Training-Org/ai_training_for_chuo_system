package com.example.bookflow.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.bookflow.domain.Reservation;
import com.example.bookflow.domain.ReservationStatus;
import com.example.bookflow.domain.Resource;
import com.example.bookflow.domain.ResourceCategory;
import com.example.bookflow.domain.Role;
import com.example.bookflow.domain.User;
import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * {@link ReservationCsvWriter} 単体テスト（ADR-018 準拠・Spring 不要）。
 *
 * <p>BOM・ヘッダ行・日時の書式・承認状態の表示名・RFC 4180 のエスケープ・CRLF・0 件を検証する。 テスト命名規約（ADR-018）: {@code
 * methodName_condition_expectedBehavior}
 */
class ReservationCsvWriterTest {

  private static final String HEADER = "予約ID,リソース名,申請者名,開始日時,終了日時,目的,承認状態";
  private static final String BOM = "﻿";
  private static final UUID ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440030");

  // ---------------------------------------------------------------------------
  // ヘルパー：リフレクションでエンティティのフィールドを設定する
  // ---------------------------------------------------------------------------

  private static void setField(Object target, String name, Object value) {
    try {
      Class<?> type = target.getClass();
      Field f = null;
      while (f == null) {
        try {
          f = type.getDeclaredField(name);
        } catch (NoSuchFieldException e) {
          type = type.getSuperclass();
        }
      }
      f.setAccessible(true);
      f.set(target, value);
    } catch (ReflectiveOperationException e) {
      throw new RuntimeException(e);
    }
  }

  private static Resource resource(String name) {
    Resource r = new Resource() {};
    setField(r, "id", UUID.randomUUID());
    setField(r, "name", name);
    setField(r, "category", ResourceCategory.ROOM);
    return r;
  }

  private static User user(String name) {
    User u = new User() {};
    setField(u, "id", UUID.randomUUID());
    setField(u, "name", name);
    setField(u, "role", Role.MEMBER);
    return u;
  }

  private static Reservation reservation(
      UUID id,
      String resourceName,
      String requesterName,
      LocalDateTime startAt,
      LocalDateTime endAt,
      String purpose,
      ReservationStatus status) {
    Reservation r =
        Reservation.create(
            resource(resourceName), user(requesterName), startAt, endAt, purpose, null, status);
    setField(r, "id", id);
    return r;
  }

  private static Reservation simple(String purpose, ReservationStatus status) {
    return reservation(
        ID,
        "第1会議室",
        "山田 太郎",
        LocalDateTime.of(2026, 6, 2, 10, 0),
        LocalDateTime.of(2026, 6, 2, 12, 0),
        purpose,
        status);
  }

  private static String text(byte[] csv) {
    return new String(csv, StandardCharsets.UTF_8);
  }

  // ---------------------------------------------------------------------------
  // BOM・ヘッダ・0 件
  // ---------------------------------------------------------------------------

  @Test
  void write_anyInput_startsWithUtf8Bom() {
    byte[] csv = ReservationCsvWriter.write(List.of(simple("会議", ReservationStatus.APPROVED)));

    assertThat(csv[0]).isEqualTo((byte) 0xEF);
    assertThat(csv[1]).isEqualTo((byte) 0xBB);
    assertThat(csv[2]).isEqualTo((byte) 0xBF);
  }

  @Test
  void write_anyInput_firstLineIsJapaneseHeader() {
    String csv =
        text(ReservationCsvWriter.write(List.of(simple("会議", ReservationStatus.APPROVED))));

    assertThat(csv).startsWith(BOM + HEADER + "\r\n");
  }

  @Test
  void write_emptyList_returnsBomAndHeaderOnly() {
    String csv = text(ReservationCsvWriter.write(List.of()));

    assertThat(csv).isEqualTo(BOM + HEADER + "\r\n");
  }

  // ---------------------------------------------------------------------------
  // 値の表記
  // ---------------------------------------------------------------------------

  @Test
  void write_pendingReservation_formatsRowAsSpecified() {
    String csv =
        text(ReservationCsvWriter.write(List.of(simple("週次ミーティング", ReservationStatus.PENDING))));

    assertThat(csv)
        .isEqualTo(
            BOM
                + HEADER
                + "\r\n"
                + "550e8400-e29b-41d4-a716-446655440030,第1会議室,山田 太郎,"
                + "2026/06/02 10:00,2026/06/02 12:00,週次ミーティング,承認待ち\r\n");
  }

  @Test
  void write_singleDigitMonthDayHourMinute_zeroPadsAndOmitsSeconds() {
    Reservation r =
        reservation(
            ID,
            "A",
            "B",
            LocalDateTime.of(2026, 1, 5, 9, 5, 30),
            LocalDateTime.of(2026, 1, 5, 9, 7, 59),
            "x",
            ReservationStatus.APPROVED);

    String csv = text(ReservationCsvWriter.write(List.of(r)));

    assertThat(csv).contains(",2026/01/05 09:05,2026/01/05 09:07,");
  }

  @Test
  void write_eachStatus_outputsJapaneseDisplayName() {
    assertThat(statusLabel(ReservationStatus.DRAFT)).isEqualTo("ドラフト");
    assertThat(statusLabel(ReservationStatus.PENDING)).isEqualTo("承認待ち");
    assertThat(statusLabel(ReservationStatus.APPROVED)).isEqualTo("承認済み");
    assertThat(statusLabel(ReservationStatus.REJECTED)).isEqualTo("却下");
    assertThat(statusLabel(ReservationStatus.CANCELLED)).isEqualTo("キャンセル済み");
  }

  private static String statusLabel(ReservationStatus status) {
    String csv = text(ReservationCsvWriter.write(List.of(simple("x", status))));
    String row = csv.substring((BOM + HEADER + "\r\n").length(), csv.length() - 2);
    return row.substring(row.lastIndexOf(',') + 1);
  }

  // ---------------------------------------------------------------------------
  // エスケープ（RFC 4180）
  // ---------------------------------------------------------------------------

  @Test
  void write_purposeWithCommaAndQuote_wrapsInQuotesAndDoublesQuote() {
    String csv =
        text(
            ReservationCsvWriter.write(
                List.of(simple("定例会議, 資料 \"A\" 確認", ReservationStatus.APPROVED))));

    assertThat(csv).contains(",\"定例会議, 資料 \"\"A\"\" 確認\",承認済み\r\n");
  }

  @Test
  void write_purposeWithLf_wrapsInQuotesAndKeepsLineBreak() {
    String csv =
        text(ReservationCsvWriter.write(List.of(simple("1行目\n2行目", ReservationStatus.APPROVED))));

    assertThat(csv).contains(",\"1行目\n2行目\",承認済み\r\n");
  }

  @Test
  void write_purposeWithCrLf_wrapsInQuotes() {
    String csv =
        text(ReservationCsvWriter.write(List.of(simple("1行目\r\n2行目", ReservationStatus.APPROVED))));

    assertThat(csv).contains(",\"1行目\r\n2行目\",承認済み\r\n");
  }

  @Test
  void write_resourceAndRequesterNamesWithComma_areEscaped() {
    Reservation r =
        reservation(
            ID,
            "会議室A,B",
            "山田,太郎",
            LocalDateTime.of(2026, 6, 2, 10, 0),
            LocalDateTime.of(2026, 6, 2, 12, 0),
            "x",
            ReservationStatus.APPROVED);

    String csv = text(ReservationCsvWriter.write(List.of(r)));

    assertThat(csv).contains(",\"会議室A,B\",\"山田,太郎\",");
  }

  @Test
  void write_plainValues_areNotQuoted() {
    String csv =
        text(ReservationCsvWriter.write(List.of(simple("会議", ReservationStatus.APPROVED))));

    assertThat(csv).doesNotContain("\"");
  }

  // ---------------------------------------------------------------------------
  // 改行コード・順序・エンコード
  // ---------------------------------------------------------------------------

  @Test
  void write_multipleReservations_usesCrlfOnlyAndKeepsInputOrder() {
    Reservation first = simple("最初", ReservationStatus.APPROVED);
    Reservation second = simple("次", ReservationStatus.REJECTED);

    String csv = text(ReservationCsvWriter.write(List.of(first, second)));

    assertThat(csv.replace("\r\n", "")).doesNotContain("\n").doesNotContain("\r");
    String[] lines = csv.split("\r\n");
    assertThat(lines).hasSize(3);
    assertThat(lines[1]).contains(",最初,");
    assertThat(lines[2]).contains(",次,");
  }

  @Test
  void write_japaneseText_isEncodedAsUtf8() {
    byte[] csv = ReservationCsvWriter.write(List.of(simple("会議", ReservationStatus.APPROVED)));

    // 「会議」の UTF-8 バイト列（E4 BC 9A E8 AD B0）が含まれる
    byte[] expected = "会議".getBytes(StandardCharsets.UTF_8);
    assertThat(indexOf(csv, expected)).isGreaterThanOrEqualTo(0);
  }

  private static int indexOf(byte[] haystack, byte[] needle) {
    outer:
    for (int i = 0; i <= haystack.length - needle.length; i++) {
      for (int j = 0; j < needle.length; j++) {
        if (haystack[i + j] != needle[j]) {
          continue outer;
        }
      }
      return i;
    }
    return -1;
  }
}
