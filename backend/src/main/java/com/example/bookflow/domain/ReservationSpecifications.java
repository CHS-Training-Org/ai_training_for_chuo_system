package com.example.bookflow.domain;

import jakarta.persistence.criteria.JoinType;
import java.time.LocalDateTime;
import java.util.Collection;
import org.springframework.data.jpa.domain.Specification;

/**
 * 予約の検索条件を {@link Specification} として部品化するユーティリティ。
 *
 * <p>{@link ReservationRepository#findAll(Specification, org.springframework.data.domain.Sort)}
 * に渡す条件を、{@link Specification#allOf} で AND 結合して使う。CSV 帳票出力（期間・ステータス）の組合せごとにクエリを増やさずに済む。
 */
public final class ReservationSpecifications {

  private ReservationSpecifications() {}

  /**
   * 開始日時（{@code start_at}）が指定日時以上の予約に限定する。
   *
   * @param from 期間の開始日時（null 不可・この日時を含む）
   * @return 条件
   */
  public static Specification<Reservation> startAtFrom(LocalDateTime from) {
    return (root, query, cb) -> cb.greaterThanOrEqualTo(root.<LocalDateTime>get("startAt"), from);
  }

  /**
   * 開始日時（{@code start_at}）が指定日時より前の予約に限定する。
   *
   * @param to 期間の終了日時（null 不可・この日時を含まない）
   * @return 条件
   */
  public static Specification<Reservation> startAtBefore(LocalDateTime to) {
    return (root, query, cb) -> cb.lessThan(root.<LocalDateTime>get("startAt"), to);
  }

  /**
   * 指定ステータスのいずれかに一致する予約に限定する。
   *
   * @param statuses ステータス群（null・空不可。呼び出し側で条件なしを判断する）
   * @return 条件
   */
  public static Specification<Reservation> statusIn(Collection<ReservationStatus> statuses) {
    return (root, query, cb) -> root.get("status").in(statuses);
  }

  /**
   * {@code resource} と {@code requester} を JOIN FETCH する（CSV 生成時の N+1 回避）。
   *
   * <p>ページングしない全件取得でのみ使う。件数クエリ（結果型が {@code Long}）には JOIN FETCH を付けない。
   *
   * @return 条件（絞り込みはせず、JOIN FETCH のみ行う）
   */
  public static Specification<Reservation> fetchResourceAndRequester() {
    return (root, query, cb) -> {
      if (!Long.class.equals(query.getResultType())) {
        root.fetch("resource", JoinType.INNER);
        root.fetch("requester", JoinType.INNER);
      }
      return cb.conjunction();
    };
  }
}
