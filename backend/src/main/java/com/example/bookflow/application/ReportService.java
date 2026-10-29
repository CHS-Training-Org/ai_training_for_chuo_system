package com.example.bookflow.application;

import com.example.bookflow.domain.Reservation;
import com.example.bookflow.domain.ReservationRepository;
import com.example.bookflow.domain.ReservationSpecifications;
import com.example.bookflow.domain.ReservationStatus;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 帳票出力のユースケース Service。
 *
 * <p>期間（日付）を利用開始日時の範囲に変換して予約を検索し、{@link ReservationCsvWriter} で CSV にする。 HTTP の知識（ヘッダ、ファイル名）は持たない。
 * 認可は Controller の {@code @PreAuthorize} が担う。
 */
@Service
@Transactional(readOnly = true)
public class ReportService {

  /** 出力順：開始日時の昇順、同値なら ID の昇順（出力を再現可能にする）。 */
  private static final Sort ORDER = Sort.by(Sort.Direction.ASC, "startAt", "id");

  private final ReservationRepository reservationRepository;

  public ReportService(ReservationRepository reservationRepository) {
    this.reservationRepository = reservationRepository;
  }

  /**
   * 予約一覧を CSV（BOM 付き UTF-8）で返す。
   *
   * @param from 期間の開始日（含む。null 可）。当日 0 時以降の予約が対象
   * @param to 期間の終了日（含む。null 可）。翌日 0 時より前の予約が対象
   * @param statuses ステータス群（null または空なら全ステータス）
   * @return CSV のバイト列
   */
  public byte[] exportReservationsCsv(
      LocalDate from, LocalDate to, Collection<ReservationStatus> statuses) {
    LocalDateTime fromAt = from == null ? null : from.atStartOfDay();
    LocalDateTime toExclusive = to == null ? null : to.plusDays(1).atStartOfDay();

    List<Reservation> reservations =
        reservationRepository.findAll(
            ReservationSpecifications.forReport(fromAt, toExclusive, statuses), ORDER);

    // LAZY 関連（resource・requester）はこのトランザクション内で読む
    List<ReservationCsvRow> rows = reservations.stream().map(ReportService::toRow).toList();
    return ReservationCsvWriter.write(rows);
  }

  private static ReservationCsvRow toRow(Reservation r) {
    return new ReservationCsvRow(
        r.getId(),
        r.getResource().getName(),
        r.getRequester().getName(),
        r.getStartAt(),
        r.getEndAt(),
        r.getPurpose(),
        r.getStatus());
  }
}
