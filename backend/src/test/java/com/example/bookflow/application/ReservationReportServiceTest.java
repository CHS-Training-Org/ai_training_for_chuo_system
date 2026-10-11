package com.example.bookflow.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.bookflow.domain.Reservation;
import com.example.bookflow.domain.ReservationRepository;
import com.example.bookflow.domain.ReservationStatus;
import com.example.bookflow.domain.Resource;
import com.example.bookflow.domain.User;
import com.example.bookflow.presentation.dto.ReportCondition;
import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * {@link ReservationReportService} 単体テスト（ADR-018 準拠・Mockito）。
 *
 * <p>status 既定値・期間条件によるクエリの切替・行の整形（日時・承認状態ラベル）・0 件時の挙動を検証する。 テスト命名規約（ADR-018）: {@code
 * methodName_condition_expectedBehavior}
 */
@ExtendWith(MockitoExtension.class)
class ReservationReportServiceTest {

  @Mock private ReservationRepository reservationRepository;

  @InjectMocks private ReservationReportService reportService;

  // ---------------------------------------------------------------------------
  // テストヘルパー：リフレクションでエンティティのフィールドを設定する
  // ---------------------------------------------------------------------------

  private static Reservation makeReservation(
      UUID id,
      String resourceName,
      String requesterName,
      LocalDateTime start,
      LocalDateTime end,
      String purpose,
      ReservationStatus status) {
    try {
      Resource resource = new Resource() {};
      setField(resource, "name", resourceName);
      User requester = new User() {};
      setField(requester, "name", requesterName);
      Reservation rv = new Reservation() {};
      setField(rv, "id", id);
      setField(rv, "resource", resource);
      setField(rv, "requester", requester);
      setField(rv, "startAt", start);
      setField(rv, "endAt", end);
      setField(rv, "purpose", purpose);
      setField(rv, "status", status);
      return rv;
    } catch (Exception e) {
      throw new RuntimeException(e);
    }
  }

  private static void setField(Object obj, String name, Object value) throws Exception {
    Class<?> clazz = obj.getClass().getSuperclass();
    if (clazz == Object.class) {
      clazz = obj.getClass();
    }
    Field field = clazz.getDeclaredField(name);
    field.setAccessible(true);
    field.set(obj, value);
  }

  /** BOM を除いた本文を行（CRLF 区切り、末尾の空要素なし）に分けて返す。 */
  private static List<String> lines(byte[] csv) {
    String body = new String(Arrays.copyOfRange(csv, 3, csv.length), StandardCharsets.UTF_8);
    return Arrays.asList(body.split("\r\n"));
  }

  private static Reservation sample(ReservationStatus status) {
    return makeReservation(
        UUID.fromString("00000000-0000-0000-0000-000000000001"),
        "第1会議室",
        "山田 太郎",
        LocalDateTime.of(2026, 10, 12, 9, 30, 45),
        LocalDateTime.of(2026, 10, 12, 11, 0),
        "週次ミーティング",
        status);
  }

  private static final List<ReservationStatus> NON_DRAFT_STATUSES =
      List.of(
          ReservationStatus.PENDING,
          ReservationStatus.APPROVED,
          ReservationStatus.REJECTED,
          ReservationStatus.CANCELLED);

  // ---------------------------------------------------------------------------
  // status の既定値
  // ---------------------------------------------------------------------------

  @Nested
  class StatusDefault {

    @Test
    @SuppressWarnings("unchecked")
    void exportCsv_statusNull_queriesWithFourNonDraftStatuses() {
      when(reservationRepository.findAllForReportByStatusIn(anyCollection())).thenReturn(List.of());

      reportService.exportCsv(new ReportCondition(null, null, null));

      ArgumentCaptor<Collection<ReservationStatus>> captor =
          ArgumentCaptor.forClass(Collection.class);
      verify(reservationRepository).findAllForReportByStatusIn(captor.capture());
      assertThat(captor.getValue()).containsExactlyInAnyOrderElementsOf(NON_DRAFT_STATUSES);
      assertThat(captor.getValue()).doesNotContain(ReservationStatus.DRAFT);
    }

    @Test
    @SuppressWarnings("unchecked")
    void exportCsv_statusEmptyList_isTreatedAsUnspecified() {
      when(reservationRepository.findAllForReportByStatusIn(anyCollection())).thenReturn(List.of());

      reportService.exportCsv(new ReportCondition(null, null, List.of()));

      ArgumentCaptor<Collection<ReservationStatus>> captor =
          ArgumentCaptor.forClass(Collection.class);
      verify(reservationRepository).findAllForReportByStatusIn(captor.capture());
      assertThat(captor.getValue()).containsExactlyInAnyOrderElementsOf(NON_DRAFT_STATUSES);
    }

    @Test
    void exportCsv_explicitDraft_passesDraftAsIs() {
      List<ReservationStatus> draftOnly = List.of(ReservationStatus.DRAFT);
      when(reservationRepository.findAllForReportByStatusIn(draftOnly)).thenReturn(List.of());

      reportService.exportCsv(new ReportCondition(null, null, draftOnly));

      verify(reservationRepository).findAllForReportByStatusIn(draftOnly);
    }

