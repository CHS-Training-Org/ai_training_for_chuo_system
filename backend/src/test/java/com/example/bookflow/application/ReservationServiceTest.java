package com.example.bookflow.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.bookflow.application.exception.BusinessException;
import com.example.bookflow.application.exception.ErrorCode;
import com.example.bookflow.application.exception.ReservationConflictException;
import com.example.bookflow.application.exception.ResourceNotFoundException;
import com.example.bookflow.application.exception.ValidationException;
import com.example.bookflow.domain.RecurrenceType;
import com.example.bookflow.domain.Reservation;
import com.example.bookflow.domain.ReservationRepository;
import com.example.bookflow.domain.ReservationStatus;
import com.example.bookflow.domain.Resource;
import com.example.bookflow.domain.ResourceCategory;
import com.example.bookflow.domain.ResourceRepository;
import com.example.bookflow.domain.Role;
import com.example.bookflow.domain.User;
import com.example.bookflow.presentation.dto.CreateReservationRequest;
import com.example.bookflow.presentation.dto.ReservationResponse;
import com.example.bookflow.presentation.dto.UpdateReservationRequest;
import java.lang.reflect.Field;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;

/**
 * {@link ReservationService} 単体テスト（ADR-018 準拠・Mockito）。
 *
 * <p>業務ルール（重複予約チェック・requires_approval 分岐・所有権チェック・ステータスガード）を単体で検証する。 テスト命名規約（ADR-018）: {@code
 * methodName_condition_expectedBehavior}
 */
@ExtendWith(MockitoExtension.class)
class ReservationServiceTest {

  @Mock private ReservationRepository reservationRepository;
  @Mock private ResourceRepository resourceRepository;
  @Mock private ApprovalService approvalService;

  @InjectMocks private ReservationService reservationService;

  // ---------------------------------------------------------------------------
  // テストヘルパー：リフレクションでエンティティのフィールドを設定する
  // ---------------------------------------------------------------------------

  private static Resource makeResource(UUID id, boolean requiresApproval) {
    try {
      Resource r = new Resource() {};
      setField(r, "id", id);
      setField(r, "name", "テスト会議室");
      setField(r, "category", ResourceCategory.ROOM);
      setField(r, "isActive", true);
      setField(r, "requiresApproval", requiresApproval);
      setField(r, "createdAt", LocalDateTime.of(2025, 4, 1, 9, 0));
      return r;
    } catch (Exception e) {
      throw new RuntimeException(e);
    }
  }

  private static User makeUser(UUID id, Role role) {
    try {
      User u = new User() {};
      setField(u, "id", id);
      setField(u, "name", "テストユーザー");
      setField(u, "cognitoSub", "test-sub-" + id);
      setField(u, "email", "test-" + id + "@example.com");
      setField(u, "role", role);
      setField(u, "createdAt", LocalDateTime.of(2025, 4, 1, 9, 0));
      return u;
    } catch (Exception e) {
      throw new RuntimeException(e);
    }
  }

