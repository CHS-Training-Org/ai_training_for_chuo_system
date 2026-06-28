package com.example.bookflow.domain;

/**
 * 承認ステップのステータス（V001 {@code approval_steps.status} CHECK 制約と一致）。
 *
 * <p>{@code PENDING}：承認待ち、{@code APPROVED}：承認済み、{@code REJECTED}：却下済み。 遷移は {@code PENDING →
 * APPROVED / REJECTED} のみ（戻りなし）。
 */
public enum ApprovalStatus {
  PENDING,
  APPROVED,
  REJECTED
}
