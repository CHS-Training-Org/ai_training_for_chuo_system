package com.example.bookflow.application.exception;

/**
 * 指定された承認ステップが存在しない場合の例外（HTTP 404・{@code APPROVAL_STEP_NOT_FOUND}）。
 *
 * <p>{@link ErrorCode#APPROVAL_STEP_NOT_FOUND} を返す。{@link
 * ResourceNotFoundException}（code=NOT_FOUND） とは別クラスとして定義し、{@code GlobalExceptionHandler}
 * で正確なコードにマップする。
 */
public class ApprovalStepNotFoundException extends RuntimeException {

  public ApprovalStepNotFoundException(String message) {
    super(message);
  }
}