  private static Reservation makeReservation(
      UUID id,
      Resource resource,
      User requester,
      LocalDateTime start,
      LocalDateTime end,
      ReservationStatus status) {
    try {
      Reservation rv = new Reservation() {};
      setField(rv, "id", id);
      setField(rv, "resource", resource);
      setField(rv, "requester", requester);
      setField(rv, "startAt", start);
      setField(rv, "endAt", end);
      setField(rv, "status", status);
      setField(rv, "purpose", "テスト会議");
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

  // ---------------------------------------------------------------------------
  // create — 予約申請
  // ---------------------------------------------------------------------------

  @Nested
  class Create {

    private final UUID resourceId = UUID.fromString("20000000-0000-0000-0000-000000000001");
    private final UUID userId = UUID.fromString("20000000-0000-0000-0000-000000000002");
    private final LocalDateTime start = LocalDateTime.of(2025, 6, 10, 10, 0);
    private final LocalDateTime end = LocalDateTime.of(2025, 6, 10, 12, 0);

    private Resource resource;
    private User requester;

    @BeforeEach
    void setUp() {
      resource = makeResource(resourceId, false);
      requester = makeUser(userId, Role.MEMBER);
      // findByIdForUpdate: 悲観ロック取得（create/update の重複チェック直列化に使用）
      lenient()
          .when(resourceRepository.findByIdForUpdate(resourceId))
          .thenReturn(Optional.of(resource));
      lenient()
          .when(reservationRepository.findByResource_IdAndStatusIn(eq(resourceId), anyCollection()))
          .thenReturn(List.of());
      lenient()
          .when(reservationRepository.save(any(Reservation.class)))
          .thenAnswer(inv -> inv.getArgument(0));
      // ApprovalService.createInitialStep は void のため lenient doNothing で登録
      // requires_approval=true のテストのみ実際に呼ばれるが、他テストで UnnecessaryStubbingException を
      // 防ぐため lenient() を使用（Cat 5 と同じパターン）
      lenient().doNothing().when(approvalService).createInitialStep(any(Reservation.class));
    }

    @Test
    void create_noConflictRequiresApprovalFalse_returnsApproved() {
      CreateReservationRequest req =
          new CreateReservationRequest(resourceId, start, end, "週次ミーティング", 5, false, null, null);

      ReservationResponse response = reservationService.create(req, requester).get(0);

      assertThat(response.status()).isEqualTo("APPROVED");
      assertThat(response.resourceId()).isEqualTo(resourceId);
    }

    @Test
    void create_noConflictRequiresApprovalTrue_returnsPending() throws Exception {
      setField(resource, "requiresApproval", true);
      CreateReservationRequest req =
          new CreateReservationRequest(resourceId, start, end, "承認が必要な会議", null, false, null, null);

      ReservationResponse response = reservationService.create(req, requester).get(0);

      assertThat(response.status()).isEqualTo("PENDING");
    }

    @Test
    void create_withConflict_throwsReservationConflictException() {
      // 重複する既存予約を stub
      Reservation existing =
          makeReservation(
              UUID.randomUUID(),
              resource,
              requester,
              start.minusHours(1),
              start.plusHours(1),
              ReservationStatus.APPROVED);
      when(reservationRepository.findByResource_IdAndStatusIn(eq(resourceId), anyCollection()))
          .thenReturn(List.of(existing));

      CreateReservationRequest req =
          new CreateReservationRequest(resourceId, start, end, "テスト", null, false, null, null);

      assertThatThrownBy(() -> reservationService.create(req, requester))
          .isInstanceOf(ReservationConflictException.class);
    }

    @Test
    void create_adjacentReservation_returnsApproved() {
      // 隣接する既存予約（end == start）は重複ではない
      Reservation existing =
          makeReservation(
              UUID.randomUUID(),
              resource,
              requester,
              start.minusHours(2),
              start, // end == start
              ReservationStatus.APPROVED);
      when(reservationRepository.findByResource_IdAndStatusIn(eq(resourceId), anyCollection()))
          .thenReturn(List.of(existing));

      CreateReservationRequest req =
          new CreateReservationRequest(resourceId, start, end, "テスト", null, false, null, null);

      ReservationResponse response = reservationService.create(req, requester).get(0);

      assertThat(response.status()).isEqualTo("APPROVED");
    }

    @Test
    void create_endBeforeStart_throwsBusinessException() {
      CreateReservationRequest req =
          new CreateReservationRequest(
              resourceId, end, start, "テスト", null, false, null, null); // endAt < startAt

      assertThatThrownBy(() -> reservationService.create(req, requester))
          .isInstanceOf(BusinessException.class);
    }

    @Test
    void create_resourceNotFound_throwsResourceNotFoundException() {
      UUID unknownId = UUID.randomUUID();
      when(resourceRepository.findByIdForUpdate(unknownId)).thenReturn(Optional.empty());

      CreateReservationRequest req =
          new CreateReservationRequest(unknownId, start, end, "テスト", null, false, null, null);

      assertThatThrownBy(() -> reservationService.create(req, requester))
          .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void create_draftTrueRequiresApprovalTrue_returnsDraftWithoutApprovalStep() throws Exception {
      // requires_approval=true のリソースでも draft=true なら承認ステップは作成されない
      setField(resource, "requiresApproval", true);
      CreateReservationRequest req =
          new CreateReservationRequest(resourceId, start, end, "下書き", null, true, null, null);

      ReservationResponse response = reservationService.create(req, requester).get(0);

      assertThat(response.status()).isEqualTo("DRAFT");
      org.mockito.Mockito.verify(approvalService, org.mockito.Mockito.never())
          .createInitialStep(any(Reservation.class));
    }

    @Test
    void create_draftTrueRequiresApprovalFalse_returnsDraft() {
      // requires_approval=false のリソースでも draft=true なら APPROVED ではなく DRAFT
      CreateReservationRequest req =
          new CreateReservationRequest(resourceId, start, end, "下書き", null, true, null, null);

      ReservationResponse response = reservationService.create(req, requester).get(0);

      assertThat(response.status()).isEqualTo("DRAFT");
    }
  }

  // ---------------------------------------------------------------------------
  // create — 繰り返し予約（recurring-reservation ユニット）
  // ---------------------------------------------------------------------------

  @Nested
  class CreateRecurring {

    private final UUID resourceId = UUID.fromString("40000000-0000-0000-0000-000000000001");
    private final UUID userId = UUID.fromString("40000000-0000-0000-0000-000000000002");
    // 2026-11-02 は月曜
    private final LocalDateTime start = LocalDateTime.of(2026, 11, 2, 10, 0);
    private final LocalDateTime end = LocalDateTime.of(2026, 11, 2, 11, 0);

    private Resource resource;
    private User requester;

    @BeforeEach
    void setUp() {
      resource = makeResource(resourceId, false);
      requester = makeUser(userId, Role.MEMBER);
      lenient()
          .when(resourceRepository.findByIdForUpdate(resourceId))
          .thenReturn(Optional.of(resource));
      lenient()
          .when(reservationRepository.findByResource_IdAndStatusIn(eq(resourceId), anyCollection()))
          .thenReturn(List.of());
      lenient()
          .when(reservationRepository.save(any(Reservation.class)))
          .thenAnswer(inv -> inv.getArgument(0));
      lenient().doNothing().when(approvalService).createInitialStep(any(Reservation.class));
    }

    private CreateReservationRequest request(
        LocalDateTime startAt,
        LocalDateTime endAt,
        boolean draft,
        RecurrenceType type,
        LocalDate until) {
      return new CreateReservationRequest(
          resourceId, startAt, endAt, "定例会議", null, draft, type, until);
    }

    private CreateReservationRequest weekly(LocalDate until) {
      return request(start, end, false, RecurrenceType.WEEKLY, until);
    }

    // ---- 日程の生成 ----

    @Test
    void create_weekly_createsOneReservationPerWeekIncludingUntilDay() {
      List<ReservationResponse> responses =
          reservationService.create(weekly(LocalDate.of(2026, 11, 23)), requester);

      assertThat(responses)
          .extracting(ReservationResponse::startAt)
          .containsExactly(
              LocalDateTime.of(2026, 11, 2, 10, 0),
              LocalDateTime.of(2026, 11, 9, 10, 0),
              LocalDateTime.of(2026, 11, 16, 10, 0),
              LocalDateTime.of(2026, 11, 23, 10, 0));
      assertThat(responses)
          .extracting(ReservationResponse::endAt)
          .containsExactly(
              LocalDateTime.of(2026, 11, 2, 11, 0),
              LocalDateTime.of(2026, 11, 9, 11, 0),
              LocalDateTime.of(2026, 11, 16, 11, 0),
              LocalDateTime.of(2026, 11, 23, 11, 0));
      verify(reservationRepository, times(4)).save(any(Reservation.class));
    }

    @Test
    void create_weekly_sharesOneSeriesIdAndRecurrenceSettings() {
      List<ReservationResponse> responses =
          reservationService.create(weekly(LocalDate.of(2026, 11, 23)), requester);

      UUID seriesId = responses.get(0).seriesId();
      assertThat(seriesId).isNotNull();
      assertThat(responses).extracting(ReservationResponse::seriesId).containsOnly(seriesId);
      assertThat(responses).extracting(ReservationResponse::recurrenceType).containsOnly("WEEKLY");
      assertThat(responses)
          .extracting(ReservationResponse::recurrenceUntil)
          .containsOnly(LocalDate.of(2026, 11, 23));
      // 申請のレスポンスでは件数を数えない
      assertThat(responses).extracting(ReservationResponse::seriesCount).containsOnlyNulls();
      assertThat(responses).extracting(ReservationResponse::remainingCount).containsOnlyNulls();
    }

    @Test
    void create_monthlyDay31_skipsMonthsWithoutThatDay() {
      CreateReservationRequest req =
          request(
              LocalDateTime.of(2026, 1, 31, 10, 0),
              LocalDateTime.of(2026, 1, 31, 11, 0),
              false,
              RecurrenceType.MONTHLY,
              LocalDate.of(2026, 5, 31));

      List<ReservationResponse> responses = reservationService.create(req, requester);

      assertThat(responses)
          .extracting(ReservationResponse::startAt)
          .containsExactly(
              LocalDateTime.of(2026, 1, 31, 10, 0),
              LocalDateTime.of(2026, 3, 31, 10, 0),
              LocalDateTime.of(2026, 5, 31, 10, 0));
    }

    @Test
    void create_overnightWeekly_keepsTheSameLengthForEachOccurrence() {
      CreateReservationRequest req =
          request(
              LocalDateTime.of(2026, 11, 2, 23, 0),
              LocalDateTime.of(2026, 11, 3, 2, 0),
              false,
              RecurrenceType.WEEKLY,
              LocalDate.of(2026, 11, 9));

      List<ReservationResponse> responses = reservationService.create(req, requester);

      assertThat(responses).hasSize(2);
      assertThat(responses.get(1).startAt()).isEqualTo(LocalDateTime.of(2026, 11, 9, 23, 0));
      assertThat(responses.get(1).endAt()).isEqualTo(LocalDateTime.of(2026, 11, 10, 2, 0));
    }

    @Test
    void create_untilSameDayAsStart_createsOneReservationWithSeriesId() {
      List<ReservationResponse> responses =
          reservationService.create(weekly(LocalDate.of(2026, 11, 2)), requester);

      assertThat(responses).hasSize(1);
      assertThat(responses.get(0).seriesId()).isNotNull();
      assertThat(responses.get(0).recurrenceType()).isEqualTo("WEEKLY");
    }

    @Test
    void create_none_hasNoSeriesAndKeepsNoneType() {
      CreateReservationRequest req = request(start, end, false, RecurrenceType.NONE, null);

      List<ReservationResponse> responses = reservationService.create(req, requester);

      assertThat(responses).hasSize(1);
      assertThat(responses.get(0).seriesId()).isNull();
      assertThat(responses.get(0).recurrenceType()).isEqualTo("NONE");
      assertThat(responses.get(0).recurrenceUntil()).isNull();
    }

    @Test
    void create_recurrenceTypeOmitted_treatedAsNone() {
      CreateReservationRequest req = request(start, end, false, null, null);

      List<ReservationResponse> responses = reservationService.create(req, requester);

      assertThat(responses).hasSize(1);
      assertThat(responses.get(0).recurrenceType()).isEqualTo("NONE");
    }

    // ---- 繰り返し指定の検証（400） ----

    @Test
    void create_noneWithUntil_throwsValidationExceptionBeforeLocking() {
      CreateReservationRequest req =
          request(start, end, false, RecurrenceType.NONE, LocalDate.of(2026, 11, 30));

      assertThatThrownBy(() -> reservationService.create(req, requester))
          .isInstanceOf(ValidationException.class);
      verify(resourceRepository, never()).findByIdForUpdate(any(UUID.class));
      verify(reservationRepository, never()).save(any(Reservation.class));
    }

    @Test
    void create_weeklyWithoutUntil_throwsValidationException() {
      CreateReservationRequest req = request(start, end, false, RecurrenceType.WEEKLY, null);

      assertThatThrownBy(() -> reservationService.create(req, requester))
          .isInstanceOf(ValidationException.class);
      verify(resourceRepository, never()).findByIdForUpdate(any(UUID.class));
    }

    @Test
    void create_monthlyWithoutUntil_throwsValidationException() {
      CreateReservationRequest req = request(start, end, false, RecurrenceType.MONTHLY, null);

      assertThatThrownBy(() -> reservationService.create(req, requester))
          .isInstanceOf(ValidationException.class);
    }

    @Test
    void create_untilBeforeStartDate_throwsValidationException() {
      assertThatThrownBy(
              () -> reservationService.create(weekly(LocalDate.of(2026, 11, 1)), requester))
          .isInstanceOf(ValidationException.class);
      verify(resourceRepository, never()).findByIdForUpdate(any(UUID.class));
    }

    // ---- 終了日の上限（開始日から 2 年以内） ----

    @Test
    void create_untilExactlyTwoYearsAfterStart_isAccepted() {
      // 2026-11-02 の 2 年後は 2028-11-02。終了日がちょうどその日なら有効（月曜は 105 回）
      List<ReservationResponse> responses =
          reservationService.create(weekly(LocalDate.of(2028, 11, 2)), requester);

      assertThat(responses).hasSize(105);
    }

    @Test
    void create_untilOneDayOverTwoYears_throwsValidationExceptionBeforeLocking() {
      assertThatThrownBy(
              () -> reservationService.create(weekly(LocalDate.of(2028, 11, 3)), requester))
          .isInstanceOf(ValidationException.class)
          .hasMessageContaining("2 年以内");
      verify(resourceRepository, never()).findByIdForUpdate(any(UUID.class));
      verify(reservationRepository, never()).save(any(Reservation.class));
    }

    @Test
    void create_monthlyUntilOverTwoYears_throwsValidationException() {
      CreateReservationRequest req =
          request(start, end, false, RecurrenceType.MONTHLY, LocalDate.of(2029, 1, 1));

      assertThatThrownBy(() -> reservationService.create(req, requester))
          .isInstanceOf(ValidationException.class);
    }

    @Test
    void create_draftUntilOverTwoYears_throwsValidationException() {
      CreateReservationRequest req =
          request(start, end, true, RecurrenceType.WEEKLY, LocalDate.of(2030, 1, 1));

      assertThatThrownBy(() -> reservationService.create(req, requester))
          .isInstanceOf(ValidationException.class);
    }

    @Test
    void create_startOnLeapDay_limitIsFebruary28TwoYearsLater() {
      // 2028-02-29 の 2 年後は 2030-02-28（2030 年は平年）。その日までは有効で、翌日は超過
      LocalDateTime leapStart = LocalDateTime.of(2028, 2, 29, 10, 0);
      LocalDateTime leapEnd = LocalDateTime.of(2028, 2, 29, 11, 0);

      assertThat(
              reservationService.create(
                  request(
                      leapStart, leapEnd, false, RecurrenceType.MONTHLY, LocalDate.of(2030, 2, 28)),
                  requester))
          .isNotEmpty();
      assertThatThrownBy(
              () ->
                  reservationService.create(
                      request(
                          leapStart,
                          leapEnd,
                          false,
                          RecurrenceType.MONTHLY,
                          LocalDate.of(2030, 3, 1)),
                      requester))
          .isInstanceOf(ValidationException.class);
    }

    @Test
    void create_noneIgnoresTwoYearLimit_becauseUntilIsNotAllowed() {
      // NONE は終了日そのものが指定不可（上限の判定には到達しない）
      CreateReservationRequest req =
          request(start, end, false, RecurrenceType.NONE, LocalDate.of(2030, 1, 1));

      assertThatThrownBy(() -> reservationService.create(req, requester))
          .isInstanceOf(ValidationException.class)
          .hasMessageContaining("指定できません");
    }

    // ---- 重複判定（全件ロールバック） ----

    @Test
    void create_oneOccurrenceConflictsWithExisting_throwsAndSavesNothing() {
      // 3 回目（11/16 10:00-11:00）だけが既存の承認済み予約と重なる
      Reservation existing =
          makeReservation(
              UUID.randomUUID(),
              resource,
              requester,
              LocalDateTime.of(2026, 11, 16, 10, 30),
              LocalDateTime.of(2026, 11, 16, 11, 30),
              ReservationStatus.APPROVED);
      when(reservationRepository.findByResource_IdAndStatusIn(eq(resourceId), anyCollection()))
          .thenReturn(List.of(existing));

      assertThatThrownBy(
              () -> reservationService.create(weekly(LocalDate.of(2026, 11, 23)), requester))
          .isInstanceOf(ReservationConflictException.class);
      verify(reservationRepository, never()).save(any(Reservation.class));
      verify(approvalService, never()).createInitialStep(any(Reservation.class));
    }

    @Test
    void create_existingAdjacentToEachOccurrence_isNotConflict() {
      // 各回 10:00-11:00 に対し、既存の予約が 09:00-10:00 で境界が接するだけ
      Reservation existing =
          makeReservation(
              UUID.randomUUID(),
              resource,
              requester,
              LocalDateTime.of(2026, 11, 9, 9, 0),
              LocalDateTime.of(2026, 11, 9, 10, 0),
              ReservationStatus.APPROVED);
      when(reservationRepository.findByResource_IdAndStatusIn(eq(resourceId), anyCollection()))
          .thenReturn(List.of(existing));

      List<ReservationResponse> responses =
          reservationService.create(weekly(LocalDate.of(2026, 11, 23)), requester);

      assertThat(responses).hasSize(4);
    }

    @Test
    void create_occurrencesOverlapEachOther_throwsAndSavesNothing() {
      // 8 日間の予約の毎週の繰り返し。1 回目（11/02-11/10）と 2 回目（11/09-11/17）が重なる
      CreateReservationRequest req =
          request(
              LocalDateTime.of(2026, 11, 2, 10, 0),
              LocalDateTime.of(2026, 11, 10, 10, 0),
              false,
              RecurrenceType.WEEKLY,
              LocalDate.of(2026, 11, 9));

      assertThatThrownBy(() -> reservationService.create(req, requester))
          .isInstanceOf(ReservationConflictException.class);
      verify(reservationRepository, never()).save(any(Reservation.class));
    }

    @Test
    void create_draftOccurrencesOverlapEachOther_throwsAndSavesNothing() {
      CreateReservationRequest req =
          request(
              LocalDateTime.of(2026, 11, 2, 10, 0),
              LocalDateTime.of(2026, 11, 10, 10, 0),
              true,
              RecurrenceType.WEEKLY,
              LocalDate.of(2026, 11, 9));

      assertThatThrownBy(() -> reservationService.create(req, requester))
          .isInstanceOf(ReservationConflictException.class);
      verify(reservationRepository, never()).save(any(Reservation.class));
    }

    @Test
    void create_occurrencesExactlyAdjacent_isNotSelfConflict() {
      // 7 日間の予約の毎週の繰り返し。前の回の終了と次の回の開始が一致するだけ（重複ではない）
      CreateReservationRequest req =
          request(
              LocalDateTime.of(2026, 11, 2, 10, 0),
              LocalDateTime.of(2026, 11, 9, 10, 0),
              false,
              RecurrenceType.WEEKLY,
              LocalDate.of(2026, 11, 16));

      List<ReservationResponse> responses = reservationService.create(req, requester);

      assertThat(responses).hasSize(3);
    }

    @Test
    void create_weekly_fetchesExistingReservationsOnlyOnce() {
      reservationService.create(weekly(LocalDate.of(2026, 11, 23)), requester);

      verify(reservationRepository, times(1))
          .findByResource_IdAndStatusIn(eq(resourceId), anyCollection());
    }

    @Test
    void create_resourceNotFound_throwsResourceNotFoundException() {
      UUID unknownId = UUID.randomUUID();
      when(resourceRepository.findByIdForUpdate(unknownId)).thenReturn(Optional.empty());
      CreateReservationRequest req =
          new CreateReservationRequest(
              unknownId,
              start,
              end,
              "定例会議",
              null,
              false,
              RecurrenceType.WEEKLY,
              LocalDate.of(2026, 11, 23));

      assertThatThrownBy(() -> reservationService.create(req, requester))
          .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void create_weeklyEndBeforeStart_throwsBusinessException() {
      CreateReservationRequest req =
          request(end, start, false, RecurrenceType.WEEKLY, LocalDate.of(2026, 11, 23));

      assertThatThrownBy(() -> reservationService.create(req, requester))
          .isInstanceOf(BusinessException.class);
      verify(reservationRepository, never()).save(any(Reservation.class));
    }

    // ---- ステータスと承認ステップ ----

    @Test
    void create_weeklyDraft_createsAllAsDraftWithoutApprovalSteps() throws Exception {
      setField(resource, "requiresApproval", true);
      CreateReservationRequest req =
          request(start, end, true, RecurrenceType.WEEKLY, LocalDate.of(2026, 11, 23));

      List<ReservationResponse> responses = reservationService.create(req, requester);

      assertThat(responses).extracting(ReservationResponse::status).containsOnly("DRAFT");
      assertThat(responses.get(0).seriesId()).isNotNull();
      verify(approvalService, never()).createInitialStep(any(Reservation.class));
    }

    @Test
    void create_weeklyRequiresApproval_createsAllPendingWithOneStepEach() throws Exception {
      setField(resource, "requiresApproval", true);

      List<ReservationResponse> responses =
          reservationService.create(weekly(LocalDate.of(2026, 11, 23)), requester);

      assertThat(responses).extracting(ReservationResponse::status).containsOnly("PENDING");
      verify(approvalService, times(4)).createInitialStep(any(Reservation.class));
    }

    @Test
    void create_weeklyNoApprovalRequired_createsAllApprovedWithoutSteps() {
      List<ReservationResponse> responses =
          reservationService.create(weekly(LocalDate.of(2026, 11, 23)), requester);

      assertThat(responses).extracting(ReservationResponse::status).containsOnly("APPROVED");
      verify(approvalService, never()).createInitialStep(any(Reservation.class));
    }

    @Test
    void create_weeklyApproverNotAvailable_throwsBusinessException() throws Exception {
      setField(resource, "requiresApproval", true);
      doThrow(new BusinessException(ErrorCode.APPROVER_NOT_AVAILABLE, "承認者が存在しません。"))
          .when(approvalService)
          .createInitialStep(any(Reservation.class));

      assertThatThrownBy(
              () -> reservationService.create(weekly(LocalDate.of(2026, 11, 23)), requester))
          .isInstanceOf(BusinessException.class)
          .hasMessageContaining("承認者");
    }
  }

  // ---------------------------------------------------------------------------
  // get — 繰り返し予約のシリーズ情報（詳細のみ件数を数える）
  // ---------------------------------------------------------------------------

  @Nested
  class GetSeries {

    private final UUID reservationId = UUID.fromString("40000000-0000-0000-0000-000000000010");
    private final UUID ownerId = UUID.fromString("40000000-0000-0000-0000-000000000011");
    private final UUID seriesId = UUID.fromString("40000000-0000-0000-0000-000000000090");

    private Reservation seriesReservation(User owner) throws Exception {
      Reservation reservation =
          makeReservation(
              reservationId,
              makeResource(UUID.randomUUID(), false),
              owner,
              LocalDateTime.of(2026, 11, 9, 10, 0),
              LocalDateTime.of(2026, 11, 9, 11, 0),
              ReservationStatus.APPROVED);
      setField(reservation, "seriesId", seriesId);
      setField(reservation, "recurrenceType", RecurrenceType.WEEKLY);
      setField(reservation, "recurrenceUntil", LocalDate.of(2026, 11, 23));
      return reservation;
    }

    @Test
    void get_seriesReservation_returnsSeriesCountAndRemainingCount() throws Exception {
      User owner = makeUser(ownerId, Role.MEMBER);
      Reservation reservation = seriesReservation(owner);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(reservation));
      when(reservationRepository.countBySeriesId(seriesId)).thenReturn(4L);
      when(reservationRepository.countBySeriesIdAndStartAtAfter(
              seriesId, LocalDateTime.of(2026, 11, 9, 10, 0)))
          .thenReturn(2L);

      ReservationResponse response = reservationService.get(reservationId, owner);

      assertThat(response.seriesId()).isEqualTo(seriesId);
      assertThat(response.recurrenceType()).isEqualTo("WEEKLY");
      assertThat(response.recurrenceUntil()).isEqualTo(LocalDate.of(2026, 11, 23));
      assertThat(response.seriesCount()).isEqualTo(4);
      assertThat(response.remainingCount()).isEqualTo(2);
    }

    @Test
    void get_lastOccurrence_returnsZeroRemaining() throws Exception {
      User owner = makeUser(ownerId, Role.MEMBER);
      Reservation reservation = seriesReservation(owner);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(reservation));
      when(reservationRepository.countBySeriesId(seriesId)).thenReturn(4L);
      when(reservationRepository.countBySeriesIdAndStartAtAfter(
              seriesId, LocalDateTime.of(2026, 11, 9, 10, 0)))
          .thenReturn(0L);

      ReservationResponse response = reservationService.get(reservationId, owner);

      assertThat(response.remainingCount()).isZero();
    }

    @Test
    void get_noneReservation_returnsNullCountsAndSkipsCountQueries() {
      User owner = makeUser(ownerId, Role.MEMBER);
      Reservation reservation =
          makeReservation(
              reservationId,
              makeResource(UUID.randomUUID(), false),
              owner,
              LocalDateTime.of(2026, 11, 9, 10, 0),
              LocalDateTime.of(2026, 11, 9, 11, 0),
              ReservationStatus.PENDING);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(reservation));

      ReservationResponse response = reservationService.get(reservationId, owner);

      assertThat(response.recurrenceType()).isEqualTo("NONE");
      assertThat(response.seriesId()).isNull();
      assertThat(response.seriesCount()).isNull();
      assertThat(response.remainingCount()).isNull();
      verify(reservationRepository, never()).countBySeriesId(any(UUID.class));
    }
  }

  // ---------------------------------------------------------------------------
  // get — 予約詳細（所有権チェック）
  // ---------------------------------------------------------------------------

  @Nested
  class Get {

    private final UUID reservationId = UUID.fromString("20000000-0000-0000-0000-000000000010");
    private final UUID ownerId = UUID.fromString("20000000-0000-0000-0000-000000000011");
    private final UUID otherId = UUID.fromString("20000000-0000-0000-0000-000000000012");

    @Test
    void get_ownerAccess_returnsResponse() {
      Resource resource = makeResource(UUID.randomUUID(), false);
      User owner = makeUser(ownerId, Role.MEMBER);
      Reservation reservation =
          makeReservation(
              reservationId,
              resource,
              owner,
              LocalDateTime.of(2025, 6, 10, 10, 0),
              LocalDateTime.of(2025, 6, 10, 12, 0),
              ReservationStatus.PENDING);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(reservation));

      ReservationResponse response = reservationService.get(reservationId, owner);

      assertThat(response.id()).isEqualTo(reservationId);
    }

    @Test
    void get_otherMemberAccess_throwsAccessDeniedException() {
      Resource resource = makeResource(UUID.randomUUID(), false);
      User owner = makeUser(ownerId, Role.MEMBER);
      User other = makeUser(otherId, Role.MEMBER);
      Reservation reservation =
          makeReservation(
              reservationId,
              resource,
              owner,
              LocalDateTime.of(2025, 6, 10, 10, 0),
              LocalDateTime.of(2025, 6, 10, 12, 0),
              ReservationStatus.PENDING);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(reservation));

      assertThatThrownBy(() -> reservationService.get(reservationId, other))
          .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void get_adminAccess_returnsResponse() {
      Resource resource = makeResource(UUID.randomUUID(), false);
      User owner = makeUser(ownerId, Role.MEMBER);
      User admin = makeUser(UUID.randomUUID(), Role.ADMIN);
      Reservation reservation =
          makeReservation(
              reservationId,
              resource,
              owner,
              LocalDateTime.of(2025, 6, 10, 10, 0),
              LocalDateTime.of(2025, 6, 10, 12, 0),
              ReservationStatus.PENDING);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(reservation));

      ReservationResponse response = reservationService.get(reservationId, admin);

      assertThat(response.id()).isEqualTo(reservationId);
    }

