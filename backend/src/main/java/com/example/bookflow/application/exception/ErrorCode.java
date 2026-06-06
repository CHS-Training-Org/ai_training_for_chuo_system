package com.example.bookflow.application.exception;

/** エラーコード定数。{@code api-spec.md} §共通エラー 準拠。 */
public final class ErrorCode {

  /** リクエストボディのバリデーション失敗（HTTP 400）。 */
  public static final String VALIDATION_ERROR = "VALIDATION_ERROR";

  /** 認証が必要（HTTP 401）。 */
  public static final String UNAUTHORIZED = "UNAUTHORIZED";

  /** 操作権限なし（HTTP 403）。 */
  public static final String FORBIDDEN = "FORBIDDEN";

  /** 指定リソースが存在しない（HTTP 404）。 */
  public static final String NOT_FOUND = "NOT_FOUND";

  /** 重複予約（HTTP 409）。 */
  public static final String RESERVATION_CONFLICT = "RESERVATION_CONFLICT";

  /** 却下コメントが欠落または空（HTTP 400・承認操作固有）。 */
  public static final String COMMENT_REQUIRED = "COMMENT_REQUIRED";

  /** 指定承認ステップが存在しない（HTTP 404・承認操作固有）。 */
  public static final String APPROVAL_STEP_NOT_FOUND = "APPROVAL_STEP_NOT_FOUND";

  /** すでに決済済みの承認ステップへの再操作（HTTP 422・承認操作固有）。 */
  public static final String APPROVAL_ALREADY_DECIDED = "APPROVAL_ALREADY_DECIDED";

  /** 承認者（APPROVER ロール）が存在しない（HTTP 422）。seed データ未投入など設定ミス時。 */
  public static final String APPROVER_NOT_AVAILABLE = "APPROVER_NOT_AVAILABLE";

  /** サーバー内部エラー（HTTP 500）。 */
  public static final String INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR";

  private ErrorCode() {}
}
