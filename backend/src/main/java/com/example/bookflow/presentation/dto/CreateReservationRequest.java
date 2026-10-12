package com.example.bookflow.presentation.dto;

import com.example.bookflow.domain.RecurrenceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 予約申請リクエスト DTO（{@code api-spec.md §予約 POST} 準拠）。
 *
 * <p>{@code resourceId} を含む（{@link UpdateReservationRequest} は含まない点に注意）。
 *
 * <p>{@code draft} は下書き保存オプション（reservation-draft ユニット）。{@code null}/未指定は {@code false}
 * （下書きではない＝通常の申請）として扱う。
 *
 * <p>{@code recurrenceType}・{@code recurrenceUntil} は繰り返し予約（recurring-reservation ユニット）。{@code
 * recurrenceType} の {@code null} は {@code NONE}（繰り返さない）として扱う。繰り返し指定の組み合わせの検証（{@code NONE} で終了日あり、
 * {@code WEEKLY}/{@code MONTHLY} で終了日なし、終了日が開始日より前）は Service で行い、400 にする。
 */
public record CreateReservationRequest(
    @NotNull(message = "リソース ID は必須です。") UUID resourceId,
    @NotNull(message = "開始日時は必須です。") LocalDateTime startAt,
    @NotNull(message = "終了日時は必須です。") LocalDateTime endAt,
    @NotBlank(message = "利用目的は必須です。") @Size(max = 255, message = "利用目的は 255 文字以内で入力してください。")
        String purpose,
    @Positive(message = "参加人数は 1 以上で入力してください。") Integer attendeesCount,
    Boolean draft,
    RecurrenceType recurrenceType,
    LocalDate recurrenceUntil) {

  /** {@code draft} を null 安全に判定する（{@code null} は {@code false} 扱い）。 */
  public boolean isDraft() {
    return Boolean.TRUE.equals(draft);
  }

  /** {@code recurrenceType} を null 安全に返す（{@code null} は {@code NONE} 扱い）。 */
  public RecurrenceType recurrence() {
    return recurrenceType == null ? RecurrenceType.NONE : recurrenceType;
  }
}
