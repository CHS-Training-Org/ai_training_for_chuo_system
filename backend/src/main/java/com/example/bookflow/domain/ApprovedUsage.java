package com.example.bookflow.domain;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 承認済み予約の利用実績の集計用射影（JPQL の構築子式で生成する）。
 *
 * <p>集計に必要な最小の値だけを持つ。リソースは外部キー（{@code resourceId}）のみで、LAZY 関連を触らない。
 *
 * @param resourceId リソース ID
 * @param startAt 予約の開始日時
 * @param endAt 予約の終了日時
 */
public record ApprovedUsage(UUID resourceId, LocalDateTime startAt, LocalDateTime endAt) {}
