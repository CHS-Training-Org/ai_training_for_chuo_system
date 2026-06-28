package com.example.bookflow.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 予約申請リクエスト DTO（{@code api-spec.md §予約 POST} L518-524 準拠）。
 *
 * <p>{@code resourceId} を含む（{@link UpdateReservationRequest} は含まない点に注意）。
 */
public record CreateReservationRequest(
    @NotNull(message = "リソース ID は必須です。") UUID resourceId,
    @NotNull(message = "開始日時は必須です。") LocalDateTime startAt,
    @NotNull(message = "終了日時は必須です。") LocalDateTime endAt,
    @NotBlank(message = "利用目的は必須です。") @Size(max = 255, message = "利用目的は 255 文字以内で入力してください。")
        String purpose,
    @Positive(message = "参加人数は 1 以上で入力してください。") Integer attendeesCount) {}
