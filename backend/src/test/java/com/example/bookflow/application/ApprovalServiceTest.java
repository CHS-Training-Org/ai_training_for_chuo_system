package com.example.bookflow.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.bookflow.application.exception.ApprovalStepNotFoundException;
import com.example.bookflow.application.exception.BusinessException;
import com.example.bookflow.application.exception.CommentRequiredException;
import com.example.bookflow.application.exception.ReservationConflictException;
import com.example.bookflow.domain.ApprovalStatus;
import com.example.bookflow.domain.ApprovalStep;
import com.example.bookflow.domain.ApprovalStepRepository;
import com.example.bookflow.domain.Reservation;
import com.example.bookflow.domain.ReservationRepository;
import com.example.bookflow.domain.ReservationStatus;
import com.example.bookflow.domain.Resource;
import com.example.bookflow.domain.ResourceCategory;
import com.example.bookflow.domain.ResourceRepository;
import com.example.bookflow.domain.Role;
import com.example.bookflow.domain.User;
import com.example.bookflow.domain.UserRepository;
import com.example.bookflow.presentation.dto.ApprovalStepResponse;
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
 * {@link ApprovalService} 単体テスト（ADR-018 準拠・Mockito）。
 *
 * <p>業務ルール（APRV-01〜07・重複再チェック・コメント必須・決済済みガード・所有権制御）を単体で検証する。 テスト命名規約（ADR-018）: {@code
 * methodName_condition_expectedBehavior}
 */
@ExtendWith(MockitoExtension.class)
class ApprovalServiceTest {

  @Mock private ApprovalStepRepository approvalStepRepository;
  @Mock private ReservationRepository reservationRepository;
  @Mock private ResourceRepository resourceRepository;
  @Mock private UserRepository userRepository;

  @InjectMocks private ApprovalService approvalService;

  // ---------------------------------------------------------------------------
  // テストヘルパー：リフレクションでエンティティのフィールドを設定する
  // ---------------------------------------------------------------------------

