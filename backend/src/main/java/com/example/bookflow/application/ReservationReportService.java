package com.example.bookflow.application;

import com.example.bookflow.application.exception.ValidationException;
import com.example.bookflow.domain.Reservation;
import com.example.bookflow.domain.ReservationRepository;
import com.example.bookflow.domain.ReservationSpecifications;
import com.example.bookflow.domain.ReservationStatus;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 帳票出力用の予約取得 Service。
 *
 * <p>期間・ステータスの検証と検索条件の組み立て、予約の取得、{@link ReservationCsvRow} への詰め替えを担う。CSV の書式は知らない （presentation 層の
 * {@code ReservationCsvWriter} が担当）。
 *
 * <p>認可（ADMIN のみ）は Controller の {@code @PreAuthorize} が担い、この Service はロールを見ない。
 */
@Service
@Transactional(readOnly = true)
public class ReservationReportService {

  /** 並び順：開始日時の昇順、同じ開始日時なら予約 ID の昇順。 */
  private static final Sort ORDER = Sort.by(Sort.Order.asc("startAt"), Sort.Order.asc("id"));

  private final ReservationRepository reservationRepository;

  public ReservationReportService(ReservationRepository reservationRepository) {
    this.reservationRepository = reservationRepository;
  }

  /**
   * 開始日時が {@code [from 00:00, to の翌日 00:00)} にある予約を、CSV 行として返す。
   *
   * <p>{@code from} / {@code to} / {@code statuses} はいずれも {@code null} 可（{@code null}
   * または空は条件なし）。期間は予約の 開始日時で判定し、{@code to} の日を含む。
   *
   * @param from 期間の開始日（任意）
   * @param to 期間の終了日（任意。その日を含む）
   * @param statuses 対象ステータス（任意）
   * @return 開始日時・予約 ID の昇順に並んだ行
   * @throws ValidationException {@code from} と {@code to} が両方指定され、{@code from} が {@code to}
   *     より後のとき（400）
   */
  public List<ReservationCsvRow> findRows(
      LocalDate from, LocalDate to, Collection<ReservationStatus> statuses) {
    if (from != null && to != null && from.isAfter(to)) {
      throw new ValidationException("from は to 以前の日付を指定してください。");
    }

    LocalDateTime fromInclusive = from == null ? null : from.atStartOfDay();
    LocalDateTime toExclusive = to == null ? null : to.plusDays(1).atStartOfDay();

    Specification<Reservation> spec =
        Specification.allOf(
            ReservationSpecifications.fetchResourceAndRequester(),
            ReservationSpecifications.startAtFrom(fromInclusive),
            ReservationSpecifications.startAtBefore(toExclusive),
            ReservationSpecifications.statusIn(statuses));

    return reservationRepository.findAll(spec, ORDER).stream()
        .map(ReservationCsvRow::from)
        .toList();
  }
}
