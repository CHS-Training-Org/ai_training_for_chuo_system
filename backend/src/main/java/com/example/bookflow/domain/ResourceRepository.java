package com.example.bookflow.domain;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * リソースリポジトリ。
 *
 * <p>ADMIN は全リソース（inactive 含む）を参照できるが、それ以外のロールは有効リソース（{@code is_active = true}）のみ。 {@link #search}
 * は {@code Pageable.unpaged()} を渡すことで全件取得にも流用できる。 {@code GET /api/resources?from&to} の空きフィルタは Java
 * 側（{@link com.example.bookflow.application.ResourceService}）で行われるため、 その場合は {@code
 * Pageable.unpaged()} でフィルタ前の全件を取得する。
 */
public interface ResourceRepository extends JpaRepository<Resource, UUID> {

  // ---- 悲観ロック（重複予約の直列化） ----

  /**
   * 指定 ID のリソースを悲観書き込みロック付きで取得する。
   *
   * <p>重複予約チェック（read-then-write）のレースコンディションを防ぐため、 {@code create} / {@code update} / {@code approve}
   * の各操作で {@code checkConflict} を呼ぶ前に取得する。 同一リソースへの並行操作がトランザクション終了まで直列化される。
   *
   * @param id リソース ID
   * @return ロック取得済みのリソース（存在しない場合は空）
   */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT r FROM Resource r WHERE r.id = :id")
  Optional<Resource> findByIdForUpdate(@Param("id") UUID id);

  // ---- 一覧検索 ----

  /**
   * カテゴリ・可視性・キーワードで絞り込んだリソース一覧を返す。
   *
   * <p>{@code category}・{@code keyword} は {@code null} 許容で、{@code null} の場合はその条件を適用しない。 {@code
   * keyword} はリソース名・説明文のいずれかへの部分一致（大文字小文字非区別）で判定する（OR）。 category・activeOnly・keyword の各条件は AND
   * で組み合わさる（resource-list-filter エンハンス課題 RES-04）。
   *
   * @param category カテゴリ絞り込み（{@code null} で全カテゴリ）
   * @param activeOnly {@code true} の場合 {@code is_active = true} のみ（ADMIN 以外）。{@code false} の場合は
   *     inactive も含む（ADMIN）
   * @param keyword 検索キーワード（{@code null} でキーワード条件なし）
   * @param pageable ページネーション（{@code Pageable.unpaged()} で全件取得）
   * @return 条件に合致するリソースのページ
   */
  @Query(
      "SELECT r FROM Resource r "
          + "WHERE (:activeOnly = false OR r.isActive = true) "
          + "AND (:category IS NULL OR r.category = :category) "
          + "AND (:keyword IS NULL "
          + "     OR LOWER(r.name) LIKE LOWER(CONCAT('%', :keyword, '%')) "
          + "     OR LOWER(r.description) LIKE LOWER(CONCAT('%', :keyword, '%')))")
  Page<Resource> search(
      @Param("category") ResourceCategory category,
      @Param("activeOnly") boolean activeOnly,
      @Param("keyword") String keyword,
      Pageable pageable);
}
