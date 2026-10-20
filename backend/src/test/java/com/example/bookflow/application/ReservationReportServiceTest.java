package com.example.bookflow.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.example.bookflow.application.exception.ValidationException;
import com.example.bookflow.domain.Reservation;
import com.example.bookflow.domain.ReservationRepository;
import com.example.bookflow.domain.ReservationStatus;
import com.example.bookflow.domain.Resource;
import com.example.bookflow.domain.ResourceCategory;
import com.example.bookflow.domain.User;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.SliceImpl;

/**
 * {@link ReservationReportService} 単体テスト（ADR-018 準拠・Mockito）。
 *
 * <p>テスト命名規約（ADR-018）: {@code methodName_condition_expectedBehavior}
 */
@ExtendWith(MockitoExtension.class)
class ReservationReportServiceTest {

  private static final UUID USER_ID = UUID.fromString("30000000-0000-0000-0000-000000000001");
  private static final LocalDateTime T1 = LocalDateTime.of(2026, 10, 1, 0, 0);
  private static final LocalDateTime T2 = LocalDateTime.of(2026, 11, 1, 0, 0);

  @Mock private ReservationRepository reservationRepository;

  @InjectMocks private ReservationReportService service;

  private ListAppender<ILoggingEvent> logAppender;
  private Logger serviceLogger;

  @BeforeEach
  void attachLogAppender() {
    serviceLogger = (Logger) LoggerFactory.getLogger(ReservationReportService.class);
    logAppender = new ListAppender<>();
    logAppender.start();
    serviceLogger.addAppender(logAppender);
  }

  @AfterEach
  void detachLogAppender() {
    serviceLogger.detachAppender(logAppender);
  }

  // ---------------------------------------------------------------------------
  // テストデータ生成
  // ---------------------------------------------------------------------------

  private static Reservation reservation(String purpose) {
    try {
      Constructor<User> ctor = User.class.getDeclaredConstructor();
      ctor.setAccessible(true);
      User u = ctor.newInstance();
      Field f = User.class.getDeclaredField("name");
      f.setAccessible(true);
      f.set(u, "山田 太郎");
      Resource resource =
          Resource.create("第1会議室", ResourceCategory.ROOM, null, null, false, true, null);
      return Reservation.create(
          resource,
          u,
          LocalDateTime.of(2026, 10, 20, 9, 0),
          LocalDateTime.of(2026, 10, 20, 10, 0),
          purpose,
          null,
          ReservationStatus.APPROVED);
    } catch (ReflectiveOperationException e) {
      throw new IllegalStateException(e);
    }
  }

  private static Slice<Reservation> slice(List<Reservation> content, boolean hasNext) {
    return new SliceImpl<>(
        content, org.springframework.data.domain.PageRequest.of(0, 500), hasNext);
  }

  private List<ILoggingEvent> logsAt(Level level) {
    return logAppender.list.stream().filter(e -> e.getLevel() == level).toList();
  }

  // ---------------------------------------------------------------------------
  // validate
  // ---------------------------------------------------------------------------

  @Nested
  class Validate {

    @Test
    void validate_fromAfterTo_throwsValidationException() {
      assertThatThrownBy(() -> service.validate(T2, T1)).isInstanceOf(ValidationException.class);
    }

    @Test
    void validate_fromEqualsTo_throwsValidationException() {
      assertThatThrownBy(() -> service.validate(T1, T1)).isInstanceOf(ValidationException.class);
    }

    @Test
    void validate_fromBeforeTo_doesNotThrow() {
      assertThatCode(() -> service.validate(T1, T2)).doesNotThrowAnyException();
    }

    @Test
    void validate_onlyFrom_doesNotThrow() {
      assertThatCode(() -> service.validate(T1, null)).doesNotThrowAnyException();
    }

    @Test
    void validate_onlyTo_doesNotThrow() {
      assertThatCode(() -> service.validate(null, T2)).doesNotThrowAnyException();
    }

    @Test
    void validate_bothNull_doesNotThrow() {
      assertThatCode(() -> service.validate(null, null)).doesNotThrowAnyException();
    }
  }

  // ---------------------------------------------------------------------------
  // writeReservationsCsv — ページ処理
  // ---------------------------------------------------------------------------

  @Nested
  class WriteReservationsCsv {

