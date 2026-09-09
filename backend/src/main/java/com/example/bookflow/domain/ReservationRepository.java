package com.example.bookflow.domain;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 予約リポジトリ。
 *
 * <p>カテゴリ 4 で空き照会・リソース一覧の重複フィルタ用メソッドを定義。 カテゴリ 5 で予約申請・一覧・キャンセル等のメソッドを追加。
 */
public interface ReservationRepository extends JpaRepository<Reservation, UUID> {

  // ---------------------------------------------------------------------------
  // カテゴリ 4（空き照会・リソース一覧フィルタ）
  // ---------------------------------------------------------------------------

  /**
   * 指定リソースの指定ステータスの予約一覧を返す（空き照会用）。
   *
   * <p>時間帯の重複判定は {@link com.example.bookflow.application.ResourceService} の Java コードで行う。
   *
   * @param resourceId リソース ID
   * @param statuses フィルタするステータス群
   * @return 予約リスト
   */
  List<Reservation> findByResource_IdAndStatusIn(
      UUID resourceId, Collection<ReservationStatus> statuses);

  /**
   * 複数リソースの指定ステータスの予約一覧を返す（一覧フィルタ用）。
   *
   * <p>{@code GET /api/resources?from=&to=} での空きリソース絞り込みに使用する。
   *
   * @param resourceIds リソース ID 群
   * @param statuses フィルタするステータス群
   * @return 予約リスト
   */
  List<Reservation> findByResource_IdInAndStatusIn(
      Collection<UUID> resourceIds, Collection<ReservationStatus> statuses);

  // ---------------------------------------------------------------------------
  // カテゴリ 5（予約一覧）
  // ---------------------------------------------------------------------------

  /**
   * 指定申請者の全予約をページネーションで返す（N+1 を避けるため resource・requester を JOIN FETCH）。
   *
   * @param requesterId 申請者 ID
   * @param pageable ページネーション
   * @return 予約ページ
   */
  @Query(
      value =
          "SELECT r FROM Reservation r JOIN FETCH r.resource JOIN FETCH r.requester"
              + " WHERE r.requester.id = :requesterId",
      countQuery = "SELECT count(r) FROM Reservation r WHERE r.requester.id = :requesterId")
  Page<Reservation> findByRequesterIdFetch(
      @Param("requesterId") UUID requesterId, Pageable pageable);

  /**
   * 指定申請者の指定ステータス予約をページネーションで返す。
   *
   * @param requesterId 申請者 ID
   * @param statuses フィルタするステータス群
   * @param pageable ページネーション
   * @return 予約ページ
   */
  @Query(
      value =
          "SELECT r FROM Reservation r JOIN FETCH r.resource JOIN FETCH r.requester"
              + " WHERE r.requester.id = :requesterId AND r.status IN :statuses",
      countQuery =
          "SELECT count(r) FROM Reservation r"
              + " WHERE r.requester.id = :requesterId AND r.status IN :statuses")
  Page<Reservation> findByRequesterIdAndStatusInFetch(
      @Param("requesterId") UUID requesterId,
      @Param("statuses") Collection<ReservationStatus> statuses,
      Pageable pageable);

  /**
   * 全予約をページネーションで返す（ADMIN 用・JOIN FETCH）。
   *
   * @param pageable ページネーション
   * @return 予約ページ
   */
  @Query(
      value = "SELECT r FROM Reservation r JOIN FETCH r.resource JOIN FETCH r.requester",
      countQuery = "SELECT count(r) FROM Reservation r")
  Page<Reservation> findAllFetch(Pageable pageable);

  /**
   * 全予約の指定ステータスをページネーションで返す（ADMIN + status フィルタ用）。
   *
   * @param statuses フィルタするステータス群
   * @param pageable ページネーション
   * @return 予約ページ
   */
  @Query(
      value =
          "SELECT r FROM Reservation r JOIN FETCH r.resource JOIN FETCH r.requester"
              + " WHERE r.status IN :statuses",
      countQuery = "SELECT count(r) FROM Reservation r WHERE r.status IN :statuses")
  Page<Reservation> findByStatusInFetch(
      @Param("statuses") Collection<ReservationStatus> statuses, Pageable pageable);

  // ---------------------------------------------------------------------------
  // カテゴリ 7（帳票出力・期間フィルタ）
  // ---------------------------------------------------------------------------

  /**
   * 指定期間と重なる予約をページネーションで返す（帳票出力用）。
   *
   * <p>期間の重複判定は {@code r.startAt < :to AND r.endAt > :from}（{@link
   * com.example.bookflow.application.ResourceService#overlaps} と同じ考え方）。呼び出し元は {@code
   * Pageable.unpaged()} を渡し、{@code Page#getContent()} で一括取得する想定。
   *
   * @param from 対象期間の開始日時
   * @param to 対象期間の終了日時
   * @param pageable ページネーション（帳票出力では {@code Pageable.unpaged()} を渡す）
   * @return 予約ページ（{@code startAt} 昇順）
   */
  @Query(
      value =
          "SELECT r FROM Reservation r JOIN FETCH r.resource JOIN FETCH r.requester"
              + " WHERE r.startAt < :to AND r.endAt > :from"
              + " ORDER BY r.startAt ASC",
      countQuery = "SELECT count(r) FROM Reservation r WHERE r.startAt < :to AND r.endAt > :from")
  Page<Reservation> findByPeriodFetch(
      @Param("from") LocalDateTime from, @Param("to") LocalDateTime to, Pageable pageable);

  /**
   * 指定期間と重なり、かつ指定ステータスの予約をページネーションで返す（帳票出力用）。
   *
   * @param from 対象期間の開始日時
   * @param to 対象期間の終了日時
   * @param statuses フィルタするステータス群
   * @param pageable ページネーション（帳票出力では {@code Pageable.unpaged()} を渡す）
   * @return 予約ページ（{@code startAt} 昇順）
   */
  @Query(
      value =
          "SELECT r FROM Reservation r JOIN FETCH r.resource JOIN FETCH r.requester"
              + " WHERE r.startAt < :to AND r.endAt > :from AND r.status IN :statuses"
              + " ORDER BY r.startAt ASC",
      countQuery =
          "SELECT count(r) FROM Reservation r"
              + " WHERE r.startAt < :to AND r.endAt > :from AND r.status IN :statuses")
  Page<Reservation> findByPeriodAndStatusInFetch(
      @Param("from") LocalDateTime from,
      @Param("to") LocalDateTime to,
      @Param("statuses") Collection<ReservationStatus> statuses,
      Pageable pageable);
}
