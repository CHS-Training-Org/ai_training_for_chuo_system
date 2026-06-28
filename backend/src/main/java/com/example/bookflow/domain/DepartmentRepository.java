package com.example.bookflow.domain;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

/**
 * 部署 Repository インターフェース。
 *
 * <p>{@code open-in-view: false} のため、{@link Department#getParent()} への遅延ロードを避ける目的で {@code left join
 * fetch d.parent} を使用する。
 */
public interface DepartmentRepository extends JpaRepository<Department, UUID> {

  /**
   * 全部署を名前順で取得する（{@code parent} を JOIN FETCH）。
   *
   * <p>{@link com.example.bookflow.presentation.dto.DepartmentResponse#from(Department)} が {@code
   * getParent().getId()} にアクセスするため、{@code left join fetch} でトランザクション内に解決する。
   *
   * @return 全部署（名前昇順）
   */
  @Query("select d from Department d left join fetch d.parent order by d.name asc")
  List<Department> findAllOrderByName();
}
