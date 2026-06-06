package com.example.bookflow.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.UUID;

/**
 * 部署エンティティ（最小実装・V001 {@code departments} テーブルと一致）。
 *
 * <p>カテゴリ3では {@link User} の JOIN 先として参照のみ使用する。 正式な DepartmentRepository・管理 API はカテゴリ 7 で実装する。
 */
@Entity
@Table(name = "departments")
public class Department {

  @Id
  @Column(nullable = false)
  private UUID id;

  @Column(nullable = false, length = 100)
  private String name;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "parent_id")
  private Department parent;

  /** JPA 用デフォルトコンストラクタ。 */
  protected Department() {}

  public UUID getId() {
    return id;
  }

  public String getName() {
    return name;
  }

  public Department getParent() {
    return parent;
  }
}
