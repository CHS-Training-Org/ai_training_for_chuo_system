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

  // ---- keyword 検索用（name/description への部分一致・大文字小文字区別なし）----
  //
  // category・activeOnly は任意条件として JPQL 内で null / false 判定しスキップする。
  // keyword は呼び出し側（ResourceService）で小文字化・前後に "%" を付与した
  // パターン文字列に正規化済みであること（null 不可。null の場合はこのメソッド自体を呼ばない）。

  /**
   * category・keyword・activeOnly で絞り込んだリソースをページネーションで返す。
   *
   * @param category カテゴリ（null の場合は全カテゴリ）
   * @param keyword LOWER(name) / LOWER(description) に対する LIKE パターン（例: "%会議%"）
   * @param activeOnly true の場合 is_active = true のみ
   * @param pageable ページネーション
   */
  @Query(
      value =
          "SELECT r FROM Resource r WHERE "
              + "(:category IS NULL OR r.category = :category) AND "
              + "(:activeOnly = false OR r.isActive = true) AND "
              + "(LOWER(r.name) LIKE :keyword OR LOWER(r.description) LIKE :keyword)",
      countQuery =
          "SELECT count(r) FROM Resource r WHERE "
              + "(:category IS NULL OR r.category = :category) AND "
              + "(:activeOnly = false OR r.isActive = true) AND "
              + "(LOWER(r.name) LIKE :keyword OR LOWER(r.description) LIKE :keyword)")
  Page<Resource> searchByKeyword(
      @Param("category") ResourceCategory category,
      @Param("keyword") String keyword,
      @Param("activeOnly") boolean activeOnly,
      Pageable pageable);

  /** 上記と同一条件の全件版（from/to の空きフィルタ用、占有判定前に全候補が必要）。 */
  @Query(
      "SELECT r FROM Resource r WHERE "
          + "(:category IS NULL OR r.category = :category) AND "
          + "(:activeOnly = false OR r.isActive = true) AND "
          + "(LOWER(r.name) LIKE :keyword OR LOWER(r.description) LIKE :keyword)")
  List<Resource> searchByKeyword(
      @Param("category") ResourceCategory category,
      @Param("keyword") String keyword,
      @Param("activeOnly") boolean activeOnly);
}
