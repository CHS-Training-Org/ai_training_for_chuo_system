package com.example.bookflow.domain;

import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

/**
 * {@code keyword} 指定時の {@link Resource} 検索条件を組み立てる Specification。
 *
 * <p>{@link ResourceService} は {@code keyword} が指定された場合のみこのクラスを使う。 {@code keyword} 未指定時は既存の派生クエリ（{@link
 * ResourceRepository}）をそのまま使うため、このクラスは経由しない。
 */
public final class ResourceSpecifications {

  private ResourceSpecifications() {}

  /**
   * カテゴリ・有効フラグ・キーワードを AND 結合した検索条件を組み立てる。
   *
   * @param category カテゴリフィルタ（{@code null} の場合は条件を付けない）
   * @param isActive 有効フラグフィルタ（{@code null} の場合は条件を付けない。ADMIN は {@code null} を渡す）
   * @param keyword {@code name} または {@code description} への部分一致キーワード（大文字小文字を区別しない、{@code null} 不可）
   * @return 組み立てた {@link Specification}
   */
  public static Specification<Resource> search(
      ResourceCategory category, Boolean isActive, String keyword) {
    return (root, query, cb) -> {
      List<Predicate> predicates = new ArrayList<>();
      if (category != null) {
        predicates.add(cb.equal(root.get("category"), category));
      }
      if (isActive != null) {
        predicates.add(cb.equal(root.get("isActive"), isActive));
      }
      String likePattern = "%" + keyword.toLowerCase(Locale.ROOT) + "%";
      predicates.add(
          cb.or(
              cb.like(cb.lower(root.get("name")), likePattern),
              cb.like(cb.lower(root.get("description")), likePattern)));
      return cb.and(predicates.toArray(new Predicate[0]));
    };
  }
}
