package com.example.bookflow.domain;

import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

/**
 * リソース一覧の動的な検索条件を {@link Specification} として組み立てるファクトリ。
 *
 * <p>category・isActive・keyword の各条件を個別に生成し、{@link #forList} で AND 合成する。条件が増えても {@link
 * ResourceRepository} のメソッドは増えない。
 */
public final class ResourceSpecifications {

  private static final char ESCAPE = '\\';

  private ResourceSpecifications() {}

  /** 有効なリソース（{@code is_active = true}）のみ。 */
  public static Specification<Resource> isActive() {
    return (root, query, cb) -> cb.isTrue(root.get("isActive"));
  }

  /**
   * カテゴリ一致。
   *
   * @param category カテゴリ（null の場合は条件なし）
   */
  public static Specification<Resource> hasCategory(ResourceCategory category) {
    return (root, query, cb) ->
        category == null ? cb.conjunction() : cb.equal(root.get("category"), category);
  }

  /**
   * 名称または説明文への部分一致（大文字・小文字を区別しない）。
   *
   * <p>{@code %} {@code _} {@code \} は通常の文字として検索する。
   *
   * @param keyword 検索語（null または空の場合は条件なし）
   */
  public static Specification<Resource> keywordContains(String keyword) {
    return (root, query, cb) -> {
      if (keyword == null || keyword.isEmpty()) {
        return cb.conjunction();
      }
      String pattern = "%" + escapeLike(keyword.toLowerCase(Locale.ROOT)) + "%";
      return cb.or(
          cb.like(cb.lower(root.get("name")), pattern, ESCAPE),
          cb.like(cb.lower(root.get("description")), pattern, ESCAPE));
    };
  }

  /**
   * 一覧用の条件を AND で合成する。
   *
   * @param category カテゴリ（null 可）
   * @param keyword 検索語（null 可）
   * @param isAdmin ADMIN であれば inactive を含む。それ以外は有効なリソースのみ
   */
  public static Specification<Resource> forList(
      ResourceCategory category, String keyword, boolean isAdmin) {
    Specification<Resource> spec = hasCategory(category).and(keywordContains(keyword));
    return isAdmin ? spec : spec.and(isActive());
  }

  /** LIKE のメタ文字をエスケープする。 */
  static String escapeLike(String keyword) {
    return keyword.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
  }
}
