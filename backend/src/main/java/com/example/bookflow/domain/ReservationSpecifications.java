package com.example.bookflow.domain;

import jakarta.persistence.criteria.JoinType;
import java.time.LocalDateTime;
import java.util.Collection;
import org.springframework.data.jpa.domain.Specification;

/**
 * 予約の動的な検索条件を {@link Specification} として組み立てるファクトリ。
 *
 * <p>帳票出力（期間・ステータス）用の条件を個別に生成し、{@link #forReport} で AND 合成する。条件が増えても {@link ReservationRepository}
 * のメソッドは増えない。
 */
public final class ReservationSpecifications {

  private ReservationSpecifications() {}

  /**
   * 利用開始日時が指定日時以降。
   *
   * @param from 下端（含む）。null の場合は条件なし
   */
  public static Specification<Reservation> startAtFrom(LocalDateTime from) {
    return (root, query, cb) ->
        from == null ? cb.conjunction() : cb.greaterThanOrEqualTo(root.get("startAt"), from);
  }

  /**
   * 利用開始日時が指定日時より前。
   *
   * @param toExclusive 上端（含まない）。null の場合は条件なし
   */
  public static Specification<Reservation> startAtBefore(LocalDateTime toExclusive) {
    return (root, query, cb) ->
        toExclusive == null ? cb.conjunction() : cb.lessThan(root.get("startAt"), toExclusive);
  }

  /**
   * ステータスが指定のいずれかに一致。
   *
   * @param statuses ステータス群。null または空の場合は条件なし
   */
  public static Specification<Reservation> statusIn(Collection<ReservationStatus> statuses) {
    return (root, query, cb) ->
        statuses == null || statuses.isEmpty() ? cb.conjunction() : root.get("status").in(statuses);
  }

  /**
   * リソースと申請者を同時に取得する（N+1 回避）。件数取得クエリでは何もしない。
   *
   * <p>帳票は全件を一度に取得するため、ページング用の count クエリは発行されないが、将来 Pageable で使う場合に備えて結果型を確認する。
   */
  static Specification<Reservation> fetchAssociations() {
    return (root, query, cb) -> {
      Class<?> resultType = query.getResultType();
      if (resultType != Long.class && resultType != long.class) {
        root.fetch("resource", JoinType.INNER);
        root.fetch("requester", JoinType.INNER);
      }
      return cb.conjunction();
    };
  }

  /**
   * 帳票用の条件を AND で合成する。
   *
   * @param from 利用開始日時の下端（含む。null 可）
   * @param toExclusive 利用開始日時の上端（含まない。null 可）
   * @param statuses ステータス群（null または空なら全ステータス）
   */
  public static Specification<Reservation> forReport(
      LocalDateTime from, LocalDateTime toExclusive, Collection<ReservationStatus> statuses) {
    return fetchAssociations()
        .and(startAtFrom(from))
        .and(startAtBefore(toExclusive))
        .and(statusIn(statuses));
  }
}
