package com.example.bookflow.infrastructure.security;

import com.example.bookflow.application.exception.UnregisteredUserException;
import com.example.bookflow.domain.User;
import com.example.bookflow.domain.UserRepository;
import org.springframework.core.MethodParameter;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

/**
 * {@link CurrentUser} アノテーションが付いた Controller 引数に {@link User} を注入するリゾルバ（タスク 1.2）。
 *
 * <p>JWT の {@code sub} クレームを {@link UserRepository#findByCognitoSub(String)} で解決する。 未登録ユーザー（JWT
 * は有効だが DB にレコードがない）は {@link UnregisteredUserException} を投げ、 {@code GlobalExceptionHandler} が 401
 * {@code UNAUTHORIZED} に変換する。
 *
 * <p>このリゾルバはフィルタチェーン後（DispatcherServlet 内）で実行されるため、 投げる例外は {@code @RestControllerAdvice} で捕捉できる素の
 * RuntimeException で充分。Spring Security の {@code AuthenticationException} は不要。
 */
public class CurrentUserArgumentResolver implements HandlerMethodArgumentResolver {

  private final UserRepository userRepository;

  public CurrentUserArgumentResolver(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  @Override
  public boolean supportsParameter(MethodParameter parameter) {
    return parameter.hasParameterAnnotation(CurrentUser.class)
        && User.class.isAssignableFrom(parameter.getParameterType());
  }

  @Override
  public Object resolveArgument(
      MethodParameter parameter,
      ModelAndViewContainer mavContainer,
      NativeWebRequest webRequest,
      WebDataBinderFactory binderFactory) {

    var principal = webRequest.getUserPrincipal();
    if (!(principal instanceof JwtAuthenticationToken jwtAuth)) {
      throw new UnregisteredUserException("(no JWT)");
    }

    String sub = jwtAuth.getToken().getSubject();
    return userRepository
        .findByCognitoSub(sub)
        .orElseThrow(() -> new UnregisteredUserException(sub));
  }
}
