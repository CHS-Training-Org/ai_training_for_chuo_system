package com.example.bookflow.application;

import com.example.bookflow.application.csv.CsvWriter;
import com.example.bookflow.domain.Reservation;
import com.example.bookflow.domain.ReservationRepository;
import com.example.bookflow.domain.ReservationStatus;
import com.example.bookflow.presentation.dto.ReportCondition;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 予約帳票（CSV）のユースケース Service（api-spec.md §帳票出力 準拠）。
 *
 * <p>条件に合う予約を全件取得し、7 列の CSV に整形して返す。認可（ADMIN のみ）は Controller の {@code @PreAuthorize} が担当する。
 */
@Service
public class ReservationReportService {

  /** CSV のヘッダ行（左から 7 列）。 */
  static final List<String> HEADER = List.of("予約ID", "リソース名", "申請者名", "開始日時", "終了日時", "目的", "承認状態");

  /** {@code status} 未指定時の対象。画面の予約一覧（「すべて」タブ）と同じく {@code DRAFT} を含めない。 */
  static final List<ReservationStatus> DEFAULT_STATUSES =
      List.of(
          ReservationStatus.PENDING,
          ReservationStatus.APPROVED,
          ReservationStatus.REJECTED,
          ReservationStatus.CANCELLED);

  private static final DateTimeFormatter DATE_TIME_FORMAT =
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

  private final ReservationRepository reservationRepository;

  public ReservationReportService(ReservationRepository reservationRepository) {
    this.reservationRepository = reservationRepository;
  }

  /**
   * 条件に合う予約を CSV（BOM 付き UTF-8）にして返す。
   *
   * <p>{@code open-in-view: false} かつ関連が LAZY のため、取得（JOIN FETCH）から整形までをトランザクション内で行う。
   *
   * @param condition 絞り込み条件（期間は同時指定済みの前提）
   * @return CSV のバイト列。該当が 0 件のときはヘッダ行のみ
   */
  @Transactional(readOnly = true)
  public byte[] exportCsv(ReportCondition condition) {
    List<ReservationStatus> statuses =
        condition.statuses() == null || condition.statuses().isEmpty()
            ? DEFAULT_STATUSES
            : condition.statuses();

    List<Reservation> reservations =
        condition.hasPeriod()
            ? reservationRepository.findAllForReportByPeriodAndStatusIn(
                condition.from(), condition.to(), statuses)
            : reservationRepository.findAllForReportByStatusIn(statuses);

    List<List<String>> rows = reservations.stream().map(this::toRow).toList();
    return CsvWriter.toBytes(HEADER, rows);
  }

  private List<String> toRow(Reservation reservation) {
    return List.of(
        reservation.getId().toString(),
        reservation.getResource().getName(),
        reservation.getRequester().getName(),
        reservation.getStartAt().format(DATE_TIME_FORMAT),
        reservation.getEndAt().format(DATE_TIME_FORMAT),
        reservation.getPurpose(),
        statusLabel(reservation.getStatus()));
  }

  /** 承認状態の日本語ラベル（frontend の {@code RESERVATION_STATUS_LABELS} と同じ表記）。 */
  private static String statusLabel(ReservationStatus status) {
    return switch (status) {
      case DRAFT -> "下書き";
      case PENDING -> "承認待ち";
      case APPROVED -> "承認済み";
      case REJECTED -> "却下";
      case CANCELLED -> "キャンセル済み";
    };
  }
}
