package com.example.bookflow.application;

import com.example.bookflow.domain.DepartmentRepository;
import com.example.bookflow.presentation.dto.DepartmentResponse;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 部署のユースケース Service（カテゴリ 7）。
 *
 * <p>部署は読み取り専用（登録・更新は管理者操作でシードまたは DB 直接投入）。 {@code @Transactional(readOnly = true)} でスループットを最適化する。
 */
@Service
@Transactional(readOnly = true)
public class DepartmentService {

  private final DepartmentRepository departmentRepository;

  public DepartmentService(DepartmentRepository departmentRepository) {
    this.departmentRepository = departmentRepository;
  }

  /**
   * 全部署一覧を返す（ページネーションなし・全件）。
   *
   * <p>{@code api-spec.md} L94 に従いページネーションなし（件数が少ない想定）。 レスポンスは素の配列（Spring Data Page ラップなし）。
   *
   * @return 全部署の DepartmentResponse リスト（名前昇順）
   */
  public List<DepartmentResponse> listAll() {
    return departmentRepository.findAllOrderByName().stream()
        .map(DepartmentResponse::from)
        .toList();
  }
}
