package com.example.bookflow.domain;

/**
 * 予約の繰り返し種別（V003 {@code reservations.recurrence_type} の CHECK 制約と一致）。
 *
 * <p>FE の {@code RecurrenceTypeSchema}（enums.ts）と同一値セット。{@code NONE} は繰り返さない（従来どおり 1 件の予約）。
 */
public enum RecurrenceType {
  NONE,
  WEEKLY,
  MONTHLY
}
