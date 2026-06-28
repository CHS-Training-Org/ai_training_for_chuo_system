package com.example.bookflow.domain;

/**
 * ユーザーロール（V001 {@code users.role} CHECK 制約 + api-spec.md 準拠）。
 *
 * <p>フロントエンドの {@code RoleSchema}（MEMBER/APPROVER/ADMIN）と同一の値セットを持つ。
 */
public enum Role {
  MEMBER,
  APPROVER,
  ADMIN,
}
