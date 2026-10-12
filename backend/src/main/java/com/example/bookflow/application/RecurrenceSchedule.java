package com.example.bookflow.application;

import com.example.bookflow.domain.RecurrenceType;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

/**
 * 繰り返し予約の日程生成（api-spec.md §予約申請 の「繰り返しの生成規則」準拠）。
 *
 * <p>1 回目の開始日時と終了日から、各回の開始日時を昇順で返す純粋関数。フレームワークにもエンティティにも依存しない。各回の終了日時は、呼び出し側が 1 回目の長さ（{@code endAt
 * - startAt}）を足して求める。
 */
final class RecurrenceSchedule {

  private RecurrenceSchedule() {}

  /**
   * 各回の開始日時を、昇順で返す（1 回目を含む）。
   *
   * <p>{@code NONE} は 1 回目だけを返す（{@code until} は見ない）。{@code WEEKLY} / {@code MONTHLY} では、開始日時の日付が
   * {@code until} 以前の回をすべて返す（終了日当日を含む）。{@code until} が 1 回目の日付より前のときは空のリストを返す（呼び出し側が 400
   * にするため、通常は到達しない）。
   *
   * @param type 繰り返しの種別
   * @param first 1 回目の開始日時
   * @param until 繰り返しの終了日（{@code WEEKLY} / {@code MONTHLY} では非 null）
   * @return 各回の開始日時（昇順）
   */
  static List<LocalDateTime> startDates(RecurrenceType type, LocalDateTime first, LocalDate until) {
    return switch (type) {
      case NONE -> List.of(first);
      case WEEKLY -> weekly(first, until);
      case MONTHLY -> monthly(first, until);
    };
  }

  /** 7 日ごと。{@code first.plusWeeks(i)} で毎回 1 回目から求めるため、積み上げの誤差は出ない。 */
  private static List<LocalDateTime> weekly(LocalDateTime first, LocalDate until) {
    List<LocalDateTime> dates = new ArrayList<>();
    for (long i = 0; ; i++) {
      LocalDateTime start = first.plusWeeks(i);
      if (start.toLocalDate().isAfter(until)) {
        break;
      }
      dates.add(start);
    }
    return dates;
  }

  /**
   * 毎月、1 回目の日（day of month）と同じ日。その月に存在しない日の月はスキップする。
   *
   * <p>各回は直前の回からの積み上げではなく、1 回目の日と月の序数から決める。{@code plusMonths} を積み重ねると、1 月 31 日が 2 月 28 日に丸められ、その後 3
   * 月 28 日になって日がずれるため。
   */
  private static List<LocalDateTime> monthly(LocalDateTime first, LocalDate until) {
    int day = first.getDayOfMonth();
    LocalTime time = first.toLocalTime();
    YearMonth firstMonth = YearMonth.from(first);
    List<LocalDateTime> dates = new ArrayList<>();
    for (long i = 0; ; i++) {
      YearMonth month = firstMonth.plusMonths(i);
      if (month.atDay(1).isAfter(until)) {
        // この月より先には、終了日以前の回は作れない（スキップ月が続いても必ず終わる）
        break;
      }
      if (month.lengthOfMonth() < day) {
        continue;
      }
      LocalDate date = month.atDay(day);
      if (date.isAfter(until)) {
        break;
      }
      dates.add(LocalDateTime.of(date, time));
    }
    return dates;
  }
}