  private static Resource makeResource(UUID id) {
    try {
      Resource r = new Resource() {};
      setField(r, "id", id);
      setField(r, "name", "テスト会議室");
      setField(r, "category", ResourceCategory.ROOM);
      setField(r, "isActive", true);
      setField(r, "requiresApproval", true);
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

  private static ApprovalStep makeApprovalStep(
      UUID id, Reservation reservation, User approver, ApprovalStatus status) {
    try {
      ApprovalStep step = new ApprovalStep() {};
      setField(step, "id", id);
      setField(step, "reservation", reservation);
      setField(step, "approver", approver);
      setField(step, "stepOrder", 1);
      setField(step, "status", status);
      setField(step, "comment", null);
      setField(step, "decidedAt", null);
      setField(step, "createdAt", LocalDateTime.of(2025, 6, 1, 9, 0));
      return step;
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
  // createInitialStep — 承認ステップ生成
  // ---------------------------------------------------------------------------

  @Nested
  class CreateInitialStep {

    @Test
    void createInitialStep_approverExists_savesStep() {
      UUID resourceId = UUID.fromString("60000000-0000-0000-0000-000000000001");
      UUID requesterId = UUID.fromString("60000000-0000-0000-0000-000000000002");
      UUID approverId = UUID.fromString("60000000-0000-0000-0000-000000000003");

      Resource resource = makeResource(resourceId);
      User requester = makeUser(requesterId, Role.MEMBER);
      User approver = makeUser(approverId, Role.APPROVER);
      Reservation reservation =
          makeReservation(
              UUID.randomUUID(),
              resource,
              requester,
              LocalDateTime.of(2025, 7, 1, 10, 0),
              LocalDateTime.of(2025, 7, 1, 12, 0),
              ReservationStatus.PENDING);

      when(userRepository.findFirstByRole(Role.APPROVER)).thenReturn(Optional.of(approver));
      when(approvalStepRepository.save(any(ApprovalStep.class)))
          .thenAnswer(inv -> inv.getArgument(0));

      approvalService.createInitialStep(reservation);

      verify(approvalStepRepository).save(any(ApprovalStep.class));
    }

    @Test
    void createInitialStep_noApproverExists_throwsBusinessException() {
      UUID resourceId = UUID.fromString("60000000-0000-0000-0000-000000000011");
      Resource resource = makeResource(resourceId);
      User requester = makeUser(UUID.randomUUID(), Role.MEMBER);
      Reservation reservation =
          makeReservation(
              UUID.randomUUID(),
              resource,
              requester,
              LocalDateTime.of(2025, 7, 1, 10, 0),
              LocalDateTime.of(2025, 7, 1, 12, 0),
              ReservationStatus.PENDING);

      when(userRepository.findFirstByRole(Role.APPROVER)).thenReturn(Optional.empty());

      // APPROVER 不在は BusinessException（APPROVER_NOT_AVAILABLE・422）として返す
      assertThatThrownBy(() -> approvalService.createInitialStep(reservation))
          .isInstanceOf(BusinessException.class);
    }
  }

  // ---------------------------------------------------------------------------
  // listPending — 承認待ち一覧
  // ---------------------------------------------------------------------------

  @Nested
  class ListPending {

    @Test
    void listPending_approverRole_returnsOwnStepsOnly() {
      UUID approverId = UUID.fromString("60000000-0000-0000-0000-000000000020");
      User approver = makeUser(approverId, Role.APPROVER);
      Resource resource = makeResource(UUID.randomUUID());
      User requester = makeUser(UUID.randomUUID(), Role.MEMBER);
      Reservation reservation =
          makeReservation(
              UUID.randomUUID(),
              resource,
              requester,
              LocalDateTime.of(2025, 7, 1, 10, 0),
              LocalDateTime.of(2025, 7, 1, 12, 0),
              ReservationStatus.PENDING);
      ApprovalStep step =
          makeApprovalStep(UUID.randomUUID(), reservation, approver, ApprovalStatus.PENDING);

      when(approvalStepRepository.findPendingByApprover(approverId)).thenReturn(List.of(step));

      List<ApprovalStepResponse> result = approvalService.listPending(approver);

      assertThat(result).hasSize(1);
      assertThat(result.get(0).status()).isEqualTo("PENDING");
    }

    @Test
    void listPending_adminRole_returnsAllPendingSteps() {
      UUID adminId = UUID.fromString("60000000-0000-0000-0000-000000000030");
      User admin = makeUser(adminId, Role.ADMIN);
      Resource resource = makeResource(UUID.randomUUID());
      User requester = makeUser(UUID.randomUUID(), Role.MEMBER);
      User approver = makeUser(UUID.randomUUID(), Role.APPROVER);
      Reservation r1 =
          makeReservation(
              UUID.randomUUID(),
              resource,
              requester,
              LocalDateTime.of(2025, 7, 1, 10, 0),
              LocalDateTime.of(2025, 7, 1, 12, 0),
              ReservationStatus.PENDING);
      ApprovalStep step1 =
          makeApprovalStep(UUID.randomUUID(), r1, approver, ApprovalStatus.PENDING);

      when(approvalStepRepository.findAllPending()).thenReturn(List.of(step1));

      List<ApprovalStepResponse> result = approvalService.listPending(admin);

      assertThat(result).hasSize(1);
    }
  }

  // ---------------------------------------------------------------------------
  // approve — 承認操作
  // ---------------------------------------------------------------------------

  @Nested
  class Approve {

    private final UUID resourceId = UUID.fromString("60000000-0000-0000-0000-000000000040");
    private final UUID requesterId = UUID.fromString("60000000-0000-0000-0000-000000000041");
    private final UUID approverId = UUID.fromString("60000000-0000-0000-0000-000000000042");
    private final UUID stepId = UUID.fromString("60000000-0000-0000-0000-000000000043");
    private final UUID reservationId = UUID.fromString("60000000-0000-0000-0000-000000000044");

    private Resource resource;
    private User requester;
    private User approver;
    private Reservation reservation;
    private ApprovalStep step;

    @BeforeEach
    void setUp() {
      resource = makeResource(resourceId);
      requester = makeUser(requesterId, Role.MEMBER);
      approver = makeUser(approverId, Role.APPROVER);
      reservation =
          makeReservation(
              reservationId,
              resource,
              requester,
              LocalDateTime.of(2025, 7, 1, 10, 0),
              LocalDateTime.of(2025, 7, 1, 12, 0),
              ReservationStatus.PENDING);
      step = makeApprovalStep(stepId, reservation, approver, ApprovalStatus.PENDING);

      lenient().when(approvalStepRepository.findByIdFetch(stepId)).thenReturn(Optional.of(step));
      lenient()
          .when(reservationRepository.findByResource_IdAndStatusIn(eq(resourceId), anyCollection()))
          .thenReturn(List.of(reservation)); // 自己のみ（自己除外でコンフリクトなし）
      lenient()
          .when(approvalStepRepository.save(any(ApprovalStep.class)))
          .thenAnswer(inv -> inv.getArgument(0));
      lenient()
          .when(reservationRepository.save(any(Reservation.class)))
          .thenAnswer(inv -> inv.getArgument(0));
      // findByIdForUpdate: 悲観ロック取得（approve の重複チェック直列化に使用）
      lenient()
          .when(resourceRepository.findByIdForUpdate(resourceId))
          .thenReturn(Optional.of(resource));
    }

    @Test
    void approve_pendingStepByOwnerApprover_returnsApproved() {
      ApprovalStepResponse response = approvalService.approve(stepId, "問題なし", approver);

      assertThat(response.status()).isEqualTo("APPROVED");
    }

    @Test
    void approve_pendingStepByAdmin_returnsApproved() {
      User admin = makeUser(UUID.randomUUID(), Role.ADMIN);

      ApprovalStepResponse response = approvalService.approve(stepId, null, admin);

      assertThat(response.status()).isEqualTo("APPROVED");
    }

    @Test
    void approve_selfExcluded_noConflict() {
      // 自己の予約のみ OCCUPIED_STATUSES に含まれる → 自己除外後コンフリクトなし
      // このパスは approve が成功することで自己除外が機能していることを確認する
      ApprovalStepResponse response = approvalService.approve(stepId, null, approver);

      assertThat(response.status()).isEqualTo("APPROVED");
    }

    @Test
    void approve_conflictWithOtherApprovedReservation_throwsReservationConflictException() {
      // 別の APPROVED 予約が重複
      User other = makeUser(UUID.randomUUID(), Role.MEMBER);
      Reservation conflicting =
          makeReservation(
              UUID.randomUUID(),
              resource,
              other,
              LocalDateTime.of(2025, 7, 1, 11, 0),
              LocalDateTime.of(2025, 7, 1, 13, 0),
              ReservationStatus.APPROVED);
      when(reservationRepository.findByResource_IdAndStatusIn(eq(resourceId), anyCollection()))
          .thenReturn(List.of(reservation, conflicting));

      assertThatThrownBy(() -> approvalService.approve(stepId, null, approver))
          .isInstanceOf(ReservationConflictException.class);
    }

    @Test
    void approve_alreadyDecidedStep_throwsBusinessException() throws Exception {
      setField(step, "status", ApprovalStatus.APPROVED);

      assertThatThrownBy(() -> approvalService.approve(stepId, null, approver))
          .isInstanceOf(BusinessException.class);
    }

    @Test
    void approve_otherApproverAccess_throwsAccessDeniedException() {
      User otherApprover = makeUser(UUID.randomUUID(), Role.APPROVER);

      assertThatThrownBy(() -> approvalService.approve(stepId, null, otherApprover))
          .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void approve_stepNotFound_throwsApprovalStepNotFoundException() {
      UUID unknownId = UUID.randomUUID();
      when(approvalStepRepository.findByIdFetch(unknownId)).thenReturn(Optional.empty());

      assertThatThrownBy(() -> approvalService.approve(unknownId, null, approver))
          .isInstanceOf(ApprovalStepNotFoundException.class);
    }
  }

  // ---------------------------------------------------------------------------
  // reject — 却下操作
  // ---------------------------------------------------------------------------

  @Nested
  class Reject {

    private final UUID resourceId = UUID.fromString("60000000-0000-0000-0000-000000000050");
    private final UUID requesterId = UUID.fromString("60000000-0000-0000-0000-000000000051");
    private final UUID approverId = UUID.fromString("60000000-0000-0000-0000-000000000052");
    private final UUID stepId = UUID.fromString("60000000-0000-0000-0000-000000000053");
    private final UUID reservationId = UUID.fromString("60000000-0000-0000-0000-000000000054");

    private Resource resource;
    private User requester;
    private User approver;
    private Reservation reservation;
    private ApprovalStep step;

    @BeforeEach
    void setUp() {
      resource = makeResource(resourceId);
      requester = makeUser(requesterId, Role.MEMBER);
      approver = makeUser(approverId, Role.APPROVER);
      reservation =
          makeReservation(
              reservationId,
              resource,
              requester,
              LocalDateTime.of(2025, 7, 1, 10, 0),
              LocalDateTime.of(2025, 7, 1, 12, 0),
              ReservationStatus.PENDING);
      step = makeApprovalStep(stepId, reservation, approver, ApprovalStatus.PENDING);

      lenient().when(approvalStepRepository.findByIdFetch(stepId)).thenReturn(Optional.of(step));
      lenient()
          .when(approvalStepRepository.save(any(ApprovalStep.class)))
          .thenAnswer(inv -> inv.getArgument(0));
      lenient()
          .when(reservationRepository.save(any(Reservation.class)))
          .thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void reject_withComment_returnsRejected() {
      ApprovalStepResponse response = approvalService.reject(stepId, "日程が他の予約と重複しています。", approver);

      assertThat(response.status()).isEqualTo("REJECTED");
    }

    @Test
    void reject_emptyComment_throwsCommentRequiredException() {
      assertThatThrownBy(() -> approvalService.reject(stepId, "", approver))
          .isInstanceOf(CommentRequiredException.class);
    }

    @Test
    void reject_nullComment_throwsCommentRequiredException() {
      assertThatThrownBy(() -> approvalService.reject(stepId, null, approver))
          .isInstanceOf(CommentRequiredException.class);
    }

    @Test
    void reject_doesNotCheckConflict() {
      // 却下時は重複再チェックを行わないことを確認（reservationRepository の findByResource_IdAndStatusIn が呼ばれない）
      approvalService.reject(stepId, "却下理由", approver);

      verify(reservationRepository, never()).findByResource_IdAndStatusIn(any(), anyCollection());
    }

    @Test
    void reject_alreadyDecidedStep_throwsBusinessException() throws Exception {
      setField(step, "status", ApprovalStatus.REJECTED);

      assertThatThrownBy(() -> approvalService.reject(stepId, "再却下", approver))
          .isInstanceOf(BusinessException.class);
    }

    @Test
    void reject_otherApproverAccess_throwsAccessDeniedException() {
      User otherApprover = makeUser(UUID.randomUUID(), Role.APPROVER);

      assertThatThrownBy(() -> approvalService.reject(stepId, "却下理由", otherApprover))
          .isInstanceOf(AccessDeniedException.class);
    }
  }
}
