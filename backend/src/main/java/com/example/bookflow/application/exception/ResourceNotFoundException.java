package com.example.bookflow.application.exception;

/** 指定されたリソース（予約対象・ユーザー等）が存在しない場合の例外（HTTP 404）。 */
public class ResourceNotFoundException extends RuntimeException {

  public ResourceNotFoundException(String message) {
    super(message);
  }
}
