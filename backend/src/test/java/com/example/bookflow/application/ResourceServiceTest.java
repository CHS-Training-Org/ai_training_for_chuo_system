package com.example.bookflow.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.bookflow.application.exception.ResourceNotFoundException;
import com.example.bookflow.domain.Reservation;
import com.example.bookflow.domain.ReservationRepository;
import com.example.bookflow.domain.ReservationStatus;
import com.example.bookflow.domain.Resource;
import com.example.bookflow.domain.ResourceCategory;
import com.example.bookflow.domain.ResourceRepository;
import com.example.bookflow.presentation.dto.OccupiedSlot;
import com.example.bookflow.presentation.dto.ResourceResponse;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

/**
 * {@link ResourceService} 単体テスト（ADR-018 準拠・Mockito）。
 *
 * <p>カテゴリ 4 で導入する初の Mockito 単体テスト。業務ルールを単体で検証する。 テスト命名規約（ADR-018）: {@code
 * methodName_condition_expectedBehavior}
 */
@ExtendWith(MockitoExtension.class)
class ResourceServiceTest {

  @Mock private ResourceRepository resourceRepository;
  @Mock private ReservationRepository reservationRepository;

  @InjectMocks private ResourceService resourceService;

  // ---------------------------------------------------------------------------
  // テストヘルパー：リフレクションでエンティティのフィールドを設定する
  // ---------------------------------------------------------------------------

  /**
   * {@link Resource} エンティティのフィールドをリフレクションで設定するヘルパー。
   *
   * <p>Resource は protected コンストラクタを持ち、create ファクトリ外で生成できないため リフレクションを使用する（テスト専用）。
   */
  private static Resource makeResource(
      UUID id, String name, ResourceCategory category, boolean isActive) {
    return makeResource(id, name, category, isActive, null);
  }

  private static Resource makeResource(
      UUID id, String name, ResourceCategory category, boolean isActive, Integer capacity) {
    return makeResource(id, name, category, isActive, capacity, LocalDateTime.of(2025, 4, 1, 9, 0));
  }

  private static Resource makeResource(
      UUID id,
      String name,
      ResourceCategory category,
      boolean isActive,
      Integer capacity,
      LocalDateTime createdAt) {
    try {
      Resource r = new Resource() {};
      setField(r, "id", id);
      setField(r, "name", name);
      setField(r, "category", category);
      setField(r, "isActive", isActive);
      setField(r, "requiresApproval", false);
      setField(r, "capacity", capacity);
      setField(r, "createdAt", createdAt);
      return r;
    } catch (Exception e) {
      throw new RuntimeException(e);
    }
  }

  private static Reservation makeReservation(
      UUID id,
      Resource resource,
      LocalDateTime start,
      LocalDateTime end,
      ReservationStatus status) {
    try {
      Reservation rv = new Reservation() {};
      setField(rv, "id", id);
      setField(rv, "resource", resource);
      setField(rv, "startAt", start);
      setField(rv, "endAt", end);
      setField(rv, "status", status);
      return rv;
    } catch (Exception e) {
      throw new RuntimeException(e);
    }
  }

  private static void setField(Object obj, String name, Object value) throws Exception {
    Class<?> clazz = obj.getClass().getSuperclass(); // actual class (not anonymous)
    if (clazz == Object.class) clazz = obj.getClass();
    Field field;
    try {
      field = clazz.getDeclaredField(name);
    } catch (NoSuchFieldException e) {
      // anonymous class の場合はスーパークラスを探す
      field = clazz.getSuperclass().getDeclaredField(name);
    }
    field.setAccessible(true);
    field.set(obj, value);
  }

  // ---------------------------------------------------------------------------
  // overlaps — 重複判定ロジック（境界値テスト）
  // ---------------------------------------------------------------------------

  @Nested
  class Overlaps {

    private final LocalDateTime base = LocalDateTime.of(2025, 6, 1, 10, 0);

    @Test
    void overlaps_fullyContained_returnsTrue() {
      // 既存予約が確認範囲を完全包含
      assertThat(
              ResourceService.overlaps(
                  base, base.plusHours(4), base.plusHours(1), base.plusHours(3)))
          .isTrue();
    }

