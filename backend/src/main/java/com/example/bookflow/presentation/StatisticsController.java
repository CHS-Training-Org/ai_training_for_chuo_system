package com.example.bookflow.presentation;

import com.example.bookflow.application.StatisticsService;
import com.example.bookflow.application.exception.ValidationException;
import com.example.bookflow.presentation.dto.ResourceUsageResponse;
import com.example.bookflow.presentation.dto.UsageCondition;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 統計コントローラ（api-spec.md §統計 準拠）。
 *
 * <ul>
 *   <li>{@code GET /api/statistics/resources} — リソース別の利用実績（承認済み予約の件数と合計利用時間）の集計（ADMIN のみ）
 * </ul>
 *
 * <p>認可：{@code @PreAuthorize("hasRole('ADMIN')")} により ADMIN のみアクセス可。 MEMBER / APPROVER は 403
 * Forbidden。
 */
@RestController
@RequestMapping("/api/statistics")
public class StatisticsController {

  private final StatisticsService statisticsService;

  public StatisticsController(StatisticsService statisticsService) {
    this.statisticsService = statisticsService;
  }

  /**
   * リソース別の利用実績を返す（ADMIN のみ）。
   *
   * <p>{@code from}/{@code to} は期間重複で絞り込み、同時指定必須（両方省略なら全期間）かつ {@code from} は {@code to}
   * より前。対象は承認済み（{@code APPROVED}）の予約のみ。ページネーションはなく、全リソースを配列で返す。
   *
   * @param from 期間の開始日時
   * @param to 期間の終了日時
   * @return 合計利用時間の降順のリソース別の集計
   */
  @GetMapping("/resources")
  @PreAuthorize("hasRole('ADMIN')")
  public List<ResourceUsageResponse> resources(
      @RequestParam(required = false) LocalDateTime from,
      @RequestParam(required = false) LocalDateTime to) {
    // from / to は同時指定必須（api-spec.md §統計 参照。予約一覧・CSV と同じ規則）
    if ((from == null) != (to == null)) {
      throw new ValidationException("from と to は同時に指定してください。");
    }
    // 統計 API 固有の検証：from >= to だと切り詰め時間が負になりうるため、from は to より前
    if (from != null && !from.isBefore(to)) {
      throw new ValidationException("from は to より前にしてください。");
    }
    return statisticsService.aggregate(new UsageCondition(from, to));
  }
}
