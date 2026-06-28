package com.example.bookflow.presentation.exception;

/**
 * 全エラーレスポンスの統一形式。
 *
 * <p>{@code api-spec.md §共通エラー} が定める {@code { "code": "...", "message": "..." }} 形式。
 * フィルタチェーン（セキュリティハンドラ）と {@link GlobalExceptionHandler} の両経路で使用する。
 */
public record ErrorResponse(String code, String message) {}
