package com.example.bookflow.infrastructure.security;

import com.example.bookflow.application.exception.ErrorCode;
import com.example.bookflow.presentation.exception.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;

/**
 * {@code authorizeHttpRequests} ルール違反（認証済みだが権限不足）時に {@code 403 Forbidden} を {@code { code, message
 * }} 形式で返す。
 *
 * <p>フィルタチェーンの {@code ExceptionTranslationFilter} が {@link AccessDeniedException} を 捕捉した際に呼び出される。
 *
 * <p>Jackson の {@code ObjectMapper} は Spring Bean に依存せず、クラス内で直接生成する。 これにより {@code SecurityConfig}
 * の初期化が Jackson 自動構成より先に走る場合でも動作する。
 */
class RestAccessDeniedHandler implements AccessDeniedHandler {

  private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

  @Override
  public void handle(
      HttpServletRequest request,
      HttpServletResponse response,
      AccessDeniedException accessDeniedException)
      throws IOException {
    writeErrorResponse(
        response, HttpStatus.FORBIDDEN, new ErrorResponse(ErrorCode.FORBIDDEN, "この操作を行う権限がありません。"));
  }

  private static void writeErrorResponse(
      HttpServletResponse response, HttpStatus status, ErrorResponse body) throws IOException {
    response.setStatus(status.value());
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    response.setCharacterEncoding("UTF-8");
    OBJECT_MAPPER.writeValue(response.getWriter(), body);
  }
}
