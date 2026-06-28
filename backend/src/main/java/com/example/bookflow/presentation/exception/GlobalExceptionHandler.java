package com.example.bookflow.presentation.exception;

import com.example.bookflow.application.exception.ApprovalStepNotFoundException;
import com.example.bookflow.application.exception.BusinessException;
import com.example.bookflow.application.exception.CommentRequiredException;
import com.example.bookflow.application.exception.ErrorCode;
import com.example.bookflow.application.exception.ReservationConflictException;
import com.example.bookflow.application.exception.ResourceNotFoundException;
import com.example.bookflow.application.exception.UnregisteredUserException;
import com.example.bookflow.application.exception.ValidationException;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/**
 * 全 Controller に共通の例外ハンドラ（{@code api-spec.md §共通エラー} 準拠）。
 *
 * <p>フィルタチェーン由来の 401/403（認証なし・{@code authorizeHttpRequests} ルール違反）は {@code
 * ExceptionTranslationFilter} に委ねるため、{@code SecurityConfig} の {@code AuthenticationEntryPoint} /
 * {@code AccessDeniedHandler} が担当する。 このクラスはそれ以外の例外（バリデーション・業務ルール違反・{@code @PreAuthorize} 違反等）を処理する。
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

  private static final Logger LOG = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  /**
   * リクエストボディが読み取れない場合（空ボディ・不正 JSON）（400）。
   *
   * <p>{@code @RequestBody}（{@code required=true}、デフォルト）でボディが空または不正 JSON の場合に Spring が投げる。 未捕捉では
   * 500 になるため、{@code api-spec.md §共通エラー} の要件（不正リクエスト → 400）を満たすよう明示的に処理する。
   */
  @ExceptionHandler(HttpMessageNotReadableException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public ErrorResponse handleHttpMessageNotReadable(HttpMessageNotReadableException ex) {
    return new ErrorResponse(ErrorCode.VALIDATION_ERROR, "リクエストボディが不正です。");
  }

  /** リクエストボディのバリデーション失敗（400）。 */
  @ExceptionHandler(MethodArgumentNotValidException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public ErrorResponse handleMethodArgumentNotValid(MethodArgumentNotValidException ex) {
    String message =
        ex.getBindingResult().getFieldErrors().stream()
            .findFirst()
            .map(FieldError::getDefaultMessage)
            .orElse("リクエストの内容が不正です。");
    return new ErrorResponse(ErrorCode.VALIDATION_ERROR, message);
  }

  /**
   * {@code @Validated} + パラメータアノテーション（{@code @Min} 等）のバリデーション失敗（400）。
   *
   * <p>{@code @RequestParam} / {@code @PathVariable} に付与したアノテーションが失敗すると {@link
   * ConstraintViolationException} が投げられる。{@link MethodArgumentNotValidException}
   * では捕捉できないため、このハンドラが必要。
   */
  @ExceptionHandler(ConstraintViolationException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public ErrorResponse handleConstraintViolation(ConstraintViolationException ex) {
    String message =
        ex.getConstraintViolations().stream()
            .findFirst()
            .map(v -> v.getMessage())
            .orElse("リクエストの内容が不正です。");
    return new ErrorResponse(ErrorCode.VALIDATION_ERROR, message);
  }

  /**
   * 必須クエリパラメータが欠落した場合（400）。
   *
   * <p>{@code @RequestParam}（{@code required=true}、デフォルト）が省略された場合に Spring が投げる。 デフォルトでは未捕捉となり 500
   * になるため、{@code api-spec.md §共通エラー} の要件（必須未入力 → 400）を満たすよう明示的に処理する。
   */
  @ExceptionHandler(MissingServletRequestParameterException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public ErrorResponse handleMissingServletRequestParameter(
      MissingServletRequestParameterException ex) {
    return new ErrorResponse(
        ErrorCode.VALIDATION_ERROR, "必須パラメータが不足しています: " + ex.getParameterName());
  }

  /**
   * クエリパラメータの型変換失敗（400）。
   *
   * <p>{@code @RequestParam} の型（{@link java.time.LocalDateTime} / {@link java.util.UUID} 等）に変換
   * できない値が渡された場合に Spring が投げる。未捕捉では 500 になるため明示的に処理する。
   */
  @ExceptionHandler(MethodArgumentTypeMismatchException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public ErrorResponse handleMethodArgumentTypeMismatch(MethodArgumentTypeMismatchException ex) {
    return new ErrorResponse(ErrorCode.VALIDATION_ERROR, "パラメータの形式が不正です: " + ex.getName());
  }

  /**
   * JWT は有効だが DB に未登録のユーザー（401）。
   *
   * <p>{@code CurrentUserArgumentResolver} がフィルタチェーン後（DispatcherServlet 内）で投げるため、
   * {@code @RestControllerAdvice} で捕捉できる。
   */
  @ExceptionHandler(UnregisteredUserException.class)
  @ResponseStatus(HttpStatus.UNAUTHORIZED)
  public ErrorResponse handleUnregisteredUser(UnregisteredUserException ex) {
    return new ErrorResponse(ErrorCode.UNAUTHORIZED, "ユーザーが登録されていません。");
  }

  /** 指定リソース不在（404）。 */
  @ExceptionHandler(ResourceNotFoundException.class)
  @ResponseStatus(HttpStatus.NOT_FOUND)
  public ErrorResponse handleResourceNotFound(ResourceNotFoundException ex) {
    return new ErrorResponse(ErrorCode.NOT_FOUND, ex.getMessage());
  }

  /**
   * {@code @PreAuthorize} 違反（403）。
   *
   * <p>フィルタチェーン由来の {@code AccessDeniedException} は {@code SecurityConfig} の {@code
   * AccessDeniedHandler} が処理するため到達しない場合があるが、念のため定義する。
   */
  @ExceptionHandler(AccessDeniedException.class)
  @ResponseStatus(HttpStatus.FORBIDDEN)
  public ErrorResponse handleAccessDenied(AccessDeniedException ex) {
    return new ErrorResponse(ErrorCode.FORBIDDEN, "この操作を行う権限がありません。");
  }

  /** 重複予約（409）。 */
  @ExceptionHandler(ReservationConflictException.class)
  @ResponseStatus(HttpStatus.CONFLICT)
  public ErrorResponse handleReservationConflict(ReservationConflictException ex) {
    return new ErrorResponse(ErrorCode.RESERVATION_CONFLICT, ex.getMessage());
  }

  /**
   * リクエストパラメータの業務上の検証失敗（400・{@code VALIDATION_ERROR}）。
   *
   * <p>Bean Validation では表現できない複合条件（例：{@code from}/{@code to} の同時指定必須）を Service / Controller 層で
   * 判定した場合に投げる。
   */
  @ExceptionHandler(ValidationException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public ErrorResponse handleValidation(ValidationException ex) {
    return new ErrorResponse(ErrorCode.VALIDATION_ERROR, ex.getMessage());
  }

  /** 却下コメントが欠落または空（400・承認操作固有）。 */
  @ExceptionHandler(CommentRequiredException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public ErrorResponse handleCommentRequired(CommentRequiredException ex) {
    return new ErrorResponse(ErrorCode.COMMENT_REQUIRED, ex.getMessage());
  }

  /** 指定承認ステップが存在しない（404・承認操作固有）。 */
  @ExceptionHandler(ApprovalStepNotFoundException.class)
  @ResponseStatus(HttpStatus.NOT_FOUND)
  public ErrorResponse handleApprovalStepNotFound(ApprovalStepNotFoundException ex) {
    return new ErrorResponse(ErrorCode.APPROVAL_STEP_NOT_FOUND, ex.getMessage());
  }

  /** 業務ルール違反（422）。code は例外が保持する値を使用する。 */
  @ExceptionHandler(BusinessException.class)
  @ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
  public ErrorResponse handleBusiness(BusinessException ex) {
    return new ErrorResponse(ex.getCode(), ex.getMessage());
  }

  /** 未捕捉例外（500）。スタックトレースをログに記録する。 */
  @ExceptionHandler(Exception.class)
  @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
  public ErrorResponse handleException(Exception ex) {
    LOG.error("Unexpected error", ex);
    return new ErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "予期しないエラーが発生しました。");
  }
}
