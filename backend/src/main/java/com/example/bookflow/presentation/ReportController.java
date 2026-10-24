package com.example.bookflow.presentation;

import com.example.bookflow.application.ReservationReportService;
import com.example.bookflow.application.exception.ValidationException;
import com.example.bookflow.domain.ReservationStatus;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 帳票出力コントローラ（api-spec.md §帳票出力 準拠）。
 *
 * <ul>
 *   <li>{@code GET /api/reports/reservations/csv} — 予約一覧の CSV 出力（ADMIN のみ）
 * </ul>
 *
 * <p>認可ルール：{@code @PreAuthorize("hasRole('ADMIN')")} で ADMIN 以外は 403。フロントエンドでもボタンの表示を ADMIN
 * に限るが、バックエンドで二重チェックする（screen-spec.md §共通 参照）。
 */
@RestController
@RequestMapping("/api/reports")
public class ReportController {

  private static final MediaType TEXT_CSV_UTF8 =
      new MediaType("text", "csv", StandardCharsets.UTF_8);

  private final ReservationReportService reservationReportService;

  public ReportController(ReservationReportService reservationReportService) {
    this.reservationReportService = reservationReportService;
  }

  /**
   * 予約一覧を CSV で返す（ADMIN のみ）。
   *
   * <p>対象は全ユーザーの予約で、開始日時の昇順。{@code from} / {@code to} を両方指定した場合は、開始日時が {@code from} 以上・{@code to}
   * 未満の予約に限る。{@code status} は複数指定可で、未指定なら全ステータス。
   *
   * @param from 期間の開始日時（任意・to と同時指定）
   * @param to 期間の終了日時（任意・from と同時指定）
   * @param status ステータスフィルタ（任意・複数可）
   * @return CSV のバイト列（{@code Content-Disposition} のファイル名は {@code reservations_yyyyMMdd.csv}）
   */
  @GetMapping("/reservations/csv")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<byte[]> downloadReservationsCsv(
      @RequestParam(required = false) LocalDateTime from,
      @RequestParam(required = false) LocalDateTime to,
      @RequestParam(required = false) List<ReservationStatus> status) {
    // from / to は同時指定必須（api-spec.md §帳票出力 参照）
    if ((from == null) != (to == null)) {
      throw new ValidationException("from と to は同時に指定してください。");
    }
    if (from != null && !from.isBefore(to)) {
      throw new ValidationException("from は to より前の日時を指定してください。");
    }
    byte[] csv = reservationReportService.exportReservationsCsv(from, to, status);
    String filename =
        "reservations_" + LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE) + ".csv";
    return ResponseEntity.ok()
        .contentType(TEXT_CSV_UTF8)
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
        .body(csv);
  }
}
