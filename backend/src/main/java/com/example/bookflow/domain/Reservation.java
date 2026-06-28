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
 * 予約エンティティ（V001 {@code reservations} テーブルと完全一致）。
 *
 * <p>カテゴリ 5 で予約申請（{@link #create}）・内容更新（{@link #update}）・キャンセル（{@link #cancel}）を追加。
 *
 * <p>{@code ddl-auto: validate} のため、カラム名・型・制約は V001 と整合していなければならない。
 */
@Entity
@Table(name = "reservations")
public class Reservation {

  @Id
  @Column(nullable = false)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "resource_id", nullable = false)
  private Resource resource;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "requester_id", nullable = false)
  private User requester;

  @Column(name = "start_at", nullable = false)
  private LocalDateTime startAt;

  @Column(name = "end_at", nullable = false)
  private LocalDateTime endAt;

  @Column(nullable = false, length = 255)
  private String purpose;

  @Column(name = "attendees_count")
  private Integer attendeesCount;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private ReservationStatus status;

  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  /** JPA 用デフォルトコンストラクタ。 */
  protected Reservation() {}

  /**
   * 予約を新規作成する。ID・登録日時はアプリ側で採番する。
   *
   * @param resource 対象リソース
   * @param requester 申請ユーザー
   * @param startAt 開始日時
   * @param endAt 終了日時
   * @param purpose 利用目的
   * @param attendeesCount 参加人数（null 可）
   * @param status 初期ステータス（{@code requires_approval} に応じ Service が決定）
   * @return 新規 Reservation インスタンス
   */
  public static Reservation create(
      Resource resource,
      User requester,
      LocalDateTime startAt,
      LocalDateTime endAt,
      String purpose,
      Integer attendeesCount,
      ReservationStatus status) {
    Reservation r = new Reservation();
    r.id = UUID.randomUUID();
    r.resource = resource;
    r.requester = requester;
    r.startAt = startAt;
    r.endAt = endAt;
    r.purpose = purpose;
    r.attendeesCount = attendeesCount;
    r.status = status;
    LocalDateTime now = LocalDateTime.now();
    r.createdAt = now;
    r.updatedAt = now;
    return r;
  }

  /**
   * 予約内容を更新する（PUT 対応・{@code PENDING} 状態のみ許可）。
   *
   * @param startAt 新しい開始日時
   * @param endAt 新しい終了日時
   * @param purpose 新しい利用目的
   * @param attendeesCount 新しい参加人数（null 可）
   */
  public void update(
      LocalDateTime startAt, LocalDateTime endAt, String purpose, Integer attendeesCount) {
    this.startAt = startAt;
    this.endAt = endAt;
    this.purpose = purpose;
    this.attendeesCount = attendeesCount;
    this.updatedAt = LocalDateTime.now();
  }

  /**
   * 予約をキャンセルする。
   *
   * <p>ステータスを {@link ReservationStatus#CANCELLED} に変更する。 呼び出し前に Service 層でキャンセル可否（{@code
   * PENDING}/{@code APPROVED}）を確認すること。
   */
  public void cancel() {
    this.status = ReservationStatus.CANCELLED;
    this.updatedAt = LocalDateTime.now();
  }

  /**
   * 予約を承認済みにする（カテゴリ 6 承認ワークフロー用）。
   *
   * <p>承認者が {@code POST /api/approvals/{stepId}/approve} を実行した際に呼ばれる。 呼び出し前に Service
   * 層で重複再チェックを実施すること。
   */
  public void markApproved() {
    this.status = ReservationStatus.APPROVED;
    this.updatedAt = LocalDateTime.now();
  }

  /**
   * 予約を却下済みにする（カテゴリ 6 承認ワークフロー用）。
   *
   * <p>承認者が {@code POST /api/approvals/{stepId}/reject} を実行した際に呼ばれる。
   */
  public void markRejected() {
    this.status = ReservationStatus.REJECTED;
    this.updatedAt = LocalDateTime.now();
  }

  public UUID getId() {
    return id;
  }

  public Resource getResource() {
    return resource;
  }

  public User getRequester() {
    return requester;
  }

  public LocalDateTime getStartAt() {
    return startAt;
  }

  public LocalDateTime getEndAt() {
    return endAt;
  }

  public String getPurpose() {
    return purpose;
  }

  public Integer getAttendeesCount() {
    return attendeesCount;
  }

  public ReservationStatus getStatus() {
    return status;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public LocalDateTime getUpdatedAt() {
    return updatedAt;
  }
}
