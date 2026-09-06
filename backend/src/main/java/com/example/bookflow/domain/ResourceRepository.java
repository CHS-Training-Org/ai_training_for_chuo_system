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

  // ---- キーワード検索用（RES-01〜04）----

  /**
   * カテゴリ・可視性・キーワードで絞り込んでページネーションで返す。
   *
   * <p>{@code keyword} は {@code resources.name} または {@code resources.description}
   * への部分一致（大文字小文字を区別しない）。 {@code category} は null 許容（未指定時は全カテゴリ）。{@code isAdmin} が false の場合は
   * {@code is_active = true} のみ。 ILIKE（PostgreSQL 専用）ではなく {@code LOWER()} + {@code LIKE} を使うことで
   * H2（テスト）/PostgreSQL 両対応にしている。
   *
   * <p>呼び出し側（{@link com.example.bookflow.application.ResourceService}）で {@code keyword} の非
   * null・非空白を保証すること （本メソッドは keyword の null チェックを行わない）。
   *
   * @param category カテゴリフィルタ（null の場合は全カテゴリ）
   * @param isAdmin ADMIN ロールであれば inactive を含む
   * @param keyword 検索キーワード（非 null・非空白）
   * @param pageable ページネーション
   * @return 絞り込み後の {@link Resource} ページ
   */
  @Query(
      """
      SELECT r FROM Resource r
      WHERE (:category IS NULL OR r.category = :category)
        AND (:isAdmin = true OR r.isActive = true)
        AND (LOWER(r.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
             OR LOWER(r.description) LIKE LOWER(CONCAT('%', :keyword, '%')))
      """)
  Page<Resource> searchByFilters(
      @Param("category") ResourceCategory category,
      @Param("isAdmin") boolean isAdmin,
      @Param("keyword") String keyword,
      Pageable pageable);

  /**
   * カテゴリ・可視性・キーワードで絞り込んで全件返す（from/to フィルタ用）。
   *
   * <p>{@link #searchByFilters(ResourceCategory, boolean, String, Pageable)} の全件取得版。
   *
   * @param category カテゴリフィルタ（null の場合は全カテゴリ）
   * @param isAdmin ADMIN ロールであれば inactive を含む
   * @param keyword 検索キーワード（非 null・非空白）
   * @return 絞り込み後の {@link Resource} 一覧
   */
  @Query(
      """
      SELECT r FROM Resource r
      WHERE (:category IS NULL OR r.category = :category)
        AND (:isAdmin = true OR r.isActive = true)
        AND (LOWER(r.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
             OR LOWER(r.description) LIKE LOWER(CONCAT('%', :keyword, '%')))
      """)
  List<Resource> searchByFilters(
      @Param("category") ResourceCategory category,
      @Param("isAdmin") boolean isAdmin,
      @Param("keyword") String keyword);
}
