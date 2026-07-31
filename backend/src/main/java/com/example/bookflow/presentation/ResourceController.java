package com.example.bookflow.presentation;

import com.example.bookflow.application.ResourceService;
import com.example.bookflow.application.exception.ValidationException;
import com.example.bookflow.domain.ResourceCategory;
import com.example.bookflow.domain.Role;
import com.example.bookflow.domain.User;
import com.example.bookflow.infrastructure.security.CurrentUser;
import com.example.bookflow.presentation.dto.CreateResourceRequest;
import com.example.bookflow.presentation.dto.OccupiedSlot;
import com.example.bookflow.presentation.dto.ResourceResponse;
import com.example.bookflow.presentation.dto.StatusUpdateRequest;
import com.example.bookflow.presentation.dto.UpdateResourceRequest;
import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * リソース（施設・備品）管理コントローラ（api-spec.md §リソース 準拠）。
 *
 * <ul>
 *   <li>{@code GET /api/resources} — リソース一覧（全ロール・認証必須、ADMIN は inactive 含む）
 *   <li>{@code POST /api/resources} — リソース登録（ADMIN のみ）
 *   <li>{@code GET /api/resources/{id}} — リソース詳細（全ロール・認証必須）
 *   <li>{@code PUT /api/resources/{id}} — リソース更新（ADMIN のみ）
 *   <li>{@code PATCH /api/resources/{id}/status} — 有効/無効切替（ADMIN のみ）
 *   <li>{@code GET /api/resources/{id}/availability} — 空き状況照会（全ロール・認証必須）
 * </ul>
 *
 * <p>認可ルール：GET・availability は全ロール（認証必須）。POST・PUT・PATCH は {@code @PreAuthorize("hasRole('ADMIN')")}。
 * フロントエンドでもロール制御を行うが、バックエンドで二重チェックする（screen-spec.md §共通 参照）。
 */
@RestController
@RequestMapping("/api/resources")
public class ResourceController {

  private final ResourceService resourceService;

  public ResourceController(ResourceService resourceService) {
    this.resourceService = resourceService;
  }

  /**
   * リソース一覧を返す（全ロール・認証必須）。
   *
   * <p>ADMIN は {@code is_active = false} のリソースも含む。 {@code from} / {@code to} を同時指定した場合は、当該時間帯に
   * {@code PENDING} / {@code APPROVED} の予約が存在しないリソースのみを返す。
   *
   * @param category カテゴリフィルタ（任意）
   * @param keyword リソース名・説明文への部分一致検索（任意・大文字小文字を区別しない）
   * @param from 空き確認の開始日時（任意・to と同時指定）
   * @param to 空き確認の終了日時（任意・from と同時指定）
   * @param pageable ページネーション（デフォルト: size=20）
   * @param currentUser 認証済みユーザー（ロール判定に使用）
   * @return {@link ResourceResponse} のページ
   */
  @GetMapping
  public Page<ResourceResponse> list(
      @RequestParam(required = false) ResourceCategory category,
      @RequestParam(required = false) String keyword,
      @RequestParam(required = false) LocalDateTime from,
      @RequestParam(required = false) LocalDateTime to,
      @PageableDefault(size = 20) Pageable pageable,
      @CurrentUser User currentUser) {
    // from / to は同時指定必須（api-spec.md §リソース一覧 参照）
    if ((from == null) != (to == null)) {
      throw new ValidationException("from と to は同時に指定してください。");
    }
    boolean isAdmin = currentUser.getRole() == Role.ADMIN;
    return resourceService.list(category, from, to, keyword, isAdmin, pageable);
  }

  /**
   * リソースを新規登録する（ADMIN のみ）。
   *
   * @param req 登録リクエスト
   * @return 作成後の {@link ResourceResponse}（201 Created）
   */
  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasRole('ADMIN')")
  public ResourceResponse create(@Valid @RequestBody CreateResourceRequest req) {
    return resourceService.create(req);
  }

  /**
   * リソース詳細を返す（全ロール・認証必須）。
   *
   * @param id リソース ID
   * @return {@link ResourceResponse}（404 の場合は {@code 404 Not Found}）
   */
  @GetMapping("/{id}")
  public ResourceResponse get(@PathVariable UUID id) {
    return resourceService.get(id);
  }

  /**
   * リソースを更新する（ADMIN のみ）。
   *
   * @param id リソース ID
   * @param req 更新リクエスト
   * @return 更新後の {@link ResourceResponse}
   */
  @PutMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public ResourceResponse update(
      @PathVariable UUID id, @Valid @RequestBody UpdateResourceRequest req) {
    return resourceService.update(id, req);
  }

  /**
   * リソースの有効/無効を切り替える（ADMIN のみ）。
   *
   * @param id リソース ID
   * @param req ステータス更新リクエスト（{@code isActive} のみ）
   * @return 更新後の {@link ResourceResponse}
   */
  @PatchMapping("/{id}/status")
  @PreAuthorize("hasRole('ADMIN')")
  public ResourceResponse changeStatus(
      @PathVariable UUID id, @Valid @RequestBody StatusUpdateRequest req) {
    return resourceService.changeStatus(id, req.isActive());
  }

  /**
   * 指定リソース・指定期間の占有済み時間スロットを返す（全ロール・認証必須）。
   *
   * <p>{@code from} / {@code to} は両方必須。空きスロットの計算はフロントエンド側の責務。
   *
   * @param id リソース ID
   * @param from 照会開始日時（必須）
   * @param to 照会終了日時（必須）
   * @return 占有スロットリスト（{@link OccupiedSlot}[]）
   */
  @GetMapping("/{id}/availability")
  public List<OccupiedSlot> availability(
      @PathVariable UUID id, @RequestParam LocalDateTime from, @RequestParam LocalDateTime to) {
    return resourceService.availability(id, from, to);
  }
}
