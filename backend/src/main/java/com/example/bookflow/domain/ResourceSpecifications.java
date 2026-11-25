package com.example.bookflow.domain;

import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

/**
 * リソース一覧用の検索条件（Specification）を組み立てるユーティリティ。
 *
 * <p>キーワード検索（名称・説明の部分一致）を、カテゴリ・有効フラグの条件と AND で組み合わせるために使う。
 */
public final class ResourceSpecifications {

  /** LIKE のエスケープ文字。 */
  private static final char ESCAPE = '\\';

  private ResourceSpecifications() {}

  /**
   * 一覧取得用の検索条件を返す。
   *
   * @param category カテゴリ（null の場合は絞り込まない）
   * @param isAdmin ADMIN であれば inactive も含める。それ以外は有効リソースのみ
   * @param keyword キーワード（null の場合は絞り込まない。空白の除去は呼び出し側で行う）
   * @return 検索条件
   */
  public static Specification<Resource> forList(
      ResourceCategory category, boolean isAdmin, String keyword) {
    return (root, query, cb) -> {
      List<Predicate> predicates = new ArrayList<>();
      if (!isAdmin) {
        predicates.add(cb.isTrue(root.get("isActive")));
      }
      if (category != null) {
        predicates.add(cb.equal(root.get("category"), category));
      }
      if (keyword != null) {
        String pattern = "%" + escapeLike(keyword.toLowerCase(Locale.ROOT)) + "%";
        predicates.add(
            cb.or(
                cb.like(cb.lower(root.get("name")), pattern, ESCAPE),
                cb.like(cb.lower(root.get("description")), pattern, ESCAPE)));
      }
      return cb.and(predicates.toArray(new Predicate[0]));
    };
  }

  /** LIKE のワイルドカード（{@code \}・{@code %}・{@code _}）を通常の文字として扱うためにエスケープする。 */
  private static String escapeLike(String value) {
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
  }
}
