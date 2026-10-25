package com.example.bookflow.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.bookflow.domain.Reservation;
import com.example.bookflow.domain.ReservationRepository;
import com.example.bookflow.domain.ReservationStatus;
import com.example.bookflow.domain.Resource;
import com.example.bookflow.domain.User;
import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

/**
 * {@link ReservationReportService} 単体テスト（ADR-018 準拠・Mockito）。
 *
 * <p>{@link Specification} は不透明で、Repository をモックすると評価されない。そのため条件の中身（期間・ステータス、ステータスが null・空の
 * ときに条件を付けない分岐を含む）は {@code ReservationSpecificationsTest} と {@code ReportControllerTest}
 * で実クエリにより検証する。ここでは Repository 呼び出しの並び順と CSV の組み立てを確認する。
 *
 * <p>テスト命名規約（ADR-018）: {@code methodName_condition_expectedBehavior}
 */
@ExtendWith(MockitoExtension.class)
class ReservationReportServiceTest {

  private static final String HEADER = "予約ID,リソース名,申請者名,開始日時,終了日時,目的,承認状態";

  @Mock private ReservationRepository reservationRepository;

  @InjectMocks private ReservationReportService reportService;

  private static String text(byte[] csv) {
    return new String(csv, StandardCharsets.UTF_8);
  }

  @SuppressWarnings("unchecked")
  private void stubEmpty() {
    when(reservationRepository.findAll(any(Specification.class), any(Sort.class)))
        .thenReturn(List.of());
  }

  @Test
  @SuppressWarnings("unchecked")
  void exportReservationsCsv_noConditions_queriesSortedByStartAtAscending() {
    stubEmpty();

    reportService.exportReservationsCsv(null, null, null);

    ArgumentCaptor<Sort> sort = ArgumentCaptor.forClass(Sort.class);
    verify(reservationRepository).findAll(any(Specification.class), sort.capture());
    assertThat(sort.getValue()).isEqualTo(Sort.by("startAt").ascending());
  }

  @Test
  void exportReservationsCsv_noReservations_returnsBomAndHeaderOnly() {
    stubEmpty();

    byte[] csv = reportService.exportReservationsCsv(null, null, null);

    assertThat(text(csv)).isEqualTo("﻿" + HEADER + "\r\n");
  }

  @Test
  void exportReservationsCsv_nullOrEmptyStatuses_doesNotThrow() {
    stubEmpty();

    assertThat(reportService.exportReservationsCsv(null, null, null)).isNotEmpty();
    assertThat(reportService.exportReservationsCsv(null, null, List.of())).isNotEmpty();
  }

  @Test
  @SuppressWarnings("unchecked")
  void exportReservationsCsv_withAllConditions_queriesOnce() {
    stubEmpty();

    byte[] csv =
        reportService.exportReservationsCsv(
            LocalDateTime.of(2026, 6, 1, 0, 0),
            LocalDateTime.of(2026, 7, 1, 0, 0),
            List.of(ReservationStatus.PENDING, ReservationStatus.APPROVED));

    assertThat(text(csv)).startsWith("﻿" + HEADER);
    verify(reservationRepository).findAll(any(Specification.class), any(Sort.class));
  }

  @Test
  @SuppressWarnings("unchecked")
  void exportReservationsCsv_repositoryReturnsReservations_writesThemInReturnedOrder() {
    Reservation first = reservation("最初");
    Reservation second = reservation("次");
    when(reservationRepository.findAll(any(Specification.class), any(Sort.class)))
        .thenReturn(List.of(first, second));

    String csv = text(reportService.exportReservationsCsv(null, null, null));

    String[] lines = csv.split("\r\n");
    assertThat(lines).hasSize(3);
    assertThat(lines[1]).contains(",最初,");
    assertThat(lines[2]).contains(",次,");
  }

  private static Reservation reservation(String purpose) {
    Resource resource = new Resource() {};
    setField(resource, "name", "第1会議室");
    User user = new User() {};
    setField(user, "name", "山田 太郎");
    Reservation r =
        Reservation.create(
            resource,
            user,
            LocalDateTime.of(2026, 6, 2, 10, 0),
            LocalDateTime.of(2026, 6, 2, 12, 0),
            purpose,
            null,
            ReservationStatus.APPROVED);
    return r;
  }

  private static void setField(Object target, String name, Object value) {
    try {
      Class<?> type = target.getClass();
      Field f = null;
      while (f == null) {
        try {
          f = type.getDeclaredField(name);
        } catch (NoSuchFieldException e) {
          type = type.getSuperclass();
        }
      }
      f.setAccessible(true);
      f.set(target, value);
    } catch (ReflectiveOperationException e) {
      throw new RuntimeException(e);
    }
  }
}
