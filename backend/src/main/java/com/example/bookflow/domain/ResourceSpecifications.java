package com.example.bookflow.domain;

import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

/**
 * {@link Resource} の動的検索条件（{@link Specification}）を提供するファクトリ。
 *
 * <p>{@code GET /api/resources} の {@code keyword} 指定時に、カテゴリ・有効フラグの条件と AND で合成して使う。
 */
public final class ResourceSpecifications {

  /** LIKE のエスケープ文字。 */
  private static final char ESCAPE_CHAR = '\\';

  private ResourceSpecifications() {}

  /**
   * カテゴリが一致するリソース。
   *
   * @param category カテゴリ
   */
  public static Specification<Resource> hasCategory(ResourceCategory category) {
    return (root, query, cb) -> cb.equal(root.get("category"), category);
  }

  /** 有効（{@code is_active = true}）なリソース。 */
  public static Specification<Resource> isActive() {
    return (root, query, cb) -> cb.isTrue(root.get("isActive"));
  }

  /**
   * {@code name} または {@code description} に keyword を含むリソース（大文字・小文字を区別しない）。
   *
   * <p>keyword 中の {@code %} {@code _} {@code \} はエスケープし、文字そのものとして部分一致させる。 keyword が null
   * または空白のみの場合は条件を付けない（全件一致）。
   *
   * @param keyword 検索キーワード
   */
  public static Specification<Resource> nameOrDescriptionContains(String keyword) {
    if (keyword == null || keyword.isBlank()) {
      return (root, query, cb) -> cb.conjunction();
    }
    String pattern = "%" + escapeLike(keyword.trim().toLowerCase(Locale.ROOT)) + "%";
    return (root, query, cb) ->
        cb.or(
            cb.like(cb.lower(root.<String>get("name")), pattern, ESCAPE_CHAR),
            cb.like(cb.lower(root.<String>get("description")), pattern, ESCAPE_CHAR));
  }

  /** LIKE 用に {@code \} {@code %} {@code _} をエスケープする（{@code \} を最初に処理する）。 */
  private static String escapeLike(String value) {
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
  }
}
