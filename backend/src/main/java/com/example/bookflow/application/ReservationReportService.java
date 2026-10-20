package com.example.bookflow.application;

import static net.logstash.logback.argument.StructuredArguments.kv;

import com.example.bookflow.application.exception.ValidationException;
import com.example.bookflow.domain.Reservation;
import com.example.bookflow.domain.ReservationRepository;
import com.example.bookflow.domain.ReservationStatus;
import java.io.IOException;
import java.io.OutputStream;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;

/**
 * 予約一覧の CSV 帳票出力ユースケース。
 *
 * <p>クラスには {@code @Transactional} を付けない。1 ページ（{@link #PAGE_SIZE} 件）の読み出しごとに {@link
 * ReservationRepository#findForReport} が短い読み取り専用トランザクションを開閉する（ダウンロードが遅くても DB 接続を保持しない）。
 *
 * <p>{@link #validate} はリクエストスレッドで書き出し開始前に呼び、{@link #writeReservationsCsv} はストリーミングスレッドで動く。
 * ストリーミングスレッドでは {@code SecurityContext} を使わないため、実行ユーザー ID は引数で受け取る。
 */
@Service
public class ReservationReportService {

  private static final Logger LOG = LoggerFactory.getLogger(ReservationReportService.class);

  /** 1 回の読み出し件数（設定ファイルには出さない）。 */
  static final int PAGE_SIZE = 500;

  private final ReservationRepository reservationRepository;

  public ReservationReportService(ReservationRepository reservationRepository) {
    this.reservationRepository = reservationRepository;
  }

  /**
   * 条件を検証する。書き出し開始前に Controller から同期で呼ぶ（開始後は HTTP ステータスを変えられないため）。
   *
   * @throws ValidationException {@code from} と {@code to} が両方あり、{@code from} が {@code to} 以上のとき
   */
  public void validate(LocalDateTime from, LocalDateTime to) {
    if (from != null && to != null && !from.isBefore(to)) {
      throw new ValidationException("from は to より前の日時を指定してください。");
    }
  }

  /**
   * BOM・ヘッダ・全ページの行を {@code out} へ書き出す。
   *
   * <p>完了時に INFO、途中で例外により終えたときに WARN の構造化ログを 1 行出す（PII・例外メッセージは含めない）。例外は握りつぶさず伝播させる。
   *
   * @param userId 実行ユーザー ID（ログ用。リクエストスレッドで取得して渡す）
   * @param statuses 対象ステータス（null または空なら全ステータス）
   * @param from 期間の開始（null で下限なし）
   * @param to 期間の終了（排他的。null で上限なし）
   * @param out 出力先
   */
  public void writeReservationsCsv(
      UUID userId,
      Collection<ReservationStatus> statuses,
      LocalDateTime from,
      LocalDateTime to,
      OutputStream out)
      throws IOException {
    validate(from, to);
    List<ReservationStatus> targets =
        statuses == null || statuses.isEmpty()
            ? List.of(ReservationStatus.values())
            : List.copyOf(statuses);

    long startNanos = System.nanoTime();
    long rowCount = 0;
    boolean completed = false;
    Throwable failure = null;
    try {
      ReservationCsvWriter writer = new ReservationCsvWriter(out);
      writer.writeBom();
      writer.writeHeader();
      int page = 0;
      Slice<Reservation> slice;
      do {
        slice =
            reservationRepository.findForReport(targets, from, to, PageRequest.of(page, PAGE_SIZE));
        writer.writeRows(slice.getContent());
        writer.flush();
        rowCount += slice.getNumberOfElements();
        page++;
      } while (slice.hasNext());
      completed = true;
    } catch (IOException | RuntimeException | Error e) {
      failure = e;
      throw e;
    } finally {
      long elapsedMs = (System.nanoTime() - startNanos) / 1_000_000;
      if (completed) {
        LOG.info(
            "csv export completed {} {} {} {} {} {} {}",
            kv("event", "csv_export_completed"),
            kv("userId", userId),
            kv("statuses", targets),
            kv("from", from),
            kv("to", to),
            kv("rowCount", rowCount),
            kv("elapsedMs", elapsedMs));
      } else {
        LOG.warn(
            "csv export aborted {} {} {} {} {} {} {} {}",
            kv("event", "csv_export_aborted"),
            kv("userId", userId),
            kv("statuses", targets),
            kv("from", from),
            kv("to", to),
            kv("rowCount", rowCount),
            kv("elapsedMs", elapsedMs),
            kv("failureType", failure == null ? "Unknown" : failure.getClass().getSimpleName()));
      }
    }
  }
}
