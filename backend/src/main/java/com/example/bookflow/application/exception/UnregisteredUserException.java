package com.example.bookflow.application.exception;

/**
 * JWT は有効だが {@code users} テーブルに未登録のユーザーを表す例外（HTTP 401）。
 *
 * <p>{@link com.example.bookflow.infrastructure.security.CurrentUserArgumentResolver} が Cognito sub
 * に対応するユーザーを見つけられない場合に投げる。フィルタチェーン後（DispatcherServlet 内）で発生するため、 {@code @RestControllerAdvice} の
 * {@code GlobalExceptionHandler} で捕捉できる。
 */
public class UnregisteredUserException extends RuntimeException {

  public UnregisteredUserException(String cognitoSub) {
    super("ユーザーが登録されていません: " + cognitoSub);
  }
}
