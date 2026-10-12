package com.example.bookflow.presentation.dto;

import java.time.LocalDateTime;

/**
 * 利用実績の集計条件。
 *
 * <p>{@code from} と {@code to} は Controller が「同時指定」「{@code from} は {@code to} より前」を検証する。
 *
 * @param from 期間の開始日時（{@code to} と同時指定。未指定は {@code null}）
 * @param to 期間の終了日時（{@code from} と同時指定。未指定は {@code null}）
 */
public record UsageCondition(LocalDateTime from, LocalDateTime to) {

  /** 期間条件が指定されているか（{@code from} と {@code to} が両方ある）。 */
  public boolean hasPeriod() {
    return from != null && to != null;
  }
}
