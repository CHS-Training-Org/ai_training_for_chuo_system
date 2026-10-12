package com.example.bookflow.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.bookflow.domain.ApprovedUsage;
import com.example.bookflow.domain.ReservationRepository;
import com.example.bookflow.domain.ReservationStatus;
import com.example.bookflow.domain.Resource;
import com.example.bookflow.domain.ResourceRepository;
import com.example.bookflow.presentation.dto.ResourceUsageResponse;
import com.example.bookflow.presentation.dto.UsageCondition;
import java.lang.reflect.Field;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * {@link StatisticsService} 単体テスト（ADR-018 準拠・Mockito）。
 *
 * <p>取得クエリの切替と {@code APPROVED} 指定・リソース別の合算（秒を合算して最後に分へ切り捨て）・期間での切り詰め・
 * 有効／無効リソースの選別・並び順を検証する。テスト命名規約（ADR-018）: {@code methodName_condition_expectedBehavior}
 */
@ExtendWith(MockitoExtension.class)
class StatisticsServiceTest {

  @Mock private ReservationRepository reservationRepository;
  @Mock private ResourceRepository resourceRepository;

  @InjectMocks private StatisticsService statisticsService;

  private static final UUID RES_A = UUID.fromString("00000000-0000-0000-0000-00000000000a");
  private static final UUID RES_B = UUID.fromString("00000000-0000-0000-0000-00000000000b");
  private static final UUID RES_C = UUID.fromString("00000000-0000-0000-0000-00000000000c");

  // ---------------------------------------------------------------------------
  // テストヘルパー
  // ---------------------------------------------------------------------------

  private static Resource makeResource(UUID id, String name, boolean isActive) {
    try {
      Resource r = new Resource() {};
      setField(r, "id", id);
      setField(r, "name", name);
      setField(r, "isActive", isActive);
      return r;
    } catch (Exception e) {
      throw new RuntimeException(e);
    }
  }

  private static void setField(Object obj, String name, Object value) throws Exception {
    Class<?> clazz = obj.getClass().getSuperclass();
    if (clazz == Object.class) {
      clazz = obj.getClass();
    }
    Field field = clazz.getDeclaredField(name);
    field.setAccessible(true);
    field.set(obj, value);
  }

  private static LocalDateTime at(int day, int hour, int minute, int second) {
    return LocalDateTime.of(2030, 10, day, hour, minute, second);
  }

  private static ApprovedUsage usage(UUID resourceId, LocalDateTime start, LocalDateTime end) {
    return new ApprovedUsage(resourceId, start, end);
  }

  /** 指定した時間数・分だけの予約（開始は 10/10 09:00）。 */
  private static ApprovedUsage hoursOf(UUID resourceId, int hours, int minutes) {
    LocalDateTime start = at(10, 9, 0, 0);
    return usage(resourceId, start, start.plusHours(hours).plusMinutes(minutes));
  }

  // ---------------------------------------------------------------------------
  // 取得クエリの切替と APPROVED 指定
  // ---------------------------------------------------------------------------

  @Nested
  class Query {

    @Test
    void aggregate_noPeriod_usesNoPeriodQueryWithApproved() {
      when(reservationRepository.findApprovedUsage(ReservationStatus.APPROVED))
          .thenReturn(List.of());
      when(resourceRepository.findAll()).thenReturn(List.of());

      statisticsService.aggregate(new UsageCondition(null, null));

      verify(reservationRepository).findApprovedUsage(ReservationStatus.APPROVED);
      verify(reservationRepository, never()).findApprovedUsageByPeriod(any(), any(), any());
    }

    @Test
    void aggregate_withPeriod_usesPeriodQueryWithApproved() {
      LocalDateTime from = at(1, 0, 0, 0);
      LocalDateTime to = at(31, 0, 0, 0);
      when(reservationRepository.findApprovedUsageByPeriod(ReservationStatus.APPROVED, from, to))
          .thenReturn(List.of());
      when(resourceRepository.findAll()).thenReturn(List.of());

      statisticsService.aggregate(new UsageCondition(from, to));

      verify(reservationRepository).findApprovedUsageByPeriod(ReservationStatus.APPROVED, from, to);
      verify(reservationRepository, never()).findApprovedUsage(any());
    }

