package com.example.bookflow.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.argThat;
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
import java.util.Collection;
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

  /** 下書き（DRAFT）の予約を作る（リソースは承認不要。日時は 2025-06-10 10:00〜12:00）。 */
  private static Reservation makeDraft(UUID id, User owner) {
    return makeReservation(
        id,
        makeResource(UUID.randomUUID(), false),
        owner,
        LocalDateTime.of(2025, 6, 10, 10, 0),
        LocalDateTime.of(2025, 6, 10, 12, 0),
        ReservationStatus.DRAFT);
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
      // findById: 下書き保存はロックせずに取得する
      lenient().when(resourceRepository.findById(resourceId)).thenReturn(Optional.of(resource));
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
      // 承認が必要なリソースで、同じ時間帯に承認済みの予約があっても、下書きは保存できる
      setField(resource, "requiresApproval", true);
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
          new CreateReservationRequest(resourceId, start, end, "下書きの会議", 5, true);

      ReservationResponse response = reservationService.create(req, requester);

      assertThat(response.status()).isEqualTo("DRAFT");
      assertThat(response.purpose()).isEqualTo("下書きの会議");
      verify(approvalService, never()).createInitialStep(any(Reservation.class));
      verify(reservationRepository, never()).findByResource_IdAndStatusIn(any(), anyCollection());
      verify(resourceRepository, never()).findByIdForUpdate(any());
    }

    @Test
    void create_draftFalse_isTreatedAsNormalApplication() {
      CreateReservationRequest req =
          new CreateReservationRequest(resourceId, start, end, "通常の申請", null, false);

      ReservationResponse response = reservationService.create(req, requester);

      assertThat(response.status()).isEqualTo("APPROVED");
    }

    @Test
    void create_draftEndBeforeStart_throwsBusinessException() {
      CreateReservationRequest req =
          new CreateReservationRequest(resourceId, end, start, "テスト", null, true);

      assertThatThrownBy(() -> reservationService.create(req, requester))
          .isInstanceOf(BusinessException.class);
      verify(reservationRepository, never()).save(any(Reservation.class));
    }

    @Test
    void create_draftResourceNotFound_throwsResourceNotFoundException() {
      UUID unknownId = UUID.randomUUID();
      when(resourceRepository.findById(unknownId)).thenReturn(Optional.empty());
      CreateReservationRequest req =
          new CreateReservationRequest(unknownId, start, end, "テスト", null, true);

      assertThatThrownBy(() -> reservationService.create(req, requester))
          .isInstanceOf(ResourceNotFoundException.class);
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
      User owner = makeUser(ownerId, Role.MEMBER);
      Reservation draft = makeDraft(reservationId, owner);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(draft));

      ReservationResponse response = reservationService.get(reservationId, owner);

      assertThat(response.status()).isEqualTo("DRAFT");
    }

    @Test
    void get_draftByAdmin_returnsResponse() {
      User owner = makeUser(ownerId, Role.MEMBER);
      User admin = makeUser(UUID.randomUUID(), Role.ADMIN);
      Reservation draft = makeDraft(reservationId, owner);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(draft));

      ReservationResponse response = reservationService.get(reservationId, admin);

      assertThat(response.id()).isEqualTo(reservationId);
    }

    @Test
    void get_draftByOtherApprover_throwsAccessDeniedException() {
      User owner = makeUser(ownerId, Role.MEMBER);
      User approver = makeUser(otherId, Role.APPROVER);
      Reservation draft = makeDraft(reservationId, owner);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(draft));

      assertThatThrownBy(() -> reservationService.get(reservationId, approver))
          .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void get_draftByOtherMember_throwsAccessDeniedException() {
      User owner = makeUser(ownerId, Role.MEMBER);
      User other = makeUser(otherId, Role.MEMBER);
      Reservation draft = makeDraft(reservationId, owner);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(draft));

      assertThatThrownBy(() -> reservationService.get(reservationId, other))
          .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void get_nonDraftByApprover_returnsResponse() {
      // 下書き以外は、従来どおり APPROVER が全件参照できる
      User owner = makeUser(ownerId, Role.MEMBER);
      User approver = makeUser(otherId, Role.APPROVER);
      Reservation pending =
          makeReservation(
              reservationId,
              makeResource(UUID.randomUUID(), false),
              owner,
              LocalDateTime.of(2025, 6, 10, 10, 0),
              LocalDateTime.of(2025, 6, 10, 12, 0),
              ReservationStatus.PENDING);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(pending));

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

    // --- 下書き（DRAFT）の更新と正式申請 ---

    private Reservation draftOf(Resource resource, User owner) {
      return makeReservation(
          reservationId,
          resource,
          owner,
          LocalDateTime.of(2025, 6, 10, 10, 0),
          LocalDateTime.of(2025, 6, 10, 12, 0),
          ReservationStatus.DRAFT);
    }

    @Test
    void update_draftWithDraftTrue_staysDraftAndSkipsConflictCheck() {
      Resource resource = makeResource(resourceId, true);
      User owner = makeUser(ownerId, Role.MEMBER);
      Reservation draft = draftOf(resource, owner);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(draft));
      when(reservationRepository.save(any(Reservation.class)))
          .thenAnswer(inv -> inv.getArgument(0));

      UpdateReservationRequest req =
          new UpdateReservationRequest(newStart, newEnd, "下書きの更新", 2, true);
      ReservationResponse response = reservationService.update(reservationId, req, owner);

      assertThat(response.status()).isEqualTo("DRAFT");
      assertThat(response.startAt()).isEqualTo(newStart);
      assertThat(response.purpose()).isEqualTo("下書きの更新");
      verify(resourceRepository, never()).findByIdForUpdate(any());
      verify(approvalService, never()).createInitialStep(any(Reservation.class));
    }

    @Test
    void update_draftSubmitRequiresApproval_becomesPendingAndCreatesApprovalStep() {
      Resource resource = makeResource(resourceId, true);
      User owner = makeUser(ownerId, Role.MEMBER);
      Reservation draft = draftOf(resource, owner);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(draft));
      when(resourceRepository.findByIdForUpdate(resourceId)).thenReturn(Optional.of(resource));
      when(reservationRepository.findByResource_IdAndStatusIn(eq(resourceId), anyCollection()))
          .thenReturn(List.of());
      when(reservationRepository.save(any(Reservation.class)))
          .thenAnswer(inv -> inv.getArgument(0));

      UpdateReservationRequest req =
          new UpdateReservationRequest(newStart, newEnd, "正式申請", 4, null);
      ReservationResponse response = reservationService.update(reservationId, req, owner);

      assertThat(response.status()).isEqualTo("PENDING");
      assertThat(response.startAt()).isEqualTo(newStart);
      verify(approvalService).createInitialStep(draft);
    }

    @Test
    void update_draftSubmitWithoutApproval_becomesApprovedWithoutApprovalStep() {
      Resource resource = makeResource(resourceId, false);
      User owner = makeUser(ownerId, Role.MEMBER);
      Reservation draft = draftOf(resource, owner);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(draft));
      when(resourceRepository.findByIdForUpdate(resourceId)).thenReturn(Optional.of(resource));
      when(reservationRepository.findByResource_IdAndStatusIn(eq(resourceId), anyCollection()))
          .thenReturn(List.of());
      when(reservationRepository.save(any(Reservation.class)))
          .thenAnswer(inv -> inv.getArgument(0));

      // draft=false は、省略（null）と同じく正式申請になる
      UpdateReservationRequest req =
          new UpdateReservationRequest(newStart, newEnd, "正式申請", null, false);
      ReservationResponse response = reservationService.update(reservationId, req, owner);

      assertThat(response.status()).isEqualTo("APPROVED");
      verify(approvalService, never()).createInitialStep(any(Reservation.class));
    }

    @Test
    void update_draftSubmitWithConflict_throwsConflictAndKeepsDraft() {
      Resource resource = makeResource(resourceId, true);
      User owner = makeUser(ownerId, Role.MEMBER);
      Reservation draft = draftOf(resource, owner);
      Reservation conflicting =
          makeReservation(
              UUID.randomUUID(),
              resource,
              makeUser(otherId, Role.MEMBER),
              newStart.minusHours(1),
              newStart.plusHours(1),
              ReservationStatus.APPROVED);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(draft));
      when(resourceRepository.findByIdForUpdate(resourceId)).thenReturn(Optional.of(resource));
      when(reservationRepository.findByResource_IdAndStatusIn(eq(resourceId), anyCollection()))
          .thenReturn(List.of(conflicting));

      UpdateReservationRequest req =
          new UpdateReservationRequest(newStart, newEnd, "申請", null, null);

      assertThatThrownBy(() -> reservationService.update(reservationId, req, owner))
          .isInstanceOf(ReservationConflictException.class);
      assertThat(draft.getStatus()).isEqualTo(ReservationStatus.DRAFT);
      verify(approvalService, never()).createInitialStep(any(Reservation.class));
    }

    @Test
    void update_draftSubmitApproverNotAvailable_throwsBusinessException() {
      // 承認者がいないとき、例外でトランザクションが巻き戻る（DRAFT のまま残る）。
      // ここでは例外が伝わることだけを検証する。
      Resource resource = makeResource(resourceId, true);
      User owner = makeUser(ownerId, Role.MEMBER);
      Reservation draft = draftOf(resource, owner);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(draft));
      when(resourceRepository.findByIdForUpdate(resourceId)).thenReturn(Optional.of(resource));
      when(reservationRepository.findByResource_IdAndStatusIn(eq(resourceId), anyCollection()))
          .thenReturn(List.of());
      when(reservationRepository.save(any(Reservation.class)))
          .thenAnswer(inv -> inv.getArgument(0));
      doThrow(new BusinessException(ErrorCode.APPROVER_NOT_AVAILABLE, "承認者がいません。"))
          .when(approvalService)
          .createInitialStep(any(Reservation.class));

      UpdateReservationRequest req =
          new UpdateReservationRequest(newStart, newEnd, "申請", null, null);

      assertThatThrownBy(() -> reservationService.update(reservationId, req, owner))
          .isInstanceOf(BusinessException.class);
    }

    @Test
    void update_draftEndBeforeStart_throwsBusinessException() {
      Resource resource = makeResource(resourceId, false);
      User owner = makeUser(ownerId, Role.MEMBER);
      Reservation draft = draftOf(resource, owner);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(draft));

      UpdateReservationRequest req =
          new UpdateReservationRequest(newEnd, newStart, "テスト", null, true);

      assertThatThrownBy(() -> reservationService.update(reservationId, req, owner))
          .isInstanceOf(BusinessException.class);
      verify(reservationRepository, never()).save(any(Reservation.class));
    }

    @Test
    void update_pendingWithDraftTrue_throwsBusinessException() {
      Resource resource = makeResource(resourceId, false);
      User owner = makeUser(ownerId, Role.MEMBER);
      Reservation pending =
          makeReservation(
              reservationId,
              resource,
              owner,
              LocalDateTime.of(2025, 6, 10, 10, 0),
              LocalDateTime.of(2025, 6, 10, 12, 0),
              ReservationStatus.PENDING);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(pending));

      UpdateReservationRequest req =
          new UpdateReservationRequest(newStart, newEnd, "テスト", null, true);

      assertThatThrownBy(() -> reservationService.update(reservationId, req, owner))
          .isInstanceOf(BusinessException.class);
      assertThat(pending.getStatus()).isEqualTo(ReservationStatus.PENDING);
      verify(reservationRepository, never()).save(any(Reservation.class));
    }

    @Test
    void update_draftByOtherMember_throwsAccessDeniedException() {
      Resource resource = makeResource(resourceId, false);
      User owner = makeUser(ownerId, Role.MEMBER);
      User other = makeUser(otherId, Role.MEMBER);
      Reservation draft = draftOf(resource, owner);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(draft));

      UpdateReservationRequest req =
          new UpdateReservationRequest(newStart, newEnd, "テスト", null, true);

      assertThatThrownBy(() -> reservationService.update(reservationId, req, other))
          .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void update_draftByOtherAdmin_throwsAccessDeniedException() {
      // ADMIN も、他人の下書きは更新できない（閲覧のみ）
      Resource resource = makeResource(resourceId, false);
      User owner = makeUser(ownerId, Role.MEMBER);
      User admin = makeUser(otherId, Role.ADMIN);
      Reservation draft = draftOf(resource, owner);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(draft));

      UpdateReservationRequest req =
          new UpdateReservationRequest(newStart, newEnd, "テスト", null, true);

      assertThatThrownBy(() -> reservationService.update(reservationId, req, admin))
          .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void update_draftByOwnerWhoIsAdmin_staysDraft() {
      // ADMIN も、自分の下書きなら更新できる
      Resource resource = makeResource(resourceId, false);
      User adminOwner = makeUser(ownerId, Role.ADMIN);
      Reservation draft = draftOf(resource, adminOwner);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(draft));
      when(reservationRepository.save(any(Reservation.class)))
          .thenAnswer(inv -> inv.getArgument(0));

      UpdateReservationRequest req =
          new UpdateReservationRequest(newStart, newEnd, "テスト", null, true);
      ReservationResponse response = reservationService.update(reservationId, req, adminOwner);

      assertThat(response.status()).isEqualTo("DRAFT");
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
    void cancel_draftByOwner_throwsBusinessException() {
      // 下書きは取消の対象外（破棄するときは削除を使う）
      User owner = makeUser(ownerId, Role.MEMBER);
      Reservation draft = makeDraft(reservationId, owner);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(draft));

      assertThatThrownBy(() -> reservationService.cancel(reservationId, owner))
          .isInstanceOf(BusinessException.class);
      assertThat(draft.getStatus()).isEqualTo(ReservationStatus.DRAFT);
    }

    @Test
    void cancel_draftByAdmin_throwsBusinessException() {
      User owner = makeUser(ownerId, Role.MEMBER);
      User admin = makeUser(UUID.randomUUID(), Role.ADMIN);
      Reservation draft = makeDraft(reservationId, owner);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(draft));

      assertThatThrownBy(() -> reservationService.cancel(reservationId, admin))
          .isInstanceOf(BusinessException.class);
    }
  }

  // ---------------------------------------------------------------------------
  // delete — 下書きの削除
  // ---------------------------------------------------------------------------

  @Nested
  class Delete {

    private final UUID reservationId = UUID.fromString("20000000-0000-0000-0000-000000000040");
    private final UUID ownerId = UUID.fromString("20000000-0000-0000-0000-000000000041");
    private final UUID otherId = UUID.fromString("20000000-0000-0000-0000-000000000042");

    @Test
    void delete_draftByOwner_deletesReservation() {
      User owner = makeUser(ownerId, Role.MEMBER);
      Reservation draft = makeDraft(reservationId, owner);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(draft));

      reservationService.delete(reservationId, owner);

      verify(reservationRepository).delete(draft);
    }

    @Test
    void delete_draftByOwnerWhoIsAdmin_deletesReservation() {
      // ADMIN も、自分の下書きなら削除できる
      User adminOwner = makeUser(ownerId, Role.ADMIN);
      Reservation draft = makeDraft(reservationId, adminOwner);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(draft));

      reservationService.delete(reservationId, adminOwner);

      verify(reservationRepository).delete(draft);
    }

    @Test
    void delete_draftByOtherMember_throwsAccessDeniedException() {
      User owner = makeUser(ownerId, Role.MEMBER);
      User other = makeUser(otherId, Role.MEMBER);
      Reservation draft = makeDraft(reservationId, owner);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(draft));

      assertThatThrownBy(() -> reservationService.delete(reservationId, other))
          .isInstanceOf(AccessDeniedException.class);
      verify(reservationRepository, never()).delete(any(Reservation.class));
    }

    @Test
    void delete_draftByOtherAdmin_throwsAccessDeniedException() {
      // ADMIN も、他人の下書きは削除できない
      User owner = makeUser(ownerId, Role.MEMBER);
      User admin = makeUser(otherId, Role.ADMIN);
      Reservation draft = makeDraft(reservationId, owner);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(draft));

      assertThatThrownBy(() -> reservationService.delete(reservationId, admin))
          .isInstanceOf(AccessDeniedException.class);
      verify(reservationRepository, never()).delete(any(Reservation.class));
    }

    @Test
    void delete_pendingByOwner_throwsBusinessException() {
      User owner = makeUser(ownerId, Role.MEMBER);
      Reservation pending =
          makeReservation(
              reservationId,
              makeResource(UUID.randomUUID(), false),
              owner,
              LocalDateTime.of(2025, 6, 10, 10, 0),
              LocalDateTime.of(2025, 6, 10, 12, 0),
              ReservationStatus.PENDING);
      when(reservationRepository.findById(reservationId)).thenReturn(Optional.of(pending));

      assertThatThrownBy(() -> reservationService.delete(reservationId, owner))
          .isInstanceOf(BusinessException.class);
      verify(reservationRepository, never()).delete(any(Reservation.class));
    }

    @Test
    void delete_notFound_throwsResourceNotFoundException() {
      UUID unknownId = UUID.randomUUID();
      when(reservationRepository.findById(unknownId)).thenReturn(Optional.empty());
      User user = makeUser(ownerId, Role.MEMBER);

      assertThatThrownBy(() -> reservationService.delete(unknownId, user))
          .isInstanceOf(ResourceNotFoundException.class);
    }
  }

  // ---------------------------------------------------------------------------
  // list — 予約一覧（status 未指定のとき下書きを除く）
  // ---------------------------------------------------------------------------

  /** 下書きを含まず、残りの 4 ステータスをすべて含む集合かどうか。 */
  private static boolean isDefaultListedStatuses(Collection<ReservationStatus> statuses) {
    return statuses.size() == 4
        && !statuses.contains(ReservationStatus.DRAFT)
        && statuses.containsAll(
            List.of(
                ReservationStatus.PENDING,
                ReservationStatus.APPROVED,
                ReservationStatus.REJECTED,
                ReservationStatus.CANCELLED));
  }

  @Nested
  class ListReservations {

    private final UUID memberId = UUID.fromString("20000000-0000-0000-0000-000000000051");
    private final Pageable pageable = PageRequest.of(0, 20);

    @Test
    void list_noStatusAsMember_excludesDraft() {
      User member = makeUser(memberId, Role.MEMBER);
      Reservation draft = makeDraft(UUID.randomUUID(), member);
      when(reservationRepository.findByRequesterIdAndStatusInFetch(
              eq(memberId), argThat(ReservationServiceTest::isDefaultListedStatuses), eq(pageable)))
          .thenReturn(new PageImpl<>(List.of(draft)));

      Page<ReservationResponse> page = reservationService.list(member, null, pageable);

      // 下書きを除く集合で検索していること（検索結果の中身は、モックが返したもの）
      assertThat(page.getContent()).hasSize(1);
    }

    @Test
    void list_emptyStatusAsMember_isTreatedAsNoFilter() {
      User member = makeUser(memberId, Role.MEMBER);
      when(reservationRepository.findByRequesterIdAndStatusInFetch(
              eq(memberId), argThat(ReservationServiceTest::isDefaultListedStatuses), eq(pageable)))
          .thenReturn(new PageImpl<>(List.of()));

      Page<ReservationResponse> page = reservationService.list(member, List.of(), pageable);

      assertThat(page.getContent()).isEmpty();
    }

    @Test
    void list_noStatusAsAdmin_excludesDraft() {
      User admin = makeUser(UUID.randomUUID(), Role.ADMIN);
      when(reservationRepository.findByStatusInFetch(
              argThat(ReservationServiceTest::isDefaultListedStatuses), eq(pageable)))
          .thenReturn(new PageImpl<>(List.of()));

      Page<ReservationResponse> page = reservationService.list(admin, null, pageable);

      assertThat(page.getContent()).isEmpty();
    }

    @Test
    void list_statusDraftAsMember_returnsOwnDrafts() {
      User member = makeUser(memberId, Role.MEMBER);
      Reservation draft = makeDraft(UUID.randomUUID(), member);
      List<ReservationStatus> draftOnly = List.of(ReservationStatus.DRAFT);
      when(reservationRepository.findByRequesterIdAndStatusInFetch(
              eq(memberId), eq(draftOnly), eq(pageable)))
          .thenReturn(new PageImpl<>(List.of(draft)));

      Page<ReservationResponse> page = reservationService.list(member, draftOnly, pageable);

      assertThat(page.getContent()).hasSize(1);
      assertThat(page.getContent().get(0).status()).isEqualTo("DRAFT");
    }

    @Test
    void list_statusDraftAsAdmin_returnsAllUsersDrafts() {
      User admin = makeUser(UUID.randomUUID(), Role.ADMIN);
      Reservation draftOfMember = makeDraft(UUID.randomUUID(), makeUser(memberId, Role.MEMBER));
      List<ReservationStatus> draftOnly = List.of(ReservationStatus.DRAFT);
      when(reservationRepository.findByStatusInFetch(eq(draftOnly), eq(pageable)))
          .thenReturn(new PageImpl<>(List.of(draftOfMember)));

      Page<ReservationResponse> page = reservationService.list(admin, draftOnly, pageable);

      assertThat(page.getContent()).hasSize(1);
      assertThat(page.getContent().get(0).status()).isEqualTo("DRAFT");
    }
  }
}
