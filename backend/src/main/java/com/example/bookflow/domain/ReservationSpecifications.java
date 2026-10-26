package com.example.bookflow.domain;

import java.time.LocalDateTime;
import java.util.Collection;
import org.springframework.data.jpa.domain.Specification;

/**
 * 予約の検索条件（{@link Specification}）を提供するユーティリティ。
 *
 * <p>帳票出力（CSV）が期間とステータスの任意の組み合わせで絞り込むために使う。条件を指定しない（{@code null} または空）場合は、常に真の
 * 述語を返して条件なしとして扱う。{@code Specification} 自体に {@code null} を返す書き方は、Spring Data JPA の版によって合成時の扱いが
 * 異なるため使わない。
 */
public final class ReservationSpecifications {

  private ReservationSpecifications() {}

  /**
   * {@code resource} と {@code requester} を JOIN FETCH する（N+1 の回避）。
   *
   * <p>件数取得のクエリ（結果型が {@code Long}）では JOIN FETCH できないため、その場合は何もしない。
   *
   * @return JOIN FETCH 用の条件（述語は常に真）
   */
  public static Specification<Reservation> fetchResourceAndRequester() {
    return (root, query, cb) -> {
      if (query != null && !Long.class.equals(query.getResultType())) {
        root.fetch("resource");
        root.fetch("requester");
      }
      return cb.conjunction();
    };
  }

  /**
   * 開始日時が指定日時以上の予約に絞る。
   *
   * @param fromInclusive 下限（この日時を含む）。{@code null} なら条件なし
   * @return 検索条件
   */
  public static Specification<Reservation> startAtFrom(LocalDateTime fromInclusive) {
    return (root, query, cb) ->
        fromInclusive == null
            ? cb.conjunction()
            : cb.greaterThanOrEqualTo(root.<LocalDateTime>get("startAt"), fromInclusive);
  }

  /**
   * 開始日時が指定日時より前の予約に絞る。
   *
   * @param toExclusive 上限（この日時を含まない）。{@code null} なら条件なし
   * @return 検索条件
   */
  public static Specification<Reservation> startAtBefore(LocalDateTime toExclusive) {
    return (root, query, cb) ->
        toExclusive == null
            ? cb.conjunction()
            : cb.lessThan(root.<LocalDateTime>get("startAt"), toExclusive);
  }

  /**
   * ステータスが指定のいずれかに一致する予約に絞る。
   *
   * @param statuses 対象ステータス。{@code null} または空なら条件なし
   * @return 検索条件
   */
  public static Specification<Reservation> statusIn(Collection<ReservationStatus> statuses) {
    return (root, query, cb) ->
        statuses == null || statuses.isEmpty()
            ? cb.conjunction()
            : root.<ReservationStatus>get("status").in(statuses);
  }
}
