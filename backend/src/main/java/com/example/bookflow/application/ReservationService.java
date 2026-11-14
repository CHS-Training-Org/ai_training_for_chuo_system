package com.example.bookflow.application;

import com.example.bookflow.application.exception.BusinessException;
import com.example.bookflow.application.exception.ErrorCode;
import com.example.bookflow.application.exception.ReservationConflictException;
import com.example.bookflow.application.exception.ResourceNotFoundException;
import com.example.bookflow.domain.Reservation;
import com.example.bookflow.domain.ReservationRepository;
import com.example.bookflow.domain.ReservationStatus;
import com.example.bookflow.domain.Resource;
import com.example.bookflow.domain.ResourceRepository;
import com.example.bookflow.domain.Role;
import com.example.bookflow.domain.User;
import com.example.bookflow.presentation.dto.CreateReservationRequest;
import com.example.bookflow.presentation.dto.ReservationResponse;
import com.example.bookflow.presentation.dto.UpdateReservationRequest;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 予約のユースケース Service。
 *
 * <p>BookFlow のドメインの中核。以下の業務ルールを集約する：
 *
 * <ul>
 *   <li>重複予約チェック（{@code PENDING}/{@code APPROVED} との時間帯重複 → 409）
 *   <li>{@code requires_approval} 分岐（false → 即 {@code APPROVED}、true → {@code PENDING}）
 *   <li>所有権チェック（本人または ADMIN のみ操作可 → 403）
 *   <li>ステータスガード（PUT は PENDING と DRAFT のみ・cancel は PENDING/APPROVED のみ・DELETE は DRAFT のみ → 422）
 *   <li>下書き（{@code DRAFT}）の保存・更新・正式申請・削除と、本人と ADMIN のみの閲覧
 * </ul>
 *
 * <p>重複判定ロジックは {@link ResourceService#overlaps} ({@code public static}) を再利用する。
 *
 * <p>【カテゴリ 6 TODO】{@code requires_approval=true} の申請時に {@code approval_steps} を生成する。 承認者割当ルールはカテゴリ
 * 6 の ApprovalStep エンティティ作成と同時に実装する（§承認 参照）。
 */
@Service
@Transactional
public class ReservationService {

  /** 重複チェック対象のステータス（PENDING/APPROVED）。 */
  private static final List<ReservationStatus> OCCUPIED_STATUSES =
      List.of(ReservationStatus.PENDING, ReservationStatus.APPROVED);

  /** キャンセル可能なステータス。 */
  private static final List<ReservationStatus> CANCELLABLE_STATUSES =
      List.of(ReservationStatus.PENDING, ReservationStatus.APPROVED);

  /** 一覧で {@code status} を指定しないときの対象（下書きを除く 4 ステータス）。 */
  private static final List<ReservationStatus> DEFAULT_LISTED_STATUSES =
      List.of(
          ReservationStatus.PENDING,
          ReservationStatus.APPROVED,
          ReservationStatus.REJECTED,
          ReservationStatus.CANCELLED);

  private final ReservationRepository reservationRepository;
  private final ResourceRepository resourceRepository;
  private final ApprovalService approvalService;

  public ReservationService(
      ReservationRepository reservationRepository,
      ResourceRepository resourceRepository,
      ApprovalService approvalService) {
    this.reservationRepository = reservationRepository;
    this.resourceRepository = resourceRepository;
    this.approvalService = approvalService;
  }

  // ---------------------------------------------------------------------------
  // 予約一覧
  // ---------------------------------------------------------------------------

  /**
   * 予約一覧をページネーションで返す。
   *
   * <p>ADMIN は全件、それ以外は本人分のみ。{@code statuses} が空でなければ status フィルタを適用する。 {@code statuses}
   * を指定しない場合は、下書き（{@code DRAFT}）を除く全ステータスを対象にする。下書きを返すのは {@code DRAFT} を明示したときだけで、 その場合も ADMIN
   * 以外には自分の下書きだけを返す。
   *
   * @param currentUser ログインユーザー
   * @param statuses ステータスフィルタ（空の場合は {@code DRAFT} を除く全ステータス）
   * @param pageable ページネーション
   * @return 予約ページ
   */
  @Transactional(readOnly = true)
  public Page<ReservationResponse> list(
      User currentUser, Collection<ReservationStatus> statuses, Pageable pageable) {
    boolean isAdmin = currentUser.getRole() == Role.ADMIN;
    boolean hasStatusFilter = statuses != null && !statuses.isEmpty();
    Collection<ReservationStatus> targetStatuses =
        hasStatusFilter ? statuses : DEFAULT_LISTED_STATUSES;

    Page<Reservation> page =
        isAdmin
            ? reservationRepository.findByStatusInFetch(targetStatuses, pageable)
            : reservationRepository.findByRequesterIdAndStatusInFetch(
                currentUser.getId(), targetStatuses, pageable);
    return page.map(ReservationResponse::from);
  }

  // ---------------------------------------------------------------------------
  // 予約詳細
  // ---------------------------------------------------------------------------

  /**
   * 指定 ID の予約を返す。
   *
   * <p>MEMBER は本人の予約のみアクセス可。他人の予約へのアクセスは 403。
   *
   * @param id 予約 ID
   * @param currentUser ログインユーザー
   * @return {@link ReservationResponse}
   */
  @Transactional(readOnly = true)
  public ReservationResponse get(UUID id, User currentUser) {
    Reservation reservation = findOrThrow(id);
    checkReadAccess(reservation, currentUser);
    return ReservationResponse.from(reservation);
  }

  // ---------------------------------------------------------------------------
  // 予約申請
  // ---------------------------------------------------------------------------

  /**
   * 予約を申請する。
   *
   * <p>業務ロジック：
   *
   * <ol>
   *   <li>リソース存在確認（404）
   *   <li>日時整合性チェック（endAt &gt; startAt）
   *   <li>重複予約チェック（409 {@code RESERVATION_CONFLICT}）
   *   <li>{@code requires_approval} に応じてステータスを決定（false → {@code APPROVED}、true → {@code PENDING}）
   *   <li>予約を保存
   * </ol>
   *
   * <p>【カテゴリ 6 TODO】{@code requires_approval=true} の場合、{@code approval_steps} を生成し承認者を割り当てる。
   *
   * <p>{@code draft=true} の場合は、下書き（{@code DRAFT}）として保存する。リソースの存在確認と日時整合性チェックだけを行い、
   * 重複予約チェックと承認ステップの生成はしない（下書きは時間帯を押さえない）。
   *
   * @param req 予約申請リクエスト
   * @param requester 申請ユーザー
   * @return 作成後の {@link ReservationResponse}
   */
  public ReservationResponse create(CreateReservationRequest req, User requester) {
    if (Boolean.TRUE.equals(req.draft())) {
      return createDraft(req, requester);
    }

    // 1. リソース存在確認（悲観ロックで取得し、以降の重複チェックを直列化）
    Resource resource =
        resourceRepository
            .findByIdForUpdate(req.resourceId())
            .orElseThrow(() -> new ResourceNotFoundException("リソースが存在しません: " + req.resourceId()));

    // 2. 日時整合性チェック
    validateTimeRange(req.startAt(), req.endAt());

    // 3. 重複予約チェック（自分含む全 PENDING/APPROVED を検索）
    checkConflict(resource.getId(), null, req.startAt(), req.endAt());

    // 4. ステータス決定（requires_approval=false → APPROVED、true → PENDING）
    ReservationStatus status =
        resource.isRequiresApproval() ? ReservationStatus.PENDING : ReservationStatus.APPROVED;

    // 5. 予約保存
    Reservation reservation =
        Reservation.create(
            resource,
            requester,
            req.startAt(),
            req.endAt(),
            req.purpose(),
            req.attendeesCount(),
            status);
    Reservation saved = reservationRepository.save(reservation);

    // 6. 【カテゴリ 6 シーム解消】requires_approval=true の場合、承認ステップを生成する
    if (resource.isRequiresApproval()) {
      approvalService.createInitialStep(saved);
    }

    return ReservationResponse.from(saved);
  }

  // ---------------------------------------------------------------------------
  // 予約内容更新
  // ---------------------------------------------------------------------------

  /**
   * 予約内容を更新する（{@code PENDING} と {@code DRAFT} 状態のみ可）。
   *
   * <p>業務ロジック：
   *
   * <ol>
   *   <li>予約存在確認（404）
   *   <li>所有権チェック（本人のみ・ロールは問わない・403）
   *   <li>予約の状態と {@code draft} で分岐する
   * </ol>
   *
   * <ul>
   *   <li>DRAFT で draft=true: 下書きのまま更新（日時整合性のみ検証。重複判定なし）
   *   <li>DRAFT で draft が省略または false: 正式申請（重複判定。承認要は PENDING と承認ステップ、不要は APPROVED）
   *   <li>PENDING で draft が省略または false: 従来どおりの更新（日時整合性と重複判定）
   *   <li>PENDING で draft=true: 422（承認待ちは下書きにできない）
   *   <li>上記以外の状態: 422
   * </ul>
   *
   * <p>正式申請が失敗した場合（409・422）は、トランザクションが巻き戻り {@code DRAFT} のまま残る。
   *
   * @param id 予約 ID
   * @param req 更新リクエスト
   * @param currentUser ログインユーザー
   * @return 更新後の {@link ReservationResponse}
   */
  public ReservationResponse update(UUID id, UpdateReservationRequest req, User currentUser) {
    Reservation reservation = findOrThrow(id);

    // 所有権チェック（本人のみ更新可。ロールは問わない）
    if (!isOwner(reservation, currentUser)) {
      throw new AccessDeniedException("この予約を更新する権限がありません。");
    }

    // 状態と draft による分岐
    boolean draftRequested = Boolean.TRUE.equals(req.draft());
    ReservationStatus status = reservation.getStatus();
    if (status == ReservationStatus.DRAFT) {
      return draftRequested ? updateDraft(reservation, req) : submitDraft(reservation, req);
    }
    if (status == ReservationStatus.PENDING) {
      if (draftRequested) {
        throw new BusinessException(ErrorCode.VALIDATION_ERROR, "承認待ち（PENDING）の予約は下書きにできません。");
      }
      return updatePending(reservation, req);
    }
    throw new BusinessException(
        ErrorCode.VALIDATION_ERROR, "PENDING または DRAFT 状態の予約のみ更新できます。現在のステータス: " + status);
  }

  // ---------------------------------------------------------------------------
  // 下書きの削除
  // ---------------------------------------------------------------------------

  /**
   * 下書きを削除する（{@code DRAFT} 状態のみ可・物理削除）。
   *
   * <p>業務ロジック：
   *
   * <ol>
   *   <li>予約存在確認（404）
   *   <li>所有権チェック（本人のみ・ロールは問わない・403）
   *   <li>ステータスガード（DRAFT のみ・422）
   *   <li>物理削除
   * </ol>
   *
   * @param id 予約 ID
   * @param currentUser ログインユーザー
   */
  public void delete(UUID id, User currentUser) {
    Reservation reservation = findOrThrow(id);

    // 所有権チェック（本人のみ削除可。ロールは問わない）
    if (!isOwner(reservation, currentUser)) {
      throw new AccessDeniedException("この予約を削除する権限がありません。");
    }

    // ステータスガード（DRAFT のみ）
    if (reservation.getStatus() != ReservationStatus.DRAFT) {
      throw new BusinessException(
          ErrorCode.VALIDATION_ERROR, "下書き（DRAFT）の予約のみ削除できます。現在のステータス: " + reservation.getStatus());
    }

    reservationRepository.delete(reservation);
  }

  // ---------------------------------------------------------------------------
  // キャンセル
  // ---------------------------------------------------------------------------

  /**
   * 予約をキャンセルする（{@code PENDING}/{@code APPROVED} 状態のみ可）。
   *
   * <p>本人または ADMIN のみ操作可。
   *
   * @param id 予約 ID
   * @param currentUser ログインユーザー
   * @return キャンセル後の {@link ReservationResponse}
   */
  public ReservationResponse cancel(UUID id, User currentUser) {
    Reservation reservation = findOrThrow(id);

    // 所有権チェック（本人または ADMIN）
    boolean isAdmin = currentUser.getRole() == Role.ADMIN;
    if (!isAdmin && !reservation.getRequester().getId().equals(currentUser.getId())) {
      throw new AccessDeniedException("この予約をキャンセルする権限がありません。");
    }

    // ステータスガード（PENDING/APPROVED のみ）
    if (!CANCELLABLE_STATUSES.contains(reservation.getStatus())) {
      throw new BusinessException(
          ErrorCode.VALIDATION_ERROR,
          "PENDING または APPROVED 状態の予約のみキャンセルできます。現在のステータス: " + reservation.getStatus());
    }

    reservation.cancel();
    return ReservationResponse.from(reservationRepository.save(reservation));
  }

  // ---------------------------------------------------------------------------
  // 内部ユーティリティ
  // ---------------------------------------------------------------------------

  private Reservation findOrThrow(UUID id) {
    return reservationRepository
        .findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("予約が存在しません: " + id));
  }

  /** 予約の申請者本人かどうか（ロールは問わない）。 */
  private boolean isOwner(Reservation reservation, User user) {
    return reservation.getRequester().getId().equals(user.getId());
  }

  /** 日時整合性チェック（{@code endAt} が {@code startAt} より後であること）。 */
  private void validateTimeRange(LocalDateTime startAt, LocalDateTime endAt) {
    if (!endAt.isAfter(startAt)) {
      throw new BusinessException(ErrorCode.VALIDATION_ERROR, "終了日時は開始日時より後に設定してください。");
    }
  }

  /** リソース行を悲観ロックで取得する（並行操作を直列化するため）。 */
  private Resource lockResource(UUID resourceId) {
    return resourceRepository
        .findByIdForUpdate(resourceId)
        .orElseThrow(() -> new ResourceNotFoundException("リソースが存在しません: " + resourceId));
  }

  /** 下書きとして保存する（リソースの存在確認と日時整合性のみ。重複判定と承認ステップ生成はしない）。 */
  private ReservationResponse createDraft(CreateReservationRequest req, User requester) {
    Resource resource =
        resourceRepository
            .findById(req.resourceId())
            .orElseThrow(() -> new ResourceNotFoundException("リソースが存在しません: " + req.resourceId()));
    validateTimeRange(req.startAt(), req.endAt());

    Reservation draft =
        Reservation.create(
            resource,
            requester,
            req.startAt(),
            req.endAt(),
            req.purpose(),
            req.attendeesCount(),
            ReservationStatus.DRAFT);
    return ReservationResponse.from(reservationRepository.save(draft));
  }

  /** 下書きを下書きのまま更新する（日時整合性のみ検証。重複判定はしない）。 */
  private ReservationResponse updateDraft(Reservation reservation, UpdateReservationRequest req) {
    validateTimeRange(req.startAt(), req.endAt());
    reservation.update(req.startAt(), req.endAt(), req.purpose(), req.attendeesCount());
    return ReservationResponse.from(reservationRepository.save(reservation));
  }

  /**
   * 下書きを正式申請する。
   *
   * <p>リソースを悲観ロックしたうえで重複判定（自己除外）を行い、入力値で更新して状態を遷移させる。 {@code requires_approval=true} は {@code
   * PENDING} にして承認ステップを生成し、{@code false} は {@code APPROVED} にする。 いずれかの段階で例外になった場合は、トランザクションが巻き戻り
   * {@code DRAFT} のまま残る。
   */
  private ReservationResponse submitDraft(Reservation reservation, UpdateReservationRequest req) {
    validateTimeRange(req.startAt(), req.endAt());
    Resource resource = lockResource(reservation.getResource().getId());
    checkConflict(resource.getId(), reservation.getId(), req.startAt(), req.endAt());

    reservation.update(req.startAt(), req.endAt(), req.purpose(), req.attendeesCount());
    if (resource.isRequiresApproval()) {
      reservation.markPending();
    } else {
      reservation.markApproved();
    }
    Reservation saved = reservationRepository.save(reservation);

    if (resource.isRequiresApproval()) {
      approvalService.createInitialStep(saved);
    }
    return ReservationResponse.from(saved);
  }

  /** {@code PENDING} の予約を更新する（日時整合性と重複判定。従来どおり）。 */
  private ReservationResponse updatePending(Reservation reservation, UpdateReservationRequest req) {
    validateTimeRange(req.startAt(), req.endAt());

    // 重複予約チェック（悲観ロックでリソース行を先取得し、並行操作を直列化してから自己除外チェック）
    lockResource(reservation.getResource().getId());
    checkConflict(
        reservation.getResource().getId(), reservation.getId(), req.startAt(), req.endAt());

    reservation.update(req.startAt(), req.endAt(), req.purpose(), req.attendeesCount());
    return ReservationResponse.from(reservationRepository.save(reservation));
  }

  /**
   * 読み取りアクセスの所有権チェック。
   *
   * <p>MEMBER は本人の予約のみ参照可。ADMIN / APPROVER は全件可。ただし下書き（{@code DRAFT}）は、本人と ADMIN のみ参照可 （他人の MEMBER
   * と APPROVER は 403）。
   */
  private void checkReadAccess(Reservation reservation, User currentUser) {
    boolean isOwner = isOwner(reservation, currentUser);
    if (reservation.getStatus() == ReservationStatus.DRAFT) {
      if (!isOwner && currentUser.getRole() != Role.ADMIN) {
        throw new AccessDeniedException("この下書きを参照する権限がありません。");
      }
      return;
    }
    if (currentUser.getRole() == Role.MEMBER && !isOwner) {
      throw new AccessDeniedException("この予約を参照する権限がありません。");
    }
  }

  /**
   * 重複予約チェック。
   *
   * <p>指定リソースの {@code PENDING}/{@code APPROVED} 予約のうち、{@code startAt}〜{@code endAt} と重複するものが あれば
   * {@link ReservationConflictException} をスローする。
   *
   * @param resourceId チェック対象リソース ID
   * @param excludeId 自己除外する予約 ID（新規作成時は {@code null}）
   * @param startAt 確認対象の開始日時
   * @param endAt 確認対象の終了日時
   */
  private void checkConflict(
      UUID resourceId,
      UUID excludeId,
      java.time.LocalDateTime startAt,
      java.time.LocalDateTime endAt) {
    boolean conflict =
        reservationRepository.findByResource_IdAndStatusIn(resourceId, OCCUPIED_STATUSES).stream()
            .filter(r -> excludeId == null || !r.getId().equals(excludeId))
            .anyMatch(r -> ResourceService.overlaps(r.getStartAt(), r.getEndAt(), startAt, endAt));
    if (conflict) {
      throw new ReservationConflictException();
    }
  }
}
