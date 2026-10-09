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
 *   <li>ステータスガード（PUT は DRAFT/PENDING のみ・cancel は PENDING/APPROVED のみ → 422）
 *   <li>下書き保存（{@code draft=true} → {@code DRAFT}。重複チェックと承認ステップ生成を行わない）
 *   <li>正式申請（{@code DRAFT} + {@code status=PENDING} → {@code requires_approval} により
 *       PENDING/APPROVED）
 *   <li>下書きの閲覧制限（{@code DRAFT} は申請者本人と ADMIN のみ → 403）
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

  /** キャンセル可能なステータス。{@code DRAFT} は含めない（下書きの破棄は対象外）。 */
  private static final List<ReservationStatus> CANCELLABLE_STATUSES =
      List.of(ReservationStatus.PENDING, ReservationStatus.APPROVED);

  /** 内容を更新できるステータス。 */
  private static final List<ReservationStatus> UPDATABLE_STATUSES =
      List.of(ReservationStatus.DRAFT, ReservationStatus.PENDING);

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
   * <p>{@code draft=true} の場合は上記のうち重複予約チェックを行わず、ステータスを {@code DRAFT} として保存し、 {@code approval_steps}
   * も生成しない。リソース行の悲観ロックも取らない。
   *
   * @param req 予約申請リクエスト
   * @param requester 申請ユーザー
   * @return 作成後の {@link ReservationResponse}
   */
  public ReservationResponse create(CreateReservationRequest req, User requester) {
    boolean draft = req.isDraft();

    // 1. リソース存在確認。下書きは重複チェックを行わないため悲観ロックを取らない
    //    （ロックは read-then-write の直列化が目的であり、チェックしないなら取る理由がない）
    Resource resource =
        (draft
                ? resourceRepository.findById(req.resourceId())
                : resourceRepository.findByIdForUpdate(req.resourceId()))
            .orElseThrow(() -> new ResourceNotFoundException("リソースが存在しません: " + req.resourceId()));

    // 2. 日時整合性チェック（下書きでも実施。V001 の chk_reservations_time に違反させないため）
    if (!req.endAt().isAfter(req.startAt())) {
      throw new BusinessException(ErrorCode.VALIDATION_ERROR, "終了日時は開始日時より後に設定してください。");
    }

    // 3. 重複予約チェック（自分含む全 PENDING/APPROVED を検索）
    //    下書きは時間帯を占有しないため行わない。判定は正式申請の時点で行う
    if (!draft) {
      checkConflict(resource.getId(), null, req.startAt(), req.endAt());
    }

    // 4. ステータス決定（draft=true → DRAFT、requires_approval=false → APPROVED、true → PENDING）
    ReservationStatus status = draft ? ReservationStatus.DRAFT : initialStatusFor(resource);

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

    // 6. requires_approval=true の場合、承認ステップを生成する（下書きは承認フローに流れない）
    if (!draft && resource.isRequiresApproval()) {
      approvalService.createInitialStep(saved);
    }

    return ReservationResponse.from(saved);
  }

  // ---------------------------------------------------------------------------
  // 予約内容更新
  // ---------------------------------------------------------------------------

  /**
   * 予約内容を更新する（{@code DRAFT} / {@code PENDING} 状態のみ可）。
   *
   * <p>{@code req.status()} に {@code PENDING} を指定すると、下書きの正式申請として扱う。
   *
   * <p>業務ロジック：
   *
   * <ol>
   *   <li>予約存在確認（404）
   *   <li>所有権チェック（本人のみ・403）
   *   <li>ステータスガード（DRAFT / PENDING のみ・422）
   *   <li>日時整合性チェック
   *   <li>正式申請の場合は遷移可否チェック（422）
   *   <li>重複予約チェック（自己除外。DRAFT のままの内容更新では行わない）
   *   <li>更新保存。正式申請の場合は {@code requires_approval} により PENDING/APPROVED へ遷移し、 {@code
   *       requires_approval=true} なら {@code approval_steps} を生成する
   * </ol>
   *
   * @param id 予約 ID
   * @param req 更新リクエスト
   * @param currentUser ログインユーザー
   * @return 更新後の {@link ReservationResponse}
   */
  public ReservationResponse update(UUID id, UpdateReservationRequest req, User currentUser) {
    Reservation reservation = findOrThrow(id);

    // 所有権チェック（本人のみ更新可。ADMIN にも更新権限はない）
    if (!reservation.getRequester().getId().equals(currentUser.getId())) {
      throw new AccessDeniedException("この予約を更新する権限がありません。");
    }

    // ステータスガード（DRAFT / PENDING のみ）
    if (!UPDATABLE_STATUSES.contains(reservation.getStatus())) {
      throw new BusinessException(
          ErrorCode.VALIDATION_ERROR,
          "DRAFT または PENDING 状態の予約のみ更新できます。現在のステータス: " + reservation.getStatus());
    }

    // 日時整合性チェック
    if (!req.endAt().isAfter(req.startAt())) {
      throw new BusinessException(ErrorCode.VALIDATION_ERROR, "終了日時は開始日時より後に設定してください。");
    }

    // status の指定は下書きの正式申請を意味する（省略時は内容のみ更新）
    boolean submitting = req.status() != null;
    if (submitting) {
      guardSubmitTransition(reservation, req.status());
    }

    // 重複予約チェックの要否。正式申請（時間帯を占有し始める）と、PENDING の内容更新のときに行う。
    // DRAFT のままの内容更新では行わない（作成時に省いたのと同じ理由による）
    boolean needsConflictCheck = submitting || reservation.getStatus() == ReservationStatus.PENDING;

    if (needsConflictCheck) {
      // 悲観ロックでリソース行を先取得し、並行操作を直列化してから自己除外チェック
      resourceRepository
          .findByIdForUpdate(reservation.getResource().getId())
          .orElseThrow(
              () ->
                  new ResourceNotFoundException(
                      "リソースが存在しません: " + reservation.getResource().getId()));
      checkConflict(reservation.getResource().getId(), id, req.startAt(), req.endAt());
    }

    reservation.update(req.startAt(), req.endAt(), req.purpose(), req.attendeesCount());

    // 正式申請の遷移先は常に PENDING とする（ビジネス要求シート RSV-03）。
    // 承認ステップは requires_approval=true のときのみ生成する（既存ルールを維持）。
    // 【既知の制約】requires_approval=false のリソースでは承認ステップが生成されないため、
    // 正式申請した予約は承認待ちのまま進まなくなる。シートの受入条件に忠実な実装であり、
    // 解消には要件の変更が要る（requirements.md §下書き保存 の注記を参照）。
    boolean requiresApproval = reservation.getResource().isRequiresApproval();
    if (submitting) {
      reservation.markPending();
    }

    Reservation saved = reservationRepository.save(reservation);

    if (submitting && requiresApproval) {
      approvalService.createInitialStep(saved);
    }

    return ReservationResponse.from(saved);
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
  // 下書きの削除
  // ---------------------------------------------------------------------------

  /**
   * 下書きを削除する（{@code DRAFT} 状態のみ可）。
   *
   * <p>業務ロジック：
   *
   * <ol>
   *   <li>予約存在確認（404）
   *   <li>所有権チェック（申請者本人のみ・403。ADMIN も削除できない）
   *   <li>ステータスガード（{@code DRAFT} のみ・422）
   *   <li>物理削除
   * </ol>
   *
   * <p>{@code DRAFT} は承認ステップを持たないため、関連レコードの削除は不要である。 確定済みの予約には履歴を残す必要があるため、削除の対象は {@code DRAFT} に限る
   * （{@code PENDING}/{@code APPROVED} はキャンセルで {@code CANCELLED} に遷移させる）。
   *
   * @param id 予約 ID
   * @param currentUser ログインユーザー
   */
  public void delete(UUID id, User currentUser) {
    Reservation reservation = findOrThrow(id);

    // 所有権チェック（本人のみ。下書きは申請者本人のものであり ADMIN も削除できない）
    if (!reservation.getRequester().getId().equals(currentUser.getId())) {
      throw new AccessDeniedException("この予約を削除する権限がありません。");
    }

    // ステータスガード（DRAFT のみ）
    if (reservation.getStatus() != ReservationStatus.DRAFT) {
      throw new BusinessException(
          ErrorCode.VALIDATION_ERROR, "DRAFT 状態の予約のみ削除できます。現在のステータス: " + reservation.getStatus());
    }

    reservationRepository.delete(reservation);
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
   * <p>{@code DRAFT} は申請者本人と ADMIN のみ参照可。それ以外のステータスは MEMBER のみ本人に限定し、ADMIN / APPROVER は全件可。
   *
   * <p>{@code DRAFT} で APPROVER を除外するのは、下書きが承認フローに流れない以上、承認者がその内容を参照する理由がないためである。
   */
  private void checkReadAccess(Reservation reservation, User currentUser) {
    if (reservation.getRequester().getId().equals(currentUser.getId())) {
      return;
    }
    boolean allowed =
        reservation.getStatus() == ReservationStatus.DRAFT
            ? currentUser.getRole() == Role.ADMIN
            : currentUser.getRole() != Role.MEMBER;
    if (!allowed) {
      throw new AccessDeniedException("この予約を参照する権限がありません。");
    }
  }

  /**
   * 下書きを経由しない申請時の初期ステータスを返す。
   *
   * @param resource 対象リソース
   * @return {@code requires_approval} が true なら {@code PENDING}、false なら {@code APPROVED}
   */
  private ReservationStatus initialStatusFor(Resource resource) {
    return resource.isRequiresApproval() ? ReservationStatus.PENDING : ReservationStatus.APPROVED;
  }

  /**
   * 正式申請の遷移可否を確認する。
   *
   * <p>指定できるのは {@code PENDING} のみで、対象は {@code DRAFT} の予約に限る。いずれも違反時は 422。
   *
   * @param reservation 対象予約
   * @param requested リクエストで指定されたステータス
   */
  private void guardSubmitTransition(Reservation reservation, ReservationStatus requested) {
    if (requested != ReservationStatus.PENDING) {
      throw new BusinessException(
          ErrorCode.VALIDATION_ERROR, "status に指定できるのは PENDING のみです。指定された値: " + requested);
    }
    if (reservation.getStatus() != ReservationStatus.DRAFT) {
      throw new BusinessException(
          ErrorCode.VALIDATION_ERROR, "DRAFT 状態の予約のみ正式申請できます。現在のステータス: " + reservation.getStatus());
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
