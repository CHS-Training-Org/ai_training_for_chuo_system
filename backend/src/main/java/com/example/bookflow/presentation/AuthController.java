package com.example.bookflow.presentation;

import com.example.bookflow.domain.User;
import com.example.bookflow.infrastructure.security.CurrentUser;
import com.example.bookflow.presentation.dto.UserResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 認証スライスのコントローラ（api-spec.md §認証 準拠）。
 *
 * <ul>
 *   <li>{@code GET /api/users/me} — 認証済みユーザーの自己情報取得（全ロール）
 *   <li>{@code POST /api/auth/signout} — サインアウト通知（認証不要・200/ボディなし）
 * </ul>
 *
 * <p>サインアウトはステートレス JWT のためサーバー側セッション無効化は行わない。 実際の Cookie 破棄は FE の Better Auth が担当する。
 */
@RestController
public class AuthController {

  /**
   * 認証済みユーザーの自己情報を返す（全ロール・認証必須）。
   *
   * @param user {@link CurrentUser} アノテーションで注入される User エンティティ
   * @return 7 フィールドの UserResponse
   */
  @GetMapping("/api/users/me")
  public UserResponse getMe(@CurrentUser User user) {
    return UserResponse.from(user);
  }

  /**
   * サインアウト通知エンドポイント（認証不要・200/ボディなし）。
   *
   * <p>{@link com.example.bookflow.infrastructure.security.SecurityConfig} にて {@code POST
   * /api/auth/signout} は {@code permitAll} 設定済み。
   */
  @PostMapping("/api/auth/signout")
  public ResponseEntity<Void> signout() {
    return ResponseEntity.ok().build();
  }
}
