package com.example.bookflow.presentation.dto;

import java.util.UUID;

/**
 * リソース別の利用実績（api-spec.md §統計 の {@code ResourceUsageResponse}）。
 *
 * @param resourceId リソース ID
 * @param resourceName リソース名
 * @param reservationCount 対象の承認済み予約の件数
 * @param totalMinutes 合計利用時間（分）
 */
public record ResourceUsageResponse(
    UUID resourceId, String resourceName, long reservationCount, long totalMinutes) {}
