package com.example.bookflow.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

/**
 * 予約内容更新リクエスト DTO（{@code api-spec.md §予約 PUT} 準拠）。
 *
 * <p>{@code resourceId} を含まない（{@link CreateReservationRequest} とは別スキーマ）。 更新可能ステータスは {@code PENDING}
 * または {@code DRAFT}。
 *
 * <p>{@code submit} は下書きの正式申請オプション（reservation-draft ユニット）。{@code status == DRAFT} の予約に対して {@code
 * true} を指定すると、新規作成時と同じ判定で {@code PENDING}/{@code APPROVED} へ遷移する。{@code null}/未指定は {@code
 * false}（正式申請しない＝内容更新のみ）として扱う。{@code status == PENDING} の予約では無視される。
 */
public record UpdateReservationRequest(
    @NotNull(message = "開始日時は必須です。") LocalDateTime startAt,
    @NotNull(message = "終了日時は必須です。") LocalDateTime endAt,
    @NotBlank(message = "利用目的は必須です。") @Size(max = 255, message = "利用目的は 255 文字以内で入力してください。")
        String purpose,
    @Positive(message = "参加人数は 1 以上で入力してください。") Integer attendeesCount,
    Boolean submit) {

  /** {@code submit} を null 安全に判定する（{@code null} は {@code false} 扱い）。 */
  public boolean isSubmit() {
    return Boolean.TRUE.equals(submit);
  }
}
