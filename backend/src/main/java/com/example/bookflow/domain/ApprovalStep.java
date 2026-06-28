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
 * 承認ステップエンティティ（V001 {@code approval_steps} テーブルと完全一致）。
 *
 * <p>ベース実装は 1 段階承認（{@code step_order = 1}）。多段階承認は拡張課題。
 *
 * <p>カテゴリ 6 で実装。{@link Reservation} の {@code requires_approval = true} 申請時に {@link
 * #create(Reservation, User)} で生成される。
 */
@Entity
@Table(name = "approval_steps")
public class ApprovalStep {

  @Id
  @Column(nullable = false)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "reservation_id", nullable = false)
  private Reservation reservation;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "approver_id", nullable = false)
  private User approver;

  @Column(name = "step_order", nullable = false)
  private Integer stepOrder;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private ApprovalStatus status;

  @Column(columnDefinition = "TEXT")
  private String comment;

  @Column(name = "decided_at")
  private LocalDateTime decidedAt;

  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  /** JPA 用デフォルトコンストラクタ。 */
  protected ApprovalStep() {}

  /**
   * 承認ステップを新規作成する（1 段階目・PENDING 状態）。
   *
   * <p>ベース実装は {@code step_order = 1} 固定。多段階承認は拡張課題。
   *
   * @param reservation 対象予約
   * @param approver 承認者ユーザー
   * @return 新規 ApprovalStep インスタンス
   */
  public static ApprovalStep create(Reservation reservation, User approver) {
    ApprovalStep step = new ApprovalStep();
    step.id = UUID.randomUUID();
    step.reservation = reservation;
    step.approver = approver;
    step.stepOrder = 1;
    step.status = ApprovalStatus.PENDING;
    step.comment = null;
    step.decidedAt = null;
    step.createdAt = LocalDateTime.now();
    return step;
  }

  /**
   * 承認操作を行う（{@code PENDING → APPROVED}）。
   *
   * <p>呼び出し前に Service 層で PENDING 状態確認・重複再チェック・所有権確認を行うこと。
   *
   * @param comment 承認コメント（任意・null 可）
   */
  public void approve(String comment) {
    this.status = ApprovalStatus.APPROVED;
    this.comment = comment;
    this.decidedAt = LocalDateTime.now();
  }

  /**
   * 却下操作を行う（{@code PENDING → REJECTED}）。
   *
   * <p>呼び出し前に Service 層でコメント必須チェック（null/blank → 400）・PENDING 状態確認・所有権確認を行うこと。
   *
   * @param comment 却下理由コメント（必須）
   */
  public void reject(String comment) {
    this.status = ApprovalStatus.REJECTED;
    this.comment = comment;
    this.decidedAt = LocalDateTime.now();
  }

  public UUID getId() {
    return id;
  }

  public Reservation getReservation() {
    return reservation;
  }

  public User getApprover() {
    return approver;
  }

  public Integer getStepOrder() {
    return stepOrder;
  }

  public ApprovalStatus getStatus() {
    return status;
  }

  public String getComment() {
    return comment;
  }

  public LocalDateTime getDecidedAt() {
    return decidedAt;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }
}
