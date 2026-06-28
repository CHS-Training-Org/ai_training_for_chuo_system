package com.example.bookflow.domain;

/**
 * リソースカテゴリ（V001 {@code resources.category} の CHECK 制約と一致）。
 *
 * <p>FE の {@code ResourceCategorySchema}（enums.ts）と同一値セット。
 */
public enum ResourceCategory {
  ROOM,
  EQUIPMENT,
  VEHICLE
}
