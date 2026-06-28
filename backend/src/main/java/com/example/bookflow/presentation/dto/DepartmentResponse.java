package com.example.bookflow.presentation.dto;

import com.example.bookflow.domain.Department;
import java.util.UUID;

/**
 * 部署情報レスポンス DTO（api-spec.md §ユーザー・部署 権威定義・3フィールド）。
 *
 * <p>{@code parentId} はルート部署の場合 {@code null}、子部署の場合は親部署の ID。 {@link Department#getParent()} は
 * {@code DepartmentRepository#findAllOrderByName()} で JOIN FETCH 済みのため遅延ロードは発生しない。
 *
 * <p>フロントエンドの {@code DepartmentResponseSchema}（{@code src/lib/types/api.ts}）と同一のフィールドセットを持つ。
 */
public record DepartmentResponse(UUID id, String name, UUID parentId) {

  /**
   * {@link Department} エンティティから {@link DepartmentResponse} を生成するファクトリメソッド。
   *
   * @param department JOIN FETCH 済みの Department エンティティ
   * @return DepartmentResponse
   */
  public static DepartmentResponse from(Department department) {
    return new DepartmentResponse(
        department.getId(),
        department.getName(),
        department.getParent() == null ? null : department.getParent().getId());
  }
}
