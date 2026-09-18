package com.example.bookflow.application;

import com.example.bookflow.domain.ReservationCsvRow;
import com.example.bookflow.domain.ReservationRepository;
import com.example.bookflow.domain.ReservationStatus;
import java.io.IOException;
import java.io.OutputStream;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.EnumSet;
import java.util.stream.Stream;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 帳票出力のユースケース Service。
 *
 * <p>{@link #writeReservationCsv} は {@code StreamingResponseBody} のコールバック（＝コントローラが return した後に動く
 * MVC 非同期スレッド）から呼ばれる。{@code TransactionSynchronizationManager} はスレッドローカルなので、 このメソッドの
 * {@code @Transactional} プロキシがその非同期スレッド上で新しい読み取り専用トランザクションを開く。{@link Stream} の消費と CSV
 * 書き出しをすべてこのメソッド内で完結させることが本設計の要点である。
 *
 * <p>{@link ReservationCsvRow} は JPQL コンストラクタ式による射影のため、LAZY 関連へのアクセス自体が存在せず、{@code
 * LazyInitializationException} は構造的に起こり得ない（{@code spring.jpa.open-in-view: false} のため OSIV
 * には依存できない）。
 *
 * <p>【カテゴリ 6 TODO とは無関係】帳票出力は既存の {@link ReservationService} とは責務が異なるため独立させている。 出力範囲は常に 全ユーザー分（ADMIN
 * 限定エンドポイントのため行レベルの所有権チェックは行わない、RPT-04）。
 */
@Service
public class ReservationReportService {

  /** {@code from} 省略時の下限（PostgreSQL / H2 双方の timestamp 範囲内の番兵値）。 */
  private static final LocalDateTime MIN_AT = LocalDateTime.of(1900, 1, 1, 0, 0);

  /** {@code to} 省略時の上限。 */
  private static final LocalDateTime MAX_AT = LocalDateTime.of(9999, 12, 31, 23, 59, 59);

  private final ReservationRepository reservationRepository;
  private final ReservationCsvWriter csvWriter;

  public ReservationReportService(
      ReservationRepository reservationRepository, ReservationCsvWriter csvWriter) {
    this.reservationRepository = reservationRepository;
    this.csvWriter = csvWriter;
  }

  /**
   * 予約実績 CSV を {@code out} に書き出す（全ユーザー分・ADMIN 専用）。
   *
   * @param out 出力先ストリーム（クローズしない）
   * @param from 期間開始（null で下限なし）
   * @param to 期間終了（null で上限なし）
   * @param statuses ステータスフィルタ（null・空で全ステータス）
   * @throws IOException 書き込み失敗
   */
  @Transactional(readOnly = true)
  public void writeReservationCsv(
      OutputStream out,
      LocalDateTime from,
      LocalDateTime to,
      Collection<ReservationStatus> statuses)
      throws IOException {

    // 1) Repository に nullable パラメータを渡さないよう正規化する
    LocalDateTime fromAt = (from == null) ? MIN_AT : from;
    LocalDateTime toAt = (to == null) ? MAX_AT : to;
    Collection<ReservationStatus> effectiveStatuses =
        (statuses == null || statuses.isEmpty())
            ? EnumSet.allOf(ReservationStatus.class)
            : statuses;

    // 2) Stream は必ず閉じる（JDBC カーソル・EntityManager リソースの解放）
    try (Stream<ReservationCsvRow> rows =
        reservationRepository.streamCsvRowsForReport(fromAt, toAt, effectiveStatuses)) {
      csvWriter.write(out, rows);
    }
  }
}