    @Test
    void get_notFound_throwsResourceNotFoundException() {
      UUID unknownId = UUID.randomUUID();
      when(reservationRepository.findById(unknownId)).thenReturn(Optional.empty());
      User user = makeUser(UUID.randomUUID(), Role.MEMBER);

      assertThatThrownBy(() -> reservationService.get(unknownId, user))
          .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void get_draftByOwner_returnsResponse() {
      Resource resource = makeResource(UUID.randomUUID(), false);
      User owner = makeUser(ownerId, Role.MEMBER);
      Reservation reservation =
          makeReservation(
              reservationId,
              resource,
              owner,
              LocalDateTime.of(2025, 6, 10, 10, 0),
              LocalDateTime.of(2025, 6, 10, 12, 0),
              ReservationStatus.DRAFT);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(reservation));

      ReservationResponse response = reservationService.get(reservationId, owner);

      assertThat(response.status()).isEqualTo("DRAFT");
    }

    @Test
    void get_draftByApprover_throwsAccessDeniedException() {
      // DRAFT は他のステータスと異なり、本人以外は APPROVER であっても閲覧不可（RSV-02）
      Resource resource = makeResource(UUID.randomUUID(), false);
      User owner = makeUser(ownerId, Role.MEMBER);
      User approver = makeUser(UUID.randomUUID(), Role.APPROVER);
      Reservation reservation =
          makeReservation(
              reservationId,
              resource,
              owner,
              LocalDateTime.of(2025, 6, 10, 10, 0),
              LocalDateTime.of(2025, 6, 10, 12, 0),
              ReservationStatus.DRAFT);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(reservation));

