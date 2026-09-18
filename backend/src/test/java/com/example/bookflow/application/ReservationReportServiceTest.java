package com.example.bookflow.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.bookflow.domain.ReservationCsvRow;
import com.example.bookflow.domain.ReservationRepository;
import com.example.bookflow.domain.ReservationStatus;
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.EnumSet;
import java.util.List;
import java.util.stream.Stream;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * {@link ReservationReportService} 単体テスト（ADR-018 準拠・Mockito）。
 *
 * <p>テスト命名規約（ADR-018）: {@code methodName_condition_expectedBehavior}
 */
@ExtendWith(MockitoExtension.class)
class ReservationReportServiceTest {

  @Mock private ReservationRepository reservationRepository;
  @Mock private ReservationCsvWriter csvWriter;

  @InjectMocks private ReservationReportService reservationReportService;

  @Captor private ArgumentCaptor<LocalDateTime> fromCaptor;
  @Captor private ArgumentCaptor<LocalDateTime> toCaptor;
  @Captor private ArgumentCaptor<Collection<ReservationStatus>> statusesCaptor;

  @Nested
  class FilterNormalization {

    @Test
    void writeReservationCsv_whenFromAndToOmitted_usesSentinelRange() throws Exception {
      when(reservationRepository.streamCsvRowsForReport(any(), any(), any()))
          .thenReturn(Stream.empty());

      reservationReportService.writeReservationCsv(new ByteArrayOutputStream(), null, null, null);

      verify(reservationRepository)
          .streamCsvRowsForReport(
              fromCaptor.capture(), toCaptor.capture(), statusesCaptor.capture());
      assertThat(fromCaptor.getValue()).isEqualTo(LocalDateTime.of(1900, 1, 1, 0, 0));
      assertThat(toCaptor.getValue()).isEqualTo(LocalDateTime.of(9999, 12, 31, 23, 59, 59));
    }

    @Test
    void writeReservationCsv_whenFromGiven_passesThroughUnchanged() throws Exception {
      when(reservationRepository.streamCsvRowsForReport(any(), any(), any()))
          .thenReturn(Stream.empty());
      LocalDateTime from = LocalDateTime.of(2026, 9, 1, 0, 0);

      reservationReportService.writeReservationCsv(new ByteArrayOutputStream(), from, null, null);

      verify(reservationRepository).streamCsvRowsForReport(fromCaptor.capture(), any(), any());
      assertThat(fromCaptor.getValue()).isEqualTo(from);
    }

    @Test
    void writeReservationCsv_whenToGiven_passesThroughUnchanged() throws Exception {
      when(reservationRepository.streamCsvRowsForReport(any(), any(), any()))
          .thenReturn(Stream.empty());
      LocalDateTime to = LocalDateTime.of(2026, 9, 30, 23, 59, 59);

      reservationReportService.writeReservationCsv(new ByteArrayOutputStream(), null, to, null);

      verify(reservationRepository).streamCsvRowsForReport(any(), toCaptor.capture(), any());
      assertThat(toCaptor.getValue()).isEqualTo(to);
    }

    @Test
    void writeReservationCsv_whenStatusOmitted_passesAllStatuses() throws Exception {
      when(reservationRepository.streamCsvRowsForReport(any(), any(), any()))
          .thenReturn(Stream.empty());

      reservationReportService.writeReservationCsv(new ByteArrayOutputStream(), null, null, null);

      verify(reservationRepository).streamCsvRowsForReport(any(), any(), statusesCaptor.capture());
      assertThat(statusesCaptor.getValue())
          .containsExactlyInAnyOrderElementsOf(EnumSet.allOf(ReservationStatus.class));
    }

    @Test
    void writeReservationCsv_whenStatusEmptyList_passesAllStatuses() throws Exception {
      when(reservationRepository.streamCsvRowsForReport(any(), any(), any()))
          .thenReturn(Stream.empty());

      reservationReportService.writeReservationCsv(
          new ByteArrayOutputStream(), null, null, List.of());

      verify(reservationRepository).streamCsvRowsForReport(any(), any(), statusesCaptor.capture());
      assertThat(statusesCaptor.getValue())
          .containsExactlyInAnyOrderElementsOf(EnumSet.allOf(ReservationStatus.class));
    }

    @Test
    void writeReservationCsv_whenStatusGiven_passesOnlyGivenStatuses() throws Exception {
      when(reservationRepository.streamCsvRowsForReport(any(), any(), any()))
          .thenReturn(Stream.empty());

      reservationReportService.writeReservationCsv(
          new ByteArrayOutputStream(), null, null, List.of(ReservationStatus.APPROVED));

      verify(reservationRepository).streamCsvRowsForReport(any(), any(), statusesCaptor.capture());
      assertThat(statusesCaptor.getValue()).containsExactly(ReservationStatus.APPROVED);
    }
  }

  @Nested
  class StreamLifecycle {

    @Test
    void writeReservationCsv_always_closesStream() throws Exception {
      boolean[] closed = {false};
      Stream<ReservationCsvRow> trackedStream =
          Stream.<ReservationCsvRow>empty().onClose(() -> closed[0] = true);
      when(reservationRepository.streamCsvRowsForReport(any(), any(), any()))
          .thenReturn(trackedStream);

      reservationReportService.writeReservationCsv(new ByteArrayOutputStream(), null, null, null);

      assertThat(closed[0]).isTrue();
    }

    @Test
    void writeReservationCsv_always_delegatesToCsvWriter() throws Exception {
      Stream<ReservationCsvRow> rows = Stream.empty();
      when(reservationRepository.streamCsvRowsForReport(any(), any(), any())).thenReturn(rows);
      ByteArrayOutputStream out = new ByteArrayOutputStream();

      reservationReportService.writeReservationCsv(out, null, null, null);

      verify(csvWriter).write(eq(out), eq(rows));
    }
  }
}
