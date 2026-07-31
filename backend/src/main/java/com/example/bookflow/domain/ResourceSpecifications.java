package com.example.bookflow.domain;

import org.springframework.data.jpa.domain.Specification;

/**
 * {@link Resource} 検索条件の {@link Specification} 部品集。
 *
 * <p>{@code category} / {@code isActive} / {@code keyword} を独立した部品として定義し、 {@link ResourceService}
 * 側で {@code null} 条件を除外しながら AND 合成する（category×isActive の組み合わせごとに派生クエリメソッドを 個別定義する既存方式は、keyword
 * 追加による組み合わせ爆発を避けるため本クラスへ集約した）。
 */
public final class ResourceSpecifications {

  private ResourceSpecifications() {}

  /** カテゴリで絞り込む（{@code category} が null の場合は条件なし）。 */
  public static Specification<Resource> hasCategory(ResourceCategory category) {
    if (category == null) {
      return null;
    }
    return (root, query, cb) -> cb.equal(root.get("category"), category);
  }

  /** 有効リソースのみに絞り込む（ADMIN は呼び出し側で条件を付与しない）。 */
  public static Specification<Resource> isActive() {
    return (root, query, cb) -> cb.isTrue(root.get("isActive"));
  }

  /**
   * {@code name} または {@code description} への大文字小文字を区別しない部分一致で絞り込む。
   *
   * <p>{@code ILIKE} は PostgreSQL 固有のためテスト環境（H2）との差異を避け、{@code LOWER()} + {@code LIKE} で実装する。
   *
   * @param keyword キーワード（null・空文字・空白のみの場合は条件なし）
   */
  public static Specification<Resource> keywordMatches(String keyword) {
    if (keyword == null || keyword.isBlank()) {
      return null;
    }
    String pattern = "%" + keyword.trim().toLowerCase() + "%";
    return (root, query, cb) ->
        cb.or(
            cb.like(cb.lower(root.get("name")), pattern),
            cb.like(cb.lower(root.get("description")), pattern));
  }
}
