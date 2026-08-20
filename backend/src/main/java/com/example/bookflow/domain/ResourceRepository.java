package com.example.bookflow.domain;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * リソースリポジトリ。
 *
 * <p>ADMIN は全リソース（inactive 含む）を参照できるが、それ以外のロールは有効リソース（{@code is_active = true}）のみ。
 * 一覧取得はすべて全件取得のみを提供する。{@link com.example.bookflow.application.ResourceService} がソート（{@code
 * Comparator}）・{@code from}/{@code to} の空きフィルタ・ページネーションをアプリケーション側で行うため、ページング付きクエリメソッドは持たない。
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

  // ---- 一覧検索（カテゴリ・可視性・キーワードの AND 絞り込み、全件） ----

  /**
   * カテゴリ・可視性・キーワードで絞り込んで全件返す。
   *
   * <p>ソート・ページネーションは {@link com.example.bookflow.application.ResourceService} が Java 側で行うため、
   * 全件取得のみを提供する。
   *
   * @param category カテゴリ（null の場合は全カテゴリ）
   * @param activeOnly true の場合は有効リソースのみ（ADMIN は false を渡す）
   * @param keyword name/description への部分一致・大文字小文字非区別（null の場合はキーワード条件なし）
   */
  @Query(
      "SELECT r FROM Resource r "
          + "WHERE (:category IS NULL OR r.category = :category) "
          + "AND (:activeOnly = FALSE OR r.isActive = TRUE) "
          + "AND (:keyword IS NULL "
          + "     OR LOWER(r.name) LIKE LOWER(CONCAT('%', CAST(:keyword AS string), '%')) "
          + "     OR (r.description IS NOT NULL "
          + "         AND LOWER(r.description) LIKE LOWER(CONCAT('%', CAST(:keyword AS string), '%'))))")
  List<Resource> search(
      @Param("category") ResourceCategory category,
      @Param("activeOnly") boolean activeOnly,
      @Param("keyword") String keyword);
}
