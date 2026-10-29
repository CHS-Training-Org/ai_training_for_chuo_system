package com.example.bookflow.application;

import com.example.bookflow.domain.ReservationStatus;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * CSV 1 行分の予約データ。
 *
 * <p>エンティティの LAZY 関連に触れずに {@link ReservationCsvWriter} を単体テストするための境界。
 */
public record ReservationCsvRow(
    UUID id,
    String resourceName,
    String requesterName,
    LocalDateTime startAt,
    LocalDateTime endAt,
    String purpose,
    ReservationStatus status) {}
