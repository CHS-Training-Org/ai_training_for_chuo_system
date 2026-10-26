package com.example.bookflow.presentation;

import com.example.bookflow.application.ReservationCsvRow;
import com.example.bookflow.application.ReservationReportService;
import com.example.bookflow.domain.ReservationStatus;
import com.example.bookflow.presentation.csv.ReservationCsvWriter;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
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
 *   <li>{@code GET /api/reports/reservations/csv} — 予約一覧の CSV 出力（ADMIN のみ。期間・ステータスで絞り込み可）
 * </ul>
 *
 * <p>認可は {@code @PreAuthorize("hasRole('ADMIN')")}。MEMBER / APPROVER は 403（JSON）になる。成功時のみ CSV
 * を返し、エラー時は他の エンドポイントと同じ JSON を返すため、{@code @GetMapping} には {@code produces} を付けない。
 */
@RestController
@RequestMapping("/api/reports")
public class ReportController {

  private static final MediaType TEXT_CSV_UTF8 =
      new MediaType("text", "csv", StandardCharsets.UTF_8);

  private static final DateTimeFormatter FILE_NAME_TIMESTAMP =
      DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss");

  private final ReservationReportService reservationReportService;
  private final ReservationCsvWriter reservationCsvWriter;

  public ReportController(
      ReservationReportService reservationReportService,
      ReservationCsvWriter reservationCsvWriter) {
    this.reservationReportService = reservationReportService;
    this.reservationCsvWriter = reservationCsvWriter;
  }

  /**
   * 予約一覧を CSV として返す（ADMIN のみ）。
   *
   * <p>開始日時が {@code from} の 0 時以上、{@code to} の翌日 0 時未満の予約を、開始日時・予約 ID の昇順で出力する。{@code from} /
   * {@code to} は片方だけでも指定でき、{@code status} は複数指定できる（未指定は全ステータス）。
   *
   * @param from 期間の開始日（任意）
   * @param to 期間の終了日（任意。その日を含む）
   * @param status ステータスフィルタ（任意・複数指定可）
   * @return BOM 付き UTF-8 の CSV（{@code Content-Disposition: attachment}）
   * @throws IOException CSV の書き出しに失敗したとき
   */
  @GetMapping("/reservations/csv")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<byte[]> reservationsCsv(
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
      @RequestParam(required = false) List<ReservationStatus> status)
      throws IOException {
    List<ReservationCsvRow> rows = reservationReportService.findRows(from, to, status);

    ByteArrayOutputStream out = new ByteArrayOutputStream();
    reservationCsvWriter.write(rows, out);

    String fileName = "reservations_" + LocalDateTime.now().format(FILE_NAME_TIMESTAMP) + ".csv";
    return ResponseEntity.ok()
        .contentType(TEXT_CSV_UTF8)
        .header(
            HttpHeaders.CONTENT_DISPOSITION,
            ContentDisposition.attachment().filename(fileName).build().toString())
        .body(out.toByteArray());
  }
}