    @Test
    void aggregate_onlyFromGiven_isTreatedAsNoPeriodAndDoesNotClip() {
      // Controller が片方のみを 400 にするため通常は到達しないが、Service は期間なしとして扱う
      when(reservationRepository.findApprovedUsage(ReservationStatus.APPROVED))
          .thenReturn(List.of(hoursOf(RES_A, 2, 0)));
      when(resourceRepository.findAll()).thenReturn(List.of(makeResource(RES_A, "A", true)));

      List<ResourceUsageResponse> result =
          statisticsService.aggregate(new UsageCondition(at(10, 10, 0, 0), null));

      assertThat(result)
          .singleElement()
          .satisfies(r -> assertThat(r.totalMinutes()).isEqualTo(120));
    }
  }

  // ---------------------------------------------------------------------------
  // 合算と切り詰め
  // ---------------------------------------------------------------------------

  @Nested
  class Sum {

    @Test
    void aggregate_multipleReservations_sumsCountAndMinutesPerResource() {
      when(reservationRepository.findApprovedUsage(ReservationStatus.APPROVED))
          .thenReturn(List.of(hoursOf(RES_A, 1, 0), hoursOf(RES_A, 2, 30), hoursOf(RES_B, 0, 45)));
      when(resourceRepository.findAll())
          .thenReturn(List.of(makeResource(RES_A, "A", true), makeResource(RES_B, "B", true)));

      List<ResourceUsageResponse> result =
          statisticsService.aggregate(new UsageCondition(null, null));

      assertThat(result)
          .extracting(
              ResourceUsageResponse::resourceName,
              ResourceUsageResponse::reservationCount,
              ResourceUsageResponse::totalMinutes)
          .containsExactly(
              org.assertj.core.groups.Tuple.tuple("A", 2L, 210L),
              org.assertj.core.groups.Tuple.tuple("B", 1L, 45L));
    }

    @Test
    void aggregate_secondsAreSummedBeforeTruncatingToMinutes() {
      // 90 秒の予約 2 件 → 合計 180 秒 = 3 分（予約ごとに切り捨てると 1 + 1 = 2 分になってしまう）
      LocalDateTime start = at(10, 9, 0, 0);
      when(reservationRepository.findApprovedUsage(ReservationStatus.APPROVED))
          .thenReturn(
              List.of(
                  usage(RES_A, start, start.plusSeconds(90)),
                  usage(RES_A, start.plusHours(1), start.plusHours(1).plusSeconds(90))));
      when(resourceRepository.findAll()).thenReturn(List.of(makeResource(RES_A, "A", true)));

      List<ResourceUsageResponse> result =
          statisticsService.aggregate(new UsageCondition(null, null));

      assertThat(result).singleElement().satisfies(r -> assertThat(r.totalMinutes()).isEqualTo(3));
    }

    @Test
    void aggregate_withPeriod_clipsMinutesAtPeriodButCountsReservationOnce() {
      // 10/9 22:00 - 10/10 02:00 を 10/10 00:00 - 10/11 00:00 で集計 → 件数 1・120 分
      LocalDateTime from = at(10, 0, 0, 0);
      LocalDateTime to = at(11, 0, 0, 0);
      when(reservationRepository.findApprovedUsageByPeriod(ReservationStatus.APPROVED, from, to))
          .thenReturn(List.of(usage(RES_A, at(9, 22, 0, 0), at(10, 2, 0, 0))));
      when(resourceRepository.findAll()).thenReturn(List.of(makeResource(RES_A, "A", true)));

      List<ResourceUsageResponse> result =
          statisticsService.aggregate(new UsageCondition(from, to));

      assertThat(result)
          .singleElement()
          .satisfies(
              r -> {
                assertThat(r.reservationCount()).isEqualTo(1);
                assertThat(r.totalMinutes()).isEqualTo(120);
              });
    }

    @Test
    void aggregate_noPeriod_usesFullReservationDuration() {
      when(reservationRepository.findApprovedUsage(ReservationStatus.APPROVED))
          .thenReturn(List.of(usage(RES_A, at(9, 22, 0, 0), at(10, 2, 0, 0))));
      when(resourceRepository.findAll()).thenReturn(List.of(makeResource(RES_A, "A", true)));

      List<ResourceUsageResponse> result =
          statisticsService.aggregate(new UsageCondition(null, null));

      assertThat(result)
          .singleElement()
          .satisfies(r -> assertThat(r.totalMinutes()).isEqualTo(240));
    }
  }

  // ---------------------------------------------------------------------------
  // 表示するリソースの選別
  // ---------------------------------------------------------------------------

  @Nested
  class Inclusion {

