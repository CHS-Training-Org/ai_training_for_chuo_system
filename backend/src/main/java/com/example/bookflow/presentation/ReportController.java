package com.example.bookflow.presentation;

import com.example.bookflow.application.ReservationReportService;
import com.example.bookflow.domain.ReservationStatus;
import com.example.bookflow.domain.User;
import com.example.bookflow.infrastructure.security.CurrentUser;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
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
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

/**
 * 帳票出力コントローラ（api-spec.md §帳票 準拠）。
 *
 * <ul>
 *   <li>{@code GET /api/reports/reservations/csv} — 予約一覧の CSV ダウンロード（ADMIN のみ）
 * </ul>
 *
 * <p>HTTP の入出力に限定する。認可（{@code @PreAuthorize}）と条件の検証は、書き出し開始前（リクエストスレッド）に完了させる。 検証を {@link
 * StreamingResponseBody} の中で行うと、200 送信後になりステータスを変えられない。
 */
@RestController
@RequestMapping("/api/reports")
public class ReportController {

  private static final DateTimeFormatter FILE_NAME_TIME =
      DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss");
  private static final MediaType TEXT_CSV_UTF8 =
      new MediaType("text", "csv", StandardCharsets.UTF_8);

  private final ReservationReportService reportService;

  public ReportController(ReservationReportService reportService) {
    this.reportService = reportService;
  }

  /** 全ユーザーの予約を CSV で返す。{@code status}（複数可）・{@code from}・{@code to} で絞り込む。 */
  @GetMapping("/reservations/csv")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<StreamingResponseBody> exportReservationsCsv(
      @RequestParam(required = false) List<ReservationStatus> status,
      @RequestParam(required = false) LocalDateTime from,
      @RequestParam(required = false) LocalDateTime to,
      @CurrentUser User currentUser) {
    // リクエストスレッドで同期的に検証し、失敗は通常の JSON エラー（400）にする。
    reportService.validate(from, to);

    // ストリーミングスレッドでは SecurityContext を使えないため、ここで ID を取り出す。
    UUID userId = currentUser.getId();
    String fileName = "reservations_" + LocalDateTime.now().format(FILE_NAME_TIME) + ".csv";

    return ResponseEntity.ok()
        .contentType(TEXT_CSV_UTF8)
        .header(
            HttpHeaders.CONTENT_DISPOSITION,
            ContentDisposition.attachment().filename(fileName).build().toString())
        .cacheControl(CacheControl.noStore())
        .body(out -> reportService.writeReservationsCsv(userId, status, from, to, out));
  }
}