      assertThatThrownBy(() -> reservationService.get(reservationId, approver))
          .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void get_draftByAdmin_returnsResponse() {
      Resource resource = makeResource(UUID.randomUUID(), false);
      User owner = makeUser(ownerId, Role.MEMBER);
      User admin = makeUser(UUID.randomUUID(), Role.ADMIN);
      Reservation reservation =
          makeReservation(
              reservationId,
              resource,
              owner,
              LocalDateTime.of(2025, 6, 10, 10, 0),
              LocalDateTime.of(2025, 6, 10, 12, 0),
              ReservationStatus.DRAFT);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(reservation));

      ReservationResponse response = reservationService.get(reservationId, admin);

      assertThat(response.status()).isEqualTo("DRAFT");
    }

    @Test
    void get_pendingByApprover_returnsResponse() {
      // DRAFT 以外のステータスでは、APPROVER は引き続き本人以外も閲覧可能（既存挙動の回帰確認）
      Resource resource = makeResource(UUID.randomUUID(), false);
      User owner = makeUser(ownerId, Role.MEMBER);
      User approver = makeUser(UUID.randomUUID(), Role.APPROVER);
      Reservation reservation =
          makeReservation(
              reservationId,
              resource,
              owner,
              LocalDateTime.of(2025, 6, 10, 10, 0),
              LocalDateTime.of(2025, 6, 10, 12, 0),
              ReservationStatus.PENDING);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(reservation));

      ReservationResponse response = reservationService.get(reservationId, approver);

      assertThat(response.status()).isEqualTo("PENDING");
    }
  }

  // ---------------------------------------------------------------------------
  // update — 予約更新
  // ---------------------------------------------------------------------------

  @Nested
  class Update {

    private final UUID reservationId = UUID.fromString("20000000-0000-0000-0000-000000000020");
    private final UUID ownerId = UUID.fromString("20000000-0000-0000-0000-000000000021");
    private final UUID otherId = UUID.fromString("20000000-0000-0000-0000-000000000022");
    private final UUID resourceId = UUID.fromString("20000000-0000-0000-0000-000000000023");

    private final LocalDateTime newStart = LocalDateTime.of(2025, 6, 10, 14, 0);
    private final LocalDateTime newEnd = LocalDateTime.of(2025, 6, 10, 16, 0);

    @Test
    void update_pendingReservationByOwner_returnsUpdated() {
      Resource resource = makeResource(resourceId, false);
      User owner = makeUser(ownerId, Role.MEMBER);
      Reservation reservation =
          makeReservation(
              reservationId,
              resource,
              owner,
              LocalDateTime.of(2025, 6, 10, 10, 0),
              LocalDateTime.of(2025, 6, 10, 12, 0),
              ReservationStatus.PENDING);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(reservation));
      // findByIdForUpdate: 悲観ロック取得（update の重複チェック直列化に使用）
      when(resourceRepository.findByIdForUpdate(resourceId)).thenReturn(Optional.of(resource));
      when(reservationRepository.findByResource_IdAndStatusIn(eq(resourceId), anyCollection()))
          .thenReturn(List.of(reservation)); // 自己のみ → 自己除外でコンフリクトなし
      when(reservationRepository.save(any(Reservation.class)))
          .thenAnswer(inv -> inv.getArgument(0));

      UpdateReservationRequest req =
          new UpdateReservationRequest(newStart, newEnd, "更新後の会議", 3, false);
      ReservationResponse response = reservationService.update(reservationId, req, owner);

      assertThat(response.startAt()).isEqualTo(newStart);
      assertThat(response.endAt()).isEqualTo(newEnd);
    }

    @Test
    void update_approvedReservation_throwsBusinessException() {
      Resource resource = makeResource(resourceId, false);
      User owner = makeUser(ownerId, Role.MEMBER);
      Reservation reservation =
          makeReservation(
              reservationId,
              resource,
              owner,
              LocalDateTime.of(2025, 6, 10, 10, 0),
              LocalDateTime.of(2025, 6, 10, 12, 0),
              ReservationStatus.APPROVED);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(reservation));

      UpdateReservationRequest req =
          new UpdateReservationRequest(newStart, newEnd, "テスト", null, false);

      assertThatThrownBy(() -> reservationService.update(reservationId, req, owner))
          .isInstanceOf(BusinessException.class);
    }

    @Test
    void update_otherMemberAccess_throwsAccessDeniedException() {
      Resource resource = makeResource(resourceId, false);
      User owner = makeUser(ownerId, Role.MEMBER);
      User other = makeUser(otherId, Role.MEMBER);
      Reservation reservation =
          makeReservation(
              reservationId,
              resource,
              owner,
              LocalDateTime.of(2025, 6, 10, 10, 0),
              LocalDateTime.of(2025, 6, 10, 12, 0),
              ReservationStatus.PENDING);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(reservation));

      UpdateReservationRequest req =
          new UpdateReservationRequest(newStart, newEnd, "テスト", null, false);

      assertThatThrownBy(() -> reservationService.update(reservationId, req, other))
          .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void update_conflictWithOtherReservation_throwsReservationConflictException() {
      Resource resource = makeResource(resourceId, false);
      User owner = makeUser(ownerId, Role.MEMBER);
      Reservation reservation =
          makeReservation(
              reservationId,
              resource,
              owner,
              LocalDateTime.of(2025, 6, 10, 10, 0),
              LocalDateTime.of(2025, 6, 10, 12, 0),
              ReservationStatus.PENDING);
      // 別の予約が新しい時間帯と重複
      User other = makeUser(otherId, Role.MEMBER);
      Reservation conflicting =
          makeReservation(
              UUID.randomUUID(),
              resource,
              other,
              newStart.minusHours(1),
              newStart.plusHours(1),
              ReservationStatus.APPROVED);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(reservation));
      // findByIdForUpdate: 悲観ロック取得（update の重複チェック直列化に使用）
      when(resourceRepository.findByIdForUpdate(resourceId)).thenReturn(Optional.of(resource));
      when(reservationRepository.findByResource_IdAndStatusIn(eq(resourceId), anyCollection()))
          .thenReturn(List.of(reservation, conflicting)); // 自己 + 重複他予約

      UpdateReservationRequest req =
          new UpdateReservationRequest(newStart, newEnd, "テスト", null, false);

      assertThatThrownBy(() -> reservationService.update(reservationId, req, owner))
          .isInstanceOf(ReservationConflictException.class);
    }

    @Test
    void update_draftSubmitFalse_contentUpdatedButRemainsDraft() {
      Resource resource = makeResource(resourceId, true);
      User owner = makeUser(ownerId, Role.MEMBER);
      Reservation reservation =
          makeReservation(
              reservationId,
              resource,
              owner,
              LocalDateTime.of(2025, 6, 10, 10, 0),
              LocalDateTime.of(2025, 6, 10, 12, 0),
              ReservationStatus.DRAFT);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(reservation));
      when(resourceRepository.findByIdForUpdate(resourceId)).thenReturn(Optional.of(resource));
      when(reservationRepository.findByResource_IdAndStatusIn(eq(resourceId), anyCollection()))
          .thenReturn(List.of());
      when(reservationRepository.save(any(Reservation.class)))
          .thenAnswer(inv -> inv.getArgument(0));

      UpdateReservationRequest req =
          new UpdateReservationRequest(newStart, newEnd, "更新後の下書き", 2, false);
      ReservationResponse response = reservationService.update(reservationId, req, owner);

      assertThat(response.status()).isEqualTo("DRAFT");
      assertThat(response.purpose()).isEqualTo("更新後の下書き");
      org.mockito.Mockito.verify(approvalService, org.mockito.Mockito.never())
          .createInitialStep(any(Reservation.class));
    }

    @Test
    void update_draftSubmitTrueRequiresApprovalTrue_returnsPendingAndCreatesApprovalStep() {
      Resource resource = makeResource(resourceId, true);
      User owner = makeUser(ownerId, Role.MEMBER);
      Reservation reservation =
          makeReservation(
              reservationId,
              resource,
              owner,
              LocalDateTime.of(2025, 6, 10, 10, 0),
              LocalDateTime.of(2025, 6, 10, 12, 0),
              ReservationStatus.DRAFT);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(reservation));
      when(resourceRepository.findByIdForUpdate(resourceId)).thenReturn(Optional.of(resource));
      when(reservationRepository.findByResource_IdAndStatusIn(eq(resourceId), anyCollection()))
          .thenReturn(List.of());
      when(reservationRepository.save(any(Reservation.class)))
          .thenAnswer(inv -> inv.getArgument(0));

      UpdateReservationRequest req =
          new UpdateReservationRequest(newStart, newEnd, "正式申請", null, true);
      ReservationResponse response = reservationService.update(reservationId, req, owner);

      assertThat(response.status()).isEqualTo("PENDING");
      org.mockito.Mockito.verify(approvalService).createInitialStep(any(Reservation.class));
    }

    @Test
    void update_draftSubmitTrueRequiresApprovalFalse_returnsApprovedWithoutApprovalStep() {
      Resource resource = makeResource(resourceId, false);
      User owner = makeUser(ownerId, Role.MEMBER);
      Reservation reservation =
          makeReservation(
              reservationId,
              resource,
              owner,
              LocalDateTime.of(2025, 6, 10, 10, 0),
              LocalDateTime.of(2025, 6, 10, 12, 0),
              ReservationStatus.DRAFT);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(reservation));
      when(resourceRepository.findByIdForUpdate(resourceId)).thenReturn(Optional.of(resource));
      when(reservationRepository.findByResource_IdAndStatusIn(eq(resourceId), anyCollection()))
          .thenReturn(List.of());
      when(reservationRepository.save(any(Reservation.class)))
          .thenAnswer(inv -> inv.getArgument(0));

      UpdateReservationRequest req =
          new UpdateReservationRequest(newStart, newEnd, "正式申請", null, true);
      ReservationResponse response = reservationService.update(reservationId, req, owner);

      assertThat(response.status()).isEqualTo("APPROVED");
      org.mockito.Mockito.verify(approvalService, org.mockito.Mockito.never())
          .createInitialStep(any(Reservation.class));
    }

    @Test
    void update_pendingSubmitTrue_ignoredAndRemainsPending() {
      // PENDING の予約では submit の値に関わらず常に無視される（ステータス変化なし）
      Resource resource = makeResource(resourceId, true);
      User owner = makeUser(ownerId, Role.MEMBER);
      Reservation reservation =
          makeReservation(
              reservationId,
              resource,
              owner,
              LocalDateTime.of(2025, 6, 10, 10, 0),
              LocalDateTime.of(2025, 6, 10, 12, 0),
              ReservationStatus.PENDING);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(reservation));
      when(resourceRepository.findByIdForUpdate(resourceId)).thenReturn(Optional.of(resource));
      when(reservationRepository.findByResource_IdAndStatusIn(eq(resourceId), anyCollection()))
          .thenReturn(List.of(reservation));
      when(reservationRepository.save(any(Reservation.class)))
          .thenAnswer(inv -> inv.getArgument(0));

      UpdateReservationRequest req =
          new UpdateReservationRequest(newStart, newEnd, "更新", null, true);
      ReservationResponse response = reservationService.update(reservationId, req, owner);

      assertThat(response.status()).isEqualTo("PENDING");
      org.mockito.Mockito.verify(approvalService, org.mockito.Mockito.never())
          .createInitialStep(any(Reservation.class));
    }

    @Test
    void update_draftByOtherMemberAccess_throwsAccessDeniedException() {
      Resource resource = makeResource(resourceId, false);
      User owner = makeUser(ownerId, Role.MEMBER);
      User other = makeUser(otherId, Role.MEMBER);
      Reservation reservation =
          makeReservation(
              reservationId,
              resource,
              owner,
              LocalDateTime.of(2025, 6, 10, 10, 0),
              LocalDateTime.of(2025, 6, 10, 12, 0),
              ReservationStatus.DRAFT);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(reservation));

      UpdateReservationRequest req =
          new UpdateReservationRequest(newStart, newEnd, "テスト", null, false);

      assertThatThrownBy(() -> reservationService.update(reservationId, req, other))
          .isInstanceOf(AccessDeniedException.class);
    }
  }

  // ---------------------------------------------------------------------------
  // cancel — キャンセル
  // ---------------------------------------------------------------------------

  @Nested
  class Cancel {

    private final UUID reservationId = UUID.fromString("20000000-0000-0000-0000-000000000030");
    private final UUID ownerId = UUID.fromString("20000000-0000-0000-0000-000000000031");
    private final UUID otherId = UUID.fromString("20000000-0000-0000-0000-000000000032");

    @Test
    void cancel_pendingByOwner_returnsCancelled() {
      Resource resource = makeResource(UUID.randomUUID(), false);
      User owner = makeUser(ownerId, Role.MEMBER);
      Reservation reservation =
          makeReservation(
              reservationId,
              resource,
              owner,
              LocalDateTime.of(2025, 6, 10, 10, 0),
              LocalDateTime.of(2025, 6, 10, 12, 0),
              ReservationStatus.PENDING);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(reservation));
      when(reservationRepository.save(any(Reservation.class)))
          .thenAnswer(inv -> inv.getArgument(0));

      ReservationResponse response = reservationService.cancel(reservationId, owner);

      assertThat(response.status()).isEqualTo("CANCELLED");
    }

    @Test
    void cancel_approvedByAdmin_returnsCancelled() {
      Resource resource = makeResource(UUID.randomUUID(), false);
      User owner = makeUser(ownerId, Role.MEMBER);
      User admin = makeUser(UUID.randomUUID(), Role.ADMIN);
      Reservation reservation =
          makeReservation(
              reservationId,
              resource,
              owner,
              LocalDateTime.of(2025, 6, 10, 10, 0),
              LocalDateTime.of(2025, 6, 10, 12, 0),
              ReservationStatus.APPROVED);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(reservation));
      when(reservationRepository.save(any(Reservation.class)))
          .thenAnswer(inv -> inv.getArgument(0));

      ReservationResponse response = reservationService.cancel(reservationId, admin);

      assertThat(response.status()).isEqualTo("CANCELLED");
    }

    @Test
    void cancel_otherMemberAccess_throwsAccessDeniedException() {
      Resource resource = makeResource(UUID.randomUUID(), false);
      User owner = makeUser(ownerId, Role.MEMBER);
      User other = makeUser(otherId, Role.MEMBER);
      Reservation reservation =
          makeReservation(
              reservationId,
              resource,
              owner,
              LocalDateTime.of(2025, 6, 10, 10, 0),
              LocalDateTime.of(2025, 6, 10, 12, 0),
              ReservationStatus.PENDING);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(reservation));

      assertThatThrownBy(() -> reservationService.cancel(reservationId, other))
          .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void cancel_rejectedReservation_throwsBusinessException() {
      Resource resource = makeResource(UUID.randomUUID(), false);
      User owner = makeUser(ownerId, Role.MEMBER);
      Reservation reservation =
          makeReservation(
              reservationId,
              resource,
              owner,
              LocalDateTime.of(2025, 6, 10, 10, 0),
              LocalDateTime.of(2025, 6, 10, 12, 0),
              ReservationStatus.REJECTED);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(reservation));

      assertThatThrownBy(() -> reservationService.cancel(reservationId, owner))
          .isInstanceOf(BusinessException.class);
    }

    @Test
    void cancel_cancelledReservation_throwsBusinessException() {
      Resource resource = makeResource(UUID.randomUUID(), false);
      User owner = makeUser(ownerId, Role.MEMBER);
      Reservation reservation =
          makeReservation(
              reservationId,
              resource,
              owner,
              LocalDateTime.of(2025, 6, 10, 10, 0),
              LocalDateTime.of(2025, 6, 10, 12, 0),
              ReservationStatus.CANCELLED);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(reservation));

      assertThatThrownBy(() -> reservationService.cancel(reservationId, owner))
          .isInstanceOf(BusinessException.class);
    }

    @Test
    void cancel_draftByOwner_returnsCancelled() {
      // DRAFT のキャンセルは下書きの削除に相当する（RSV-02）
      Resource resource = makeResource(UUID.randomUUID(), false);
      User owner = makeUser(ownerId, Role.MEMBER);
      Reservation reservation =
          makeReservation(
              reservationId,
              resource,
              owner,
              LocalDateTime.of(2025, 6, 10, 10, 0),
              LocalDateTime.of(2025, 6, 10, 12, 0),
              ReservationStatus.DRAFT);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(reservation));
      when(reservationRepository.save(any(Reservation.class)))
          .thenAnswer(inv -> inv.getArgument(0));

      ReservationResponse response = reservationService.cancel(reservationId, owner);

      assertThat(response.status()).isEqualTo("CANCELLED");
    }
  }

  // ---------------------------------------------------------------------------
  // list — resourceName・period フィルタ（Issue #24）
  // ---------------------------------------------------------------------------

  @Nested
  class List_ {

    private final Pageable pageable = PageRequest.of(0, 20);
    private final LocalDateTime from = LocalDateTime.of(2025, 8, 1, 0, 0);
    private final LocalDateTime to = LocalDateTime.of(2025, 8, 31, 23, 59);

    private Page<Reservation> onePage() {
      Resource resource = makeResource(UUID.randomUUID(), false);
      User requester = makeUser(UUID.randomUUID(), Role.MEMBER);
      Reservation reservation =
          makeReservation(
              UUID.randomUUID(),
              resource,
              requester,
              LocalDateTime.of(2025, 8, 10, 10, 0),
              LocalDateTime.of(2025, 8, 10, 12, 0),
              ReservationStatus.APPROVED);
      return new PageImpl<>(List.of(reservation));
    }

    @Test
    void list_adminWithResourceNameOnly_callsResourceNameRepositoryMethod() {
      User admin = makeUser(UUID.randomUUID(), Role.ADMIN);
      when(reservationRepository.findByResourceNameFetch("会議室", pageable)).thenReturn(onePage());

      Page<ReservationResponse> result =
          reservationService.list(admin, null, "会議室", null, null, pageable);

      assertThat(result.getContent()).hasSize(1);
    }

    @Test
    void list_memberWithResourceNameOnly_callsRequesterIdAndResourceNameRepositoryMethod() {
      User member = makeUser(UUID.randomUUID(), Role.MEMBER);
      when(reservationRepository.findByRequesterIdAndResourceNameFetch(
              member.getId(), "会議室", pageable))
          .thenReturn(onePage());

      Page<ReservationResponse> result =
          reservationService.list(member, null, "会議室", null, null, pageable);

      assertThat(result.getContent()).hasSize(1);
    }

    @Test
    void list_resourceNameWithWildcardCharacters_escapesBeforeDelegatingToRepository() {
      // BR-03: "!" を先にエスケープしてから "%"/"_" をエスケープする（二重エスケープ回避）
      User admin = makeUser(UUID.randomUUID(), Role.ADMIN);
      when(reservationRepository.findByResourceNameFetch("50!%off!_now!!", pageable))
          .thenReturn(onePage());

      Page<ReservationResponse> result =
          reservationService.list(admin, null, "50%off_now!", null, null, pageable);

      assertThat(result.getContent()).hasSize(1);
    }

    @Test
    void list_blankResourceName_treatedAsNoResourceNameFilter() {
      // BR-02: 空白のみの resourceName は未入力として扱う
      User admin = makeUser(UUID.randomUUID(), Role.ADMIN);
      when(reservationRepository.findAllFetch(pageable)).thenReturn(onePage());

      Page<ReservationResponse> result =
          reservationService.list(admin, null, "   ", null, null, pageable);

      assertThat(result.getContent()).hasSize(1);
    }

    @Test
    void list_adminWithPeriodOnly_callsPeriodRepositoryMethod() {
      User admin = makeUser(UUID.randomUUID(), Role.ADMIN);
      when(reservationRepository.findByPeriodFetch(from, to, pageable)).thenReturn(onePage());

      Page<ReservationResponse> result =
          reservationService.list(admin, null, null, from, to, pageable);

      assertThat(result.getContent()).hasSize(1);
    }

    @Test
    void list_memberWithPeriodAndStatus_callsRequesterIdAndPeriodAndStatusInRepositoryMethod() {
      User member = makeUser(UUID.randomUUID(), Role.MEMBER);
      List<ReservationStatus> statuses = List.of(ReservationStatus.APPROVED);
      when(reservationRepository.findByRequesterIdAndPeriodAndStatusInFetch(
              member.getId(), from, to, statuses, pageable))
          .thenReturn(onePage());

      Page<ReservationResponse> result =
          reservationService.list(member, statuses, null, from, to, pageable);

      assertThat(result.getContent()).hasSize(1);
    }

    @Test
    void list_adminWithResourceNameAndPeriodAndStatus_callsFullyCombinedRepositoryMethod() {
      // 16メソッドのうち最も条件数の多い組み合わせ（ADMIN）を検証する
      User admin = makeUser(UUID.randomUUID(), Role.ADMIN);
      List<ReservationStatus> statuses = List.of(ReservationStatus.APPROVED);
      when(reservationRepository.findByResourceNameAndPeriodAndStatusInFetch(
              "会議室", from, to, statuses, pageable))
          .thenReturn(onePage());

      Page<ReservationResponse> result =
          reservationService.list(admin, statuses, "会議室", from, to, pageable);

      assertThat(result.getContent()).hasSize(1);
    }

    @Test
    void
        list_memberWithResourceNameAndPeriodAndStatus_callsFullyCombinedRequesterIdRepositoryMethod() {
      // 16メソッドのうち最も条件数の多い組み合わせ（非ADMIN）を検証する
      User member = makeUser(UUID.randomUUID(), Role.MEMBER);
      List<ReservationStatus> statuses = List.of(ReservationStatus.APPROVED);
      when(reservationRepository.findByRequesterIdAndResourceNameAndPeriodAndStatusInFetch(
              member.getId(), "会議室", from, to, statuses, pageable))
          .thenReturn(onePage());

      Page<ReservationResponse> result =
          reservationService.list(member, statuses, "会議室", from, to, pageable);

      assertThat(result.getContent()).hasSize(1);
    }

    @Test
    void list_adminWithResourceNameAndPeriod_callsResourceNameAndPeriodRepositoryMethod() {
      User admin = makeUser(UUID.randomUUID(), Role.ADMIN);
      when(reservationRepository.findByResourceNameAndPeriodFetch("会議室", from, to, pageable))
          .thenReturn(onePage());

      Page<ReservationResponse> result =
          reservationService.list(admin, null, "会議室", from, to, pageable);

      assertThat(result.getContent()).hasSize(1);
    }

    @Test
    void list_adminWithResourceNameAndStatus_callsResourceNameAndStatusInRepositoryMethod() {
      User admin = makeUser(UUID.randomUUID(), Role.ADMIN);
      List<ReservationStatus> statuses = List.of(ReservationStatus.APPROVED);
      when(reservationRepository.findByResourceNameAndStatusInFetch("会議室", statuses, pageable))
          .thenReturn(onePage());

      Page<ReservationResponse> result =
          reservationService.list(admin, statuses, "会議室", null, null, pageable);

      assertThat(result.getContent()).hasSize(1);
    }

    @Test
    void list_adminWithPeriodAndStatus_callsPeriodAndStatusInRepositoryMethod() {
      User admin = makeUser(UUID.randomUUID(), Role.ADMIN);
      List<ReservationStatus> statuses = List.of(ReservationStatus.APPROVED);
      when(reservationRepository.findByPeriodAndStatusInFetch(from, to, statuses, pageable))
          .thenReturn(onePage());

      Page<ReservationResponse> result =
          reservationService.list(admin, statuses, null, from, to, pageable);

      assertThat(result.getContent()).hasSize(1);
    }

    @Test
    void
        list_memberWithResourceNameAndPeriod_callsRequesterIdAndResourceNameAndPeriodRepositoryMethod() {
      User member = makeUser(UUID.randomUUID(), Role.MEMBER);
      when(reservationRepository.findByRequesterIdAndResourceNameAndPeriodFetch(
              member.getId(), "会議室", from, to, pageable))
          .thenReturn(onePage());

      Page<ReservationResponse> result =
          reservationService.list(member, null, "会議室", from, to, pageable);

      assertThat(result.getContent()).hasSize(1);
    }
  }
}
