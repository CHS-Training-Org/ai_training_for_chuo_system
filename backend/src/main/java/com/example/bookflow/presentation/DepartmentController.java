package com.example.bookflow.presentation;

import com.example.bookflow.application.DepartmentService;
import com.example.bookflow.presentation.dto.DepartmentResponse;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 部署情報コントローラ（api-spec.md §ユーザー・部署 準拠）。
 *
 * <ul>
 *   <li>{@code GET /api/departments} — 部署一覧（全ロール・認証必須・ページネーションなし）
 * </ul>
 *
 * <p>認可：全ロール（MEMBER / APPROVER / ADMIN）がアクセス可能。 {@link
 * com.example.bookflow.infrastructure.security.SecurityConfig} の {@code
 * .anyRequest().authenticated()} により認証必須。
 */
@RestController
@RequestMapping("/api/departments")
public class DepartmentController {

  private final DepartmentService departmentService;

  public DepartmentController(DepartmentService departmentService) {
    this.departmentService = departmentService;
  }

  /**
   * 部署一覧を返す（全ロール・認証必須）。
   *
   * <p>ページネーションなし。件数が少ない想定のため全件返却（{@code api-spec.md} L94 参照）。
   *
   * @return {@link DepartmentResponse} のリスト（名前昇順）
   */
  @GetMapping
  public List<DepartmentResponse> list() {
    return departmentService.listAll();
  }
}
