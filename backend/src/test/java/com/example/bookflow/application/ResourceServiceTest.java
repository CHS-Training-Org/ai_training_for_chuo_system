package com.example.bookflow.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
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
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

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
    try {
      Resource r = new Resource() {};
      setField(r, "id", id);
      setField(r, "name", name);
      setField(r, "category", category);
      setField(r, "isActive", isActive);
      setField(r, "requiresApproval", false);
      setField(r, "createdAt", LocalDateTime.of(2025, 4, 1, 9, 0));
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
      when(resourceRepository.findByIsActiveTrue(pageable))
          .thenReturn(new PageImpl<>(java.util.List.of(activeResource)));

      Page<ResourceResponse> result = resourceService.list(null, null, null, false, pageable);

      assertThat(result.getContent()).hasSize(1);
      assertThat(result.getContent().get(0).id()).isEqualTo(ACTIVE_ID);
    }

    @Test
    void list_adminWithoutFilter_returnsAllIncludingInactive() {
      when(resourceRepository.findAll(pageable))
          .thenReturn(new PageImpl<>(java.util.List.of(activeResource, inactiveResource)));

      Page<ResourceResponse> result = resourceService.list(null, null, null, true, pageable);

      assertThat(result.getContent()).hasSize(2);
    }

    @Test
    void list_memberWithTimeFilterAndOccupied_excludesOccupiedResource() {
      LocalDateTime from = LocalDateTime.of(2025, 6, 1, 10, 0);
      LocalDateTime to = LocalDateTime.of(2025, 6, 1, 12, 0);

      when(resourceRepository.findByIsActiveTrue()).thenReturn(java.util.List.of(activeResource));

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

      Page<ResourceResponse> result = resourceService.list(null, from, to, false, pageable);

      assertThat(result.getContent()).isEmpty();
    }

    @Test
    void list_memberWithTimeFilterAndAdjacentReservation_includesResource() {
      LocalDateTime from = LocalDateTime.of(2025, 6, 1, 10, 0);
      LocalDateTime to = LocalDateTime.of(2025, 6, 1, 12, 0);

      when(resourceRepository.findByIsActiveTrue()).thenReturn(java.util.List.of(activeResource));

      // 隣接（to == 既存開始）→ 非重複なので除外しない
      Reservation adjacent =
          makeReservation(
              UUID.randomUUID(), activeResource, to, to.plusHours(2), ReservationStatus.APPROVED);
      when(reservationRepository.findByResource_IdInAndStatusIn(anyCollection(), anyCollection()))
          .thenReturn(java.util.List.of(adjacent));

      Page<ResourceResponse> result = resourceService.list(null, from, to, false, pageable);

      assertThat(result.getContent()).hasSize(1);
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
