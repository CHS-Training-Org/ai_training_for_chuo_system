package com.example.bookflow.application;

import com.example.bookflow.domain.UserRepository;
import com.example.bookflow.presentation.dto.UserResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * ユーザー管理のユースケース Service（カテゴリ 7）。
 *
 * <p>自分のプロフィール取得（{@code /api/users/me}）は {@link AuthController} が直接 {@link
 * UserResponse#from(com.example.bookflow.domain.User)} を呼ぶためこの Service は使用しない。 本 Service は ADMIN
 * による全ユーザー一覧取得（{@code GET /api/users}）を担う。
 */
@Service
@Transactional(readOnly = true)
public class UserService {

  private final UserRepository userRepository;

  public UserService(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  /**
   * 全ユーザー一覧を返す（ADMIN 専用・ページネーション）。
   *
   * <p>{@link UserRepository#findAllWithDepartment(Pageable)} で {@code department} を JOIN FETCH
   * し、{@code open-in-view: false} 環境でも遅延ロードを回避する。
   *
   * @param pageable ページング条件（デフォルト: size=20）
   * @return ユーザーのページ（department 含む）
   */
  public Page<UserResponse> listUsers(Pageable pageable) {
    return userRepository.findAllWithDepartment(pageable).map(UserResponse::from);
  }
}
