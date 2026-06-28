package com.example.bookflow.infrastructure.security;

import com.example.bookflow.application.exception.ErrorCode;
import com.example.bookflow.presentation.exception.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;

/**
 * 認証失敗（JWT 未設定・不正・期限切れ）時に {@code 401 Unauthorized} を {@code { code, message }} 形式で返す。
 *
 * <p>フィルタチェーンの {@code ExceptionTranslationFilter} が {@link AuthenticationException} を
 * 捕捉した際に呼び出される。{@code @RestControllerAdvice} はこの経路には介入しないため、 {@code SecurityConfig}
 * にこのエントリポイントを登録する。
 *
 * <p>Jackson の {@code ObjectMapper} は Spring Bean に依存せず、クラス内で直接生成する。 これにより {@code SecurityConfig}
 * の初期化が Jackson 自動構成より先に走る場合でも動作する。
 */
class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

  private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

  @Override
  public void commence(
      HttpServletRequest request,
      HttpServletResponse response,
      AuthenticationException authException)
      throws IOException {
    writeErrorResponse(
        response, HttpStatus.UNAUTHORIZED, new ErrorResponse(ErrorCode.UNAUTHORIZED, "認証が必要です。"));
  }

  private static void writeErrorResponse(
      HttpServletResponse response, HttpStatus status, ErrorResponse body) throws IOException {
    response.setStatus(status.value());
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    response.setCharacterEncoding("UTF-8");
    OBJECT_MAPPER.writeValue(response.getWriter(), body);
  }
}
