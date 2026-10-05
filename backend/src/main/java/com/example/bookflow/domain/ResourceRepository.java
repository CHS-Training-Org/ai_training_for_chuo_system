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

  // ---- 一覧検索（カテゴリ・有効フラグ・キーワードの組み合わせ検索） ----

  /**
   * カテゴリ・有効フラグ・キーワードで絞り込んだリソース一覧をページネーションで返す。
   *
   * <p>各条件は null（{@code category}/{@code keyword}）または {@code false}（{@code activeOnly}）のとき無視される（AND
   * 条件での組み合わせ）。{@code keyword} は {@code name} / {@code description} への大文字小文字を区別しない部分一致検索（呼び出し側で
   * {@code %}/{@code _} をエスケープ済みであること）。
   *
   * @param category カテゴリフィルタ（null の場合は全カテゴリ）
   * @param activeOnly true の場合は {@code is_active = true} のみ
   * @param keyword 検索キーワード（null の場合はキーワード条件なし。エスケープ済みであること）
   * @param pageable ページネーション
   * @return 絞り込み後の {@link Resource} ページ
   */
  // CAST(:keyword AS string) が必須：PostgreSQL は :keyword が null のとき型推論に失敗し
  // "function lower(bytea) does not exist" を送出する（H2 では再現しない）。
  @Query(
      """
      SELECT r FROM Resource r
      WHERE (:category IS NULL OR r.category = :category)
        AND (:activeOnly = false OR r.isActive = true)
        AND (:keyword IS NULL
             OR LOWER(r.name) LIKE LOWER(CONCAT('%', CAST(:keyword AS string), '%')) ESCAPE '\\'
             OR LOWER(r.description) LIKE LOWER(CONCAT('%', CAST(:keyword AS string), '%')) ESCAPE '\\')
      """)
  Page<Resource> search(
      @Param("category") ResourceCategory category,
      @Param("activeOnly") boolean activeOnly,
      @Param("keyword") String keyword,
      Pageable pageable);

  /**
   * カテゴリ・有効フラグ・キーワードで絞り込んだリソース全件を返す（from/to の空きフィルタ用の候補取得）。
   *
   * @param category カテゴリフィルタ（null の場合は全カテゴリ）
   * @param activeOnly true の場合は {@code is_active = true} のみ
   * @param keyword 検索キーワード（null の場合はキーワード条件なし。エスケープ済みであること）
   * @return 絞り込み後の {@link Resource} 一覧
   */
  @Query(
      """
      SELECT r FROM Resource r
      WHERE (:category IS NULL OR r.category = :category)
        AND (:activeOnly = false OR r.isActive = true)
        AND (:keyword IS NULL
             OR LOWER(r.name) LIKE LOWER(CONCAT('%', CAST(:keyword AS string), '%')) ESCAPE '\\'
             OR LOWER(r.description) LIKE LOWER(CONCAT('%', CAST(:keyword AS string), '%')) ESCAPE '\\')
      """)
  List<Resource> search(
      @Param("category") ResourceCategory category,
      @Param("activeOnly") boolean activeOnly,
      @Param("keyword") String keyword);
}
