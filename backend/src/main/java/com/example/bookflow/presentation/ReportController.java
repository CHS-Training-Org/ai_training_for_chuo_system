package com.example.bookflow.presentation;

import com.example.bookflow.application.ReportService;
import com.example.bookflow.application.exception.ValidationException;
import com.example.bookflow.domain.ReservationStatus;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
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
 * <p>認可：{@code @PreAuthorize("hasRole('ADMIN')")} により ADMIN のみアクセス可。MEMBER / APPROVER は 403
 * Forbidden。 個人名を含むため、CSV の本文はログに出力しない。
 */
@RestController
@RequestMapping("/api/reports")
public class ReportController {

  private static final MediaType TEXT_CSV_UTF8 =
      new MediaType("text", "csv", StandardCharsets.UTF_8);
  private static final DateTimeFormatter FILE_DATE = DateTimeFormatter.ofPattern("yyyyMMdd");

  private final ReportService reportService;

  public ReportController(ReportService reportService) {
    this.reportService = reportService;
  }

  /**
   * 予約一覧を CSV で返す（ADMIN のみ）。
   *
   * @param status ステータスの絞り込み（複数可。未指定なら全ステータス）
   * @param from 期間の開始日（{@code yyyy-MM-dd}、含む）
   * @param to 期間の終了日（{@code yyyy-MM-dd}、含む）
   * @return {@code text/csv; charset=UTF-8} の添付ファイル
   */
  @GetMapping("/reservations/csv")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<byte[]> exportReservationsCsv(
      @RequestParam(required = false) List<ReservationStatus> status,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
    if (from != null && to != null && from.isAfter(to)) {
      throw new ValidationException("from は to 以前の日付を指定してください。");
    }
    byte[] body = reportService.exportReservationsCsv(from, to, status);
    String fileName = buildFileName(from, to, LocalDate.now());
    return ResponseEntity.ok()
        .contentType(TEXT_CSV_UTF8)
        .header(
            HttpHeaders.CONTENT_DISPOSITION,
            ContentDisposition.attachment().filename(fileName).build().toString())
        .body(body);
  }

  /**
   * ダウンロードのファイル名を組み立てる。
   *
   * <p>{@code from} と {@code to} の両方があるときは {@code reservations_<from>_<to>.csv}、それ以外は {@code
   * reservations_<出力日>.csv}。
   */
  static String buildFileName(LocalDate from, LocalDate to, LocalDate today) {
    if (from != null && to != null) {
      return "reservations_" + from.format(FILE_DATE) + "_" + to.format(FILE_DATE) + ".csv";
    }
    return "reservations_" + today.format(FILE_DATE) + ".csv";
  }
}
