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
  // resourceName・period フィルタ（Issue #24、大文字小文字非依存の部分一致・半開区間の重複判定）
  // ---------------------------------------------------------------------------

  /**
   * resourceName 一致条件（大文字小文字非依存の部分一致）の共通 JPQL 断片。
   *
   * <p>{@code resourceName} は呼び出し元（{@link com.example.bookflow.application.ReservationService}）で
   * trim・{@code !}/{@code %}/{@code _} のエスケープ済みであることを前提とする。ESCAPE 文字に {@code \} ではなく {@code !}
   * を使うのは、Java 文字列リテラルと JPQL の二重エスケープを避けるため（{@link ResourceRepository} と同じ方針）。
   */
  String RESOURCE_NAME_MATCH =
      "LOWER(r.resource.name) LIKE LOWER(CONCAT(CONCAT('%', :resourceName), '%')) ESCAPE '!'";

  /**
   * 予約期間の重複条件（半開区間 {@code [startAt, endAt)}）の共通 JPQL 断片。
   *
   * <p>{@code checkConflict}/{@code ResourceService#overlaps} と同じ意味論（境界が一致するだけの隣接は重複としない）。
   */
  String PERIOD_MATCH = "r.startAt < :to AND r.endAt > :from";

  /** resourceName で絞り込んだ全予約をページネーションで返す（ADMIN・status 未指定）。 */
  @Query(
      value =
          "SELECT r FROM Reservation r JOIN FETCH r.resource JOIN FETCH r.requester WHERE "
              + RESOURCE_NAME_MATCH,
      countQuery = "SELECT count(r) FROM Reservation r WHERE " + RESOURCE_NAME_MATCH)
  Page<Reservation> findByResourceNameFetch(
      @Param("resourceName") String resourceName, Pageable pageable);

  /** 期間で絞り込んだ全予約をページネーションで返す（ADMIN・status 未指定）。 */
  @Query(
      value =
          "SELECT r FROM Reservation r JOIN FETCH r.resource JOIN FETCH r.requester WHERE "
              + PERIOD_MATCH,
      countQuery = "SELECT count(r) FROM Reservation r WHERE " + PERIOD_MATCH)
  Page<Reservation> findByPeriodFetch(
      @Param("from") LocalDateTime from, @Param("to") LocalDateTime to, Pageable pageable);

  /** resourceName・期間で絞り込んだ全予約をページネーションで返す（ADMIN・status 未指定）。 */
  @Query(
      value =
          "SELECT r FROM Reservation r JOIN FETCH r.resource JOIN FETCH r.requester WHERE "
              + RESOURCE_NAME_MATCH
              + " AND "
              + PERIOD_MATCH,
      countQuery =
          "SELECT count(r) FROM Reservation r WHERE "
              + RESOURCE_NAME_MATCH
              + " AND "
              + PERIOD_MATCH)
  Page<Reservation> findByResourceNameAndPeriodFetch(
      @Param("resourceName") String resourceName,
      @Param("from") LocalDateTime from,
      @Param("to") LocalDateTime to,
      Pageable pageable);

  /** resourceName・status で絞り込んだ全予約をページネーションで返す（ADMIN）。 */
  @Query(
      value =
          "SELECT r FROM Reservation r JOIN FETCH r.resource JOIN FETCH r.requester WHERE "
              + RESOURCE_NAME_MATCH
              + " AND r.status IN :statuses",
      countQuery =
          "SELECT count(r) FROM Reservation r WHERE "
              + RESOURCE_NAME_MATCH
              + " AND r.status IN :statuses")
  Page<Reservation> findByResourceNameAndStatusInFetch(
      @Param("resourceName") String resourceName,
      @Param("statuses") Collection<ReservationStatus> statuses,
      Pageable pageable);

  /** 期間・status で絞り込んだ全予約をページネーションで返す（ADMIN）。 */
  @Query(
      value =
          "SELECT r FROM Reservation r JOIN FETCH r.resource JOIN FETCH r.requester WHERE "
              + PERIOD_MATCH
              + " AND r.status IN :statuses",
      countQuery =
          "SELECT count(r) FROM Reservation r WHERE " + PERIOD_MATCH + " AND r.status IN :statuses")
  Page<Reservation> findByPeriodAndStatusInFetch(
      @Param("from") LocalDateTime from,
      @Param("to") LocalDateTime to,
      @Param("statuses") Collection<ReservationStatus> statuses,
      Pageable pageable);

  /** resourceName・期間・status で絞り込んだ全予約をページネーションで返す（ADMIN）。 */
  @Query(
      value =
          "SELECT r FROM Reservation r JOIN FETCH r.resource JOIN FETCH r.requester WHERE "
              + RESOURCE_NAME_MATCH
              + " AND "
              + PERIOD_MATCH
              + " AND r.status IN :statuses",
      countQuery =
          "SELECT count(r) FROM Reservation r WHERE "
              + RESOURCE_NAME_MATCH
              + " AND "
              + PERIOD_MATCH
              + " AND r.status IN :statuses")
  Page<Reservation> findByResourceNameAndPeriodAndStatusInFetch(
      @Param("resourceName") String resourceName,
      @Param("from") LocalDateTime from,
      @Param("to") LocalDateTime to,
      @Param("statuses") Collection<ReservationStatus> statuses,
      Pageable pageable);

  /** 指定申請者・resourceName で絞り込んだ予約をページネーションで返す（非 ADMIN・status 未指定）。 */
  @Query(
      value =
          "SELECT r FROM Reservation r JOIN FETCH r.resource JOIN FETCH r.requester"
              + " WHERE r.requester.id = :requesterId AND "
              + RESOURCE_NAME_MATCH,
      countQuery =
          "SELECT count(r) FROM Reservation r WHERE r.requester.id = :requesterId AND "
              + RESOURCE_NAME_MATCH)
  Page<Reservation> findByRequesterIdAndResourceNameFetch(
      @Param("requesterId") UUID requesterId,
      @Param("resourceName") String resourceName,
      Pageable pageable);

  /** 指定申請者・期間で絞り込んだ予約をページネーションで返す（非 ADMIN・status 未指定）。 */
  @Query(
      value =
          "SELECT r FROM Reservation r JOIN FETCH r.resource JOIN FETCH r.requester"
              + " WHERE r.requester.id = :requesterId AND "
              + PERIOD_MATCH,
      countQuery =
          "SELECT count(r) FROM Reservation r WHERE r.requester.id = :requesterId AND "
              + PERIOD_MATCH)
  Page<Reservation> findByRequesterIdAndPeriodFetch(
      @Param("requesterId") UUID requesterId,
      @Param("from") LocalDateTime from,
      @Param("to") LocalDateTime to,
      Pageable pageable);

  /** 指定申請者・resourceName・期間で絞り込んだ予約をページネーションで返す（非 ADMIN・status 未指定）。 */
  @Query(
      value =
          "SELECT r FROM Reservation r JOIN FETCH r.resource JOIN FETCH r.requester"
              + " WHERE r.requester.id = :requesterId AND "
              + RESOURCE_NAME_MATCH
              + " AND "
              + PERIOD_MATCH,
      countQuery =
          "SELECT count(r) FROM Reservation r WHERE r.requester.id = :requesterId AND "
              + RESOURCE_NAME_MATCH
              + " AND "
              + PERIOD_MATCH)
  Page<Reservation> findByRequesterIdAndResourceNameAndPeriodFetch(
      @Param("requesterId") UUID requesterId,
      @Param("resourceName") String resourceName,
      @Param("from") LocalDateTime from,
      @Param("to") LocalDateTime to,
      Pageable pageable);

  /** 指定申請者・resourceName・status で絞り込んだ予約をページネーションで返す（非 ADMIN）。 */
  @Query(
      value =
          "SELECT r FROM Reservation r JOIN FETCH r.resource JOIN FETCH r.requester"
              + " WHERE r.requester.id = :requesterId AND "
              + RESOURCE_NAME_MATCH
              + " AND r.status IN :statuses",
      countQuery =
          "SELECT count(r) FROM Reservation r WHERE r.requester.id = :requesterId AND "
              + RESOURCE_NAME_MATCH
              + " AND r.status IN :statuses")
  Page<Reservation> findByRequesterIdAndResourceNameAndStatusInFetch(
      @Param("requesterId") UUID requesterId,
      @Param("resourceName") String resourceName,
      @Param("statuses") Collection<ReservationStatus> statuses,
      Pageable pageable);

  /** 指定申請者・期間・status で絞り込んだ予約をページネーションで返す（非 ADMIN）。 */
  @Query(
      value =
          "SELECT r FROM Reservation r JOIN FETCH r.resource JOIN FETCH r.requester"
              + " WHERE r.requester.id = :requesterId AND "
              + PERIOD_MATCH
              + " AND r.status IN :statuses",
      countQuery =
          "SELECT count(r) FROM Reservation r WHERE r.requester.id = :requesterId AND "
              + PERIOD_MATCH
              + " AND r.status IN :statuses")
  Page<Reservation> findByRequesterIdAndPeriodAndStatusInFetch(
      @Param("requesterId") UUID requesterId,
      @Param("from") LocalDateTime from,
      @Param("to") LocalDateTime to,
      @Param("statuses") Collection<ReservationStatus> statuses,
      Pageable pageable);

  /** 指定申請者・resourceName・期間・status すべてで絞り込んだ予約をページネーションで返す（非 ADMIN）。 */
  @Query(
      value =
          "SELECT r FROM Reservation r JOIN FETCH r.resource JOIN FETCH r.requester"
              + " WHERE r.requester.id = :requesterId AND "
              + RESOURCE_NAME_MATCH
              + " AND "
              + PERIOD_MATCH
              + " AND r.status IN :statuses",
      countQuery =
          "SELECT count(r) FROM Reservation r WHERE r.requester.id = :requesterId AND "
              + RESOURCE_NAME_MATCH
              + " AND "
              + PERIOD_MATCH
              + " AND r.status IN :statuses")
  Page<Reservation> findByRequesterIdAndResourceNameAndPeriodAndStatusInFetch(
      @Param("requesterId") UUID requesterId,
      @Param("resourceName") String resourceName,
      @Param("from") LocalDateTime from,
      @Param("to") LocalDateTime to,
      @Param("statuses") Collection<ReservationStatus> statuses,
      Pageable pageable);
}
