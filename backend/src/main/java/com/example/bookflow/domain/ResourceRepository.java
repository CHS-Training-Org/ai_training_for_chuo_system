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

  // ---- 一覧検索（カテゴリ・有効フラグ・キーワードで絞り込み）----

  /**
   * カテゴリ・有効フラグ・キーワード（name/description 部分一致・大文字小文字非区別）で リソースを絞り込みページネーションで返す。
   *
   * @param category カテゴリ（null の場合は絞り込まない）
   * @param isActiveOnly true の場合 {@code is_active = true} のみ（ADMIN 以外）
   * @param pattern LOWER 済み LIKE パターン（例: {@code "%projector%"}。未指定時は {@code "%%"}）
   * @param pageable ページネーション
   */
  @Query(
      "SELECT r FROM Resource r "
          + "WHERE (:isActiveOnly = false OR r.isActive = true) "
          + "AND (:category IS NULL OR r.category = :category) "
          + "AND (LOWER(r.name) LIKE :pattern OR LOWER(COALESCE(r.description, '')) LIKE :pattern)")
  Page<Resource> search(
      @Param("category") ResourceCategory category,
      @Param("isActiveOnly") boolean isActiveOnly,
      @Param("pattern") String pattern,
      Pageable pageable);

  /** {@link #search(ResourceCategory, boolean, String, Pageable)} の全件版（from/to フィルタ用）。 */
  @Query(
      "SELECT r FROM Resource r "
          + "WHERE (:isActiveOnly = false OR r.isActive = true) "
          + "AND (:category IS NULL OR r.category = :category) "
          + "AND (LOWER(r.name) LIKE :pattern OR LOWER(COALESCE(r.description, '')) LIKE :pattern)")
  List<Resource> search(
      @Param("category") ResourceCategory category,
      @Param("isActiveOnly") boolean isActiveOnly,
      @Param("pattern") String pattern);
}