    @Test
    void overlaps_partialOverlapStart_returnsTrue() {
      // 既存予約の後半が確認範囲の前半と重複
      assertThat(
              ResourceService.overlaps(
                  base, base.plusHours(2), base.plusHours(1), base.plusHours(3)))
          .isTrue();
    }

    @Test
    void overlaps_partialOverlapEnd_returnsTrue() {
      // 既存予約の前半が確認範囲の後半と重複
      assertThat(
              ResourceService.overlaps(
                  base.plusHours(1), base.plusHours(3), base, base.plusHours(2)))
          .isTrue();
    }

    @Test
    void overlaps_exactlySameRange_returnsTrue() {
      // 既存予約と完全に同一の時間帯
      assertThat(ResourceService.overlaps(base, base.plusHours(2), base, base.plusHours(2)))
          .isTrue();
    }

    @Test
    void overlaps_adjacentEnd_returnsFalse() {
      // 既存予約の終了 == 確認範囲の開始（隣接・非重複）
      assertThat(
              ResourceService.overlaps(
                  base, base.plusHours(1), base.plusHours(1), base.plusHours(2)))
          .isFalse();
    }

    @Test
    void overlaps_adjacentStart_returnsFalse() {
      // 既存予約の開始 == 確認範囲の終了（隣接・非重複）
      assertThat(
              ResourceService.overlaps(
                  base.plusHours(2), base.plusHours(3), base, base.plusHours(2)))
          .isFalse();
    }

    @Test
    void overlaps_discrete_returnsFalse() {
      // 既存予約と確認範囲が離散（重ならない）
      assertThat(
              ResourceService.overlaps(
                  base, base.plusHours(1), base.plusHours(2), base.plusHours(3)))
          .isFalse();
    }
  }

  // ---------------------------------------------------------------------------
  // list — ロール別一覧・空きフィルタ
  // ---------------------------------------------------------------------------

  @Nested
  class List_ {

    private static final UUID ACTIVE_ID = UUID.randomUUID();
    private static final UUID INACTIVE_ID = UUID.randomUUID();
    private final Pageable pageable = PageRequest.of(0, 20);

    private Resource activeResource;
    private Resource inactiveResource;

    @BeforeEach
    void setUp() {
      activeResource = makeResource(ACTIVE_ID, "第1会議室", ResourceCategory.ROOM, true);
      inactiveResource = makeResource(INACTIVE_ID, "旧備品A", ResourceCategory.EQUIPMENT, false);
    }

    @Test
    void list_memberWithoutFilter_returnsActiveOnly() {
      when(resourceRepository.search(null, true, null))
          .thenReturn(java.util.List.of(activeResource));

      Page<ResourceResponse> result = resourceService.list(null, null, null, null, false, pageable);

      assertThat(result.getContent()).hasSize(1);
      assertThat(result.getContent().get(0).id()).isEqualTo(ACTIVE_ID);
    }

    @Test
    void list_adminWithoutFilter_returnsAllIncludingInactive() {
      when(resourceRepository.search(null, false, null))
          .thenReturn(java.util.List.of(activeResource, inactiveResource));

      Page<ResourceResponse> result = resourceService.list(null, null, null, null, true, pageable);

      assertThat(result.getContent()).hasSize(2);
    }

    @Test
    void list_memberWithTimeFilterAndOccupied_excludesOccupiedResource() {
      LocalDateTime from = LocalDateTime.of(2025, 6, 1, 10, 0);
      LocalDateTime to = LocalDateTime.of(2025, 6, 1, 12, 0);

      when(resourceRepository.search(null, true, null))
          .thenReturn(java.util.List.of(activeResource));

      // 完全重複する予約が存在する
      Reservation occupying =
          makeReservation(
              UUID.randomUUID(),
              activeResource,
              from.minusHours(1),
              to.plusHours(1),
              ReservationStatus.PENDING);
      when(reservationRepository.findByResource_IdInAndStatusIn(anyCollection(), anyCollection()))
          .thenReturn(java.util.List.of(occupying));

      Page<ResourceResponse> result = resourceService.list(null, null, from, to, false, pageable);

      assertThat(result.getContent()).isEmpty();
    }

