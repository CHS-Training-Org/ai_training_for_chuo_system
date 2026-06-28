package com.example.bookflow.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * ユーザーエンティティ（V001 {@code users} テーブルと完全一致）。
 *
 * <p>{@code ddl-auto: validate} のため、カラム名・型・制約は V001 と整合していなければならない。 Cognito で認証済みの社員を表す。
 */
@Entity
@Table(name = "users")
public class User {

  @Id
  @Column(nullable = false)
  private UUID id;

  @Column(name = "cognito_sub", nullable = false, unique = true, length = 255)
  private String cognitoSub;

  @Column(nullable = false, length = 100)
  private String name;

  @Column(nullable = false, unique = true, length = 255)
  private String email;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "department_id", nullable = false)
  private Department department;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private Role role;

  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  /** JPA 用デフォルトコンストラクタ。 */
  protected User() {}

  public UUID getId() {
    return id;
  }

  public String getCognitoSub() {
    return cognitoSub;
  }

  public String getName() {
    return name;
  }

  public String getEmail() {
    return email;
  }

  public Department getDepartment() {
    return department;
  }

  public Role getRole() {
    return role;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }
}
