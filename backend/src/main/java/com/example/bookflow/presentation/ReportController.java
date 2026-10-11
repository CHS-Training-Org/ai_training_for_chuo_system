package com.example.bookflow.presentation;

import com.example.bookflow.application.ReservationReportService;
import com.example.bookflow.application.exception.ValidationException;
import com.example.bookflow.domain.ReservationStatus;
import com.example.bookflow.presentation.dto.ReportCondition;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.springframework.http.CacheControl;
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
 * 帳票出力コントローラ（api-spec.md §帳票出力 準拠）。
 *
 * <ul>
 *   <li>{@code GET /api/reports/reservations/csv} — 予約一覧の CSV ダウンロード（ADMIN のみ）
 * </ul>
 *
 * <p>認可：{@code @PreAuthorize("hasRole('ADMIN')")} により ADMIN のみアクセス可。 MEMBER / APPROVER は 403
 * Forbidden。
 */
@RestController
@RequestMapping("/api/reports")
public class ReportController {

  private static final MediaType TEXT_CSV_UTF8 =
      new MediaType("text", "csv", StandardCharsets.UTF_8);
  private static final DateTimeFormatter FILE_DATE = DateTimeFormatter.BASIC_ISO_DATE;

  private final ReservationReportService reportService;

  public ReportController(ReservationReportService reportService) {
    this.reportService = reportService;
  }

  /**
   * 予約一覧を CSV（BOM 付き UTF-8）でダウンロードさせる（ADMIN のみ）。
   *
   * <p>{@code from}/{@code to} は期間重複で絞り込み、同時指定必須（両方省略なら全期間）。 {@code status} 未指定時は {@code DRAFT} を除く
   * 4 ステータスが対象。ファイル名は出力日の {@code reservations_yyyyMMdd.csv}。
   *
   * @param status 対象ステータス（複数指定可）
   * @param from 期間の開始日時
   * @param to 期間の終了日時
   * @return CSV 本文（{@code Content-Disposition: attachment}）
   */
  @GetMapping("/reservations/csv")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<byte[]> reservationsCsv(
      @RequestParam(required = false) List<ReservationStatus> status,
      @RequestParam(required = false) LocalDateTime from,
      @RequestParam(required = false) LocalDateTime to) {
    // from / to は同時指定必須（api-spec.md §帳票出力 参照。予約一覧 API と同じ規則）
    if ((from == null) != (to == null)) {
      throw new ValidationException("from と to は同時に指定してください。");
    }
    byte[] csv = reportService.exportCsv(new ReportCondition(from, to, status));
    String filename = "reservations_" + LocalDate.now().format(FILE_DATE) + ".csv";
    return ResponseEntity.ok()
        .contentType(TEXT_CSV_UTF8)
        .header(
            HttpHeaders.CONTENT_DISPOSITION,
            ContentDisposition.attachment().filename(filename).build().toString())
        .cacheControl(CacheControl.noStore())
        .body(csv);
  }
}
