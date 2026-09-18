package com.example.bookflow.presentation;

import com.example.bookflow.application.ReservationReportService;
import com.example.bookflow.application.exception.ValidationException;
import com.example.bookflow.domain.ReservationStatus;
import java.nio.charset.StandardCharsets;
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
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

/**
 * 帳票出力コントローラ（api-spec.md §帳票出力 準拠）。
 *
 * <ul>
 *   <li>{@code GET /api/reports/reservations/csv} — 予約実績 CSV ダウンロード（ADMIN のみ・全ユーザー分）
 * </ul>
 *
 * <p>{@code StreamingResponseBody} を返すため、レスポンス確定後は JSON エラーを返せない。パラメータ検証はストリーム開始前 （本メソッド内）で完了させること。
 */
@RestController
@RequestMapping("/api/reports")
public class ReportController {

  private static final DateTimeFormatter FILENAME_TIMESTAMP =
      DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

  private final ReservationReportService reservationReportService;

  public ReportController(ReservationReportService reservationReportService) {
    this.reservationReportService = reservationReportService;
  }

  /**
   * 予約実績を CSV（UTF-8 BOM 付き）でストリーミング出力する（ADMIN のみ・全ユーザー分）。
   *
   * <p>{@code from}/{@code to} は無注釈の {@link LocalDateTime} で受ける。{@code ResourceController#list}
   * と同じ変換方式（オフセットなし ISO 8601 のみを受理し、オフセット付き入力は {@code MethodArgumentTypeMismatchException} 経由で 400
   * になる）。
   *
   * @param from 出力対象期間の開始（任意、以上）
   * @param to 出力対象期間の終了（任意、以下）
   * @param status 承認ステータスフィルタ（任意・複数指定可）
   * @return CSV 本文を書き出す {@link StreamingResponseBody}
   */
  @GetMapping(value = "/reservations/csv", produces = "text/csv")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<StreamingResponseBody> exportReservationsCsv(
      @RequestParam(required = false) LocalDateTime from,
      @RequestParam(required = false) LocalDateTime to,
      @RequestParam(required = false) List<ReservationStatus> status) {

    // ストリーミング開始前に検証する。コールバック内で投げてもレスポンス確定後のため JSON 400 にできない。
    if (from != null && to != null && from.isAfter(to)) {
      throw new ValidationException("from は to 以前の日時を指定してください。");
    }

    String filename = "reservations_" + LocalDateTime.now().format(FILENAME_TIMESTAMP) + ".csv";

    StreamingResponseBody body =
        out -> reservationReportService.writeReservationCsv(out, from, to, status);

    return ResponseEntity.ok()
        .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
        .header(HttpHeaders.CACHE_CONTROL, "no-store")
        .body(body);
  }
}
