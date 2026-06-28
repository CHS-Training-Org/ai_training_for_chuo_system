package com.example.bookflow.domain;

/**
 * 予約ステータス（V001 {@code reservations.status} の CHECK 制約と一致）。
 *
 * <p>FE の {@code ReservationStatusSchema}（enums.ts）と同一値セット。
 */
public enum ReservationStatus {
  DRAFT,
  PENDING,
  APPROVED,
  REJECTED,
  CANCELLED
}