    @Test
    void writeReservationsCsv_invalidRange_throwsBeforeTouchingRepositoryOrStream() {
      ByteArrayOutputStream out = new ByteArrayOutputStream();

      assertThatThrownBy(() -> service.writeReservationsCsv(USER_ID, null, T2, T1, out))
          .isInstanceOf(ValidationException.class);

      verifyNoInteractions(reservationRepository);
      assertThat(out.size()).isZero();
    }

    @Test
    void writeReservationsCsv_noMatchingReservations_writesBomAndHeaderOnly() throws IOException {
      when(reservationRepository.findForReport(anyCollection(), isNull(), isNull(), any()))
          .thenReturn(slice(List.of(), false));
      ByteArrayOutputStream out = new ByteArrayOutputStream();

      service.writeReservationsCsv(USER_ID, null, null, null, out);

      byte[] bytes = out.toByteArray();
      assertThat(bytes[0]).isEqualTo((byte) 0xEF);
      String body = new String(bytes, 3, bytes.length - 3, StandardCharsets.UTF_8);
      assertThat(body).isEqualTo("予約ID,リソース名,申請者名,開始日時,終了日時,利用目的,ステータス\r\n");
    }

    @Test
    void writeReservationsCsv_multiplePages_readsAllPagesWithIncreasingPageNumber()
        throws IOException {
      when(reservationRepository.findForReport(anyCollection(), any(), any(), any()))
          .thenReturn(slice(List.of(reservation("p1-a"), reservation("p1-b")), true))
          .thenReturn(slice(List.of(reservation("p2-a")), true))
          .thenReturn(slice(List.of(reservation("p3-a")), false));
      ByteArrayOutputStream out = new ByteArrayOutputStream();

      service.writeReservationsCsv(USER_ID, null, T1, T2, out);

      ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
      verify(reservationRepository, times(3))
          .findForReport(anyCollection(), eq(T1), eq(T2), pageable.capture());
      assertThat(pageable.getAllValues())
          .extracting(Pageable::getPageNumber)
          .containsExactly(0, 1, 2);
      assertThat(pageable.getAllValues())
          .extracting(Pageable::getPageSize)
          .containsOnly(ReservationReportService.PAGE_SIZE);
      String body = out.toString(StandardCharsets.UTF_8);
      assertThat(body).contains("p1-a", "p1-b", "p2-a", "p3-a");
      // ヘッダ 1 行 + データ 4 行
      assertThat(body.split("\r\n")).hasSize(5);
    }

    @Test
    void writeReservationsCsv_statusNull_passesAllStatusesToRepository() throws IOException {
      when(reservationRepository.findForReport(anyCollection(), any(), any(), any()))
          .thenReturn(slice(List.of(), false));

      service.writeReservationsCsv(USER_ID, null, null, null, new ByteArrayOutputStream());

      ArgumentCaptor<java.util.Collection<ReservationStatus>> statuses =
          ArgumentCaptor.forClass(java.util.Collection.class);
      verify(reservationRepository).findForReport(statuses.capture(), any(), any(), any());
      assertThat(statuses.getValue()).containsExactlyInAnyOrder(ReservationStatus.values());
    }

    @Test
    void writeReservationsCsv_statusEmpty_passesAllStatusesToRepository() throws IOException {
      when(reservationRepository.findForReport(anyCollection(), any(), any(), any()))
          .thenReturn(slice(List.of(), false));

      service.writeReservationsCsv(USER_ID, List.of(), null, null, new ByteArrayOutputStream());

      ArgumentCaptor<java.util.Collection<ReservationStatus>> statuses =
          ArgumentCaptor.forClass(java.util.Collection.class);
      verify(reservationRepository).findForReport(statuses.capture(), any(), any(), any());
      assertThat(statuses.getValue()).containsExactlyInAnyOrder(ReservationStatus.values());
    }

    @Test
    void writeReservationsCsv_statusSpecified_passesOnlySpecifiedStatuses() throws IOException {
      when(reservationRepository.findForReport(anyCollection(), any(), any(), any()))
          .thenReturn(slice(List.of(), false));

      service.writeReservationsCsv(
          USER_ID,
          List.of(ReservationStatus.PENDING, ReservationStatus.APPROVED),
          null,
          null,
          new ByteArrayOutputStream());

      ArgumentCaptor<java.util.Collection<ReservationStatus>> statuses =
          ArgumentCaptor.forClass(java.util.Collection.class);
      verify(reservationRepository).findForReport(statuses.capture(), any(), any(), any());
      assertThat(statuses.getValue())
          .containsExactlyInAnyOrder(ReservationStatus.PENDING, ReservationStatus.APPROVED);
    }
  }