    @Test
    void list_memberWithTimeFilterAndAdjacentReservation_includesResource() {
      LocalDateTime from = LocalDateTime.of(2025, 6, 1, 10, 0);
      LocalDateTime to = LocalDateTime.of(2025, 6, 1, 12, 0);

      when(resourceRepository.search(null, true, null))
          .thenReturn(java.util.List.of(activeResource));

      // 隣接（to == 既存開始）→ 非重複なので除外しない
      Reservation adjacent =
          makeReservation(
              UUID.randomUUID(), activeResource, to, to.plusHours(2), ReservationStatus.APPROVED);
      when(reservationRepository.findByResource_IdInAndStatusIn(anyCollection(), anyCollection()))
          .thenReturn(java.util.List.of(adjacent));

      Page<ResourceResponse> result = resourceService.list(null, null, from, to, false, pageable);

      assertThat(result.getContent()).hasSize(1);
    }

    @Test
    void list_withBlankKeyword_normalizesToNullBeforeRepositoryCall() {
      when(resourceRepository.search(null, true, null))
          .thenReturn(java.util.List.of(activeResource));

      resourceService.list(null, "   ", null, null, false, pageable);

      verify(resourceRepository).search(null, true, null);
    }

    @Test
    void list_withKeyword_passesTrimmedKeywordToRepositoryCall() {
      when(resourceRepository.search(null, true, "会議室"))
          .thenReturn(java.util.List.of(activeResource));

      resourceService.list(null, "  会議室  ", null, null, false, pageable);

      verify(resourceRepository).search(null, true, "会議室");
    }

    // -------------------------------------------------------------------------
    // sort — ソート（issue #22）
    // -------------------------------------------------------------------------

    @Test
    void list_sortByNameAsc_sortsCaseInsensitively() {
      Resource banana = makeResource(UUID.randomUUID(), "banana", ResourceCategory.ROOM, true);
      Resource apple = makeResource(UUID.randomUUID(), "Apple", ResourceCategory.ROOM, true);
      Resource cherry = makeResource(UUID.randomUUID(), "cherry", ResourceCategory.ROOM, true);
      when(resourceRepository.search(null, true, null))
          .thenReturn(java.util.List.of(banana, apple, cherry));

      Pageable sorted = PageRequest.of(0, 20, Sort.by(Sort.Order.asc("name")));
      Page<ResourceResponse> result = resourceService.list(null, null, null, null, false, sorted);

      assertThat(result.getContent())
          .extracting(ResourceResponse::name)
          .containsExactly("Apple", "banana", "cherry");
    }

    @Test
    void list_sortByNameDesc_sortsCaseInsensitivelyReversed() {
      Resource banana = makeResource(UUID.randomUUID(), "banana", ResourceCategory.ROOM, true);
      Resource apple = makeResource(UUID.randomUUID(), "Apple", ResourceCategory.ROOM, true);
      Resource cherry = makeResource(UUID.randomUUID(), "cherry", ResourceCategory.ROOM, true);
      when(resourceRepository.search(null, true, null))
          .thenReturn(java.util.List.of(banana, apple, cherry));

      Pageable sorted = PageRequest.of(0, 20, Sort.by(Sort.Order.desc("name")));
      Page<ResourceResponse> result = resourceService.list(null, null, null, null, false, sorted);

      assertThat(result.getContent())
          .extracting(ResourceResponse::name)
          .containsExactly("cherry", "banana", "Apple");
    }

    @Test
    void list_sortByCapacityAsc_nullsLast() {
      Resource withoutCapacity =
          makeResource(UUID.randomUUID(), "無指定", ResourceCategory.ROOM, true, null);
      Resource small = makeResource(UUID.randomUUID(), "小", ResourceCategory.ROOM, true, 5);
      Resource large = makeResource(UUID.randomUUID(), "大", ResourceCategory.ROOM, true, 20);
      when(resourceRepository.search(null, true, null))
          .thenReturn(java.util.List.of(withoutCapacity, large, small));

      Pageable sorted = PageRequest.of(0, 20, Sort.by(Sort.Order.asc("capacity")));
      Page<ResourceResponse> result = resourceService.list(null, null, null, null, false, sorted);

      assertThat(result.getContent())
          .extracting(ResourceResponse::capacity)
          .containsExactly(5, 20, null);
    }

