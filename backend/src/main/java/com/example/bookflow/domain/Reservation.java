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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import org.hibernate.annotations.ColumnDefault;

/**
 * 予約エンティティ（V001 {@code reservations} テーブルと完全一致）。
 *
 * <p>カテゴリ 5 で予約申請（{@link #create}）・内容更新（{@link #update}）・キャンセル（{@link #cancel}）を追加。
 *
 * <p>繰り返し予約（recurring-reservation ユニット）で、V003 の {@code recurrence_type}・{@code
 * recurrence_until}・{@code series_id} を追加（{@link #joinSeries}）。
 *
 * <p>{@code ddl-auto: validate} のため、カラム名・型・制約は V001・V003 と整合していなければならない。
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

  // テストは H2 の create-drop（Flyway 無効）でテーブルを作る。生 SQL の INSERT が列を省略しても通るよう、
  // V003 の DEFAULT 'NONE' と同じ既定値を持たせる（本番の validate は既定値を検証しない）。
  @ColumnDefault("'NONE'")
  @Enumerated(EnumType.STRING)
  @Column(name = "recurrence_type", nullable = false, length = 10)
  private RecurrenceType recurrenceType = RecurrenceType.NONE;

  @Column(name = "recurrence_until")
  private LocalDate recurrenceUntil;

  @Column(name = "series_id")
  private UUID seriesId;

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
    r.recurrenceType = RecurrenceType.NONE;
    LocalDateTime now = LocalDateTime.now();
    r.createdAt = now;
    r.updatedAt = now;
    return r;
  }

  /**
   * 繰り返しの系列に所属させる（繰り返し予約の一括作成時のみ。{@link #create} の直後に 1 回だけ呼ぶ）。
   *
   * <p>{@link #create} の引数は Checkstyle の {@code ParameterNumber}（最大 7）に達しているため、系列の 3 項目は作成後に設定する。
   * 種別が {@code NONE} 以外のとき、{@code seriesId}・{@code until} は必ず非 null（V003 の CHECK 制約と整合）。
   *
   * @param seriesId 系列 ID（1 回の作成で 1 つ採番し、系列内の全予約で共有する）
   * @param type 繰り返しの種別（{@code WEEKLY} / {@code MONTHLY}）
   * @param until 繰り返しの終了日
   */
  public void joinSeries(UUID seriesId, RecurrenceType type, LocalDate until) {
    this.seriesId = seriesId;
    this.recurrenceType = type;
    this.recurrenceUntil = until;
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
   * 下書き（{@link ReservationStatus#DRAFT}）を正式申請する（reservation-draft ユニット）。
   *
   * <p>呼び出し前に Service 層で {@code status == DRAFT} であることを確認すること（{@link #cancel()}・{@link
   * #markApproved()} 等と同様、ステータスガードは Service 層の責務）。
   *
   * @param newStatus 遷移先ステータス（{@code resource.requires_approval} に応じて Service が決定した {@code PENDING}
   *     または {@code APPROVED}）
   */
  public void submit(ReservationStatus newStatus) {
    this.status = newStatus;
    this.updatedAt = LocalDateTime.now();
  }

  /**
   * 予約をキャンセルする。
   *
   * <p>ステータスを {@link ReservationStatus#CANCELLED} に変更する。 呼び出し前に Service 層でキャンセル可否（{@code
   * DRAFT}/{@code PENDING}/{@code APPROVED}）を確認すること。
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

  public RecurrenceType getRecurrenceType() {
    return recurrenceType;
  }

  public LocalDate getRecurrenceUntil() {
    return recurrenceUntil;
  }

  public UUID getSeriesId() {
    return seriesId;
  }
}
