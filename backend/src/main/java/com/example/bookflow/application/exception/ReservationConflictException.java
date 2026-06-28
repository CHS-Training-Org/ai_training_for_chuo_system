package com.example.bookflow.application.exception;

/** 重複予約（同一リソース・同一時間帯に PENDING/APPROVED 予約が存在）を表す例外（HTTP 409）。 */
public class ReservationConflictException extends RuntimeException {

  public ReservationConflictException(String message) {
    super(message);
  }

  public ReservationConflictException() {
    super("同一リソースの同一時間帯に承認済みまたは承認待ちの予約が存在します。");
  }
}
