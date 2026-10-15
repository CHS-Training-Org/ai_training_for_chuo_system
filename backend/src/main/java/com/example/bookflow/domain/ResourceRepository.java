package com.example.bookflow.domain;

import jakarta.persistence.LockModeType;
import java.util.Collection;
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

  // ---- キーワード検索（name / description の部分一致・大文字小文字無視）----
  //
  // keyword が空・未指定の場合は上記の派生クエリを使う（ResourceService で分岐）。
  // PostgreSQL は null パラメータの型推論に失敗することがあるため、これらのクエリには null を渡さない。
  // カテゴリ未指定は全カテゴリの IN で、有効無効は boolean で表す。
  // keyword 中の % と _ は LIKE のワイルドカードとして働く（エスケープしない仕様）。

  /**
   * キーワードに一致するリソースをページネーションで返す。
   *
   * @param categories 対象カテゴリ（カテゴリ未指定時は全カテゴリを渡す）
   * @param includeInactive true の場合は inactive も含める（ADMIN）
   * @param keyword 検索語（空でない文字列）
   * @param pageable ページネーション
   * @return 一致したリソースのページ
   */
  @Query(
      """
      SELECT r FROM Resource r
      WHERE r.category IN :categories
        AND (:includeInactive = true OR r.isActive = true)
        AND (LOWER(r.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
          OR LOWER(r.description) LIKE LOWER(CONCAT('%', :keyword, '%')))
      """)
  Page<Resource> searchByKeyword(
      @Param("categories") Collection<ResourceCategory> categories,
      @Param("includeInactive") boolean includeInactive,
      @Param("keyword") String keyword,
      Pageable pageable);

  /**
   * キーワードに一致するリソースを全件返す（from/to フィルタ用）。
   *
   * @param categories 対象カテゴリ（カテゴリ未指定時は全カテゴリを渡す）
   * @param includeInactive true の場合は inactive も含める（ADMIN）
   * @param keyword 検索語（空でない文字列）
   * @return 一致したリソースのリスト
   */
  @Query(
      """
      SELECT r FROM Resource r
      WHERE r.category IN :categories
        AND (:includeInactive = true OR r.isActive = true)
        AND (LOWER(r.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
          OR LOWER(r.description) LIKE LOWER(CONCAT('%', :keyword, '%')))
      """)
  List<Resource> searchByKeyword(
      @Param("categories") Collection<ResourceCategory> categories,
      @Param("includeInactive") boolean includeInactive,
      @Param("keyword") String keyword);
}
