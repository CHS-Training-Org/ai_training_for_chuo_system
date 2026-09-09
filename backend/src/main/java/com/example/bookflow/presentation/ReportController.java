package com.example.bookflow.presentation;

import com.example.bookflow.application.ReportService;
import com.example.bookflow.application.exception.ValidationException;
import com.example.bookflow.domain.ReservationStatus;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 帳票出力コントローラ（{@code csv-export.md} RPT-01〜05 準拠）。
 *
 * <ul>
 *   <li>{@code GET /api/reports/reservations/csv} — 予約一覧の CSV ダウンロード（ADMIN のみ）
 * </ul>
 *
 * <p>認可は {@code @PreAuthorize("hasRole('ADMIN')")}（{@link ResourceController} の ADMIN
 * 限定エンドポイントと同じパターン）。
 */
@RestController
@RequestMapping("/api/reports")
public class ReportController {

  private final ReportService reportService;

  public ReportController(ReportService reportService) {
    this.reportService = reportService;
  }

  /**
   * 予約一覧を CSV（UTF-8 BOM 付き）でダウンロードする（ADMIN のみ）。
   *
   * <p>{@code from}/{@code to} は同時指定必須（{@link ResourceController#list} と同じパターン）。片方のみ指定時は {@link
   * ValidationException}（400）。
   *
   * @param status ステータスフィルタ（複数指定可・省略時は全ステータス）
   * @param from 対象期間の開始日時（任意・to と同時指定）
   * @param to 対象期間の終了日時（任意・from と同時指定）
   * @return CSV バイト列（{@code Content-Disposition: attachment}）
   */
  @GetMapping("/reservations/csv")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<byte[]> csv(
      @RequestParam(required = false) List<ReservationStatus> status,
      @RequestParam(required = false) LocalDateTime from,
      @RequestParam(required = false) LocalDateTime to) {
    if ((from == null) != (to == null)) {
      throw new ValidationException("from と to は同時に指定してください。");
    }

    byte[] csv =
        reportService.generateReservationsCsv(status == null ? List.of() : status, from, to);

    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
        .header(
            HttpHeaders.CONTENT_DISPOSITION,
            ContentDisposition.attachment().filename("reservations.csv").build().toString())
        .body(csv);
  }
}
