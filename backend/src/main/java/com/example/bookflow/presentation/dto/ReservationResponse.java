package com.example.bookflow.presentation.dto;

import com.example.bookflow.domain.Reservation;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 予約レスポンス DTO（{@code api-spec.md §予約} L490-505 準拠）。
 *
 * <p>17 フィールド。{@code resourceName} / {@code requesterName} はエンティティの LAZY 関連から取得するため、
 * トランザクション内で呼び出すこと。
 *
 * <p>末尾の 5 フィールドは繰り返し予約（recurring-reservation ユニット）。{@code seriesCount}・{@code remainingCount}
 * は予約詳細 （{@code GET /api/reservations/{id}}）だけが値を入れ、一覧・申請・更新・キャンセルでは {@code null}（N+1
 * を避けるため）。繰り返さない予約（{@code seriesId == null}）も {@code null}。
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
    LocalDateTime updatedAt,
    UUID seriesId,
    String recurrenceType,
    LocalDate recurrenceUntil,
    Integer seriesCount,
    Integer remainingCount) {

  /**
   * {@link Reservation} エンティティから DTO を生成するファクトリメソッド（シリーズ件数・残り回数は {@code null}）。
   *
   * @param r 予約エンティティ（resource / requester が初期化済みであること）
   * @return {@link ReservationResponse}
   */
  public static ReservationResponse from(Reservation r) {
    return build(r, null, null);
  }

  /**
   * シリーズ件数と残り回数を付けて DTO を生成する（予約詳細用。{@code seriesId} を持つ予約にだけ使う）。
   *
   * @param r 予約エンティティ（resource / requester が初期化済みであること）
   * @param seriesCount 同じ系列の予約の件数（全ステータス）
   * @param remainingCount この予約より後に始まる同じ系列の予約の件数（全ステータス）
   * @return {@link ReservationResponse}
   */
  public static ReservationResponse from(Reservation r, long seriesCount, long remainingCount) {
    return build(r, (int) seriesCount, (int) remainingCount);
  }

  private static ReservationResponse build(
      Reservation r, Integer seriesCount, Integer remainingCount) {
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
        r.getUpdatedAt(),
        r.getSeriesId(),
        r.getRecurrenceType().name(),
        r.getRecurrenceUntil(),
        seriesCount,
        remainingCount);
  }
}
