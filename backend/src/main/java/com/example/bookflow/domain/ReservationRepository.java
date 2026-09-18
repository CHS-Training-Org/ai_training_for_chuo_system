package com.example.bookflow.domain;

import jakarta.persistence.QueryHint;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;
import org.hibernate.jpa.AvailableHints;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
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
  // 帳票出力（CSV）
  // ---------------------------------------------------------------------------

  /**
   * 帳票用の予約行をストリームで返す（ADMIN の CSV 出力専用・全ユーザー分）。
   *
   * <p>{@link ReservationCsvRow} への射影クエリのため {@code JOIN FETCH} は使えない（構文上）。ただし 1 本の SQL で
   * リソース名・申請者名まで含めて取得するため、そもそも N+1 は発生しない。
   *
   * <p>呼び出し側はトランザクション内で実行し、必ず {@code try-with-resources} で {@link Stream} を閉じること （JDBC カーソル・{@code
   * EntityManager} の解放のため）。
   *
   * <p>すべてのパラメータは非 null（呼び出し側が省略時の既定値に正規化済み）。期間判定は {@code start_at} が {@code [from,
   * to]}（両端を含む）に入るかで行う。
   *
   * @param from 期間開始（以上）
   * @param to 期間終了（以下）
   * @param statuses 対象ステータス群（空不可）
   * @return 帳票行のストリーム（{@code start_at} 昇順）
   */
  @Query(
      "SELECT new com.example.bookflow.domain.ReservationCsvRow("
          + "r.id, res.name, u.name, r.startAt, r.endAt, r.purpose, r.status)"
          + " FROM Reservation r JOIN r.resource res JOIN r.requester u"
          + " WHERE r.startAt >= :from AND r.startAt <= :to AND r.status IN :statuses"
          + " ORDER BY r.startAt ASC, r.id ASC")
  @QueryHints(@QueryHint(name = AvailableHints.HINT_FETCH_SIZE, value = "500"))
  Stream<ReservationCsvRow> streamCsvRowsForReport(
      @Param("from") LocalDateTime from,
      @Param("to") LocalDateTime to,
      @Param("statuses") Collection<ReservationStatus> statuses);
}
