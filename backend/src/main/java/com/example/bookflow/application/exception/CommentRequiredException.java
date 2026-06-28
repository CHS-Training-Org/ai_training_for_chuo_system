package com.example.bookflow.application.exception;

/**
 * 却下操作のコメントが欠落または空の場合の例外（HTTP 400・{@code COMMENT_REQUIRED}）。
 *
 * <p>{@link ErrorCode#COMMENT_REQUIRED} を返す。{@code @NotBlank} ではなく Service 層で判定することで {@code
 * VALIDATION_ERROR} と区別した正確なエラーコードを返す（{@code api-spec.md} L794 準拠）。
 */
public class CommentRequiredException extends RuntimeException {

  public CommentRequiredException() {
    super("却下理由を入力してください。");
  }
}
