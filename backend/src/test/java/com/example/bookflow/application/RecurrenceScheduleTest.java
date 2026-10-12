package com.example.bookflow.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.bookflow.domain.RecurrenceType;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * {@link RecurrenceSchedule} 単体テスト（ADR-018 準拠）。
 *
 * <p>毎週・毎月の件数、終了日当日・前日の境界、月末のスキップと基準日からの数え直し、時刻の保持、年またぎ、うるう年を検証する。 テスト命名規約（ADR-018）: {@code
 * methodName_condition_expectedBehavior}
 */
class RecurrenceScheduleTest {

  private static LocalDateTime at(int year, int month, int day, int hour, int minute) {
    return LocalDateTime.of(year, month, day, hour, minute);
  }

  private static LocalDate on(int year, int month, int day) {
    return LocalDate.of(year, month, day);
  }

  // ---------------------------------------------------------------------------
  // NONE
  // ---------------------------------------------------------------------------

  @Test
  void startDates_none_returnsOnlyFirst() {
    LocalDateTime first = at(2026, 11, 2, 10, 0);

    List<LocalDateTime> dates = RecurrenceSchedule.startDates(RecurrenceType.NONE, first, null);

    assertThat(dates).containsExactly(first);
  }

  @Test
  void startDates_noneWithUntil_ignoresUntil() {
    LocalDateTime first = at(2026, 11, 2, 10, 0);

    List<LocalDateTime> dates =
        RecurrenceSchedule.startDates(RecurrenceType.NONE, first, on(2027, 12, 31));

    assertThat(dates).containsExactly(first);
  }

  // ---------------------------------------------------------------------------
  // WEEKLY
  // ---------------------------------------------------------------------------

  @Test
  void startDates_weeklyUntilOnOccurrenceDay_includesUntilDay() {
    // 2026-11-02（月）から 11/23（月）まで: 11/02, 11/09, 11/16, 11/23 の 4 件（終了日当日を含む）
    List<LocalDateTime> dates =
        RecurrenceSchedule.startDates(
            RecurrenceType.WEEKLY, at(2026, 11, 2, 10, 0), on(2026, 11, 23));

    assertThat(dates)
        .containsExactly(
            at(2026, 11, 2, 10, 0),
            at(2026, 11, 9, 10, 0),
            at(2026, 11, 16, 10, 0),
            at(2026, 11, 23, 10, 0));
  }

  @Test
  void startDates_weeklyUntilDayBeforeOccurrence_excludesThatOccurrence() {
    // 終了日 11/22（日）。11/23 の回は終了日の翌日なので含まれない
    List<LocalDateTime> dates =
        RecurrenceSchedule.startDates(
            RecurrenceType.WEEKLY, at(2026, 11, 2, 10, 0), on(2026, 11, 22));

    assertThat(dates)
        .containsExactly(at(2026, 11, 2, 10, 0), at(2026, 11, 9, 10, 0), at(2026, 11, 16, 10, 0));
  }

  @Test
  void startDates_weeklyUntilSameDayAsFirst_returnsOnlyFirst() {
    List<LocalDateTime> dates =
        RecurrenceSchedule.startDates(
            RecurrenceType.WEEKLY, at(2026, 11, 2, 10, 0), on(2026, 11, 2));

    assertThat(dates).containsExactly(at(2026, 11, 2, 10, 0));
  }

  @Test
  void startDates_weeklyLateEveningStart_keepsTimeAndComparesByDate() {
    // 23:59 開始の回は、終了日当日なら含まれる（終了日の判定は日付単位）
    List<LocalDateTime> dates =
        RecurrenceSchedule.startDates(
            RecurrenceType.WEEKLY, at(2026, 11, 2, 23, 59), on(2026, 11, 9));

    assertThat(dates).containsExactly(at(2026, 11, 2, 23, 59), at(2026, 11, 9, 23, 59));
  }

  @Test
  void startDates_weeklyAcrossYearEnd_continuesIntoNextYear() {
    List<LocalDateTime> dates =
        RecurrenceSchedule.startDates(
            RecurrenceType.WEEKLY, at(2026, 12, 21, 9, 30), on(2027, 1, 11));

    assertThat(dates)
        .containsExactly(
            at(2026, 12, 21, 9, 30),
            at(2026, 12, 28, 9, 30),
            at(2027, 1, 4, 9, 30),
            at(2027, 1, 11, 9, 30));
  }

  @Test
  void startDates_weeklyUntilBeforeFirst_returnsEmpty() {
    List<LocalDateTime> dates =
        RecurrenceSchedule.startDates(
            RecurrenceType.WEEKLY, at(2026, 11, 2, 10, 0), on(2026, 11, 1));

    assertThat(dates).isEmpty();
  }

  @Test
  void startDates_weeklyTwoYears_returnsOneHundredFive() {
    // 件数の上限がないことの確認（約 2 年分。2026-11-02 から 2028-11-01 までの月曜は 105 件）
    List<LocalDateTime> dates =
        RecurrenceSchedule.startDates(
            RecurrenceType.WEEKLY, at(2026, 11, 2, 10, 0), on(2028, 11, 1));

    assertThat(dates).hasSize(105);
    assertThat(dates.get(0)).isEqualTo(at(2026, 11, 2, 10, 0));
    assertThat(dates.get(104)).isEqualTo(at(2028, 10, 30, 10, 0));
  }

  // ---------------------------------------------------------------------------
  // MONTHLY
  // ---------------------------------------------------------------------------

