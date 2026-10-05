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

  // ---- 非 ADMIN 用（is_active = true のみ）----

  /** 有効リソース一覧をページネーションで返す。 */
  Page<Resource> findByIsActiveTrue(Pageable pageable);

  /** 有効リソース全件を返す（from/to フィルタ用）。 */
  List<Resource> findByIsActiveTrue();

  /** 有効リソースをカテゴリで絞り込んでページネーションで返す。 */
  Page<Resource> findByCategoryAndIsActiveTrue(ResourceCategory category, Pageable pageable);

  /** 有効リソースをカテゴリで絞り込んで全件返す（from/to フィルタ用）。 */
  List<Resource> findByCategoryAndIsActiveTrue(ResourceCategory category);

  // ---- ADMIN 用（inactive 含む）----

  /** リソースをカテゴリで絞り込んでページネーションで返す（inactive 含む）。 */
  Page<Resource> findByCategory(ResourceCategory category, Pageable pageable);

  /** リソースをカテゴリで絞り込んで全件返す（inactive 含む・from/to フィルタ用）。 */
  List<Resource> findByCategory(ResourceCategory category);

  // ---- keyword 検索用（大文字小文字非依存の部分一致、ESCAPE '!'） ----

  /**
   * keyword 検索条件（{@code name} または {@code description} への大文字小文字非依存部分一致）の共通 JPQL 断片。
   *
   * <p>{@code keyword} は呼び出し元（{@link com.example.bookflow.application.ResourceService}）で
   * trim・{@code !}/{@code %}/{@code _} のエスケープ済みであることを前提とする。ESCAPE 文字に {@code \} ではなく {@code !}
   * を使うのは、Java 文字列リテラルと JPQL の二重エスケープを避けるため。
   */
  String KEYWORD_MATCH =
      "(LOWER(r.name) LIKE LOWER(CONCAT(CONCAT('%', :keyword), '%')) ESCAPE '!' "
          + "OR (r.description IS NOT NULL "
          + "AND LOWER(r.description) LIKE LOWER(CONCAT(CONCAT('%', :keyword), '%')) ESCAPE '!'))";

  /** 有効リソースを keyword で絞り込んでページネーションで返す（非 ADMIN・category 未指定）。 */
  @Query("SELECT r FROM Resource r WHERE r.isActive = true AND " + KEYWORD_MATCH)
  Page<Resource> findByIsActiveTrueAndKeyword(@Param("keyword") String keyword, Pageable pageable);

  /** 有効リソースを keyword で絞り込んで全件返す（非 ADMIN・category 未指定・from/to フィルタ用）。 */
  @Query("SELECT r FROM Resource r WHERE r.isActive = true AND " + KEYWORD_MATCH)
  List<Resource> findByIsActiveTrueAndKeyword(@Param("keyword") String keyword);

  /** 有効リソースをカテゴリ・keyword で絞り込んでページネーションで返す（非 ADMIN）。 */
  @Query(
      "SELECT r FROM Resource r WHERE r.category = :category AND r.isActive = true AND "
          + KEYWORD_MATCH)
  Page<Resource> findByCategoryAndIsActiveTrueAndKeyword(
      @Param("category") ResourceCategory category,
      @Param("keyword") String keyword,
      Pageable pageable);

  /** 有効リソースをカテゴリ・keyword で絞り込んで全件返す（非 ADMIN・from/to フィルタ用）。 */
  @Query(
      "SELECT r FROM Resource r WHERE r.category = :category AND r.isActive = true AND "
          + KEYWORD_MATCH)
  List<Resource> findByCategoryAndIsActiveTrueAndKeyword(
      @Param("category") ResourceCategory category, @Param("keyword") String keyword);

  /** リソースを keyword で絞り込んでページネーションで返す（ADMIN・inactive 含む・category 未指定）。 */
  @Query("SELECT r FROM Resource r WHERE " + KEYWORD_MATCH)
  Page<Resource> findByKeyword(@Param("keyword") String keyword, Pageable pageable);

  /** リソースを keyword で絞り込んで全件返す（ADMIN・inactive 含む・category 未指定・from/to フィルタ用）。 */
  @Query("SELECT r FROM Resource r WHERE " + KEYWORD_MATCH)
  List<Resource> findByKeyword(@Param("keyword") String keyword);

  /** リソースをカテゴリ・keyword で絞り込んでページネーションで返す（ADMIN・inactive 含む）。 */
  @Query("SELECT r FROM Resource r WHERE r.category = :category AND " + KEYWORD_MATCH)
  Page<Resource> findByCategoryAndKeyword(
      @Param("category") ResourceCategory category,
      @Param("keyword") String keyword,
      Pageable pageable);

  /** リソースをカテゴリ・keyword で絞り込んで全件返す（ADMIN・inactive 含む・from/to フィルタ用）。 */
  @Query("SELECT r FROM Resource r WHERE r.category = :category AND " + KEYWORD_MATCH)
  List<Resource> findByCategoryAndKeyword(
      @Param("category") ResourceCategory category, @Param("keyword") String keyword);
}
