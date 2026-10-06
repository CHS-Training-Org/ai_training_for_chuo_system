package com.example.bookflow.presentation;

import com.example.bookflow.application.ReservationService;
import com.example.bookflow.application.exception.ValidationException;
import com.example.bookflow.domain.ReservationStatus;
import com.example.bookflow.domain.User;
import com.example.bookflow.infrastructure.security.CurrentUser;
import com.example.bookflow.presentation.dto.CreateReservationRequest;
import com.example.bookflow.presentation.dto.ReservationResponse;
import com.example.bookflow.presentation.dto.UpdateReservationRequest;
import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * 予約管理コントローラ（api-spec.md §予約 準拠）。
 *
 * <ul>
 *   <li>{@code GET /api/reservations} — 予約一覧（本人分 or ADMIN は全件、status フィルタ対応）
 *   <li>{@code POST /api/reservations} — 予約申請（全ロール・認証必須）
 *   <li>{@code GET /api/reservations/{id}} — 予約詳細（本人 or APPROVER/ADMIN）
 *   <li>{@code PUT /api/reservations/{id}} — 予約更新（申請者本人・PENDING のみ）
 *   <li>{@code POST /api/reservations/{id}/cancel} — キャンセル（本人 or ADMIN）
 * </ul>
 *
 * <p>行レベルの所有権チェック（本人 or ADMIN）は {@link ReservationService} が担当する（{@code @PreAuthorize} 不使用）。
 */
@RestController
@RequestMapping("/api/reservations")
public class ReservationController {

  private final ReservationService reservationService;

  public ReservationController(ReservationService reservationService) {
    this.reservationService = reservationService;
  }

  /**
   * 予約一覧を返す。
   *
   * <p>ADMIN は全件、それ以外は本人分のみ。{@code status} パラメータ（複数指定可）・{@code resourceName}（部分一致）・{@code
   * from}/{@code to}（期間重複）でフィルタ可能。
   */
  @GetMapping
  public Page<ReservationResponse> list(
      @RequestParam(required = false) List<ReservationStatus> status,
      @RequestParam(required = false) String resourceName,
      @RequestParam(required = false) LocalDateTime from,
      @RequestParam(required = false) LocalDateTime to,
      @PageableDefault(size = 20) Pageable pageable,
      @CurrentUser User currentUser) {
    // from / to は同時指定必須（api-spec.md §予約一覧 参照）
    if ((from == null) != (to == null)) {
      throw new ValidationException("from と to は同時に指定してください。");
    }
    return reservationService.list(currentUser, status, resourceName, from, to, pageable);
  }

  /**
   * 予約を申請する（201 Created）。
   *
   * <p>{@code requires_approval=false} → 即 {@code APPROVED}、{@code true} → {@code PENDING}。
   */
  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public ReservationResponse create(
      @Valid @RequestBody CreateReservationRequest req, @CurrentUser User currentUser) {
    return reservationService.create(req, currentUser);
  }

  /** 予約詳細を返す。MEMBER は本人の予約のみ。 */
  @GetMapping("/{id}")
  public ReservationResponse get(@PathVariable UUID id, @CurrentUser User currentUser) {
    return reservationService.get(id, currentUser);
  }

  /** 予約内容を更新する（{@code PENDING} のみ・申請者本人）。 */
  @PutMapping("/{id}")
  public ReservationResponse update(
      @PathVariable UUID id,
      @Valid @RequestBody UpdateReservationRequest req,
      @CurrentUser User currentUser) {
    return reservationService.update(id, req, currentUser);
  }

  /** 予約をキャンセルする（{@code PENDING}/{@code APPROVED} のみ・本人 or ADMIN）。 */
  @PostMapping("/{id}/cancel")
  public ReservationResponse cancel(@PathVariable UUID id, @CurrentUser User currentUser) {
    return reservationService.cancel(id, currentUser);
  }
}
