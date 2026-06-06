package com.example.bookflow.presentation.dto;

/**
 * 承認・却下操作のリクエスト DTO（approve / reject 共用）。
 *
 * <p>承認時は {@code comment} は任意（null 可）。却下時は必須だが、{@code @NotBlank} を付与しない。 理由：{@code @NotBlank} 違反は
 * {@link org.springframework.web.bind.MethodArgumentNotValidException} として扱われ {@code
 * VALIDATION_ERROR}（400）を返してしまうが、仕様上は {@code COMMENT_REQUIRED}（400）が 正しいエラーコードである（{@code
 * api-spec.md} L794 準拠）。Service 層で null/blank を判定し {@link
 * com.example.bookflow.application.exception.CommentRequiredException} をスローする。
 */
public record ApprovalDecisionRequest(String comment) {}
