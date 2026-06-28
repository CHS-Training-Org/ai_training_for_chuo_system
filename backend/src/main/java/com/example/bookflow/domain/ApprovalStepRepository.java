package com.example.bookflow.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 承認ステップリポジトリ。
 *
 * <p>{@code GET /api/approvals/pending} はページネーションなし（{@code api-spec.md} L94 が権威）のため 全メソッドは {@link
 * List} を返す。
 *
 * <p>{@code open-in-view: false} のため、{@link ApprovalStep} の関連エンティティ （{@link Reservation}・{@link
 * Resource}・{@link User}）は JOIN FETCH で一括取得する。
 */
public interface ApprovalStepRepository extends JpaRepository<ApprovalStep, UUID> {

  /**
   * 指定承認者の PENDING ステップ一覧を返す（APPROVER 向け・全関連 JOIN FETCH）。
   *
   * <p>{@code open-in-view: false} 対応のため、step → reservation → resource / requester を一括 FETCH。
   *
   * @param approverId 承認者 ID
   * @return PENDING 承認ステップリスト
   */
  @Query(
      "SELECT s FROM ApprovalStep s"
          + " JOIN FETCH s.reservation r"
          + " JOIN FETCH r.resource"
          + " JOIN FETCH r.requester"
          + " WHERE s.approver.id = :approverId AND s.status = 'PENDING'"
          + " AND r.status = 'PENDING'")
  List<ApprovalStep> findPendingByApprover(@Param("approverId") UUID approverId);

  /**
   * 全 PENDING ステップ一覧を返す（ADMIN 向け・全関連 JOIN FETCH）。
   *
   * @return 全 PENDING 承認ステップリスト
   */
  @Query(
      "SELECT s FROM ApprovalStep s"
          + " JOIN FETCH s.reservation r"
          + " JOIN FETCH r.resource"
          + " JOIN FETCH r.requester"
          + " WHERE s.status = 'PENDING'"
          + " AND r.status = 'PENDING'")
  List<ApprovalStep> findAllPending();

  /**
   * ID 指定で承認ステップを取得する（全関連 JOIN FETCH 付き・approve/reject 操作用）。
   *
   * <p>LAZY 関連（reservation / approver）を操作内で参照するため、JOIN FETCH で一括取得する。
   *
   * @param id 承認ステップ ID
   * @return 承認ステップ（Optional）
   */
  @Query(
      "SELECT s FROM ApprovalStep s"
          + " JOIN FETCH s.reservation r"
          + " JOIN FETCH r.resource"
          + " JOIN FETCH r.requester"
          + " JOIN FETCH s.approver"
          + " WHERE s.id = :id")
  Optional<ApprovalStep> findByIdFetch(@Param("id") UUID id);
}