  // ---------------------------------------------------------------------------
  // 実行記録（ログ）
  // ---------------------------------------------------------------------------

  @Nested
  class ExecutionLog {

    @Test
    void writeReservationsCsv_completed_logsSingleInfoLineWithFieldsAndNoPii() throws IOException {
      when(reservationRepository.findForReport(anyCollection(), any(), any(), any()))
          .thenReturn(slice(List.of(reservation("秘密の利用目的")), false));

      service.writeReservationsCsv(
          USER_ID, List.of(ReservationStatus.APPROVED), T1, T2, new ByteArrayOutputStream());

      assertThat(logsAt(Level.INFO)).hasSize(1);
      assertThat(logsAt(Level.WARN)).isEmpty();
      String line = logsAt(Level.INFO).get(0).getFormattedMessage();
      assertThat(line)
          .contains("event=csv_export_completed")
          .contains("userId=" + USER_ID)
          .contains("statuses=[APPROVED]")
          .contains("rowCount=1")
          .contains("elapsedMs=")
          .doesNotContain("failureType")
          .doesNotContain("秘密の利用目的")
          .doesNotContain("山田 太郎")
          .doesNotContain("第1会議室");
    }

    @Test
    void writeReservationsCsv_outputStreamFails_logsWarnAndPropagatesIOException()
        throws IOException {
      when(reservationRepository.findForReport(anyCollection(), any(), any(), any()))
          .thenReturn(slice(List.of(reservation("秘密の利用目的")), false));
      OutputStream broken =
          new OutputStream() {
            @Override
            public void write(int b) throws IOException {
              throw new IOException("client disconnected: 秘密のメッセージ");
            }

            @Override
            public void write(byte[] b, int off, int len) throws IOException {
              throw new IOException("client disconnected: 秘密のメッセージ");
            }
          };

      assertThatThrownBy(() -> service.writeReservationsCsv(USER_ID, null, null, null, broken))
          .isInstanceOf(IOException.class);

      assertThat(logsAt(Level.INFO)).isEmpty();
      assertThat(logsAt(Level.WARN)).hasSize(1);
      String line = logsAt(Level.WARN).get(0).getFormattedMessage();
      assertThat(line)
          .contains("event=csv_export_aborted")
          .contains("userId=" + USER_ID)
          .contains("failureType=IOException")
          .doesNotContain("秘密のメッセージ")
          .doesNotContain("秘密の利用目的");
      // 例外メッセージ・スタックトレースはこの 1 行に含めない
      assertThat(logsAt(Level.WARN).get(0).getThrowableProxy()).isNull();
    }

    @Test
    void writeReservationsCsv_repositoryFails_logsWarnWithRowCountSoFarAndPropagates()
        throws IOException {
      when(reservationRepository.findForReport(anyCollection(), any(), any(), any()))
          .thenReturn(slice(List.of(reservation("p1-a"), reservation("p1-b")), true))
          .thenThrow(new IllegalStateException("db down: 内部情報"));

      assertThatThrownBy(
              () ->
                  service.writeReservationsCsv(
                      USER_ID, null, null, null, new ByteArrayOutputStream()))
          .isInstanceOf(IllegalStateException.class);

      assertThat(logsAt(Level.WARN)).hasSize(1);
      String line = logsAt(Level.WARN).get(0).getFormattedMessage();
      assertThat(line)
          .contains("event=csv_export_aborted")
          .contains("rowCount=2")
          .contains("failureType=IllegalStateException")
          .doesNotContain("内部情報");
    }

    @Test
    void writeReservationsCsv_invalidRange_logsNothing() {
      assertThatThrownBy(
              () ->
                  service.writeReservationsCsv(
                      USER_ID, new ArrayList<>(), T2, T1, new ByteArrayOutputStream()))
          .isInstanceOf(ValidationException.class);

      assertThat(logAppender.list).isEmpty();
    }
  }
}
