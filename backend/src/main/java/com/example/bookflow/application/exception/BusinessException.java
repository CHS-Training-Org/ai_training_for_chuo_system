package com.example.bookflow.application.exception;

/** 業務ルール違反を表す基底例外（HTTP 422 Unprocessable Entity）。 */
public class BusinessException extends RuntimeException {

  private final String code;

  public BusinessException(String code, String message) {
    super(message);
    this.code = code;
  }

  public String getCode() {
    return code;
  }
}