    @Test
    void aggregate_activeResourceWithoutUsage_isIncludedWithZeros() {
      when(reservationRepository.findApprovedUsage(ReservationStatus.APPROVED))
          .thenReturn(List.of());
      when(resourceRepository.findAll())
          .thenReturn(List.of(makeResource(RES_A, "使われていない会議室", true)));

      List<ResourceUsageResponse> result =
          statisticsService.aggregate(new UsageCondition(null, null));

      assertThat(result)
          .singleElement()
          .satisfies(
              r -> {
                assertThat(r.resourceName()).isEqualTo("使われていない会議室");
                assertThat(r.reservationCount()).isZero();
                assertThat(r.totalMinutes()).isZero();
              });
    }

    @Test
    void aggregate_inactiveResourceWithUsage_isIncluded() {
      when(reservationRepository.findApprovedUsage(ReservationStatus.APPROVED))
          .thenReturn(List.of(hoursOf(RES_A, 1, 0)));
      when(resourceRepository.findAll()).thenReturn(List.of(makeResource(RES_A, "廃止済み", false)));

      List<ResourceUsageResponse> result =
          statisticsService.aggregate(new UsageCondition(null, null));

      assertThat(result)
          .singleElement()
          .satisfies(r -> assertThat(r.reservationCount()).isEqualTo(1));
    }

    @Test
    void aggregate_inactiveResourceWithoutUsage_isExcluded() {
      when(reservationRepository.findApprovedUsage(ReservationStatus.APPROVED))
          .thenReturn(List.of());
      when(resourceRepository.findAll())
          .thenReturn(List.of(makeResource(RES_A, "廃止済み", false), makeResource(RES_B, "B", true)));

      List<ResourceUsageResponse> result =
          statisticsService.aggregate(new UsageCondition(null, null));

      assertThat(result).extracting(ResourceUsageResponse::resourceName).containsExactly("B");
    }

    @Test
    void aggregate_noResources_returnsEmptyList() {
      when(reservationRepository.findApprovedUsage(ReservationStatus.APPROVED))
          .thenReturn(List.of());
      when(resourceRepository.findAll()).thenReturn(List.of());

      assertThat(statisticsService.aggregate(new UsageCondition(null, null))).isEmpty();
    }

    @Test
    void aggregate_usageOfUnknownResource_isIgnored() {
      // リソース一覧に存在しない resourceId の予約（通常は外部キー制約で起きない）は出力しない
      when(reservationRepository.findApprovedUsage(ReservationStatus.APPROVED))
          .thenReturn(List.of(hoursOf(RES_C, 1, 0)));
      when(resourceRepository.findAll()).thenReturn(List.of(makeResource(RES_A, "A", true)));

      List<ResourceUsageResponse> result =
          statisticsService.aggregate(new UsageCondition(null, null));

      assertThat(result).extracting(ResourceUsageResponse::resourceName).containsExactly("A");
    }
  }

  // ---------------------------------------------------------------------------
  // 並び順
  // ---------------------------------------------------------------------------

  @Nested
  class Ordering {

    @Test
    void aggregate_sortsByMinutesDescThenCountDescThenNameAsc() {
      // A: 60 分・2 件、B: 120 分・1 件、C: 60 分・3 件、D: 60 分・3 件（名前 C より後）
      UUID resD = UUID.fromString("00000000-0000-0000-0000-00000000000d");
      when(reservationRepository.findApprovedUsage(ReservationStatus.APPROVED))
          .thenReturn(
              List.of(
                  hoursOf(RES_A, 0, 30),
                  hoursOf(RES_A, 0, 30),
                  hoursOf(RES_B, 2, 0),
                  hoursOf(RES_C, 0, 20),
                  hoursOf(RES_C, 0, 20),
                  hoursOf(RES_C, 0, 20),
                  hoursOf(resD, 0, 20),
                  hoursOf(resD, 0, 20),
                  hoursOf(resD, 0, 20)));
      when(resourceRepository.findAll())
          .thenReturn(
              List.of(
                  makeResource(RES_A, "A", true),
                  makeResource(RES_B, "B", true),
                  makeResource(resD, "D", true),
                  makeResource(RES_C, "C", true)));

      List<ResourceUsageResponse> result =
          statisticsService.aggregate(new UsageCondition(null, null));

      assertThat(result)
          .extracting(ResourceUsageResponse::resourceName)
          .containsExactly("B", "C", "D", "A");
    }
  }
}
