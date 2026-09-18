package com.example.bookflow.domain;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * CSV 帳票 1 行分の読み取りモデル（{@code GET /api/reports/reservations/csv} 専用）。
 *
 * <p>{@link ReservationRepository#streamCsvRowsForReport} の JPQL コンストラクタ式で直接生成される。
 * エンティティではなく射影のため永続化コンテキストに載らず、{@code Reservation} の LAZY 関連（{@code resource}・{@code
 * requester}）にも一切触れない。そのためトランザクション終了後に参照しても {@code LazyInitializationException} は起きない。
 */
public record ReservationCsvRow(
    UUID id,
    String resourceName,
    String requesterName,
    LocalDateTime startAt,
    LocalDateTime endAt,
    String purpose,
    ReservationStatus status) {}
