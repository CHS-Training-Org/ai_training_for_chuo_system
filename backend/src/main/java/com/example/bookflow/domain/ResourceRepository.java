package com.example.bookflow.domain;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * リソースリポジトリ。
 *
 * <p>一覧取得は {@link JpaSpecificationExecutor} の {@code findAll(spec, pageable)}（ページネーション有り）と {@code
 * findAll(spec)}（全件）を使う。条件（カテゴリ・キーワード・有効リソースのみ）は {@link ResourceSpecifications}
 * で組み立てる。全件版があるのは、{@code GET /api/resources?from&to} の空きフィルタが Java 側（{@link
 * com.example.bookflow.application.ResourceService}）で行われ、フィルタ前に全件を取得する必要があるためである。
 *
 * <p>ADMIN は全リソース（inactive 含む）を参照できるが、それ以外のロールは有効リソース（{@code is_active = true}）のみ。
 */
public interface ResourceRepository
    extends JpaRepository<Resource, UUID>, JpaSpecificationExecutor<Resource> {

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
}
