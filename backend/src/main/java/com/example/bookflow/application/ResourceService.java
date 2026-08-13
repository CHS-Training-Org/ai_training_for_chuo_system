package com.example.bookflow.application;

import com.example.bookflow.application.exception.ResourceNotFoundException;
import com.example.bookflow.application.exception.ValidationException;
import com.example.bookflow.domain.Reservation;
import com.example.bookflow.domain.ReservationRepository;
import com.example.bookflow.domain.ReservationStatus;
import com.example.bookflow.domain.Resource;
import com.example.bookflow.domain.ResourceCategory;
import com.example.bookflow.domain.ResourceRepository;
import com.example.bookflow.presentation.dto.CreateResourceRequest;
import com.example.bookflow.presentation.dto.OccupiedSlot;
import com.example.bookflow.presentation.dto.ResourceResponse;
import com.example.bookflow.presentation.dto.UpdateResourceRequest;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * リソース（施設・備品）のユースケース Service。
 *
 * <p>カテゴリ 4 で導入する初の Service 層。業務ルールを集約し、Controller は薄く保つ。
 *
 * <ul>
 *   <li>ロール別一覧（ADMIN は inactive 含む、それ以外は active のみ）
 *   <li>空き照会の重複判定（半開区間 {@code [start, end)}・隣接は非重複）
 *   <li>CRUD・ステータス切替
 * </ul>
 *
 * <p>時間帯の重複判定ロジック（{@link #overlaps}）はカテゴリ 5 の {@code 409 RESERVATION_CONFLICT} チェックでも再利用する。
 */
@Service
@Transactional
public class ResourceService {

  private static final List<ReservationStatus> OCCUPIED_STATUSES =
      List.of(ReservationStatus.PENDING, ReservationStatus.APPROVED);

  private final ResourceRepository resourceRepository;
  private final ReservationRepository reservationRepository;

  public ResourceService(
      ResourceRepository resourceRepository, ReservationRepository reservationRepository) {
    this.resourceRepository = resourceRepository;
    this.reservationRepository = reservationRepository;
  }

  // ---------------------------------------------------------------------------
  // リソース一覧
  // ---------------------------------------------------------------------------

  /**
   * リソース一覧を返す。
   *
   * <p>ADMIN は {@code is_active = false} のリソースも含む。 {@code from} / {@code to} を指定した場合は、当該時間帯に {@code
   * PENDING} / {@code APPROVED} の予約が存在するリソースを除外する（Java 側で重複判定）。
   *
   * <p>ソート（{@code pageable.getSort()}）は DB の {@code ORDER BY} には委譲せず、候補リスト取得後に {@link Comparator}
   * で適用する。DB 委譲では null 定員の末尾固定（BR-03）や大文字小文字非依存（BR-05）を DB のロケール・NULLS
   * 順序既定に依存させてしまい、環境によって結果が変わるため（詳細は {@code aidlc-audit.md} 参照）。
   *
   * @param category カテゴリフィルタ（null の場合は全カテゴリ）
   * @param from 空き確認の開始日時（null の場合はフィルタしない）
   * @param to 空き確認の終了日時（null の場合はフィルタしない）
   * @param isAdmin ADMIN ロールであれば inactive を含む
   * @param pageable ページネーション・ソート
   * @return {@link ResourceResponse} のページ
   */
  @Transactional(readOnly = true)
  public Page<ResourceResponse> list(
      ResourceCategory category,
      LocalDateTime from,
      LocalDateTime to,
      boolean isAdmin,
      Pageable pageable) {
    List<Resource> candidates = fetchAllCandidates(category, isAdmin);
    if (from != null && to != null) {
      candidates = excludeOccupied(candidates, from, to);
    }

    Comparator<Resource> comparator = resolveComparator(pageable.getSort());
    List<Resource> sorted = candidates.stream().sorted(comparator).toList();

    int total = sorted.size();
    int start = (int) pageable.getOffset();
    int end = Math.min(start + pageable.getPageSize(), total);
    List<ResourceResponse> content =
        start >= total
            ? List.of()
            : sorted.subList(start, end).stream().map(ResourceResponse::from).toList();
    return new PageImpl<>(content, pageable, total);
  }

  private List<Resource> fetchAllCandidates(ResourceCategory category, boolean isAdmin) {
    if (isAdmin) {
      return category != null
          ? resourceRepository.findByCategory(category)
          : resourceRepository.findAll();
    } else {
      return category != null
          ? resourceRepository.findByCategoryAndIsActiveTrue(category)
          : resourceRepository.findByIsActiveTrue();
    }
  }

  /** 占有済み予約があるリソースを候補リストから除外する（重複するリソース ID を一括取得、1 クエリ）。 */
  private List<Resource> excludeOccupied(
      List<Resource> candidates, LocalDateTime from, LocalDateTime to) {
    List<UUID> candidateIds = candidates.stream().map(Resource::getId).toList();
    if (candidateIds.isEmpty()) {
      return candidates;
    }
    Set<UUID> occupiedIds =
        reservationRepository
            .findByResource_IdInAndStatusIn(candidateIds, OCCUPIED_STATUSES)
            .stream()
            .filter(r -> overlaps(r.getStartAt(), r.getEndAt(), from, to))
            .map(r -> r.getResource().getId())
            .collect(Collectors.toSet());
    return candidates.stream().filter(r -> !occupiedIds.contains(r.getId())).toList();
  }

  /**
   * {@link Pageable#getSort()} から {@link Resource} 比較用の {@link Comparator} を導出する。
   *
   * <p>issue #22 の UI は単一フィールドの選択のみを提供するため、最初の {@link Sort.Order} 1 件のみを見る（複数フィールドの複合ソートはスコープ外）。
   * {@code sort} が未指定（unsorted）の場合は {@code createdAt} 昇順にフォールバックする（BR-02）。
   *
   * @param sort ページネーションの並び順
   * @return リソースの比較器
   */
  private static Comparator<Resource> resolveComparator(Sort sort) {
    Sort.Order order = sort.isSorted() ? sort.iterator().next() : Sort.Order.asc("createdAt");
    boolean desc = order.getDirection().isDescending();
    return switch (order.getProperty()) {
      case "name" -> {
        Comparator<Resource> byName =
            Comparator.comparing(Resource::getName, String.CASE_INSENSITIVE_ORDER);
        yield desc ? byName.reversed() : byName;
      }
      case "capacity" -> {
        // null は昇順・降順いずれでも末尾固定（BR-03）。値部分のみ方向に応じて反転し、null 判定は変えない。
        Comparator<Integer> byValue =
            desc ? Comparator.<Integer>naturalOrder().reversed() : Comparator.naturalOrder();
        yield Comparator.comparing(Resource::getCapacity, Comparator.nullsLast(byValue));
      }
      case "createdAt" -> {
        Comparator<Resource> byCreatedAt = Comparator.comparing(Resource::getCreatedAt);
        yield desc ? byCreatedAt.reversed() : byCreatedAt;
      }
      default -> throw new ValidationException("不正なソートフィールドです: " + order.getProperty());
    };
  }

  // ---------------------------------------------------------------------------
  // リソース詳細
  // ---------------------------------------------------------------------------

  /**
   * 指定 ID のリソースを返す。存在しない場合は 404。
   *
   * @param id リソース ID
   * @return {@link ResourceResponse}
   */
  @Transactional(readOnly = true)
  public ResourceResponse get(UUID id) {
    Resource resource = findOrThrow(id);
    return ResourceResponse.from(resource);
  }

  // ---------------------------------------------------------------------------
  // 登録・更新・ステータス切替
  // ---------------------------------------------------------------------------

  /**
   * リソースを新規登録する（ADMIN のみ）。
   *
   * @param req 登録リクエスト
   * @return 作成後の {@link ResourceResponse}
   */
  public ResourceResponse create(CreateResourceRequest req) {
    Resource resource =
        Resource.create(
            req.name(),
            req.category(),
            req.capacity(),
            req.location(),
            req.requiresApproval(),
            req.isActive(),
            req.description());
    return ResourceResponse.from(resourceRepository.save(resource));
  }

  /**
   * リソースを更新する（ADMIN のみ）。
   *
   * @param id リソース ID
   * @param req 更新リクエスト
   * @return 更新後の {@link ResourceResponse}
   */
  public ResourceResponse update(UUID id, UpdateResourceRequest req) {
    Resource resource = findOrThrow(id);
    resource.update(
        req.name(),
        req.category(),
        req.capacity(),
        req.location(),
        req.requiresApproval(),
        req.isActive(),
        req.description());
    return ResourceResponse.from(resourceRepository.save(resource));
  }

  /**
   * リソースの有効/無効を切り替える（ADMIN のみ）。
   *
   * @param id リソース ID
   * @param isActive true = 有効、false = 無効
   * @return 更新後の {@link ResourceResponse}
   */
  public ResourceResponse changeStatus(UUID id, boolean isActive) {
    Resource resource = findOrThrow(id);
    resource.changeActive(isActive);
    return ResourceResponse.from(resourceRepository.save(resource));
  }

  // ---------------------------------------------------------------------------
  // 空き照会
  // ---------------------------------------------------------------------------

  /**
   * 指定リソース・指定期間の占有済み時間スロットを返す。
   *
   * <p>{@code status IN ('PENDING', 'APPROVED')} の予約のうち、指定期間と重複する予約を返す。 空きスロットの計算はフロントエンド側の責務。
   *
   * @param id リソース ID
   * @param from 照会開始日時（必須）
   * @param to 照会終了日時（必須）
   * @return 占有スロットリスト
   */
  @Transactional(readOnly = true)
  public List<OccupiedSlot> availability(UUID id, LocalDateTime from, LocalDateTime to) {
    findOrThrow(id); // 存在確認（404 チェック）
    return reservationRepository.findByResource_IdAndStatusIn(id, OCCUPIED_STATUSES).stream()
        .filter(r -> overlaps(r.getStartAt(), r.getEndAt(), from, to))
        .map(OccupiedSlot::from)
        .toList();
  }

  // ---------------------------------------------------------------------------
  // 内部ユーティリティ
  // ---------------------------------------------------------------------------

  private Resource findOrThrow(UUID id) {
    return resourceRepository
        .findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("リソースが存在しません: " + id));
  }

  /**
   * 2 つの時間帯が重複するか判定する（半開区間 {@code [start, end)}）。
   *
   * <p>隣接（{@code existingEnd == from} または {@code to == existingStart}）は重複とみなさない。 予約時間帯の重複判定（カテゴリ
   * 4・5 共通ロジック）。
   *
   * @param existingStart 既存予約の開始日時
   * @param existingEnd 既存予約の終了日時
   * @param from 確認対象の開始日時
   * @param to 確認対象の終了日時
   * @return 重複する場合 {@code true}
   */
  public static boolean overlaps(
      LocalDateTime existingStart,
      LocalDateTime existingEnd,
      LocalDateTime from,
      LocalDateTime to) {
    return existingStart.isBefore(to) && existingEnd.isAfter(from);
  }

  /**
   * {@link Collection} 版の {@link #overlaps}（{@link Reservation} バッチフィルタ用）。
   *
   * @param reservation 対象予約
   * @param from 確認対象の開始日時
   * @param to 確認対象の終了日時
   * @return 重複する場合 {@code true}
   */
  static boolean overlaps(Reservation reservation, LocalDateTime from, LocalDateTime to) {
    return overlaps(reservation.getStartAt(), reservation.getEndAt(), from, to);
  }
}
