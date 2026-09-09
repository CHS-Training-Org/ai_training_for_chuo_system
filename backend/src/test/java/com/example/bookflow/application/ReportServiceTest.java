package com.example.bookflow.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.bookflow.domain.Reservation;
import com.example.bookflow.domain.ReservationRepository;
import com.example.bookflow.domain.ReservationStatus;
import com.example.bookflow.domain.Resource;
import com.example.bookflow.domain.ResourceCategory;
import com.example.bookflow.domain.Role;
import com.example.bookflow.domain.User;
import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

/**
 * {@link ReportService} 単体テスト（ADR-018 準拠・Mockito）。
 *
 * <p>CSV 列マッピング・エスケープ処理・期間×ステータスの4分岐データ取得・境界値を検証する。 テスト命名規約（ADR-018）: {@code
 * methodName_condition_expectedBehavior}
 */
@ExtendWith(MockitoExtension.class)
class ReportServiceTest {

  @Mock private ReservationRepository reservationRepository;

  @InjectMocks private ReportService reportService;

  private static final byte[] UTF8_BOM = {(byte) 0xEF, (byte) 0xBB, (byte) 0xBF};

  // ---------------------------------------------------------------------------
  // テストヘルパー：リフレクションでエンティティのフィールドを設定する
  // ---------------------------------------------------------------------------

  private static Resource makeResource(UUID id, String name) {
    try {
      Resource r = new Resource() {};
      setField(r, "id", id);
      setField(r, "name", name);
      setField(r, "category", ResourceCategory.ROOM);
      setField(r, "isActive", true);
      setField(r, "requiresApproval", false);
      setField(r, "createdAt", LocalDateTime.of(2025, 4, 1, 9, 0));
      return r;
    } catch (Exception e) {
      throw new RuntimeException(e);
    }
  }

  private static User makeUser(UUID id, String name) {
    try {
      User u = new User() {};
      setField(u, "id", id);
      setField(u, "name", name);
      setField(u, "cognitoSub", "test-sub-" + id);
      setField(u, "email", "test-" + id + "@example.com");
      setField(u, "role", Role.MEMBER);
      setField(u, "createdAt", LocalDateTime.of(2025, 4, 1, 9, 0));
      return u;
    } catch (Exception e) {
      throw new RuntimeException(e);
    }
  }

  private static Reservation makeReservation(
      Resource resource,
      User requester,
      LocalDateTime start,
      LocalDateTime end,
      String purpose,
      ReservationStatus status) {
    try {
      Reservation rv = new Reservation() {};
      setField(rv, "id", UUID.fromString("30000000-0000-0000-0000-000000000001"));
      setField(rv, "resource", resource);
      setField(rv, "requester", requester);
      setField(rv, "startAt", start);
      setField(rv, "endAt", end);
      setField(rv, "purpose", purpose);
      setField(rv, "status", status);
      setField(rv, "createdAt", LocalDateTime.of(2025, 6, 1, 9, 0));
      setField(rv, "updatedAt", LocalDateTime.of(2025, 6, 1, 9, 0));
      return rv;
    } catch (Exception e) {
      throw new RuntimeException(e);
    }
  }

  private static void setField(Object obj, String name, Object value) throws Exception {
    Class<?> clazz = obj.getClass().getSuperclass();
    if (clazz == Object.class) clazz = obj.getClass();
    Field field;
    try {
      field = clazz.getDeclaredField(name);
    } catch (NoSuchFieldException e) {
      field = clazz.getSuperclass().getDeclaredField(name);
    }
    field.setAccessible(true);
    field.set(obj, value);
  }

  private static String toText(byte[] csvBytes) {
    return new String(csvBytes, StandardCharsets.UTF_8).substring(1); // BOM 分を除く
  }

  // ---------------------------------------------------------------------------
  // データ取得の4分岐
  // ---------------------------------------------------------------------------

  @Nested
  class FindReservationsBranching {

    @Test
    void generateReservationsCsv_noFilters_callsFindAllFetch() {
      when(reservationRepository.findAllFetch(Pageable.unpaged()))
          .thenReturn(new PageImpl<>(List.of()));

      reportService.generateReservationsCsv(List.of(), null, null);

      verify(reservationRepository).findAllFetch(Pageable.unpaged());
      verify(reservationRepository, never())
          .findByStatusInFetch(anyCollection(), eq(Pageable.unpaged()));
    }

    @Test
    void generateReservationsCsv_statusOnly_callsFindByStatusInFetch() {
      List<ReservationStatus> statuses = List.of(ReservationStatus.APPROVED);
      when(reservationRepository.findByStatusInFetch(statuses, Pageable.unpaged()))
          .thenReturn(new PageImpl<>(List.of()));

      reportService.generateReservationsCsv(statuses, null, null);

      verify(reservationRepository).findByStatusInFetch(statuses, Pageable.unpaged());
      verify(reservationRepository, never()).findAllFetch(Pageable.unpaged());
    }

    @Test
    void generateReservationsCsv_periodOnly_callsFindByPeriodFetch() {
      LocalDateTime from = LocalDateTime.of(2026, 1, 1, 0, 0);
      LocalDateTime to = LocalDateTime.of(2026, 2, 1, 0, 0);
      when(reservationRepository.findByPeriodFetch(from, to, Pageable.unpaged()))
          .thenReturn(new PageImpl<>(List.of()));

      reportService.generateReservationsCsv(List.of(), from, to);

      verify(reservationRepository).findByPeriodFetch(from, to, Pageable.unpaged());
      verify(reservationRepository, never()).findAllFetch(Pageable.unpaged());
    }

