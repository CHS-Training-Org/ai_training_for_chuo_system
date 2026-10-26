package com.example.bookflow.application;

import com.example.bookflow.application.exception.ResourceNotFoundException;
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
import java.util.List;
import java.util.Locale;
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
   * @param category カテゴリフィルタ（null の場合は全カテゴリ）
   * @param from 空き確認の開始日時（null の場合はフィルタしない）
   * @param to 空き確認の終了日時（null の場合はフィルタしない）
   * @param isAdmin ADMIN ロールであれば inactive を含む
   * @param pageable ページネーション
   * @return {@link ResourceResponse} のページ
   */
  @Transactional(readOnly = true)
  public Page<ResourceResponse> list(
      ResourceCategory category,
      LocalDateTime from,
      LocalDateTime to,
      boolean isAdmin,
      Pageable pageable) {
    return list(category, from, to, isAdmin, null, pageable);
  }

  /**
   * キーワード検索を含むリソース一覧を返す。
   *
   * <p>{@code keyword} は前後の空白を除去し、空なら指定なしとして扱う。指定ありの場合は {@code name} または {@code description}
   * への大文字・小文字を区別しない部分一致で絞り込み、{@code category}・{@code from} / {@code to} とは AND で組み合わせる。{@code %} と
   * {@code _} はリテラル文字として扱う。
   *
   * @param category カテゴリフィルタ（null の場合は全カテゴリ）
   * @param from 空き確認の開始日時（null の場合はフィルタしない）
   * @param to 空き確認の終了日時（null の場合はフィルタしない）
   * @param isAdmin ADMIN ロールであれば inactive を含む
   * @param keyword 検索キーワード（null・空白のみの場合は絞り込まない）
   * @param pageable ページネーション
   * @return {@link ResourceResponse} のページ
   */
  @Transactional(readOnly = true)
  public Page<ResourceResponse> list(
      ResourceCategory category,
      LocalDateTime from,
      LocalDateTime to,
      boolean isAdmin,
      String keyword,
      Pageable pageable) {
    String pattern = toLikePattern(keyword);
    if (pattern != null) {
      return listWithKeyword(category, from, to, isAdmin, pattern, pageable);
    }
    if (from != null && to != null) {
      return listWithAvailabilityFilter(category, from, to, isAdmin, pageable);
    }
    return listPaginated(category, isAdmin, pageable);
  }

  /** from/to 指定なし：通常ページネーション。 */
  private Page<ResourceResponse> listPaginated(
      ResourceCategory category, boolean isAdmin, Pageable pageable) {
    Page<Resource> page;
    if (isAdmin) {
      page =
          category != null
              ? resourceRepository.findByCategory(category, pageable)
              : resourceRepository.findAll(pageable);
    } else {
      page =
          category != null
              ? resourceRepository.findByCategoryAndIsActiveTrue(category, pageable)
              : resourceRepository.findByIsActiveTrue(pageable);
    }
    return page.map(ResourceResponse::from);
  }

  /**
   * from/to 指定あり：全候補を取得し Java で重複判定してから手動ページネーション。
   *
   * <p>重複するリソース ID を一括取得（1 クエリ）し、候補リストから除外する。
   */
  private Page<ResourceResponse> listWithAvailabilityFilter(
      ResourceCategory category,
      LocalDateTime from,
      LocalDateTime to,
      boolean isAdmin,
      Pageable pageable) {
    // 1. 候補リソースを全取得（ページネーション前）
    List<Resource> candidates = fetchAllCandidates(category, isAdmin);

    // 2. 占有済みを除外し、3. 手動ページネーション
    return paginate(excludeOccupied(candidates, from, to), pageable);
  }

  /**
   * keyword 指定あり：キーワードに一致する候補を全取得し、from/to があれば重複判定してから手動ページネーション。
   *
   * <p>並び順は {@code pageable} の {@link org.springframework.data.domain.Sort} を候補取得クエリに渡して保つ。
   */
  private Page<ResourceResponse> listWithKeyword(
      ResourceCategory category,
      LocalDateTime from,
      LocalDateTime to,
      boolean isAdmin,
      String pattern,
      Pageable pageable) {
    List<Resource> candidates =
        fetchKeywordCandidates(category, isAdmin, pattern, pageable.getSort());
    if (from != null && to != null) {
      candidates = excludeOccupied(candidates, from, to);
    }
    return paginate(candidates, pageable);
  }

  /** 候補のうち、指定時間帯に占有済み予約があるリソースを除外する（予約取得は 1 クエリ）。 */
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

  /** フィルタ後リストを手動ページネーションする。 */
  private Page<ResourceResponse> paginate(List<Resource> candidates, Pageable pageable) {
    int total = candidates.size();
    int start = (int) pageable.getOffset();
    int end = Math.min(start + pageable.getPageSize(), total);
    List<ResourceResponse> content =
        start >= total
            ? List.of()
            : candidates.subList(start, end).stream().map(ResourceResponse::from).toList();
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

  private List<Resource> fetchKeywordCandidates(
      ResourceCategory category, boolean isAdmin, String pattern, Sort sort) {
    if (isAdmin) {
      return category != null
          ? resourceRepository.searchByKeywordAndCategory(pattern, category, sort)
          : resourceRepository.searchByKeyword(pattern, sort);
    } else {
      return category != null
          ? resourceRepository.searchActiveByKeywordAndCategory(pattern, category, sort)
          : resourceRepository.searchActiveByKeyword(pattern, sort);
    }
  }

  /**
   * キーワードを LIKE 用のパターン（{@code %...%}）に変換する。
   *
   * <p>前後の空白（全角空白を含む）を除去し、空なら {@code null}（キーワード指定なし）を返す。 比較は {@code LOWER()} 同士で行うため小文字化し、{@code
   * !}・{@code %}・{@code _} は {@link ResourceRepository} の {@code ESCAPE '!'} に合わせて {@code !}
   * でエスケープする。
   *
   * @param keyword 入力されたキーワード（null 可）
   * @return LIKE パターン。キーワード指定なしの場合は {@code null}
   */
  private static String toLikePattern(String keyword) {
    if (keyword == null) {
      return null;
    }
    String normalized = keyword.strip();
    if (normalized.isEmpty()) {
      return null;
    }
    String escaped =
        normalized
            .toLowerCase(Locale.ROOT)
            .replace("!", "!!")
            .replace("%", "!%")
            .replace("_", "!_");
    return "%" + escaped + "%";
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