    @Test
    void exportCsv_multipleStatuses_passesThemAsIs() {
      List<ReservationStatus> statuses =
          List.of(ReservationStatus.PENDING, ReservationStatus.APPROVED);
      when(reservationRepository.findAllForReportByStatusIn(statuses)).thenReturn(List.of());

      reportService.exportCsv(new ReportCondition(null, null, statuses));

      verify(reservationRepository).findAllForReportByStatusIn(statuses);
    }
  }

  // ---------------------------------------------------------------------------
  // 期間条件によるクエリの切替
  // ---------------------------------------------------------------------------

  @Nested
  class Period {

    @Test
    void exportCsv_withPeriod_usesPeriodQuery() {
      LocalDateTime from = LocalDateTime.of(2026, 10, 1, 0, 0);
      LocalDateTime to = LocalDateTime.of(2026, 10, 31, 0, 0);
      when(reservationRepository.findAllForReportByPeriodAndStatusIn(
              eq(from), eq(to), anyCollection()))
          .thenReturn(List.of());

      reportService.exportCsv(new ReportCondition(from, to, null));

      verify(reservationRepository)
          .findAllForReportByPeriodAndStatusIn(eq(from), eq(to), anyCollection());
      verify(reservationRepository, never()).findAllForReportByStatusIn(any());
    }

    @Test
    void exportCsv_withoutPeriod_usesStatusOnlyQuery() {
      when(reservationRepository.findAllForReportByStatusIn(anyCollection())).thenReturn(List.of());

      reportService.exportCsv(new ReportCondition(null, null, null));

      verify(reservationRepository).findAllForReportByStatusIn(anyCollection());
      verify(reservationRepository, never())
          .findAllForReportByPeriodAndStatusIn(any(), any(), anyCollection());
    }
  }

  // ---------------------------------------------------------------------------
  // 出力内容
  // ---------------------------------------------------------------------------

  @Nested
  class Output {

    @Test
    void exportCsv_noReservations_returnsHeaderLineOnly() {
      when(reservationRepository.findAllForReportByStatusIn(anyCollection())).thenReturn(List.of());

      byte[] csv = reportService.exportCsv(new ReportCondition(null, null, null));

      assertThat(lines(csv)).containsExactly("予約ID,リソース名,申請者名,開始日時,終了日時,目的,承認状態");
    }

    @Test
    void exportCsv_reservation_outputsSevenColumnsWithFormattedDateTime() {
      when(reservationRepository.findAllForReportByStatusIn(anyCollection()))
          .thenReturn(List.of(sample(ReservationStatus.APPROVED)));

      byte[] csv = reportService.exportCsv(new ReportCondition(null, null, null));

      assertThat(lines(csv))
          .containsExactly(
              "予約ID,リソース名,申請者名,開始日時,終了日時,目的,承認状態",
              "00000000-0000-0000-0000-000000000001,第1会議室,山田 太郎,"
                  + "2026-10-12 09:30,2026-10-12 11:00,週次ミーティング,承認済み");
    }

    @Test
    void exportCsv_allStatuses_mapsToJapaneseLabels() {
      List<Reservation> reservations =
          Arrays.stream(ReservationStatus.values())
              .map(ReservationReportServiceTest::sample)
              .toList();
      when(reservationRepository.findAllForReportByStatusIn(anyCollection()))
          .thenReturn(reservations);

      byte[] csv = reportService.exportCsv(new ReportCondition(null, null, null));

      List<String> labels =
          lines(csv).stream()
              .skip(1)
              .map(line -> line.substring(line.lastIndexOf(',') + 1))
              .toList();
      assertThat(labels).containsExactly("下書き", "承認待ち", "承認済み", "却下", "キャンセル済み");
    }

    @Test
    void exportCsv_preservesRepositoryOrder() {
      Reservation first = sample(ReservationStatus.PENDING);
      Reservation second =
          makeReservation(
              UUID.fromString("00000000-0000-0000-0000-000000000002"),
              "第2会議室",
              "佐藤 花子",
              LocalDateTime.of(2026, 10, 13, 10, 0),
              LocalDateTime.of(2026, 10, 13, 12, 0),
              "打合せ",
              ReservationStatus.REJECTED);
      when(reservationRepository.findAllForReportByStatusIn(anyCollection()))
          .thenReturn(List.of(first, second));

      byte[] csv = reportService.exportCsv(new ReportCondition(null, null, null));

      List<String> data = lines(csv).subList(1, 3);
      assertThat(data.get(0)).startsWith("00000000-0000-0000-0000-000000000001,");
      assertThat(data.get(1)).startsWith("00000000-0000-0000-0000-000000000002,");
    }

    @Test
    void exportCsv_purposeStartingWithFormulaTrigger_isNeutralized() {
      Reservation rv =
          makeReservation(
              UUID.fromString("00000000-0000-0000-0000-000000000003"),
              "第1会議室",
              "山田 太郎",
              LocalDateTime.of(2026, 10, 12, 9, 30),
              LocalDateTime.of(2026, 10, 12, 11, 0),
              "=SUM(A1:A9)",
              ReservationStatus.APPROVED);
      when(reservationRepository.findAllForReportByStatusIn(anyCollection()))
          .thenReturn(List.of(rv));

      byte[] csv = reportService.exportCsv(new ReportCondition(null, null, null));

      assertThat(lines(csv).get(1)).contains(",'=SUM(A1:A9),承認済み");
    }
  }
}
