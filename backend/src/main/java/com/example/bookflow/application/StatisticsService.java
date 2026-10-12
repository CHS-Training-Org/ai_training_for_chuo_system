package com.example.bookflow.application;

import com.example.bookflow.domain.ApprovedUsage;
import com.example.bookflow.domain.ReservationRepository;
import com.example.bookflow.domain.ReservationStatus;
import com.example.bookflow.domain.ResourceRepository;
import com.example.bookflow.presentation.dto.ResourceUsageResponse;
import com.example.bookflow.presentation.dto.UsageCondition;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 利用実績の集計ユースケース Service（api-spec.md §統計 準拠）。
 *
 * <p>承認済み（{@code APPROVED}）の予約をリソース別に集計し、件数と合計利用時間（分）を返す。期間指定があるときは 期間と重複する予約を対象にし、利用時間は期間で切り詰める。
 * 取得は JPQL（射影）、切り詰めと合算は Java で行い、H2 と PostgreSQL の日時差関数の方言差に依存しない。 認可（ADMIN のみ）は Controller の
 * {@code @PreAuthorize} が担当する。
 */
@Service
public class StatisticsService {

  /** 並び順：合計時間の降順、同値は件数の降順、さらに同値はリソース名の昇順。 */
  private static final Comparator<ResourceUsageResponse> ORDER =
      Comparator.comparingLong(ResourceUsageResponse::totalMinutes)
          .reversed()
          .thenComparing(
              Comparator.comparingLong(ResourceUsageResponse::reservationCount).reversed())
          .thenComparing(ResourceUsageResponse::resourceName);

  private final ReservationRepository reservationRepository;
  private final ResourceRepository resourceRepository;

  public StatisticsService(
      ReservationRepository reservationRepository, ResourceRepository resourceRepository) {
    this.reservationRepository = reservationRepository;
    this.resourceRepository = resourceRepository;
  }

  /**
   * リソース別の利用実績を集計する。
   *
   * <p>有効なリソースは実績が 0 件でも含め、無効化済みのリソースは対象の予約が 1 件以上あるときだけ含める。 合計利用時間は予約ごとの秒を合算し、最後に 60
   * で割って切り捨てた分で返す。
   *
   * @param condition 集計条件（期間は同時指定済みで {@code from} が {@code to} より前の前提）
   * @return 合計利用時間の降順（同値は件数の降順、リソース名の昇順）のリスト
   */
  @Transactional(readOnly = true)
  public List<ResourceUsageResponse> aggregate(UsageCondition condition) {
    List<ApprovedUsage> usages =
        condition.hasPeriod()
            ? reservationRepository.findApprovedUsageByPeriod(
                ReservationStatus.APPROVED, condition.from(), condition.to())
            : reservationRepository.findApprovedUsage(ReservationStatus.APPROVED);

    LocalDateTime from = condition.hasPeriod() ? condition.from() : null;
    LocalDateTime to = condition.hasPeriod() ? condition.to() : null;

    Map<UUID, Totals> totalsByResource = new HashMap<>();
    for (ApprovedUsage usage : usages) {
      Totals totals = totalsByResource.computeIfAbsent(usage.resourceId(), id -> new Totals());
      totals.count++;
      totals.seconds += UsageCalculator.clippedSeconds(usage.startAt(), usage.endAt(), from, to);
    }

    return resourceRepository.findAll().stream()
        .filter(resource -> resource.isActive() || totalsByResource.containsKey(resource.getId()))
        .map(
            resource -> {
              Totals totals = totalsByResource.getOrDefault(resource.getId(), new Totals());
              return new ResourceUsageResponse(
                  resource.getId(), resource.getName(), totals.count, totals.seconds / 60);
            })
        .sorted(ORDER)
        .toList();
  }

  /** リソース別の件数と合計秒の集計値。 */
  private static final class Totals {
    private long count;
    private long seconds;
  }
}
