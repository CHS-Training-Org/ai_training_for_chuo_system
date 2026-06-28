package com.example.bookflow.presentation.dto;

import com.example.bookflow.domain.Resource;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * リソース情報レスポンス DTO（api-spec.md §リソース 権威定義・9フィールド）。
 *
 * <p>フロントエンドの {@code ResourceResponseSchema}（{@code src/lib/types/api.ts}）と同一のフィールドセットを持つ。 {@code
 * category} は enum の文字列表現（{@code ROOM} / {@code EQUIPMENT} / {@code VEHICLE}）で返す。
 */
public record ResourceResponse(
    UUID id,
    String name,
    String category,
    Integer capacity,
    String location,
    boolean requiresApproval,
    boolean isActive,
    String description,
    LocalDateTime createdAt) {

  /**
   * {@link Resource} エンティティから {@link ResourceResponse} を生成するファクトリメソッド。
   *
   * @param resource Resource エンティティ
   * @return ResourceResponse
   */
  public static ResourceResponse from(Resource resource) {
    return new ResourceResponse(
        resource.getId(),
        resource.getName(),
        resource.getCategory().name(),
        resource.getCapacity(),
        resource.getLocation(),
        resource.isRequiresApproval(),
        resource.isActive(),
        resource.getDescription(),
        resource.getCreatedAt());
  }
}
