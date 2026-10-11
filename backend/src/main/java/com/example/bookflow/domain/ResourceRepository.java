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
 * <p>一覧取得の条件（ロール別の可視性・カテゴリ・キーワード）は {@link ResourceSpecifications} の {@link
 * org.springframework.data.jpa.domain.Specification} を組み合わせて {@code findAll(Specification)} /
 * {@code findAll(Specification, Pageable)} に渡す。ADMIN は全リソース（inactive
 * 含む）を参照できるが、それ以外のロールは有効リソース（{@code is_active = true}）のみで、この条件は呼び出し側（{@link
 * com.example.bookflow.application.ResourceService}）が組み立てる。 ページネーション有り / 無しの両形式があるのは、{@code GET
 * /api/resources?from&to} の空きフィルタが Java 側で行われ、フィルタ前に全件を取得する必要があるためである。
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
