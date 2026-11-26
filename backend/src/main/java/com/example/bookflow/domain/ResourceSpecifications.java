package com.example.bookflow.domain;

import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

/**
 * {@link Resource} の一覧取得条件を組み立てる Specification。
 *
 * <p>条件ごとに派生クエリを用意すると、カテゴリ・キーワード・ロールの組み合わせでメソッドが増え続けるため、 値が指定された条件だけを AND で合成する。 値が無い条件は predicate
 * を作らないので、未指定時の動作は絞り込みなしと同じになる。
 */
public final class ResourceSpecifications {

  /** LIKE パターン内で {@code %} と {@code _} を文字そのものとして扱うためのエスケープ文字。 */
  private static final char LIKE_ESCAPE = '\\';

  private ResourceSpecifications() {}

  /**
   * 一覧取得の条件を組み立てる。
   *
   * @param category カテゴリ（null の場合は全カテゴリ）
   * @param keyword キーワード（null・空・空白のみの場合は条件なし）。リソース名と説明への部分一致で、大文字・小文字を区別しない
   * @param activeOnly true の場合は {@code is_active = true} のリソースのみ（ADMIN 以外）
   * @return 合成した条件
   */
  public static Specification<Resource> search(
      ResourceCategory category, String keyword, boolean activeOnly) {
    Specification<Resource> spec = Specification.unrestricted();
    if (activeOnly) {
      spec = spec.and((root, query, cb) -> cb.isTrue(root.get("isActive")));
    }
    if (category != null) {
      spec = spec.and((root, query, cb) -> cb.equal(root.get("category"), category));
    }
    String normalized = normalizeKeyword(keyword);
    if (normalized != null) {
      String pattern = "%" + escapeLike(normalized.toLowerCase(Locale.ROOT)) + "%";
      // description は NULL 可。LOWER(NULL) LIKE は偽になるので、name 側だけで判定される。
      spec =
          spec.and(
              (root, query, cb) ->
                  cb.or(
                      cb.like(cb.lower(root.<String>get("name")), pattern, LIKE_ESCAPE),
                      cb.like(cb.lower(root.<String>get("description")), pattern, LIKE_ESCAPE)));
    }
    return spec;
  }

  /** 前後の空白（全角空白を含む）を除き、空になった場合は null（条件なし）にする。 */
  private static String normalizeKeyword(String keyword) {
    if (keyword == null) {
      return null;
    }
    String stripped = keyword.strip();
    return stripped.isEmpty() ? null : stripped;
  }

  /** LIKE のワイルドカード（{@code %} {@code _}）とエスケープ文字自身を、文字そのものとして扱えるようにする。 */
  private static String escapeLike(String value) {
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
  }
}
