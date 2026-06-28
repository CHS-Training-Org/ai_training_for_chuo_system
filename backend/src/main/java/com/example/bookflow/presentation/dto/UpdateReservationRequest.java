package com.example.bookflow.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

/**
 * 予約内容更新リクエスト DTO（{@code api-spec.md §予約 PUT} L579-584 準拠）。
 *
 * <p>{@code resourceId} を含まない（{@link CreateReservationRequest} とは別スキーマ）。 更新可能ステータスは {@code PENDING}
 * のみ。
 */
public record UpdateReservationRequest(
    @NotNull(message = "開始日時は必須です。") LocalDateTime startAt,
    @NotNull(message = "終了日時は必須です。") LocalDateTime endAt,
    @NotBlank(message = "利用目的は必須です。") @Size(max = 255, message = "利用目的は 255 文字以内で入力してください。")
        String purpose,
    @Positive(message = "参加人数は 1 以上で入力してください。") Integer attendeesCount) {}
