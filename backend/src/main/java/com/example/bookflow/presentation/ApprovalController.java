package com.example.bookflow.presentation;

import com.example.bookflow.application.ApprovalService;
import com.example.bookflow.domain.User;
import com.example.bookflow.infrastructure.security.CurrentUser;
import com.example.bookflow.presentation.dto.ApprovalDecisionRequest;
import com.example.bookflow.presentation.dto.ApprovalStepResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 承認ワークフローコントローラ（api-spec.md §承認 準拠）。
 *
 * <ul>
 *   <li>{@code GET /api/approvals/pending} — 承認待ち一覧（APPROVER/ADMIN のみ）
 *   <li>{@code POST /api/approvals/{stepId}/approve} — 承認（APPROVER/ADMIN のみ）
 *   <li>{@code POST /api/approvals/{stepId}/reject} — 却下（APPROVER/ADMIN のみ）
 * </ul>
 *
 * <p>全エンドポイントに {@code @PreAuthorize("hasAnyRole('APPROVER','ADMIN')")} を付与し MEMBER を排除。
 * 行レベルの所有権チェック（自分担当のステップのみ操作可）は {@link ApprovalService} が担当する。
 */
@RestController
@RequestMapping("/api/approvals")
public class ApprovalController {

  private final ApprovalService approvalService;

  public ApprovalController(ApprovalService approvalService) {
    this.approvalService = approvalService;
  }

  /**
   * 承認待ちステップ一覧を返す（ページネーションなし・全件配列）。
   *
   * <p>APPROVER は自分担当（{@code approver_id = 自分}）の PENDING ステップのみ。ADMIN は全 PENDING ステップ。
   *
   * <p>{@code api-spec.md} L94 に従いページネーションなし（bare array）で返す。
   */
  @GetMapping("/pending")
  @PreAuthorize("hasAnyRole('APPROVER','ADMIN')")
  public List<ApprovalStepResponse> listPending(@CurrentUser User currentUser) {
    return approvalService.listPending(currentUser);
  }

  /**
   * 承認操作を行う（{@code PENDING → APPROVED}）。
   *
   * <p>コメントは任意（{@code APRV-03}）。リクエストボディ自体は省略可能なため {@code required=false}。 重複再チェックを実施し、競合あり →
   * 409、決済済み → 422。
   *
   * @param stepId 承認ステップ ID（{@code approval_steps.id}）
   */
  @PostMapping("/{stepId}/approve")
  @PreAuthorize("hasAnyRole('APPROVER','ADMIN')")
  public ApprovalStepResponse approve(
      @PathVariable UUID stepId,
      @RequestBody(required = false) ApprovalDecisionRequest req,
      @CurrentUser User currentUser) {
    String comment = req != null ? req.comment() : null;
    return approvalService.approve(stepId, comment, currentUser);
  }

  /**
   * 却下操作を行う（{@code PENDING → REJECTED}）。
   *
   * <p>コメントは必須（{@code APRV-04}）。欠落または空の場合は 400 {@code COMMENT_REQUIRED}。 却下時は重複再チェックを行わない（{@code
   * requirements.md} L308）。
   *
   * @param stepId 承認ステップ ID（{@code approval_steps.id}）
   */
  @PostMapping("/{stepId}/reject")
  @PreAuthorize("hasAnyRole('APPROVER','ADMIN')")
  public ApprovalStepResponse reject(
      @PathVariable UUID stepId,
      @RequestBody(required = false) ApprovalDecisionRequest req,
      @CurrentUser User currentUser) {
    // ボディ欠落・不正 JSON 時も null として扱い、Service 層の COMMENT_REQUIRED チェックに一本化する。
    // （以前は HttpMessageNotReadableException で VALIDATION_ERROR が返っていたが、
    //   仕様は COMMENT_REQUIRED を要求する: api-spec.md §却下 L840, L867）
    String comment = req != null ? req.comment() : null;
    return approvalService.reject(stepId, comment, currentUser);
  }
}