    @Test
    void list_sortByCapacityDesc_nullsLast() {
      // BR-03 の回帰テスト：DB の ORDER BY capacity DESC への単純委譲では
      // PostgreSQL の既定（DESC は NULLS FIRST）により null が先頭に来てしまうことを実測で確認済み。
      Resource withoutCapacity =
          makeResource(UUID.randomUUID(), "無指定", ResourceCategory.ROOM, true, null);
      Resource small = makeResource(UUID.randomUUID(), "小", ResourceCategory.ROOM, true, 5);
      Resource large = makeResource(UUID.randomUUID(), "大", ResourceCategory.ROOM, true, 20);
      when(resourceRepository.search(null, true, null))
          .thenReturn(java.util.List.of(withoutCapacity, small, large));

      Pageable sorted = PageRequest.of(0, 20, Sort.by(Sort.Order.desc("capacity")));
      Page<ResourceResponse> result = resourceService.list(null, null, null, null, false, sorted);

      assertThat(result.getContent())
          .extracting(ResourceResponse::capacity)
          .containsExactly(20, 5, null);
    }

    @Test
    void list_sortByCreatedAtDesc_sortsDescending() {
      Resource older =
          makeResource(
              UUID.randomUUID(),
              "旧",
              ResourceCategory.ROOM,
              true,
              null,
              LocalDateTime.of(2025, 1, 1, 9, 0));
      Resource newer =
          makeResource(
              UUID.randomUUID(),
              "新",
              ResourceCategory.ROOM,
              true,
              null,
              LocalDateTime.of(2025, 6, 1, 9, 0));
      when(resourceRepository.search(null, true, null))
          .thenReturn(java.util.List.of(older, newer));

      Pageable sorted = PageRequest.of(0, 20, Sort.by(Sort.Order.desc("createdAt")));
      Page<ResourceResponse> result = resourceService.list(null, null, null, null, false, sorted);

      assertThat(result.getContent()).extracting(ResourceResponse::name).containsExactly("新", "旧");
    }

    @Test
    void list_unsortedPageable_defaultsToCreatedAtAsc() {
      Resource older =
          makeResource(
              UUID.randomUUID(),
              "旧",
              ResourceCategory.ROOM,
              true,
              null,
              LocalDateTime.of(2025, 1, 1, 9, 0));
      Resource newer =
          makeResource(
              UUID.randomUUID(),
              "新",
              ResourceCategory.ROOM,
              true,
              null,
              LocalDateTime.of(2025, 6, 1, 9, 0));
      when(resourceRepository.search(null, true, null))
          .thenReturn(java.util.List.of(newer, older));

      Page<ResourceResponse> result = resourceService.list(null, null, null, null, false, pageable);

      assertThat(result.getContent()).extracting(ResourceResponse::name).containsExactly("旧", "新");
    }

    @Test
    void list_pageOffsetBeyondIntRange_returnsEmptyContentWithoutOverflow() {
      // 大きな page 値では offset (long) が int の範囲を超えるため、
      // 先に int にキャストして total と比較すると負数に折り返り例外になる（回帰テスト）。
      when(resourceRepository.search(null, true, null))
          .thenReturn(java.util.List.of(activeResource));

      Pageable farPage = PageRequest.of(200_000_000, 20);
      Page<ResourceResponse> result = resourceService.list(null, null, null, null, false, farPage);

      assertThat(result.getContent()).isEmpty();
      assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    void list_withTimeFilterAndSort_appliesSortAfterExclusion() {
      LocalDateTime from = LocalDateTime.of(2025, 6, 1, 10, 0);
      LocalDateTime to = LocalDateTime.of(2025, 6, 1, 12, 0);
      Resource occupied = makeResource(UUID.randomUUID(), "banana", ResourceCategory.ROOM, true);
      Resource free1 = makeResource(UUID.randomUUID(), "cherry", ResourceCategory.ROOM, true);
      Resource free2 = makeResource(UUID.randomUUID(), "Apple", ResourceCategory.ROOM, true);
      when(resourceRepository.search(null, true, null))
          .thenReturn(java.util.List.of(occupied, free1, free2));

      Reservation occupying =
          makeReservation(
              UUID.randomUUID(),
              occupied,
              from.minusHours(1),
              to.plusHours(1),
              ReservationStatus.PENDING);
      when(reservationRepository.findByResource_IdInAndStatusIn(anyCollection(), anyCollection()))
          .thenReturn(java.util.List.of(occupying));

      Pageable sorted = PageRequest.of(0, 20, Sort.by(Sort.Order.asc("name")));
      Page<ResourceResponse> result = resourceService.list(null, null, from, to, false, sorted);

      assertThat(result.getContent())
          .extracting(ResourceResponse::name)
          .containsExactly("Apple", "cherry");
    }
  }

