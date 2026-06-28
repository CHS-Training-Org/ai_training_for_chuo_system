package com.example.bookflow.presentation.dto;

import com.example.bookflow.domain.User;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * ユーザー情報レスポンス DTO（api-spec.md §認証 権威定義・7フィールド）。
 *
 * <p>{@code cognito_sub} は含めない。{@code departmentName} は {@link User#getDepartment()} から取得する （{@code
 * UserRepository#findByCognitoSub} で JOIN FETCH 済みのため遅延ロードは発生しない）。
 *
 * <p>フロントエンドの {@code UserResponseSchema}（{@code src/lib/types/api.ts}）と同一のフィールドセットを持つ。
 */
public record UserResponse(
    UUID id,
    String name,
    String email,
    String role,
    UUID departmentId,
    String departmentName,
    LocalDateTime createdAt) {

  /**
   * {@link User} エンティティから {@link UserResponse} を生成するファクトリメソッド。
   *
   * @param user JOIN FETCH 済みの User エンティティ
   * @return UserResponse
   */
  public static UserResponse from(User user) {
    return new UserResponse(
        user.getId(),
        user.getName(),
        user.getEmail(),
        user.getRole().name(),
        user.getDepartment().getId(),
        user.getDepartment().getName(),
        user.getCreatedAt());
  }
}
