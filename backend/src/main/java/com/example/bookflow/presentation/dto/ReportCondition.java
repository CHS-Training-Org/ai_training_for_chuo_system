package com.example.bookflow.presentation.dto;

import com.example.bookflow.domain.ReservationStatus;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 予約帳票（CSV）の絞り込み条件。
 *
 * <p>引数の個数を抑えるために条件をまとめる（Checkstyle の {@code ParameterNumber}）。{@code from} と {@code to} は
 * Controller が同時指定を検証する。
 *
 * @param from 期間の開始日時（{@code to} と同時指定。未指定は {@code null}）
 * @param to 期間の終了日時（{@code from} と同時指定。未指定は {@code null}）
 * @param statuses 対象ステータス（未指定は {@code null} または空。既定値の決定は Service が行う）
 */
public record ReportCondition(
    LocalDateTime from, LocalDateTime to, List<ReservationStatus> statuses) {

  /** 期間条件が指定されているか（{@code from} と {@code to} が両方ある）。 */
  public boolean hasPeriod() {
    return from != null && to != null;
  }
}
