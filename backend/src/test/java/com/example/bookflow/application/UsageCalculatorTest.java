package com.example.bookflow.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

/**
 * {@link UsageCalculator} 単体テスト（ADR-018 準拠）。
 *
 * <p>期間での切り詰めの各境界（期間なし・完全に含む・前後をまたぐ・両側をまたぐ・境界ちょうど・負の防御）を検証する。 テスト命名規約（ADR-018）: {@code
 * methodName_condition_expectedBehavior}
 */
class UsageCalculatorTest {

  private static LocalDateTime at(int day, int hour, int minute) {
    return LocalDateTime.of(2030, 10, day, hour, minute);
  }

  @Test
  void clippedSeconds_noPeriod_returnsFullDuration() {
    long seconds = UsageCalculator.clippedSeconds(at(10, 9, 0), at(10, 11, 0), null, null);

    assertThat(seconds).isEqualTo(2 * 60 * 60);
  }

  @Test
  void clippedSeconds_periodContainsReservation_returnsFullDuration() {
    long seconds =
        UsageCalculator.clippedSeconds(at(10, 9, 0), at(10, 11, 0), at(1, 0, 0), at(31, 0, 0));

    assertThat(seconds).isEqualTo(2 * 60 * 60);
  }

  @Test
  void clippedSeconds_reservationStartsBeforePeriod_clipsAtFrom() {
    // 10/9 22:00 - 10/10 02:00（全体 4 時間）を 10/10 00:00 起点の期間で切り詰める → 2 時間
    long seconds =
        UsageCalculator.clippedSeconds(at(9, 22, 0), at(10, 2, 0), at(10, 0, 0), at(11, 0, 0));

    assertThat(seconds).isEqualTo(2 * 60 * 60);
  }

  @Test
  void clippedSeconds_reservationEndsAfterPeriod_clipsAtTo() {
    // 10/10 22:00 - 10/11 02:00 を 10/10 00:00 - 10/11 00:00 で切り詰める → 2 時間
    long seconds =
        UsageCalculator.clippedSeconds(at(10, 22, 0), at(11, 2, 0), at(10, 0, 0), at(11, 0, 0));

    assertThat(seconds).isEqualTo(2 * 60 * 60);
  }

  @Test
  void clippedSeconds_reservationSpansBothSides_returnsPeriodLength() {
    long seconds =
        UsageCalculator.clippedSeconds(at(9, 0, 0), at(12, 0, 0), at(10, 0, 0), at(11, 0, 0));

    assertThat(seconds).isEqualTo(24 * 60 * 60);
  }

  @Test
  void clippedSeconds_reservationStartsExactlyAtFrom_isNotClipped() {
    long seconds =
        UsageCalculator.clippedSeconds(at(10, 9, 0), at(10, 10, 0), at(10, 9, 0), at(10, 12, 0));

    assertThat(seconds).isEqualTo(60 * 60);
  }

  @Test
  void clippedSeconds_reservationEndsExactlyAtTo_isNotClipped() {
    long seconds =
        UsageCalculator.clippedSeconds(at(10, 9, 0), at(10, 10, 0), at(10, 8, 0), at(10, 10, 0));

    assertThat(seconds).isEqualTo(60 * 60);
  }

  @Test
  void clippedSeconds_onlyFromGiven_clipsOnlyTheStart() {
    long seconds = UsageCalculator.clippedSeconds(at(10, 9, 0), at(10, 11, 0), at(10, 10, 0), null);

    assertThat(seconds).isEqualTo(60 * 60);
  }

  @Test
  void clippedSeconds_onlyToGiven_clipsOnlyTheEnd() {
    long seconds = UsageCalculator.clippedSeconds(at(10, 9, 0), at(10, 11, 0), null, at(10, 10, 0));

    assertThat(seconds).isEqualTo(60 * 60);
  }

  @Test
  void clippedSeconds_fromAfterTo_returnsZeroInsteadOfNegative() {
    // from=12:00, to=10:00 のとき、予約 09:00-13:00 は重複判定に当たるが、切り詰め結果は負になるため 0
    long seconds =
        UsageCalculator.clippedSeconds(at(10, 9, 0), at(10, 13, 0), at(10, 12, 0), at(10, 10, 0));

    assertThat(seconds).isZero();
  }

  @Test
  void clippedSeconds_secondsAreKept() {
    long seconds =
        UsageCalculator.clippedSeconds(
            LocalDateTime.of(2030, 10, 10, 9, 0, 0),
            LocalDateTime.of(2030, 10, 10, 9, 0, 45),
            null,
            null);

    assertThat(seconds).isEqualTo(45);
  }
}
