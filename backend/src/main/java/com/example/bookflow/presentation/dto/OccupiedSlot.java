package com.example.bookflow.presentation.dto;

import com.example.bookflow.domain.Reservation;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 占有済み時間スロット DTO（api-spec.md §リソース {@code GET /api/resources/{id}/availability} 権威定義）。
 *
 * <p>{@code status IN ('PENDING', 'APPROVED')} の予約が占有する時間帯を表す。 フロントエンドの {@code
 * AvailabilitySlotSchema}（{@code src/lib/types/api.ts}）と同一の JSON フィールド名（{@code reservationId} /
 * {@code startAt} / {@code endAt}）を持つ。
 */
public record OccupiedSlot(UUID reservationId, LocalDateTime startAt, LocalDateTime endAt) {

  /**
   * {@link Reservation} エンティティから {@link OccupiedSlot} を生成するファクトリメソッド。
   *
   * @param reservation 対象予約
   * @return OccupiedSlot
   */
  public static OccupiedSlot from(Reservation reservation) {
    return new OccupiedSlot(reservation.getId(), reservation.getStartAt(), reservation.getEndAt());
  }
}
