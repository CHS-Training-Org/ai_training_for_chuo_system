package com.example.bookflow.presentation;

import com.example.bookflow.application.UserService;
import com.example.bookflow.presentation.dto.UserResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * ユーザー管理コントローラ（api-spec.md §ユーザー・部署 準拠）。
 *
 * <ul>
 *   <li>{@code GET /api/users} — ユーザー一覧（ADMIN のみ・ページネーション）
 * </ul>
 *
 * <p>注意：{@link AuthController} が同一パス {@code /api/users/me} を扱う。 {@code /me} は固定サブパスであり、 {@code GET
 * /api/users}（ルート）と競合しない。
 *
 * <p>認可：{@code @PreAuthorize("hasRole('ADMIN')")} により ADMIN のみアクセス可。 MEMBER / APPROVER は 403
 * Forbidden。
 */
@RestController
@RequestMapping("/api/users")
public class UserController {

  private final UserService userService;

  public UserController(UserService userService) {
    this.userService = userService;
  }

  /**
   * ユーザー一覧を返す（ADMIN のみ）。
   *
   * <p>デフォルト page=0・size=20。{@link UserResponse} には {@code departmentName} が含まれる（JOIN FETCH 済み）。
   *
   * @param pageable ページング条件（デフォルト: size=20）
   * @return {@link UserResponse} のページ
   */
  @GetMapping
  @PreAuthorize("hasRole('ADMIN')")
  public Page<UserResponse> list(@PageableDefault(size = 20) Pageable pageable) {
    return userService.listUsers(pageable);
  }
}