    @Test
    void generateReservationsCsv_periodAndStatus_callsFindByPeriodAndStatusInFetch() {
      LocalDateTime from = LocalDateTime.of(2026, 1, 1, 0, 0);
      LocalDateTime to = LocalDateTime.of(2026, 2, 1, 0, 0);
      List<ReservationStatus> statuses =
          List.of(ReservationStatus.PENDING, ReservationStatus.APPROVED);
      when(reservationRepository.findByPeriodAndStatusInFetch(
              from, to, statuses, Pageable.unpaged()))
          .thenReturn(new PageImpl<>(List.of()));

      reportService.generateReservationsCsv(statuses, from, to);

      verify(reservationRepository)
          .findByPeriodAndStatusInFetch(from, to, statuses, Pageable.unpaged());
    }
  }

  // ---------------------------------------------------------------------------
  // CSV 出力内容
  // ---------------------------------------------------------------------------

  @Nested
  class CsvContent {

    @Test
    void generateReservationsCsv_hasBom_prefixesUtf8Bom() {
      when(reservationRepository.findAllFetch(Pageable.unpaged()))
          .thenReturn(new PageImpl<>(List.of()));

      byte[] result = reportService.generateReservationsCsv(List.of(), null, null);

      assertThat(result[0]).isEqualTo(UTF8_BOM[0]);
      assertThat(result[1]).isEqualTo(UTF8_BOM[1]);
      assertThat(result[2]).isEqualTo(UTF8_BOM[2]);
    }

    @Test
    void generateReservationsCsv_noReservations_returnsHeaderOnly() {
      when(reservationRepository.findAllFetch(Pageable.unpaged()))
          .thenReturn(new PageImpl<>(List.of()));

      byte[] result = reportService.generateReservationsCsv(List.of(), null, null);

      assertThat(toText(result)).isEqualTo("予約ID,リソース名,申請者名,開始日時,終了日時,目的,承認状態\r\n");
    }

    @Test
    void generateReservationsCsv_hasReservation_mapsColumnsAndJapaneseStatusLabel() {
      Resource resource = makeResource(UUID.randomUUID(), "第1会議室");
      User requester = makeUser(UUID.randomUUID(), "山田太郎");
      Reservation reservation =
          makeReservation(
              resource,
              requester,
              LocalDateTime.of(2026, 9, 9, 10, 0),
              LocalDateTime.of(2026, 9, 9, 12, 0),
              "定例会議",
              ReservationStatus.APPROVED);
      when(reservationRepository.findAllFetch(Pageable.unpaged()))
          .thenReturn(new PageImpl<>(List.of(reservation)));

      byte[] result = reportService.generateReservationsCsv(List.of(), null, null);

      String[] lines = toText(result).split("\r\n", -1);
      assertThat(lines[0]).isEqualTo("予約ID,リソース名,申請者名,開始日時,終了日時,目的,承認状態");
      assertThat(lines[1])
          .isEqualTo(
              reservation.getId() + ",第1会議室,山田太郎,2026/09/09 10:00,2026/09/09 12:00,定例会議,承認済み");
    }

    @Test
    void generateReservationsCsv_purposeContainsComma_isQuoted() {
      Resource resource = makeResource(UUID.randomUUID(), "第1会議室");
      User requester = makeUser(UUID.randomUUID(), "山田太郎");
      Reservation reservation =
          makeReservation(
              resource,
              requester,
              LocalDateTime.of(2026, 9, 9, 10, 0),
              LocalDateTime.of(2026, 9, 9, 12, 0),
              "予算会議,経費精算",
              ReservationStatus.PENDING);
      when(reservationRepository.findAllFetch(Pageable.unpaged()))
          .thenReturn(new PageImpl<>(List.of(reservation)));

      byte[] result = reportService.generateReservationsCsv(List.of(), null, null);

      assertThat(toText(result)).contains("\"予算会議,経費精算\"");
    }

    @Test
    void generateReservationsCsv_purposeContainsDoubleQuote_isDoubledAndQuoted() {
      Resource resource = makeResource(UUID.randomUUID(), "第1会議室");
      User requester = makeUser(UUID.randomUUID(), "山田太郎");
      Reservation reservation =
          makeReservation(
              resource,
              requester,
              LocalDateTime.of(2026, 9, 9, 10, 0),
              LocalDateTime.of(2026, 9, 9, 12, 0),
              "\"重要\"な会議",
              ReservationStatus.PENDING);
      when(reservationRepository.findAllFetch(Pageable.unpaged()))
          .thenReturn(new PageImpl<>(List.of(reservation)));

      byte[] result = reportService.generateReservationsCsv(List.of(), null, null);

      assertThat(toText(result)).contains("\"\"\"重要\"\"な会議\"");
    }

    @Test
    void generateReservationsCsv_purposeContainsNewline_isQuoted() {
      Resource resource = makeResource(UUID.randomUUID(), "第1会議室");
      User requester = makeUser(UUID.randomUUID(), "山田太郎");
      Reservation reservation =
          makeReservation(
              resource,
              requester,
              LocalDateTime.of(2026, 9, 9, 10, 0),
              LocalDateTime.of(2026, 9, 9, 12, 0),
              "1行目\n2行目",
              ReservationStatus.PENDING);
      when(reservationRepository.findAllFetch(Pageable.unpaged()))
          .thenReturn(new PageImpl<>(List.of(reservation)));

      byte[] result = reportService.generateReservationsCsv(List.of(), null, null);

      assertThat(toText(result)).contains("\"1行目\n2行目\"");
    }
  }
}
