package com.example.bookflow.presentation.dto;

import jakarta.validation.constraints.NotNull;

/**
 * リソース有効/無効切替リクエスト DTO（api-spec.md §リソース {@code PATCH /api/resources/{id}/status} 準拠）。
 *
 * <p>リクエストボディは {@code { "isActive": boolean }} のみ。
 */
public record StatusUpdateRequest(@NotNull(message = "有効フラグは必須です。") Boolean isActive) {}
