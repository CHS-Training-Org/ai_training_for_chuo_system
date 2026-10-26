package com.example.bookflow.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.example.bookflow.application.exception.ValidationException;
import com.example.bookflow.domain.Reservation;
import com.example.bookflow.domain.ReservationRepository;
import com.example.bookflow.domain.ReservationStatus;
import com.example.bookflow.domain.Resource;
import com.example.bookflow.domain.Role;
import com.example.bookflow.domain.User;
import java.lang.reflect.Field;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

/**
 * {@link ReservationReportService} 単体テスト（ADR-018 準拠・Mockito）。
 *
 * <p>期間の検証、並び順の指定、行 DTO への詰め替えを検証する。期間の境界（{@code to} の日を含む等）と JOIN FETCH の実際の挙動は、{@code
 * ReportControllerTest}（H2 の結合テスト）で確認する。
 *
 * <p>テスト命名規約（ADR-018）: {@code methodName_condition_expectedBehavior}
 */
@ExtendWith(MockitoExtension.class)
class ReservationReportServiceTest {

  @Mock private ReservationRepository reservationRepository;

  @InjectMocks private ReservationReportService service;

  // ---------------------------------------------------------------------------
  // テストヘルパー：リフレクションでエンティティのフィールドを設定する
  // ---------------------------------------------------------------------------

  private static Resource makeResource(String name) {
    Resource r = new Resource() {};
    setField(r, "id", UUID.fromString("73000000-0000-0000-0000-000000000001"));
    setField(r, "name", name);
    return r;
  }

  private static User makeUser(String name) {
    User u = new User() {};
    setField(u, "id", UUID.fromString("73000000-0000-0000-0000-000000000002"));
    setField(u, "name", name);
    setField(u, "role", Role.MEMBER);
    return u;
  }

  private static Reservation makeReservation(UUID id, String purpose, ReservationStatus status) {
    Reservation rv = new Reservation() {};
    setField(rv, "id", id);
    setField(rv, "resource", makeResource("第1会議室"));
    setField(rv, "requester", makeUser("山田 太郎"));
    setField(rv, "startAt", LocalDateTime.of(2026, 10, 2, 10, 0));
    setField(rv, "endAt", LocalDateTime.of(2026, 10, 2, 12, 0));
    setField(rv, "purpose", purpose);
    setField(rv, "status", status);
    return rv;
  }

  private static void setField(Object obj, String name, Object value) {
    try {
      Class<?> clazz = obj.getClass().getSuperclass();
      Field field = clazz.getDeclaredField(name);
      field.setAccessible(true);
      field.set(obj, value);
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }

  private void stubFindAllReturns(List<Reservation> reservations) {
    when(reservationRepository.findAll(
            ArgumentMatchers.<Specification<Reservation>>any(), any(Sort.class)))
        .thenReturn(reservations);
  }

  // ---------------------------------------------------------------------------
  // from / to の検証
  // ---------------------------------------------------------------------------

  @Test
  void findRows_fromAfterTo_throwsValidationExceptionWithoutQuerying() {
    assertThatThrownBy(
            () -> service.findRows(LocalDate.of(2026, 10, 31), LocalDate.of(2026, 10, 1), null))
        .isInstanceOf(ValidationException.class);

    verifyNoInteractions(reservationRepository);
  }

  @Test
  void findRows_fromEqualsTo_doesNotThrow() {
    stubFindAllReturns(List.of());
    LocalDate day = LocalDate.of(2026, 10, 15);

    assertThatCode(() -> service.findRows(day, day, null)).doesNotThrowAnyException();
  }

  @Test
  void findRows_onlyFrom_doesNotThrow() {
    stubFindAllReturns(List.of());

    assertThatCode(() -> service.findRows(LocalDate.of(2026, 10, 1), null, null))
        .doesNotThrowAnyException();
  }

  @Test
  void findRows_onlyTo_doesNotThrow() {
    stubFindAllReturns(List.of());

    assertThatCode(() -> service.findRows(null, LocalDate.of(2026, 10, 31), null))
        .doesNotThrowAnyException();
  }

  @Test
  void findRows_noConditions_doesNotThrow() {
    stubFindAllReturns(List.of());

    assertThat(service.findRows(null, null, null)).isEmpty();
    assertThat(service.findRows(null, null, List.of())).isEmpty();
  }

  // ---------------------------------------------------------------------------
  // 並び順
  // ---------------------------------------------------------------------------

  @Test
  void findRows_always_sortsByStartAtThenIdAscending() {
    stubFindAllReturns(List.of());

    service.findRows(null, null, List.of(ReservationStatus.APPROVED));

    ArgumentCaptor<Sort> sortCaptor = ArgumentCaptor.forClass(Sort.class);
    verify(reservationRepository)
        .findAll(ArgumentMatchers.<Specification<Reservation>>any(), sortCaptor.capture());
    List<Sort.Order> orders = sortCaptor.getValue().toList();
    assertThat(orders).hasSize(2);
    assertThat(orders.get(0).getProperty()).isEqualTo("startAt");
    assertThat(orders.get(0).isAscending()).isTrue();
    assertThat(orders.get(1).getProperty()).isEqualTo("id");
    assertThat(orders.get(1).isAscending()).isTrue();
  }

  // ---------------------------------------------------------------------------
  // 行 DTO への詰め替え
  // ---------------------------------------------------------------------------

  @Test
  void findRows_reservations_mappedToCsvRowsInRepositoryOrder() {
    UUID firstId = UUID.fromString("73000000-0000-0000-0000-0000000000a1");
    UUID secondId = UUID.fromString("73000000-0000-0000-0000-0000000000a2");
    stubFindAllReturns(
        List.of(
            makeReservation(firstId, "週次ミーティング", ReservationStatus.APPROVED),
            makeReservation(secondId, "=1+1", ReservationStatus.CANCELLED)));

    List<ReservationCsvRow> rows = service.findRows(null, null, null);

    assertThat(rows).hasSize(2);
    ReservationCsvRow first = rows.get(0);
    assertThat(first.id()).isEqualTo(firstId);
    assertThat(first.resourceName()).isEqualTo("第1会議室");
    assertThat(first.requesterName()).isEqualTo("山田 太郎");
    assertThat(first.startAt()).isEqualTo(LocalDateTime.of(2026, 10, 2, 10, 0));
    assertThat(first.endAt()).isEqualTo(LocalDateTime.of(2026, 10, 2, 12, 0));
    assertThat(first.purpose()).isEqualTo("週次ミーティング");
    assertThat(first.status()).isEqualTo(ReservationStatus.APPROVED);
    // 値は加工せずそのまま渡す（インジェクション対策は CSV 生成部の責務）
    assertThat(rows.get(1).id()).isEqualTo(secondId);
    assertThat(rows.get(1).purpose()).isEqualTo("=1+1");
    assertThat(rows.get(1).status()).isEqualTo(ReservationStatus.CANCELLED);
  }

  @Test
  void findRows_noReservations_returnsEmptyList() {
    stubFindAllReturns(List.of());

    assertThat(service.findRows(null, null, null)).isEmpty();
  }
}
