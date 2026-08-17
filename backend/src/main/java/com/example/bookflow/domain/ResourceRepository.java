package com.example.bookflow.domain;

import jakarta.persistence.LockModeType;
import java.util.List;
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
 * <p>ADMIN は全リソース（inactive 含む）を参照できるが、それ以外のロールは有効リソース（{@code is_active = true}）のみ。 ページネーション有り / 無し
 * の両形式を提供するのは、 {@code GET /api/resources?from&to} の空きフィルタが Java 側（{@link
 * com.example.bookflow.application.ResourceService}）で行われるため、 フィルタ前に全件を取得する必要があるためである。
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

  // ---- 一覧検索（カテゴリ・可視性・キーワードの AND 絞り込み）----

  /** {@link #search(ResourceCategory, boolean, String, Pageable)} / 全件版で共有する検索条件。 */
  String SEARCH_JPQL =
      "SELECT r FROM Resource r "
          + "WHERE (:category IS NULL OR r.category = :category) "
          + "AND (:activeOnly = FALSE OR r.isActive = TRUE) "
          + "AND (:keyword IS NULL "
          + "     OR LOWER(r.name) LIKE LOWER(CONCAT('%', CAST(:keyword AS string), '%')) "
          + "     OR (r.description IS NOT NULL "
          + "         AND LOWER(r.description) LIKE LOWER(CONCAT('%', CAST(:keyword AS string), '%'))))";

  /**
   * カテゴリ・可視性・キーワードで絞り込んでページネーションで返す。
   *
   * @param category カテゴリ（null の場合は全カテゴリ）
   * @param activeOnly true の場合は有効リソースのみ（ADMIN は false を渡す）
   * @param keyword name/description への部分一致・大文字小文字非区別（null の場合はキーワード条件なし）
   */
  @Query(SEARCH_JPQL)
  Page<Resource> search(
      @Param("category") ResourceCategory category,
      @Param("activeOnly") boolean activeOnly,
      @Param("keyword") String keyword,
      Pageable pageable);

  /** {@link #search(ResourceCategory, boolean, String, Pageable)} の全件版（from/to フィルタ用）。 */
  @Query(SEARCH_JPQL)
  List<Resource> search(
      @Param("category") ResourceCategory category,
      @Param("activeOnly") boolean activeOnly,
      @Param("keyword") String keyword);
}
