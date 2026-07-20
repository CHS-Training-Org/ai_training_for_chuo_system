package com.example.bookflow.infrastructure.security;

import com.example.bookflow.application.exception.UnregisteredUserException;
import com.example.bookflow.domain.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * JWT は有効だが {@code users} テーブルに未登録のユーザーを全 API エンドポイントで弾くインターセプター。
 *
 * <p>{@link CurrentUserArgumentResolver} は {@link CurrentUser} アノテーション付き引数を持つエンドポイントのみで DB
 * 照合を行うため、{@code @CurrentUser} を持たないエンドポイント（{@code GET /api/resources} 等）では
 * 未登録ユーザーが通過していた。本インターセプターは {@code /api/**}（{@code /api/auth/signout} を除く） 全エンドポイントで JWT の {@code
 * sub} を users テーブルと照合し、未登録の場合は {@link UnregisteredUserException} をスローして {@code
 * GlobalExceptionHandler} に 401 処理を委ねる。
 *
 * <p>Spring MVC の {@link HandlerInterceptor} は Spring Security の JWT 認証フィルターより後に実行されるため、 このタイミングで
 * {@link JwtAuthenticationToken} が利用可能。投げる {@link UnregisteredUserException} は
 * {@code @RestControllerAdvice} で捕捉できる。
 *
 * <p>api-spec.md §認証方式：「JWT は有効だが {@code users} テーブルに未登録のユーザーの場合も {@code 401 Unauthorized}（{@code
 * code: UNAUTHORIZED}）を返す」（全エンドポイント共通保証）。
 */
public class RegisteredUserInterceptor implements HandlerInterceptor {

  private final UserRepository userRepository;

  public RegisteredUserInterceptor(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  /**
   * リクエストのプリンシパルが {@link JwtAuthenticationToken} の場合に DB 照合を行う。
   *
   * <p>認証不要エンドポイント（{@code /api/auth/signout}）は {@link
   * com.example.bookflow.infrastructure.config.WebMvcConfig} の excludePathPatterns で除外される。
   * 未認証のリクエストは Spring Security の {@code ExceptionTranslationFilter} が先に 401 を返すため、
   * このインターセプターには到達しない。
   *
   * @return {@code true} — 後続処理に進む（登録済みユーザー）
   * @throws UnregisteredUserException JWT は有効だが DB 未登録のユーザーの場合
   */
  @Override
  public boolean preHandle(
      HttpServletRequest request, HttpServletResponse response, Object handler) {

    var principal = request.getUserPrincipal();
    if (!(principal instanceof JwtAuthenticationToken jwtAuth)) {
      // 認証不要パスまたは Spring Security で弾かれた未認証リクエスト → スルー
      return true;
    }

    String sub = jwtAuth.getToken().getSubject();
    if (userRepository.findByCognitoSub(sub).isEmpty()) {
      throw new UnregisteredUserException(sub);
    }
    return true;
  }
}
