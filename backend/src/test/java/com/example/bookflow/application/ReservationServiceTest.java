package com.example.bookflow.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.bookflow.application.exception.BusinessException;
import com.example.bookflow.application.exception.ErrorCode;
import com.example.bookflow.application.exception.ReservationConflictException;
import com.example.bookflow.application.exception.ResourceNotFoundException;
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
          new CreateReservationRequest(resourceId, start, end, "週次ミーティング", 5, null);

      ReservationResponse response = reservationService.create(req, requester);

      assertThat(response.status()).isEqualTo("APPROVED");
      assertThat(response.resourceId()).isEqualTo(resourceId);
    }

    @Test
    void create_noConflictRequiresApprovalTrue_returnsPending() throws Exception {
      setField(resource, "requiresApproval", true);
      CreateReservationRequest req =
          new CreateReservationRequest(resourceId, start, end, "承認が必要な会議", null, null);

      ReservationResponse response = reservationService.create(req, requester);

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
          new CreateReservationRequest(resourceId, start, end, "テスト", null, null);

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
          new CreateReservationRequest(resourceId, start, end, "テスト", null, null);

      ReservationResponse response = reservationService.create(req, requester);

      assertThat(response.status()).isEqualTo("APPROVED");
    }

    @Test
    void create_endBeforeStart_throwsBusinessException() {
      CreateReservationRequest req =
          new CreateReservationRequest(
              resourceId, end, start, "テスト", null, null); // endAt < startAt

      assertThatThrownBy(() -> reservationService.create(req, requester))
          .isInstanceOf(BusinessException.class);
    }

    @Test
    void create_resourceNotFound_throwsResourceNotFoundException() {
      UUID unknownId = UUID.randomUUID();
      when(resourceRepository.findByIdForUpdate(unknownId)).thenReturn(Optional.empty());

      CreateReservationRequest req =
          new CreateReservationRequest(unknownId, start, end, "テスト", null, null);

      assertThatThrownBy(() -> reservationService.create(req, requester))
          .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void create_draft_returnsDraftWithoutConflictCheckOrApprovalStep() throws Exception {
      setField(resource, "requiresApproval", true);
      // 重複する既存予約があっても下書きは 409 にならない
      Reservation existing =
          makeReservation(
              UUID.randomUUID(),
              resource,
              requester,
              start.minusHours(1),
              start.plusHours(1),
              ReservationStatus.APPROVED);
      lenient()
          .when(reservationRepository.findByResource_IdAndStatusIn(eq(resourceId), anyCollection()))
          .thenReturn(List.of(existing));
      CreateReservationRequest req =
          new CreateReservationRequest(resourceId, start, end, "下書き", null, true);

      ReservationResponse response = reservationService.create(req, requester);

      assertThat(response.status()).isEqualTo("DRAFT");
      verify(approvalService, never()).createInitialStep(any(Reservation.class));
    }

    @Test
    void create_draftWithEndBeforeStart_throwsBusinessException() {
      CreateReservationRequest req =
          new CreateReservationRequest(resourceId, end, start, "下書き", null, true);

      assertThatThrownBy(() -> reservationService.create(req, requester))
          .isInstanceOf(BusinessException.class);
    }

    @Test
    void create_draftFalse_behavesAsNormalApplication() {
      CreateReservationRequest req =
          new CreateReservationRequest(resourceId, start, end, "通常申請", null, false);

      ReservationResponse response = reservationService.create(req, requester);

      assertThat(response.status()).isEqualTo("APPROVED");
    }
  }

  // ---------------------------------------------------------------------------
  // get — 予約詳細
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
          new UpdateReservationRequest(newStart, newEnd, "更新後の会議", 3, null);
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
          new UpdateReservationRequest(newStart, newEnd, "テスト", null, null);

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
          new UpdateReservationRequest(newStart, newEnd, "テスト", null, null);

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
          new UpdateReservationRequest(newStart, newEnd, "テスト", null, null);

      assertThatThrownBy(() -> reservationService.update(reservationId, req, owner))
          .isInstanceOf(ReservationConflictException.class);
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
  }

  // ---------------------------------------------------------------------------
  // 下書き（DRAFT）— 閲覧・更新・正式申請・削除・キャンセル
  // ---------------------------------------------------------------------------

  @Nested
  class Draft {

    private final UUID reservationId = UUID.fromString("20000000-0000-0000-0000-000000000040");
    private final UUID ownerId = UUID.fromString("20000000-0000-0000-0000-000000000041");
    private final UUID otherId = UUID.fromString("20000000-0000-0000-0000-000000000042");
    private final UUID resourceId = UUID.fromString("20000000-0000-0000-0000-000000000043");

    private final LocalDateTime start = LocalDateTime.of(2025, 6, 10, 10, 0);
    private final LocalDateTime end = LocalDateTime.of(2025, 6, 10, 12, 0);

    private Resource resource;
    private User owner;
    private Reservation draft;

    @BeforeEach
    void setUp() {
      resource = makeResource(resourceId, true);
      owner = makeUser(ownerId, Role.MEMBER);
      draft = makeReservation(reservationId, resource, owner, start, end, ReservationStatus.DRAFT);
      lenient().when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(draft));
      lenient()
          .when(resourceRepository.findByIdForUpdate(resourceId))
          .thenReturn(Optional.of(resource));
      lenient()
          .when(reservationRepository.findByResource_IdAndStatusIn(eq(resourceId), anyCollection()))
          .thenReturn(List.of());
      lenient()
          .when(reservationRepository.save(any(Reservation.class)))
          .thenAnswer(inv -> inv.getArgument(0));
    }

    private UpdateReservationRequest submitReq() {
      return new UpdateReservationRequest(start, end, "正式申請", null, true);
    }

    // ---- get ----

    @Test
    void get_draftByOwner_returnsResponse() {
      assertThat(reservationService.get(reservationId, owner).status()).isEqualTo("DRAFT");
    }

    @Test
    void get_draftByAdmin_returnsResponse() {
      User admin = makeUser(UUID.randomUUID(), Role.ADMIN);
      assertThat(reservationService.get(reservationId, admin).status()).isEqualTo("DRAFT");
    }

    @Test
    void get_draftByApprover_throwsAccessDeniedException() {
      User approver = makeUser(UUID.randomUUID(), Role.APPROVER);
      assertThatThrownBy(() -> reservationService.get(reservationId, approver))
          .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void get_draftByOtherMember_throwsAccessDeniedException() {
      User other = makeUser(otherId, Role.MEMBER);
      assertThatThrownBy(() -> reservationService.get(reservationId, other))
          .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void get_pendingByApprover_stillReturnsResponse() throws Exception {
      setField(draft, "status", ReservationStatus.PENDING);
      User approver = makeUser(UUID.randomUUID(), Role.APPROVER);
      assertThat(reservationService.get(reservationId, approver).status()).isEqualTo("PENDING");
    }

    // ---- update（DRAFT のまま）----

    @Test
    void update_draftWithoutSubmit_staysDraftAndSkipsConflictCheck() {
      ReservationResponse response =
          reservationService.update(
              reservationId, new UpdateReservationRequest(start, end, "更新", 2, null), owner);

      assertThat(response.status()).isEqualTo("DRAFT");
      assertThat(response.purpose()).isEqualTo("更新");
      verify(reservationRepository, never()).findByResource_IdAndStatusIn(any(), anyCollection());
      verify(approvalService, never()).createInitialStep(any(Reservation.class));
    }

    @Test
    void update_draftByAdmin_throwsAccessDeniedException() {
      User admin = makeUser(UUID.randomUUID(), Role.ADMIN);
      assertThatThrownBy(() -> reservationService.update(reservationId, submitReq(), admin))
          .isInstanceOf(AccessDeniedException.class);
    }

    // ---- 正式申請（DRAFT → PENDING / APPROVED）----

    @Test
    void submit_requiresApprovalTrue_transitionsToPendingAndCreatesApprovalStep() {
      ReservationResponse response = reservationService.update(reservationId, submitReq(), owner);

      assertThat(response.status()).isEqualTo("PENDING");
      verify(approvalService).createInitialStep(draft);
    }

    @Test
    void submit_requiresApprovalFalse_transitionsToApprovedWithoutApprovalStep() throws Exception {
      setField(resource, "requiresApproval", false);

      ReservationResponse response = reservationService.update(reservationId, submitReq(), owner);

      assertThat(response.status()).isEqualTo("APPROVED");
      verify(approvalService, never()).createInitialStep(any(Reservation.class));
    }

    @Test
    void submit_withConflict_throwsConflictAndStaysDraft() {
      Reservation existing =
          makeReservation(
              UUID.randomUUID(),
              resource,
              otherUserReservationOwner(),
              start,
              end,
              ReservationStatus.APPROVED);
      when(reservationRepository.findByResource_IdAndStatusIn(eq(resourceId), anyCollection()))
          .thenReturn(List.of(existing));

      assertThatThrownBy(() -> reservationService.update(reservationId, submitReq(), owner))
          .isInstanceOf(ReservationConflictException.class);

      assertThat(draft.getStatus()).isEqualTo(ReservationStatus.DRAFT);
      verify(approvalService, never()).createInitialStep(any(Reservation.class));
    }

    @Test
    void submit_approverNotAvailable_propagatesBusinessException() {
      doThrow(new BusinessException(ErrorCode.APPROVER_NOT_AVAILABLE, "承認者なし"))
          .when(approvalService)
          .createInitialStep(any(Reservation.class));

      assertThatThrownBy(() -> reservationService.update(reservationId, submitReq(), owner))
          .isInstanceOfSatisfying(
              BusinessException.class,
              e -> assertThat(e.getCode()).isEqualTo(ErrorCode.APPROVER_NOT_AVAILABLE));
    }

    @Test
    void update_pendingWithSubmitTrue_ignoresSubmitAndStaysPending() throws Exception {
      setField(draft, "status", ReservationStatus.PENDING);

      ReservationResponse response = reservationService.update(reservationId, submitReq(), owner);

      assertThat(response.status()).isEqualTo("PENDING");
      verify(approvalService, never()).createInitialStep(any(Reservation.class));
    }

    // ---- delete ----

    @Test
    void delete_draftByOwner_deletesReservation() {
      reservationService.delete(reservationId, owner);

      verify(reservationRepository).delete(draft);
    }

    @Test
    void delete_draftByAdmin_throwsAccessDeniedException() {
      User admin = makeUser(UUID.randomUUID(), Role.ADMIN);
      assertThatThrownBy(() -> reservationService.delete(reservationId, admin))
          .isInstanceOf(AccessDeniedException.class);
      verify(reservationRepository, never()).delete(any(Reservation.class));
    }

    @Test
    void delete_draftByOtherMember_throwsAccessDeniedException() {
      User other = makeUser(otherId, Role.MEMBER);
      assertThatThrownBy(() -> reservationService.delete(reservationId, other))
          .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void delete_nonDraft_throwsBusinessException() throws Exception {
      setField(draft, "status", ReservationStatus.PENDING);

      assertThatThrownBy(() -> reservationService.delete(reservationId, owner))
          .isInstanceOf(BusinessException.class);
      verify(reservationRepository, never()).delete(any(Reservation.class));
    }

    @Test
    void delete_notFound_throwsResourceNotFoundException() {
      UUID unknown = UUID.randomUUID();
      when(reservationRepository.findById(unknown)).thenReturn(Optional.empty());

      assertThatThrownBy(() -> reservationService.delete(unknown, owner))
          .isInstanceOf(ResourceNotFoundException.class);
    }

    // ---- cancel ----

    @Test
    void cancel_draft_throwsBusinessException() {
      assertThatThrownBy(() -> reservationService.cancel(reservationId, owner))
          .isInstanceOf(BusinessException.class);
    }

    private User otherUserReservationOwner() {
      return makeUser(otherId, Role.MEMBER);
    }
  }
}
