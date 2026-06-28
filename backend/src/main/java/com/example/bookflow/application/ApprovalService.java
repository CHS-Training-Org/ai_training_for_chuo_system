package com.example.bookflow.application;

import com.example.bookflow.application.exception.ApprovalStepNotFoundException;
import com.example.bookflow.application.exception.BusinessException;
import com.example.bookflow.application.exception.CommentRequiredException;
import com.example.bookflow.application.exception.ErrorCode;
import com.example.bookflow.application.exception.ReservationConflictException;
import com.example.bookflow.application.exception.ResourceNotFoundException;
import com.example.bookflow.domain.ApprovalStatus;
import com.example.bookflow.domain.ApprovalStep;
import com.example.bookflow.domain.ApprovalStepRepository;
import com.example.bookflow.domain.Reservation;
import com.example.bookflow.domain.ReservationRepository;
import com.example.bookflow.domain.ReservationStatus;
import com.example.bookflow.domain.ResourceRepository;
import com.example.bookflow.domain.Role;
import com.example.bookflow.domain.User;
import com.example.bookflow.domain.UserRepository;
import com.example.bookflow.presentation.dto.ApprovalStepResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 承認ワークフローのユースケース Service。
 *
 * <p>以下の業務ルール（{@code requirements.md APRV-01〜07}）を集約する：
 *
 * <ul>
 *   <li>APPROVER は自分担当（{@code approver_id = 自分}）のステップのみ操作可（ADMIN は全件）
 *   <li>承認時は {@code PENDING → APPROVED} 遷移前に重複予約再チェック（APRV-05）
 *   <li>却下コメントは必須（欠落/空 → 400 {@code COMMENT_REQUIRED}・APRV-04）
 *   <li>決済済みステップへの再操作は 422 {@code APPROVAL_ALREADY_DECIDED}（APRV-06）
 *   <li>MEMBER は操作不可（403・APRV-07・Controller の {@code @PreAuthorize} が担当）
 * </ul>
 *
 * <p>重複判定ロジックは {@link ResourceService#overlaps} ({@code public static}) を再利用する。
 */
@Service
@Transactional
public class ApprovalService {

  /** 重複チェック対象のステータス（PENDING/APPROVED）。 */
  private static final List<ReservationStatus> OCCUPIED_STATUSES =
      List.of(ReservationStatus.PENDING, ReservationStatus.APPROVED);

  private final ApprovalStepRepository approvalStepRepository;
  private final ReservationRepository reservationRepository;
  private final ResourceRepository resourceRepository;
  private final UserRepository userRepository;

  public ApprovalService(
      ApprovalStepRepository approvalStepRepository,
      ReservationRepository reservationRepository,
      ResourceRepository resourceRepository,
      UserRepository userRepository) {
    this.approvalStepRepository = approvalStepRepository;
    this.reservationRepository = reservationRepository;
    this.resourceRepository = resourceRepository;
    this.userRepository = userRepository;
  }

  // ---------------------------------------------------------------------------
  // 承認ステップ生成（ReservationService.create() から呼ばれる）
  // ---------------------------------------------------------------------------

  /**
   * 予約申請時に承認ステップを生成する（{@code requires_approval = true} のリソースのみ）。
   *
   * <p>ベース実装は 1 段階承認（{@code step_order = 1}）。承認者は {@code role = 'APPROVER'} のユーザーを割り当てる （seed データに
   * APPROVER が 1 名存在することを前提。部署別ルーティングは拡張課題）。
   *
   * <p>{@link com.example.bookflow.application.ReservationService#create} の 「カテゴリ 6
   * TODO」シームを解消するために実装。
   *
   * @param reservation 承認ステップを生成する予約（直前に永続化済みであること）
   */
  public void createInitialStep(Reservation reservation) {
    User approver =
        userRepository
            .findFirstByRole(Role.APPROVER)
            .orElseThrow(
                () ->
                    new BusinessException(
                        ErrorCode.APPROVER_NOT_AVAILABLE,
                        "承認者（APPROVER ロール）が存在しません。システム管理者に連絡してください。"));
    ApprovalStep step = ApprovalStep.create(reservation, approver);
    approvalStepRepository.save(step);
  }

  // ---------------------------------------------------------------------------
  // 承認待ち一覧
  // ---------------------------------------------------------------------------

  /**
   * 承認待ちステップ一覧を返す（ページネーションなし・全件）。
   *
   * <p>APPROVER は自分担当（{@code approver_id = 自分}）の PENDING ステップのみ。ADMIN は全 PENDING ステップ。
   *
   * @param currentUser ログインユーザー
   * @return 承認待ちステップのレスポンスリスト
   */
  @Transactional(readOnly = true)
  public List<ApprovalStepResponse> listPending(User currentUser) {
    List<ApprovalStep> steps;
    if (currentUser.getRole() == Role.ADMIN) {
      steps = approvalStepRepository.findAllPending();
    } else {
      steps = approvalStepRepository.findPendingByApprover(currentUser.getId());
    }
    return steps.stream().map(ApprovalStepResponse::from).toList();
  }

  // ---------------------------------------------------------------------------
  // 承認操作
  // ---------------------------------------------------------------------------

  /**
   * 承認操作を行う（{@code PENDING → APPROVED}）。
   *
   * <p>業務ロジック：
   *
   * <ol>
   *   <li>承認ステップ存在確認（404 {@code APPROVAL_STEP_NOT_FOUND}）
   *   <li>所有権確認（APPROVER は自分担当のみ・非 ADMIN → 403）
   *   <li>決済済みガード（APPROVED / REJECTED → 422 {@code APPROVAL_ALREADY_DECIDED}）
   *   <li>重複予約再チェック（対象予約自身を除外・競合あり → 409 {@code RESERVATION_CONFLICT}）
   *   <li>{@link ApprovalStep#approve(String)} + {@link Reservation#markApproved()}
   * </ol>
   *
   * @param stepId 承認ステップ ID
   * @param comment 承認コメント（任意・null 可）
   * @param currentUser ログインユーザー
   * @return 承認後の {@link ApprovalStepResponse}
   */
  public ApprovalStepResponse approve(UUID stepId, String comment, User currentUser) {
    ApprovalStep step = findStepOrThrow(stepId);
    checkOwnership(step, currentUser);
    guardAlreadyDecided(step);

    Reservation reservation = step.getReservation();

    // 予約ステータスガード（CANCELLED 予約が誤って復活しないよう防止）
    guardReservationPending(reservation);

    // 悲観ロックでリソース行を先取得し、並行 approve の重複チェックを直列化
    resourceRepository
        .findByIdForUpdate(reservation.getResource().getId())
        .orElseThrow(
            () ->
                new ResourceNotFoundException("リソースが存在しません: " + reservation.getResource().getId()));

    // 重複再チェック（自己除外：対象予約は PENDING のため OCCUPIED_STATUSES に含まれる）
    checkConflictExcludingSelf(reservation);

    step.approve(comment);
    reservation.markApproved();
    reservationRepository.save(reservation);
    return ApprovalStepResponse.from(approvalStepRepository.save(step));
  }

  // ---------------------------------------------------------------------------
  // 却下操作
  // ---------------------------------------------------------------------------

  /**
   * 却下操作を行う（{@code PENDING → REJECTED}）。
   *
   * <p>業務ロジック：
   *
   * <ol>
   *   <li>承認ステップ存在確認（404）
   *   <li>所有権確認（403）
   *   <li>決済済みガード（422）
   *   <li>コメント必須チェック（null/blank → 400 {@code COMMENT_REQUIRED}）
   *   <li>{@link ApprovalStep#reject(String)} + {@link Reservation#markRejected()}
   * </ol>
   *
   * <p>却下時は重複再チェックを行わない（{@code requirements.md} L308 準拠）。
   *
   * @param stepId 承認ステップ ID
   * @param comment 却下コメント（必須）
   * @param currentUser ログインユーザー
   * @return 却下後の {@link ApprovalStepResponse}
   */
  public ApprovalStepResponse reject(UUID stepId, String comment, User currentUser) {
    ApprovalStep step = findStepOrThrow(stepId);
    checkOwnership(step, currentUser);
    guardAlreadyDecided(step);

    Reservation reservation = step.getReservation();

    // 予約ステータスガード（CANCELLED 予約が誤って復活しないよう防止）
    guardReservationPending(reservation);

    // コメント必須チェック（@NotBlank ではなく Service で判定して COMMENT_REQUIRED を返す）
    if (comment == null || comment.isBlank()) {
      throw new CommentRequiredException();
    }

    step.reject(comment);
    reservation.markRejected();
    reservationRepository.save(reservation);
    return ApprovalStepResponse.from(approvalStepRepository.save(step));
  }

  // ---------------------------------------------------------------------------
  // 内部ユーティリティ
  // ---------------------------------------------------------------------------

  private ApprovalStep findStepOrThrow(UUID stepId) {
    return approvalStepRepository
        .findByIdFetch(stepId)
        .orElseThrow(() -> new ApprovalStepNotFoundException("承認ステップが存在しません: " + stepId));
  }

  /**
   * 所有権確認。APPROVER は自分担当のステップのみ操作可。ADMIN は全件操作可。
   *
   * @param step 操作対象ステップ
   * @param currentUser ログインユーザー
   */
  private void checkOwnership(ApprovalStep step, User currentUser) {
    if (currentUser.getRole() != Role.ADMIN
        && !step.getApprover().getId().equals(currentUser.getId())) {
      throw new AccessDeniedException("この承認ステップを操作する権限がありません。");
    }
  }

  /**
   * 対象予約が PENDING であることを確認する。
   *
   * <p>CANCELLED 予約に紐づく PENDING ステップを承認/却下すると予約が復活してしまうため防止する。
   * キャンセル後にファントムステップが残存している場合でも、このガードで操作をブロックできる。
   *
   * @param reservation 操作対象の予約
   */
  private void guardReservationPending(Reservation reservation) {
    if (reservation.getStatus() != ReservationStatus.PENDING) {
      throw new BusinessException(
          ErrorCode.APPROVAL_ALREADY_DECIDED,
          "対象の予約は既に決済済みまたはキャンセル済みです。現在のステータス: " + reservation.getStatus());
    }
  }

  /**
   * 決済済みガード。APPROVED / REJECTED のステップへの再操作は 422。
   *
   * @param step 操作対象ステップ
   */
  private void guardAlreadyDecided(ApprovalStep step) {
    if (step.getStatus() != ApprovalStatus.PENDING) {
      throw new BusinessException(
          ErrorCode.APPROVAL_ALREADY_DECIDED, "すでに決済済みの承認ステップです。現在のステータス: " + step.getStatus());
    }
  }

  /**
   * 重複予約再チェック（approve 専用・対象予約自身を除外）。
   *
   * <p>対象予約は {@code PENDING} ステータスのため {@code OCCUPIED_STATUSES} に含まれる。
   * 自身を除外しないと常に競合と判定されるため除外が必須（{@code api-spec.md} L730）。
   *
   * @param reservation チェック対象予約（自身を除外）
   */
  private void checkConflictExcludingSelf(Reservation reservation) {
    boolean conflict =
        reservationRepository
            .findByResource_IdAndStatusIn(reservation.getResource().getId(), OCCUPIED_STATUSES)
            .stream()
            .filter(r -> !r.getId().equals(reservation.getId()))
            .anyMatch(
                r ->
                    ResourceService.overlaps(
                        r.getStartAt(),
                        r.getEndAt(),
                        reservation.getStartAt(),
                        reservation.getEndAt()));
    if (conflict) {
      throw new ReservationConflictException();
    }
  }
}
