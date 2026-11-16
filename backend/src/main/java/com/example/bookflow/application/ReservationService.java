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
 *   <li>ステータスガード（PUT は PENDING/DRAFT のみ・DELETE は DRAFT のみ・cancel は PENDING/APPROVED のみ → 422）
 *   <li>下書き（{@code DRAFT}）：重複チェック・承認ステップ生成なしで保存し、{@code submit=true} の正式申請時に行う。 閲覧は本人と ADMIN
 *       のみ、更新・正式申請・削除は本人のみ
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
   * <p>ADMIN は全件、それ以外は本人分のみ。{@code statuses} が空でなければ status フィルタを適用する。
   *
   * @param currentUser ログインユーザー
   * @param statuses ステータスフィルタ（空の場合は全ステータス）
   * @param pageable ページネーション
   * @return 予約ページ
   */
  @Transactional(readOnly = true)
  public Page<ReservationResponse> list(
      User currentUser, Collection<ReservationStatus> statuses, Pageable pageable) {
    boolean isAdmin = currentUser.getRole() == Role.ADMIN;
    boolean hasStatusFilter = statuses != null && !statuses.isEmpty();

    Page<Reservation> page;
    if (isAdmin) {
      page =
          hasStatusFilter
              ? reservationRepository.findByStatusInFetch(statuses, pageable)
              : reservationRepository.findAllFetch(pageable);
    } else {
      page =
          hasStatusFilter
              ? reservationRepository.findByRequesterIdAndStatusInFetch(
                  currentUser.getId(), statuses, pageable)
              : reservationRepository.findByRequesterIdFetch(currentUser.getId(), pageable);
    }
    return page.map(ReservationResponse::from);
  }

  // ---------------------------------------------------------------------------
  // 予約詳細
  // ---------------------------------------------------------------------------

  /**
   * 指定 ID の予約を返す。
   *
   * <p>MEMBER は本人の予約のみアクセス可。他人の予約へのアクセスは 403。{@code DRAFT} は本人と ADMIN のみ（APPROVER も 403）。
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
   * @param req 予約申請リクエスト
   * @param requester 申請ユーザー
   * @return 作成後の {@link ReservationResponse}
   */
  public ReservationResponse create(CreateReservationRequest req, User requester) {
    // 1. リソース存在確認（悲観ロックで取得し、以降の重複チェックを直列化）
    Resource resource =
        resourceRepository
            .findByIdForUpdate(req.resourceId())
            .orElseThrow(() -> new ResourceNotFoundException("リソースが存在しません: " + req.resourceId()));

    // 2. 日時整合性チェック
    if (!req.endAt().isAfter(req.startAt())) {
      throw new BusinessException(ErrorCode.VALIDATION_ERROR, "終了日時は開始日時より後に設定してください。");
    }

    // 下書き保存: 重複チェック・承認ステップ生成を行わず DRAFT で保存する
    if (Boolean.TRUE.equals(req.draft())) {
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

    // 3. 重複予約チェック（自分含む全 PENDING/APPROVED を検索）
    checkConflict(resource.getId(), null, req.startAt(), req.endAt());

    // 4. ステータス決定（requires_approval=false → APPROVED、true → PENDING）
    ReservationStatus status = decideStatus(resource);

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
   * 予約内容を更新する（{@code PENDING}/{@code DRAFT} 状態のみ可）。下書きは {@code submit=true} で正式申請できる。
   *
   * <p>業務ロジック：
   *
   * <ol>
   *   <li>予約存在確認（404）
   *   <li>所有権チェック（本人のみ・403）
   *   <li>ステータスガード（PENDING/DRAFT のみ・422）
   *   <li>日時整合性チェック
   *   <li>重複予約チェック（自己除外。DRAFT の更新のみでは行わず、正式申請時に行う）
   *   <li>更新保存（正式申請時は requires_approval に応じて PENDING/APPROVED へ遷移）
   * </ol>
   *
   * @param id 予約 ID
   * @param req 更新リクエスト
   * @param currentUser ログインユーザー
   * @return 更新後の {@link ReservationResponse}
   */
  public ReservationResponse update(UUID id, UpdateReservationRequest req, User currentUser) {
    Reservation reservation = findOrThrow(id);

    // 所有権チェック（本人のみ更新可）
    if (!reservation.getRequester().getId().equals(currentUser.getId())) {
      throw new AccessDeniedException("この予約を更新する権限がありません。");
    }

    // ステータスガード（PENDING / DRAFT のみ）
    boolean isDraft = reservation.getStatus() == ReservationStatus.DRAFT;
    if (!isDraft && reservation.getStatus() != ReservationStatus.PENDING) {
      throw new BusinessException(
          ErrorCode.VALIDATION_ERROR,
          "PENDING または DRAFT 状態の予約のみ更新できます。現在のステータス: " + reservation.getStatus());
    }

    // 日時整合性チェック
    if (!req.endAt().isAfter(req.startAt())) {
      throw new BusinessException(ErrorCode.VALIDATION_ERROR, "終了日時は開始日時より後に設定してください。");
    }

    // DRAFT の更新のみ（正式申請でない）: 重複チェックなしで DRAFT のまま更新
    boolean submit = isDraft && Boolean.TRUE.equals(req.submit());
    if (isDraft && !submit) {
      reservation.update(req.startAt(), req.endAt(), req.purpose(), req.attendeesCount());
      return ReservationResponse.from(reservationRepository.save(reservation));
    }

    // 重複予約チェック（悲観ロックでリソース行を先取得し、並行操作を直列化してから自己除外チェック）
    Resource resource =
        resourceRepository
            .findByIdForUpdate(reservation.getResource().getId())
            .orElseThrow(
                () ->
                    new ResourceNotFoundException(
                        "リソースが存在しません: " + reservation.getResource().getId()));
    checkConflict(resource.getId(), id, req.startAt(), req.endAt());

    reservation.update(req.startAt(), req.endAt(), req.purpose(), req.attendeesCount());

    if (submit) {
      // 正式申請: requires_approval で PENDING / APPROVED を決定。承認ステップ生成の失敗は
      // トランザクションのロールバックにより DRAFT のまま残る
      ReservationStatus next = decideStatus(resource);
      reservation.submit(next);
      Reservation saved = reservationRepository.save(reservation);
      if (next == ReservationStatus.PENDING) {
        approvalService.createInitialStep(saved);
      }
      return ReservationResponse.from(saved);
    }
    return ReservationResponse.from(reservationRepository.save(reservation));
  }

  // ---------------------------------------------------------------------------
  // 下書き削除
  // ---------------------------------------------------------------------------

  /**
   * 下書き予約を物理削除する（{@code DRAFT} のみ・申請者本人のみ。ADMIN も不可）。
   *
   * @param id 予約 ID
   * @param currentUser ログインユーザー
   */
  public void delete(UUID id, User currentUser) {
    Reservation reservation = findOrThrow(id);

    if (!reservation.getRequester().getId().equals(currentUser.getId())) {
      throw new AccessDeniedException("この予約を削除する権限がありません。");
    }
    if (reservation.getStatus() != ReservationStatus.DRAFT) {
      throw new BusinessException(
          ErrorCode.VALIDATION_ERROR, "DRAFT 状態の予約のみ削除できます。現在のステータス: " + reservation.getStatus());
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

  /**
   * 読み取りアクセスの所有権チェック。
   *
   * <p>MEMBER は本人の予約のみ参照可。ADMIN / APPROVER は全件可。ただし {@code DRAFT} は本人と ADMIN のみ（APPROVER も不可）。
   */
  private void checkReadAccess(Reservation reservation, User currentUser) {
    boolean isOwner = reservation.getRequester().getId().equals(currentUser.getId());
    Role role = currentUser.getRole();
    if (reservation.getStatus() == ReservationStatus.DRAFT) {
      if (!isOwner && role != Role.ADMIN) {
        throw new AccessDeniedException("この下書きを参照する権限がありません。");
      }
      return;
    }
    if (role == Role.MEMBER && !isOwner) {
      throw new AccessDeniedException("この予約を参照する権限がありません。");
    }
  }

  /** {@code requires_approval} に応じた申請後ステータス（true → PENDING、false → APPROVED）。 */
  private static ReservationStatus decideStatus(Resource resource) {
    return resource.isRequiresApproval() ? ReservationStatus.PENDING : ReservationStatus.APPROVED;
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