  // ---------------------------------------------------------------------------
  // get — リソース詳細
  // ---------------------------------------------------------------------------

  @Nested
  class Get {

    @Test
    void get_existingId_returnsResourceResponse() {
      UUID id = UUID.randomUUID();
      Resource resource = makeResource(id, "第1会議室", ResourceCategory.ROOM, true);
      when(resourceRepository.findById(id)).thenReturn(Optional.of(resource));

      ResourceResponse response = resourceService.get(id);

      assertThat(response.id()).isEqualTo(id);
      assertThat(response.name()).isEqualTo("第1会議室");
    }

    @Test
    void get_nonExistentId_throwsResourceNotFoundException() {
      UUID id = UUID.randomUUID();
      when(resourceRepository.findById(id)).thenReturn(Optional.empty());

      assertThatThrownBy(() -> resourceService.get(id))
          .isInstanceOf(ResourceNotFoundException.class);
    }
  }

  // ---------------------------------------------------------------------------
  // availability — 空き照会・重複判定
  // ---------------------------------------------------------------------------

  @Nested
  class Availability {

    private final UUID resourceId = UUID.randomUUID();
    private Resource resource;

    @BeforeEach
    void setUp() {
      resource = makeResource(resourceId, "第1会議室", ResourceCategory.ROOM, true);
      // lenient: availability_nonExistentResourceId テストでは resourceId の stub は不使用
      lenient().when(resourceRepository.findById(resourceId)).thenReturn(Optional.of(resource));
    }

    @Test
    void availability_noReservations_returnsEmptyList() {
      when(reservationRepository.findByResource_IdAndStatusIn(eq(resourceId), anyCollection()))
          .thenReturn(java.util.List.of());

      LocalDateTime from = LocalDateTime.of(2025, 6, 1, 0, 0);
      LocalDateTime to = LocalDateTime.of(2025, 6, 7, 23, 59);
      List<OccupiedSlot> slots = resourceService.availability(resourceId, from, to);

      assertThat(slots).isEmpty();
    }

    @Test
    void availability_overlappingReservation_returnsSlot() {
      LocalDateTime from = LocalDateTime.of(2025, 6, 1, 10, 0);
      LocalDateTime to = LocalDateTime.of(2025, 6, 1, 12, 0);
      UUID reservationId = UUID.randomUUID();

      Reservation overlapping =
          makeReservation(
              reservationId,
              resource,
              from.minusHours(1),
              to.plusHours(1),
              ReservationStatus.APPROVED);
      when(reservationRepository.findByResource_IdAndStatusIn(eq(resourceId), anyCollection()))
          .thenReturn(java.util.List.of(overlapping));

      List<OccupiedSlot> slots = resourceService.availability(resourceId, from, to);

      assertThat(slots).hasSize(1);
      assertThat(slots.get(0).reservationId()).isEqualTo(reservationId);
    }

    @Test
    void availability_adjacentReservation_returnsEmptyList() {
      LocalDateTime from = LocalDateTime.of(2025, 6, 1, 10, 0);
      LocalDateTime to = LocalDateTime.of(2025, 6, 1, 12, 0);

      // 隣接（end == from）→ 重複なし
      Reservation adjacent =
          makeReservation(
              UUID.randomUUID(), resource, from.minusHours(2), from, ReservationStatus.PENDING);
      when(reservationRepository.findByResource_IdAndStatusIn(eq(resourceId), anyCollection()))
          .thenReturn(java.util.List.of(adjacent));

      List<OccupiedSlot> slots = resourceService.availability(resourceId, from, to);

      assertThat(slots).isEmpty();
    }

    @Test
    void availability_nonExistentResourceId_throwsResourceNotFoundException() {
      UUID nonExistentId = UUID.randomUUID();
      when(resourceRepository.findById(nonExistentId)).thenReturn(Optional.empty());

      assertThatThrownBy(
              () ->
                  resourceService.availability(
                      nonExistentId, LocalDateTime.now(), LocalDateTime.now().plusHours(1)))
          .isInstanceOf(ResourceNotFoundException.class);
    }
  }
}
