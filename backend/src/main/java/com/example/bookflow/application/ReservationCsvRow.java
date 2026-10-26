package com.example.bookflow.application;

import com.example.bookflow.domain.Reservation;
import com.example.bookflow.domain.ReservationStatus;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * CSV 帳票 1 行分の予約データ。
 *
 * <p>{@code resourceName} / {@code requesterName} はエンティティの LAZY 関連から取得するため、{@link
 * #from(Reservation)} は トランザクション内で呼び出すこと（{@code open-in-view: false}）。
 */
public record ReservationCsvRow(
    UUID id,
    String resourceName,
    String requesterName,
    LocalDateTime startAt,
    LocalDateTime endAt,
    String purpose,
    ReservationStatus status) {

  /**
   * {@link Reservation} エンティティから行を生成する。
   *
   * @param r 予約エンティティ（resource / requester が読み取れること）
   * @return {@link ReservationCsvRow}
   */
  public static ReservationCsvRow from(Reservation r) {
    return new ReservationCsvRow(
        r.getId(),
        r.getResource().getName(),
        r.getRequester().getName(),
        r.getStartAt(),
        r.getEndAt(),
        r.getPurpose(),
        r.getStatus());
  }
}