  @Test
  void startDates_monthlySameDay_includesUntilDay() {
    List<LocalDateTime> dates =
        RecurrenceSchedule.startDates(
            RecurrenceType.MONTHLY, at(2026, 11, 15, 14, 0), on(2027, 1, 15));

    assertThat(dates)
        .containsExactly(at(2026, 11, 15, 14, 0), at(2026, 12, 15, 14, 0), at(2027, 1, 15, 14, 0));
  }

  @Test
  void startDates_monthlyUntilDayBeforeOccurrence_excludesThatOccurrence() {
    List<LocalDateTime> dates =
        RecurrenceSchedule.startDates(
            RecurrenceType.MONTHLY, at(2026, 11, 15, 14, 0), on(2027, 1, 14));

    assertThat(dates).containsExactly(at(2026, 11, 15, 14, 0), at(2026, 12, 15, 14, 0));
  }

  @Test
  void startDates_monthlyDay31_skipsMonthsWithoutThatDay() {
    // 1/31 から 5/31 まで: 2 月（28 日まで）と 4 月（30 日まで）はスキップ
    List<LocalDateTime> dates =
        RecurrenceSchedule.startDates(
            RecurrenceType.MONTHLY, at(2026, 1, 31, 10, 0), on(2026, 5, 31));

    assertThat(dates)
        .containsExactly(at(2026, 1, 31, 10, 0), at(2026, 3, 31, 10, 0), at(2026, 5, 31, 10, 0));
  }

  @Test
  void startDates_monthlyDay31_afterSkipCountsFromBaseDayNotPreviousOccurrence() {
    // 2 月をスキップした後の次の回は、2/28 でも 3/3 でもなく 3/31（基準日の 31 日から数える）
    List<LocalDateTime> dates =
        RecurrenceSchedule.startDates(
            RecurrenceType.MONTHLY, at(2026, 1, 31, 10, 0), on(2026, 3, 31));

    assertThat(dates).containsExactly(at(2026, 1, 31, 10, 0), at(2026, 3, 31, 10, 0));
    assertThat(dates).doesNotContain(at(2026, 2, 28, 10, 0), at(2026, 3, 3, 10, 0));
  }

  @Test
  void startDates_monthlyDay30_skipsOnlyFebruary() {
    List<LocalDateTime> dates =
        RecurrenceSchedule.startDates(
            RecurrenceType.MONTHLY, at(2026, 1, 30, 10, 0), on(2026, 4, 30));

    assertThat(dates)
        .containsExactly(at(2026, 1, 30, 10, 0), at(2026, 3, 30, 10, 0), at(2026, 4, 30, 10, 0));
  }

  @Test
  void startDates_monthlyDay29InLeapYear_includesFebruary29() {
    // 2028 年はうるう年。2/29 が存在するので含まれる
    List<LocalDateTime> dates =
        RecurrenceSchedule.startDates(
            RecurrenceType.MONTHLY, at(2028, 1, 29, 10, 0), on(2028, 3, 29));

    assertThat(dates)
        .containsExactly(at(2028, 1, 29, 10, 0), at(2028, 2, 29, 10, 0), at(2028, 3, 29, 10, 0));
  }

  @Test
  void startDates_monthlyDay29InNonLeapYear_skipsFebruary() {
    List<LocalDateTime> dates =
        RecurrenceSchedule.startDates(
            RecurrenceType.MONTHLY, at(2027, 1, 29, 10, 0), on(2027, 3, 29));

    assertThat(dates).containsExactly(at(2027, 1, 29, 10, 0), at(2027, 3, 29, 10, 0));
  }

  @Test
  void startDates_monthlyDay28_neverSkips() {
    List<LocalDateTime> dates =
        RecurrenceSchedule.startDates(
            RecurrenceType.MONTHLY, at(2026, 1, 28, 10, 0), on(2026, 4, 28));

    assertThat(dates)
        .containsExactly(
            at(2026, 1, 28, 10, 0),
            at(2026, 2, 28, 10, 0),
            at(2026, 3, 28, 10, 0),
            at(2026, 4, 28, 10, 0));
  }

  @Test
  void startDates_monthlyAcrossYearEnd_continuesIntoNextYear() {
    List<LocalDateTime> dates =
        RecurrenceSchedule.startDates(
            RecurrenceType.MONTHLY, at(2026, 11, 10, 8, 15), on(2027, 2, 10));

    assertThat(dates)
        .containsExactly(
            at(2026, 11, 10, 8, 15),
            at(2026, 12, 10, 8, 15),
            at(2027, 1, 10, 8, 15),
            at(2027, 2, 10, 8, 15));
  }

  @Test
  void startDates_monthlyUntilSameDayAsFirst_returnsOnlyFirst() {
    List<LocalDateTime> dates =
        RecurrenceSchedule.startDates(
            RecurrenceType.MONTHLY, at(2026, 11, 15, 14, 0), on(2026, 11, 15));

    assertThat(dates).containsExactly(at(2026, 11, 15, 14, 0));
  }

  @Test
  void startDates_monthlyUntilBeforeFirst_returnsEmpty() {
    List<LocalDateTime> dates =
        RecurrenceSchedule.startDates(
            RecurrenceType.MONTHLY, at(2026, 11, 15, 14, 0), on(2026, 11, 14));

    assertThat(dates).isEmpty();
  }

  @Test
  void startDates_monthlyDay31UntilInSkippedMonth_endsAtLastExistingOccurrence() {
    // 終了日が 4/30（4 月は 31 日がなくスキップ）。1/31 と 3/31 だけ
    List<LocalDateTime> dates =
        RecurrenceSchedule.startDates(
            RecurrenceType.MONTHLY, at(2026, 1, 31, 10, 0), on(2026, 4, 30));

    assertThat(dates).containsExactly(at(2026, 1, 31, 10, 0), at(2026, 3, 31, 10, 0));
  }
}
