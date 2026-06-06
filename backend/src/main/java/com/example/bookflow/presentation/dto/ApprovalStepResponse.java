package com.example.bookflow.presentation.dto;

import com.example.bookflow.domain.ApprovalStep;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 承認ステップレスポンス DTO（{@code api-spec.md §承認 ApprovalStepResponse} 準拠・10 フィールド）。
 *
 * <p>呼び出し元（{@link com.example.bookflow.application.ApprovalService}）は必ず {@code @Transactional}
 * メソッド内で {@link #from(ApprovalStep)} を呼び出すこと。 {@code open-in-view: false} のため、LAZY 関連（{@code
 * reservation} / {@code resource} / {@code requester}）はトランザクション外で参照すると {@code
 * LazyInitializationException} が発生する。
 */
public record ApprovalStepResponse(
    UUID id,
    UUID reservationId,
    String resourceName,
    String requesterName,
    LocalDateTime startAt,
    LocalDateTime endAt,
    String purpose,
    Integer stepOrder,
    String status,
    LocalDateTime createdAt) {

  /**
   * {@link ApprovalStep} エンティティから DTO を生成するファクトリメソッド。
   *
   * <p>JOIN FETCH 済みの {@code step} を渡すこと（LAZY 解決が必要なため）。
   *
   * @param step JOIN FETCH 済み承認ステップエンティティ
   * @return {@link ApprovalStepResponse}
   */
  public static ApprovalStepResponse from(ApprovalStep step) {
    return new ApprovalStepResponse(
        step.getId(),
        step.getReservation().getId(),
        step.getReservation().getResource().getName(),
        step.getReservation().getRequester().getName(),
        step.getReservation().getStartAt(),
        step.getReservation().getEndAt(),
        step.getReservation().getPurpose(),
        step.getStepOrder(),
        step.getStatus().name(),
        step.getCreatedAt());
  }
}
