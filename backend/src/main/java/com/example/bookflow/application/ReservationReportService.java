package com.example.bookflow.application;

import com.example.bookflow.domain.Reservation;
import com.example.bookflow.domain.ReservationRepository;
import com.example.bookflow.domain.ReservationSpecifications;
import com.example.bookflow.domain.ReservationStatus;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 予約の帳票出力ユースケース Service（CSV 帳票出力、Issue #29）。
 *
 * <p>条件に合う予約を開始日時の昇順で全件取得し、{@link ReservationCsvWriter} で CSV にする。{@code open-in-view: false} のため、
 * JOIN FETCH した予約の取得と CSV 生成を読み取り専用トランザクション内で完結させる。
 */
@Service
@Transactional(readOnly = true)
public class ReservationReportService {

  private final ReservationRepository reservationRepository;

  public ReservationReportService(ReservationRepository reservationRepository) {
    this.reservationRepository = reservationRepository;
  }

  /**
   * 予約一覧を CSV のバイト列で返す。
   *
   * @param from 期間の開始日時（開始日時が {@code from} 以上）。{@code to} と同時に null か非 null
   * @param to 期間の終了日時（開始日時が {@code to} 未満）。{@code from} と同時に null か非 null
   * @param statuses ステータス群。null または空なら全ステータス
   * @return BOM・ヘッダ行を含む CSV のバイト列
   */
  public byte[] exportReservationsCsv(
      LocalDateTime from, LocalDateTime to, Collection<ReservationStatus> statuses) {
    List<Specification<Reservation>> conditions = new ArrayList<>();
    if (from != null && to != null) {
      conditions.add(ReservationSpecifications.startAtFrom(from));
      conditions.add(ReservationSpecifications.startAtBefore(to));
    }
    if (statuses != null && !statuses.isEmpty()) {
      conditions.add(ReservationSpecifications.statusIn(statuses));
    }
    conditions.add(ReservationSpecifications.fetchResourceAndRequester());

    List<Reservation> reservations =
        reservationRepository.findAll(
            Specification.allOf(conditions), Sort.by("startAt").ascending());
    return ReservationCsvWriter.write(reservations);
  }
}
