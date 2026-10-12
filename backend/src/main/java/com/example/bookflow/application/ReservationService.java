package com.example.bookflow.application;

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
import com.example.bookflow.domain.ResourceRepository;
import com.example.bookflow.domain.Role;
import com.example.bookflow.domain.User;
import com.example.bookflow.presentation.dto.CreateReservationRequest;
import com.example.bookflow.presentation.dto.ReservationResponse;
import com.example.bookflow.presentation.dto.UpdateReservationRequest;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
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
 *   <li>繰り返し予約（{@code recurrenceType} が {@code WEEKLY}/{@code MONTHLY} のとき、全日程を 1
 *       トランザクションで作成し、既存予約との重複 または生成した予約どうしの重複が 1 件でもあれば全件ロールバックして 409）
 *   <li>所有権チェック（本人または ADMIN のみ操作可 → 403）
 *   <li>ステータスガード（PUT は PENDING のみ・cancel は PENDING/APPROVED のみ → 422）
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

  /** キャンセル可能なステータス（{@code DRAFT} のキャンセルは下書きの削除に相当する）。 */
  private static final List<ReservationStatus> CANCELLABLE_STATUSES =
      List.of(ReservationStatus.DRAFT, ReservationStatus.PENDING, ReservationStatus.APPROVED);

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
   * <p>ADMIN は全件、それ以外は本人分のみ。{@code statuses} が空でなければ status フィルタを適用する。 {@code resourceName}
   * を指定した場合は予約先リソース名への大文字小文字非依存部分一致で、{@code from}/{@code to} を指定した場合は 予約期間（半開区間）の重複判定で絞り込む（BR-01〜07
   * 参照）。
   *
   * @param currentUser ログインユーザー
   * @param statuses ステータスフィルタ（空の場合は全ステータス）
   * @param resourceName リソース名フィルタ（null・空文字・空白のみの場合はフィルタしない）
   * @param from 予約期間の絞り込み開始日時（null の場合はフィルタしない）
   * @param to 予約期間の絞り込み終了日時（null の場合はフィルタしない）
   * @param pageable ページネーション
   * @return 予約ページ
   */
  @Transactional(readOnly = true)
  public Page<ReservationResponse> list(
      User currentUser,
      Collection<ReservationStatus> statuses,
      String resourceName,
      LocalDateTime from,
      LocalDateTime to,
      Pageable pageable) {
    boolean isAdmin = currentUser.getRole() == Role.ADMIN;
    UUID requesterId = currentUser.getId();
    boolean hasStatusFilter = statuses != null && !statuses.isEmpty();
    boolean hasPeriodFilter = from != null && to != null;

    String normalizedResourceName = normalizeResourceName(resourceName);
    String escapedResourceName =
        normalizedResourceName != null ? escapeLikeResourceName(normalizedResourceName) : null;
    boolean hasResourceNameFilter = escapedResourceName != null;

    Page<Reservation> page;
    if (hasResourceNameFilter && hasPeriodFilter) {
      page =
          isAdmin
              ? (hasStatusFilter
                  ? reservationRepository.findByResourceNameAndPeriodAndStatusInFetch(
                      escapedResourceName, from, to, statuses, pageable)
                  : reservationRepository.findByResourceNameAndPeriodFetch(
                      escapedResourceName, from, to, pageable))
              : (hasStatusFilter
                  ? reservationRepository.findByRequesterIdAndResourceNameAndPeriodAndStatusInFetch(
                      requesterId, escapedResourceName, from, to, statuses, pageable)
                  : reservationRepository.findByRequesterIdAndResourceNameAndPeriodFetch(
                      requesterId, escapedResourceName, from, to, pageable));
    } else if (hasResourceNameFilter) {
      page =
          isAdmin
              ? (hasStatusFilter
                  ? reservationRepository.findByResourceNameAndStatusInFetch(
                      escapedResourceName, statuses, pageable)
                  : reservationRepository.findByResourceNameFetch(escapedResourceName, pageable))
              : (hasStatusFilter
                  ? reservationRepository.findByRequesterIdAndResourceNameAndStatusInFetch(
                      requesterId, escapedResourceName, statuses, pageable)
                  : reservationRepository.findByRequesterIdAndResourceNameFetch(
                      requesterId, escapedResourceName, pageable));
    } else if (hasPeriodFilter) {
      page =
          isAdmin
              ? (hasStatusFilter
                  ? reservationRepository.findByPeriodAndStatusInFetch(from, to, statuses, pageable)
                  : reservationRepository.findByPeriodFetch(from, to, pageable))
              : (hasStatusFilter
                  ? reservationRepository.findByRequesterIdAndPeriodAndStatusInFetch(
                      requesterId, from, to, statuses, pageable)
                  : reservationRepository.findByRequesterIdAndPeriodFetch(
                      requesterId, from, to, pageable));
    } else {
      page =
          isAdmin
              ? (hasStatusFilter
                  ? reservationRepository.findByStatusInFetch(statuses, pageable)
                  : reservationRepository.findAllFetch(pageable))
              : (hasStatusFilter
                  ? reservationRepository.findByRequesterIdAndStatusInFetch(
                      requesterId, statuses, pageable)
                  : reservationRepository.findByRequesterIdFetch(requesterId, pageable));
    }
    return page.map(ReservationResponse::from);
  }

  /** resourceName を trim し、空文字なら null として扱う（BR-02）。 */
  private static String normalizeResourceName(String resourceName) {
    if (resourceName == null) {
      return null;
    }
    String trimmed = resourceName.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }

  /**
   * resourceName 中の LIKE ワイルドカード（{@code %}・{@code _}）とエスケープ文字自身（{@code !}）をリテラル扱いにエスケープする（BR-03）。
   *
   * <p>ESCAPE 文字に {@code !} を使う（{@link ReservationRepository} 参照）ため、まず {@code !} 自身を {@code !!}
   * にエスケープしてから {@code %} / {@code _} をエスケープする（{@link ResourceService} と同じ方針。クラス間の静的依存は作らない）。
   */
  private static String escapeLikeResourceName(String resourceName) {
    return resourceName.replace("!", "!!").replace("%", "!%").replace("_", "!_");
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
    UUID seriesId = reservation.getSeriesId();
    if (seriesId == null) {
      return ReservationResponse.from(reservation);
    }
    // 繰り返しで作った予約だけ、シリーズ件数と残り回数（全ステータス）を数える。一覧では数えない（N+1 回避）
    long seriesCount = reservationRepository.countBySeriesId(seriesId);
    long remainingCount =
        reservationRepository.countBySeriesIdAndStartAtAfter(seriesId, reservation.getStartAt());
    return ReservationResponse.from(reservation, seriesCount, remainingCount);
  }

  // ---------------------------------------------------------------------------
  // 予約申請
  // ---------------------------------------------------------------------------

  /**
   * 予約を申請する（下書き保存・繰り返し予約を含む）。
   *
   * <p>業務ロジック：
   *
   * <ol>
   *   <li>繰り返し指定の検証（400 {@code VALIDATION_ERROR}。DB に触れず、ロックより前に行う）
   *   <li>リソース存在確認（404、悲観ロックで取得）
   *   <li>日時整合性チェック（endAt &gt; startAt）
   *   <li>日程の生成（繰り返さない場合は 1 件、{@code WEEKLY}/{@code MONTHLY} は終了日まで）
   *   <li>生成した予約どうしの重複チェック（409 {@code RESERVATION_CONFLICT}）
   *   <li>既存予約との重複チェック（409。既存予約の取得は 1 回）
   *   <li>{@code draft} と {@code requires_approval} に応じてステータスを決定（{@code draft=true} → {@code
   *       DRAFT}、 {@code false} → {@code APPROVED}、{@code true} → {@code PENDING}）。全件に同じステータスを付ける
   *   <li>予約を保存（繰り返しのときは全件に同じ系列 ID を付ける）
   *   <li>ステータスが {@code PENDING} になる場合のみ、予約ごとに {@code approval_steps} を生成し承認者を割り当てる
   * </ol>
   *
   * <p>どの段階で例外が出ても、クラス単位の {@code @Transactional} により、保存済みの予約と承認ステップは全件ロールバックされる。
   *
   * @param req 予約申請リクエスト
   * @param requester 申請ユーザー
   * @return 作成した予約の {@link ReservationResponse}（開始日時の昇順。繰り返さない場合は 1 件）
   */
  public List<ReservationResponse> create(CreateReservationRequest req, User requester) {
    // 1. 繰り返し指定の検証（入力だけで判定できるため、リソース行のロックより前に行う）
    RecurrenceType recurrence = validateRecurrence(req);

    // 2. リソース存在確認（悲観ロックで取得し、以降の重複チェックを直列化）
    Resource resource =
        resourceRepository
            .findByIdForUpdate(req.resourceId())
            .orElseThrow(() -> new ResourceNotFoundException("リソースが存在しません: " + req.resourceId()));

    // 3. 日時整合性チェック
    if (!req.endAt().isAfter(req.startAt())) {
      throw new BusinessException(ErrorCode.VALIDATION_ERROR, "終了日時は開始日時より後に設定してください。");
    }

    // 4〜6. 日程の生成と、重複予約チェック（自己重複 → 既存予約。下書きも対象時間帯の確認は行う）
    List<TimeSlot> slots = generateSlots(req, recurrence);
    checkSelfConflict(slots);
    checkConflicts(resource.getId(), slots);

    // 7. ステータス決定（draft=true → DRAFT、false → requires_approval に応じて PENDING/APPROVED）
    ReservationStatus status;
    boolean createsApprovalStep;
    if (req.isDraft()) {
      status = ReservationStatus.DRAFT;
      createsApprovalStep = false;
    } else {
      status =
          resource.isRequiresApproval() ? ReservationStatus.PENDING : ReservationStatus.APPROVED;
      createsApprovalStep = resource.isRequiresApproval();
    }

    // 8. 予約保存（繰り返しのときは、1 回の作成で 1 つ採番した系列 ID を全件で共有する）
    UUID seriesId = recurrence == RecurrenceType.NONE ? null : UUID.randomUUID();
    List<Reservation> saved = new ArrayList<>();
    for (TimeSlot slot : slots) {
      Reservation reservation =
          Reservation.create(
              resource,
              requester,
              slot.startAt(),
              slot.endAt(),
              req.purpose(),
              req.attendeesCount(),
              status);
      if (seriesId != null) {
        reservation.joinSeries(seriesId, recurrence, req.recurrenceUntil());
      }
      saved.add(reservationRepository.save(reservation));
    }

    // 9. ステータスが PENDING になる場合のみ、予約ごとに承認ステップを生成する
    if (createsApprovalStep) {
      for (Reservation reservation : saved) {
        approvalService.createInitialStep(reservation);
      }
    }

    return saved.stream().map(ReservationResponse::from).toList();
  }

  /** 1 回分の利用時間帯（{@code [startAt, endAt)}）。 */
  private record TimeSlot(LocalDateTime startAt, LocalDateTime endAt) {}

  /**
   * 繰り返し指定の組み合わせを検証し、種別を返す（{@code null} は {@code NONE}）。
   *
   * <p>違反はすべて 400 {@code VALIDATION_ERROR}（{@link ValidationException}）。{@code endAt > startAt}
   * の検証（422）とは HTTP ステータスが異なる。
   */
  private static RecurrenceType validateRecurrence(CreateReservationRequest req) {
    RecurrenceType type = req.recurrence();
    LocalDate until = req.recurrenceUntil();
    if (type == RecurrenceType.NONE) {
      if (until != null) {
        throw new ValidationException("繰り返しなしの場合、繰り返し終了日は指定できません。");
      }
      return type;
    }
    if (until == null) {
      throw new ValidationException("繰り返し終了日は必須です。");
    }
    if (until.isBefore(req.startAt().toLocalDate())) {
      throw new ValidationException("繰り返し終了日は開始日以降にしてください。");
    }
    return type;
  }

  /** 各回の利用時間帯を、開始日時の昇順で生成する。各回の長さは 1 回目の {@code endAt - startAt} と同じ。 */
  private static List<TimeSlot> generateSlots(CreateReservationRequest req, RecurrenceType type) {
    Duration length = Duration.between(req.startAt(), req.endAt());
    return RecurrenceSchedule.startDates(type, req.startAt(), req.recurrenceUntil()).stream()
        .map(start -> new TimeSlot(start, start.plus(length)))
        .toList();
  }

  /**
   * 生成した予約どうしの重複（自己重複）を検出する。重複があれば {@link ReservationConflictException}。
   *
   * <p>各回の長さが同じで開始日時が昇順なので、隣り合う 2 回が重ならなければ、それより離れた回も重ならない。そのため隣り合う 2 回の比較だけで足りる。
   * 保存前の日程どうしで比較するため、保存した兄弟予約が次の判定に見えるか（自動フラッシュ）には依存しない。
   */
  private static void checkSelfConflict(List<TimeSlot> slots) {
    for (int i = 1; i < slots.size(); i++) {
      TimeSlot previous = slots.get(i - 1);
      TimeSlot current = slots.get(i);
      if (ResourceService.overlaps(
          previous.startAt(), previous.endAt(), current.startAt(), current.endAt())) {
        throw new ReservationConflictException();
      }
    }
  }

  /**
   * 既存の {@code PENDING}/{@code APPROVED} 予約との重複を、全日程について検出する。
   *
   * <p>既存予約の取得は 1 回だけ（日程の数だけ取得しない）。1 件でも重複すれば {@link ReservationConflictException}。
   */
  private void checkConflicts(UUID resourceId, List<TimeSlot> slots) {
    List<Reservation> existing =
        reservationRepository.findByResource_IdAndStatusIn(resourceId, OCCUPIED_STATUSES);
    for (TimeSlot slot : slots) {
      boolean conflict =
          existing.stream()
              .anyMatch(
                  r ->
                      ResourceService.overlaps(
                          r.getStartAt(), r.getEndAt(), slot.startAt(), slot.endAt()));
      if (conflict) {
        throw new ReservationConflictException();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 予約内容更新
  // ---------------------------------------------------------------------------

  /**
   * 予約内容を更新する（{@code PENDING} または {@code DRAFT} 状態のみ可）。
   *
   * <p>業務ロジック：
   *
   * <ol>
   *   <li>予約存在確認（404）
   *   <li>所有権チェック（本人のみ・403）
   *   <li>ステータスガード（PENDING/DRAFT のみ・422）
   *   <li>日時整合性チェック
   *   <li>重複予約チェック（自己除外）
   *   <li>更新保存
   *   <li>{@code status == DRAFT} かつ {@code submit == true} の場合、正式申請として {@code PENDING}/{@code
   *       APPROVED} へ遷移し、{@code PENDING} になる場合のみ {@code approval_steps} を生成する
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

    // ステータスガード（PENDING または DRAFT のみ）
    boolean wasDraft = reservation.getStatus() == ReservationStatus.DRAFT;
    if (reservation.getStatus() != ReservationStatus.PENDING && !wasDraft) {
      throw new BusinessException(
          ErrorCode.VALIDATION_ERROR,
          "PENDING または DRAFT 状態の予約のみ更新できます。現在のステータス: " + reservation.getStatus());
    }

    // 日時整合性チェック
    if (!req.endAt().isAfter(req.startAt())) {
      throw new BusinessException(ErrorCode.VALIDATION_ERROR, "終了日時は開始日時より後に設定してください。");
    }

    // 重複予約チェック（悲観ロックでリソース行を先取得し、並行操作を直列化してから自己除外チェック）
    Resource resource =
        resourceRepository
            .findByIdForUpdate(reservation.getResource().getId())
            .orElseThrow(
                () ->
                    new ResourceNotFoundException(
                        "リソースが存在しません: " + reservation.getResource().getId()));
    checkConflict(reservation.getResource().getId(), id, req.startAt(), req.endAt());

    reservation.update(req.startAt(), req.endAt(), req.purpose(), req.attendeesCount());

    // 下書きの正式申請（DRAFT → PENDING/APPROVED）
    if (wasDraft && req.isSubmit()) {
      ReservationStatus newStatus =
          resource.isRequiresApproval() ? ReservationStatus.PENDING : ReservationStatus.APPROVED;
      reservation.submit(newStatus);
      if (resource.isRequiresApproval()) {
        approvalService.createInitialStep(reservation);
      }
    }

    return ReservationResponse.from(reservationRepository.save(reservation));
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
          "DRAFT、PENDING または APPROVED 状態の予約のみキャンセルできます。現在のステータス: " + reservation.getStatus());
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
   * <p>MEMBER は本人の予約のみ参照可。ADMIN / APPROVER は全件可。ただし {@code status == DRAFT} の予約は、 申請者本人または ADMIN
   * 以外（APPROVER を含む）は参照不可（reservation-draft ユニット、RSV-02）。
   */
  private void checkReadAccess(Reservation reservation, User currentUser) {
    boolean isOwner = reservation.getRequester().getId().equals(currentUser.getId());
    if (currentUser.getRole() == Role.MEMBER && !isOwner) {
      throw new AccessDeniedException("この予約を参照する権限がありません。");
    }
    if (reservation.getStatus() == ReservationStatus.DRAFT
        && currentUser.getRole() == Role.APPROVER
        && !isOwner) {
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
