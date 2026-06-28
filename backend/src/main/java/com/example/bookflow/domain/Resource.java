package com.example.bookflow.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * リソース（施設・備品）エンティティ（V001 {@code resources} テーブルと完全一致）。
 *
 * <p>ユーザー / 部署と異なり、API 経由で生成・更新される初のエンティティ。 {@link #create} ファクトリで ID・登録日時をアプリ側採番し、{@link #update}
 * / {@link #changeActive} で状態を変更する。
 *
 * <p>{@code ddl-auto: validate} のため、カラム名・型・制約は V001 と整合していなければならない。
 */
@Entity
@Table(name = "resources")
public class Resource {

  @Id
  @Column(nullable = false)
  private UUID id;

  @Column(nullable = false, length = 100)
  private String name;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private ResourceCategory category;

  @Column private Integer capacity;

  @Column(length = 200)
  private String location;

  @Column(name = "requires_approval", nullable = false)
  private boolean requiresApproval;

  @Column(name = "is_active", nullable = false)
  private boolean isActive;

  @Column(columnDefinition = "TEXT")
  private String description;

  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  /** JPA 用デフォルトコンストラクタ。 */
  protected Resource() {}

  /**
   * リソースを新規作成する。ID・登録日時はアプリ側で採番する。
   *
   * @param name リソース名（必須）
   * @param category カテゴリ（ROOM / EQUIPMENT / VEHICLE）
   * @param capacity 定員（null 可）
   * @param location 場所・棚番号（null 可）
   * @param requiresApproval 承認フロー要否
   * @param isActive 有効フラグ
   * @param description 説明文（null 可）
   * @return 新規 Resource インスタンス
   */
  public static Resource create(
      String name,
      ResourceCategory category,
      Integer capacity,
      String location,
      boolean requiresApproval,
      boolean isActive,
      String description) {
    Resource r = new Resource();
    r.id = UUID.randomUUID();
    r.name = name;
    r.category = category;
    r.capacity = capacity;
    r.location = location;
    r.requiresApproval = requiresApproval;
    r.isActive = isActive;
    r.description = description;
    r.createdAt = LocalDateTime.now();
    return r;
  }

  /**
   * リソース情報を更新する（PUT 対応）。
   *
   * @param name リソース名
   * @param category カテゴリ
   * @param capacity 定員
   * @param location 場所
   * @param requiresApproval 承認フロー要否
   * @param isActive 有効フラグ
   * @param description 説明文
   */
  public void update(
      String name,
      ResourceCategory category,
      Integer capacity,
      String location,
      boolean requiresApproval,
      boolean isActive,
      String description) {
    this.name = name;
    this.category = category;
    this.capacity = capacity;
    this.location = location;
    this.requiresApproval = requiresApproval;
    this.isActive = isActive;
    this.description = description;
  }

  /**
   * 有効/無効を切り替える（PATCH /status 対応）。
   *
   * @param active true = 有効、false = 無効
   */
  public void changeActive(boolean active) {
    this.isActive = active;
  }

  public UUID getId() {
    return id;
  }

  public String getName() {
    return name;
  }

  public ResourceCategory getCategory() {
    return category;
  }

  public Integer getCapacity() {
    return capacity;
  }

  public String getLocation() {
    return location;
  }

  public boolean isRequiresApproval() {
    return requiresApproval;
  }

  public boolean isActive() {
    return isActive;
  }

  public String getDescription() {
    return description;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }
}
