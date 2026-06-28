package com.example.bookflow.application.exception;

/**
 * クライアントリクエストのパラメータ検証失敗（HTTP 400・{@code VALIDATION_ERROR}）。
 *
 * <p>Bean Validation では捕捉できない業務上のリクエスト検証（例：{@code from}/{@code to} の同時指定必須）に使用する。{@link
 * GlobalExceptionHandler} が {@link ErrorCode#VALIDATION_ERROR} として 400 を返す。
 */
public class ValidationException extends RuntimeException {

  public ValidationException(String message) {
    super(message);
  }
}
