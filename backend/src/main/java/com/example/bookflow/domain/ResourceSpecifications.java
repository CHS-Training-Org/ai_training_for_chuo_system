package com.example.bookflow.domain;

import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

/**
 * リソース一覧の検索条件を {@link Specification} として部品化するユーティリティ。
 *
 * <p>{@link ResourceRepository#findAll(Specification)} / {@link
 * ResourceRepository#findAll(Specification, org.springframework.data.domain.Pageable)}
 * に渡す条件を、{@link Specification#allOf} で AND 結合して使う。 ロール別の可視性（{@code
 * is_active}）・カテゴリ・キーワードを個別の部品にすることで、一覧取得の組合せごとにクエリを増やさずに済む。
 */
public final class ResourceSpecifications {

  /** LIKE のエスケープ文字。PostgreSQL・H2 の既定と同じバックスラッシュ。 */
  private static final char ESCAPE_CHAR = '\\';

  private ResourceSpecifications() {}

  /**
   * 有効リソース（{@code is_active = true}）のみに限定する。非 ADMIN の一覧で使う。
   *
   * @return 条件
   */
  public static Specification<Resource> isActiveTrue() {
    return (root, query, cb) -> cb.isTrue(root.<Boolean>get("isActive"));
  }

  /**
   * 指定カテゴリのリソースに限定する。
   *
   * @param category カテゴリ（null 不可）
   * @return 条件
   */
  public static Specification<Resource> hasCategory(ResourceCategory category) {
    return (root, query, cb) -> cb.equal(root.get("category"), category);
  }

  /**
   * {@code name} または {@code description} がキーワードを含むリソースに限定する（部分一致・OR）。
   *
   * <p>大文字小文字は区別しない。キーワード中の {@code %}・{@code _}・{@code \} は LIKE のワイルドカードではなく通常の文字として扱う。 {@code
   * description} が NULL の行は {@code name} だけで判定される（NULL との LIKE は真にならないため）。 パターンはバインドパラメータとして渡し、
   * 文字列連結でクエリを組まない。
   *
   * @param keyword 正規化済み（trim 済み）の非空キーワード
   * @return 条件
   */
  public static Specification<Resource> keywordContains(String keyword) {
    String pattern = "%" + escapeLike(keyword.toLowerCase(Locale.ROOT)) + "%";
    return (root, query, cb) ->
        cb.or(
            cb.like(cb.lower(root.<String>get("name")), pattern, ESCAPE_CHAR),
            cb.like(cb.lower(root.<String>get("description")), pattern, ESCAPE_CHAR));
  }

  /**
   * LIKE のメタ文字をエスケープする。
   *
   * <p>エスケープ文字自身（{@code \}）を先に処理し、その後で {@code %}・{@code _} を処理する。 順序を逆にすると、{@code %} のために付けた {@code
   * \} が再度エスケープされてしまう。 大文字小文字の変換は行わない（呼び出し側の責務）。
   *
   * @param keyword エスケープ前の文字列
   * @return エスケープ後の文字列
   */
  static String escapeLike(String keyword) {
    return keyword.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
  }
}
