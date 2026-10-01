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

  // ---- 一覧検索（カテゴリ・有効フラグ・キーワードの AND 条件） ----

  /**
   * カテゴリ・有効フラグ・キーワードで絞り込んだリソース一覧をページネーションで返す。
   *
   * <p>{@code category} は null の場合フィルタしない。{@code isActiveOnly} が {@code true} の場合は {@code is_active
   * = true} のリソースのみ返す（ADMIN は {@code false} を渡して inactive も含める）。{@code pattern} は {@link
   * com.example.bookflow.application.ResourceService} が組み立てる小文字化済み LIKE パターン（キーワード未指定時は {@code
   * "%%"}）。H2 が PostgreSQL 固有の {@code ILIKE} に対応しないため {@code LOWER(...) LIKE} で大文字小文字を区別しない。
   *
   * @param category カテゴリフィルタ（null の場合は全カテゴリ）
   * @param isActiveOnly true の場合 is_active=true のみ
   * @param pattern LIKE パターン（小文字化済み、例: {@code "%keyword%"}）
   * @param pageable ページネーション
   * @return 条件に合致するリソースのページ
   */
  @Query(
      "SELECT r FROM Resource r "
          + "WHERE (:category IS NULL OR r.category = :category) "
          + "AND (:isActiveOnly = false OR r.isActive = true) "
          + "AND (LOWER(r.name) LIKE :pattern OR LOWER(COALESCE(r.description, '')) LIKE :pattern)")
  Page<Resource> search(
      @Param("category") ResourceCategory category,
      @Param("isActiveOnly") boolean isActiveOnly,
      @Param("pattern") String pattern,
      Pageable pageable);

  /**
   * {@link #search(ResourceCategory, boolean, String, Pageable)} の全件版。
   *
   * <p>{@code from}/{@code to} 指定時の空きフィルタ（Java 側での予約重複判定・手動ページネーション）の候補取得に使う。
   */
  @Query(
      "SELECT r FROM Resource r "
          + "WHERE (:category IS NULL OR r.category = :category) "
          + "AND (:isActiveOnly = false OR r.isActive = true) "
          + "AND (LOWER(r.name) LIKE :pattern OR LOWER(COALESCE(r.description, '')) LIKE :pattern)")
  List<Resource> search(
      @Param("category") ResourceCategory category,
      @Param("isActiveOnly") boolean isActiveOnly,
      @Param("pattern") String pattern);
}
