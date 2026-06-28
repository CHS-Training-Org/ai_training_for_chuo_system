package com.example.bookflow.presentation.dto;

import com.example.bookflow.domain.Reservation;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 予約レスポンス DTO（{@code api-spec.md §予約} L490-505 準拠）。
 *
 * <p>12 フィールド。{@code resourceName} / {@code requesterName} はエンティティの LAZY 関連から取得するため、
 * トランザクション内で呼び出すこと。
 */
public record ReservationResponse(
    UUID id,
    UUID resourceId,
    String resourceName,
    UUID requesterId,
    String requesterName,
    LocalDateTime startAt,
    LocalDateTime endAt,
    String purpose,
    Integer attendeesCount,
    String status,
    LocalDateTime createdAt,
    LocalDateTime updatedAt) {

  /**
   * {@link Reservation} エンティティから DTO を生成するファクトリメソッド。
   *
   * @param r 予約エンティティ（resource / requester が初期化済みであること）
   * @return {@link ReservationResponse}
   */
  public static ReservationResponse from(Reservation r) {
    return new ReservationResponse(
        r.getId(),
        r.getResource().getId(),
        r.getResource().getName(),
        r.getRequester().getId(),
        r.getRequester().getName(),
        r.getStartAt(),
        r.getEndAt(),
        r.getPurpose(),
        r.getAttendeesCount(),
        r.getStatus().name(),
        r.getCreatedAt(),
        r.getUpdatedAt());
  }
}
