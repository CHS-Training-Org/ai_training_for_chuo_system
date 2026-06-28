package com.example.bookflow.presentation.dto;

import com.example.bookflow.domain.ResourceCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * リソース更新リクエスト DTO（api-spec.md §リソース {@code PUT /api/resources/{id}} 準拠）。
 *
 * <p>{@link CreateResourceRequest} と同一フィールド構成。PUT のため全フィールドを置換する。
 */
public record UpdateResourceRequest(
    @NotBlank(message = "リソース名は必須です。") @Size(max = 100, message = "リソース名は 100 文字以内で入力してください。")
        String name,
    @NotNull(message = "カテゴリは必須です。") ResourceCategory category,
    Integer capacity,
    @Size(max = 200, message = "場所は 200 文字以内で入力してください。") String location,
    @NotNull(message = "承認フロー要否は必須です。") Boolean requiresApproval,
    @NotNull(message = "有効フラグは必須です。") Boolean isActive,
    String description) {}
