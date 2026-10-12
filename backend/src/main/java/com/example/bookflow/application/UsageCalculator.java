package com.example.bookflow.application;

import java.time.Duration;
import java.time.LocalDateTime;

/**
 * 利用時間の計算（api-spec.md §統計 準拠）。
 *
 * <p>予約の利用時間を、指定期間で切り詰めた秒で返す純粋関数。フレームワークにもエンティティにも依存しない。
 */
final class UsageCalculator {

  private UsageCalculator() {}

  /**
   * 予約の利用時間を、期間（{@code null} は無制限）で切り詰めた秒で返す。
   *
   * <p>開始は {@code max(startAt, from)}、終了は {@code min(endAt, to)}（{@code from}/{@code to} が {@code
   * null} のときは予約の {@code startAt}/{@code endAt} をそのまま使う）。結果が負になる場合は 0 を返す。これは {@code from >= to}
   * のときに起こりうるが、Controller が 400 にするため通常は到達しない防御である。
   *
   * @param startAt 予約の開始日時
   * @param endAt 予約の終了日時
   * @param from 期間の開始日時（{@code null} は指定なし）
   * @param to 期間の終了日時（{@code null} は指定なし）
   * @return 切り詰めた利用時間（秒、0 以上）
   */
  static long clippedSeconds(
      LocalDateTime startAt, LocalDateTime endAt, LocalDateTime from, LocalDateTime to) {
    LocalDateTime start = from != null && from.isAfter(startAt) ? from : startAt;
    LocalDateTime end = to != null && to.isBefore(endAt) ? to : endAt;
    long seconds = Duration.between(start, end).getSeconds();
    return Math.max(seconds, 0);
  }
}
