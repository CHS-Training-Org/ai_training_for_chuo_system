package com.example.bookflow.application;

import com.example.bookflow.domain.Reservation;
import com.example.bookflow.domain.ReservationRepository;
import com.example.bookflow.domain.ReservationStatus;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 予約データの CSV 帳票出力ユースケース Service（{@code csv-export.md} RPT-01〜03 準拠）。
 *
 * <p>{@link ReservationService} とは独立したサービスとする。CSV 出力は ADMIN 限定エンドポイントからのみ呼ばれ、所有権チェックが不要な点が {@link
 * ReservationService} の各ユースケースと異なる（{@code
 * Docs/spec/aidlc-docs/inception/application-design/services.md} 参照）。
 */
@Service
@Transactional(readOnly = true)
public class ReportService {

  /** CSV ヘッダ行（列順は RPT-02 準拠）。 */
  private static final String CSV_HEADER = "予約ID,リソース名,申請者名,開始日時,終了日時,目的,承認状態";

  /** CSV 内の日時フォーマット（一覧画面の表示体裁に合わせる）。 */
  private static final DateTimeFormatter DATE_TIME_FORMATTER =
      DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm");

  /** UTF-8 BOM（Excel での文字化けを防ぐため CSV 本体の先頭に付与する）。 */
  private static final byte[] UTF8_BOM = {(byte) 0xEF, (byte) 0xBB, (byte) 0xBF};

  /** {@link ReservationStatus} の日本語表示ラベル（{@code frontend/src/lib/labels.ts} と値を一致させること）。 */
  private static final Map<ReservationStatus, String> STATUS_LABELS =
      Map.of(
          ReservationStatus.DRAFT, "ドラフト",
          ReservationStatus.PENDING, "承認待ち",
          ReservationStatus.APPROVED, "承認済み",
          ReservationStatus.REJECTED, "却下",
          ReservationStatus.CANCELLED, "キャンセル済み");

  private final ReservationRepository reservationRepository;

  public ReportService(ReservationRepository reservationRepository) {
    this.reservationRepository = reservationRepository;
  }

  /**
   * 予約一覧を CSV（UTF-8 BOM 付き）バイト列として生成する。
   *
   * <p>{@code from}/{@code to} は両方 {@code null}（全期間）または両方非 {@code null} であること（呼び出し元でバリデーション済み）。
   * {@code statuses} が空の場合は全ステータスを対象とする。
   *
   * @param statuses ステータスフィルタ（空の場合は全ステータス）
   * @param from 対象期間の開始日時（{@code null} の場合は全期間）
   * @param to 対象期間の終了日時（{@code null} の場合は全期間）
   * @return CSV バイト列（UTF-8 BOM 付き）
   */
  public byte[] generateReservationsCsv(
      Collection<ReservationStatus> statuses, LocalDateTime from, LocalDateTime to) {
    List<Reservation> reservations = findReservations(statuses, from, to);
    String csv = buildCsv(reservations);

    byte[] csvBytes = csv.getBytes(StandardCharsets.UTF_8);
    byte[] result = new byte[UTF8_BOM.length + csvBytes.length];
    System.arraycopy(UTF8_BOM, 0, result, 0, UTF8_BOM.length);
    System.arraycopy(csvBytes, 0, result, UTF8_BOM.length, csvBytes.length);
    return result;
  }

  /**
   * 絞り込み条件に応じて対象予約一覧を取得する（期間×ステータスの有無で4分岐）。
   *
   * @param statuses ステータスフィルタ（空の場合は全ステータス）
   * @param from 対象期間の開始日時（{@code null} の場合は全期間）
   * @param to 対象期間の終了日時（{@code null} の場合は全期間）
   * @return 対象予約一覧（{@code resource}・{@code requester} 初期化済み）
   */
  private List<Reservation> findReservations(
      Collection<ReservationStatus> statuses, LocalDateTime from, LocalDateTime to) {
    boolean hasPeriod = from != null && to != null;
    boolean hasStatusFilter = statuses != null && !statuses.isEmpty();

    Page<Reservation> page;
    if (hasPeriod && hasStatusFilter) {
      page =
          reservationRepository.findByPeriodAndStatusInFetch(
              from, to, statuses, Pageable.unpaged());
    } else if (hasPeriod) {
      page = reservationRepository.findByPeriodFetch(from, to, Pageable.unpaged());
    } else if (hasStatusFilter) {
      page = reservationRepository.findByStatusInFetch(statuses, Pageable.unpaged());
    } else {
      page = reservationRepository.findAllFetch(Pageable.unpaged());
    }
    return page.getContent();
  }

  /**
   * 予約一覧を CSV 文字列（ヘッダ行 + データ行、CRLF 区切り）に変換する。
   *
   * @param reservations 対象予約一覧
   * @return CSV 文字列
   */
  private String buildCsv(List<Reservation> reservations) {
    StringBuilder sb = new StringBuilder();
    sb.append(CSV_HEADER).append("\r\n");
    for (Reservation r : reservations) {
      sb.append(escape(r.getId().toString()))
          .append(',')
          .append(escape(r.getResource().getName()))
          .append(',')
          .append(escape(r.getRequester().getName()))
          .append(',')
          .append(escape(r.getStartAt().format(DATE_TIME_FORMATTER)))
          .append(',')
          .append(escape(r.getEndAt().format(DATE_TIME_FORMATTER)))
          .append(',')
          .append(escape(r.getPurpose()))
          .append(',')
          .append(escape(STATUS_LABELS.get(r.getStatus())))
          .append("\r\n");
    }
    return sb.toString();
  }

  /**
   * CSV セル値をエスケープする（RFC 4180 準拠）。カンマ・改行・ダブルクォートを含む場合は値全体をダブルクォートで囲み、内部のダブルクォートは二重化する。
   *
   * @param value セル値（{@code null} 不可）
   * @return エスケープ済みセル値
   */
  private static String escape(String value) {
    if (value.indexOf(',') >= 0
        || value.indexOf('"') >= 0
        || value.indexOf('\n') >= 0
        || value.indexOf('\r') >= 0) {
      return '"' + value.replace("\"", "\"\"") + '"';
    }
    return value;
  }
}
