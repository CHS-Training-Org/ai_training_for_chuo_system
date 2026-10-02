package com.example.bookflow.domain;

import jakarta.persistence.criteria.Predicate;
import java.util.List;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

/**
 * リソース一覧の絞り込み条件を組み立てるユーティリティ。
 *
 * <p>「有効フラグ」「カテゴリ」「キーワード」の 3 条件をそれぞれ {@link Specification} として表現し、AND で合成する。
 * 各述語は「指定がなければ制約を課さない」形（{@link Specification#unrestricted()}）を取るため、 条件の組み合わせごとにリポジトリのメソッドを増やす必要がない。
 *
 * <p>業務ルールは {@code
 * Docs/spec/aidlc-docs/construction/resource-keyword-search/functional-design/business-rules.md}
 * に定義する（BR-01〜BR-09）。
 */
public final class ResourceSpecifications {

  /** LIKE パターンのエスケープ文字。 */
  private static final char ESCAPE_CHAR = '\\';

  private ResourceSpecifications() {
    // ユーティリティクラスのためインスタンス化しない
  }

  /**
   * キーワードを正規化する（BR-05）。
   *
   * <p>{@code null}・空文字・空白のみの入力はいずれも「指定なし」として {@code null} に揃える。 それ以外は前後の空白を除去した文字列を返す。
   *
   * <p>{@link String#isBlank()} と {@link String#strip()} を使うのは、これらが Unicode の空白定義に従い
   * 全角空白も対象に含めるためである（{@code trim()} は制御文字までしか扱わない）。
   *
   * @param raw 生のキーワード入力（{@code null} 可）
   * @return 正規化後のキーワード。指定なしの場合は {@code null}
   */
  public static String normalizeKeyword(String raw) {
    if (raw == null || raw.isBlank()) {
      return null;
    }
    return raw.strip();
  }

  /**
   * ロール別の可視範囲を表す述語を返す（BR-09）。
   *
   * @param isAdmin ADMIN ロールであれば {@code true}
   * @return ADMIN の場合は制約なし、それ以外は {@code isActive = true} に限定する述語
   */
  public static Specification<Resource> activeOnly(boolean isAdmin) {
    if (isAdmin) {
      return Specification.unrestricted();
    }
    return (root, query, cb) -> cb.isTrue(root.get("isActive"));
  }

  /**
   * カテゴリ一致の述語を返す。
   *
   * @param category カテゴリ（{@code null} の場合は制約なし）
   * @return カテゴリ一致の述語
   */
  public static Specification<Resource> categoryEquals(ResourceCategory category) {
    if (category == null) {
      return Specification.unrestricted();
    }
    return (root, query, cb) -> cb.equal(root.get("category"), category);
  }

  /**
   * キーワード一致の述語を返す（BR-01〜BR-04・BR-06）。
   *
   * <p>{@code name} または {@code description} のいずれかへの部分一致で絞り込む。照合は大文字小文字を 区別しない（{@code LOWER()}
   * による比較。PostgreSQL 固有の {@code ILIKE} はテスト DB の H2 との 互換性のため使わない）。小文字変換は {@link Locale#ROOT}
   * 指定でロケール非依存に行う。
   *
   * <p>{@code description} は {@code null} を取りうるが、SQL の 3 値論理により {@code TRUE OR UNKNOWN} は TRUE と
   * 評価されるため、{@code name} が一致していれば行は残る。どちらにも一致しない場合は {@code FALSE OR UNKNOWN} が UNKNOWN となり行は採用されない。
   * いずれも意図どおりであるため {@code COALESCE} 等による回避はしない。
   *
   * @param keyword キーワード（{@code null}・空文字・空白のみの場合は制約なし）
   * @return キーワード一致の述語
   */
  public static Specification<Resource> keywordMatches(String keyword) {
    String normalized = normalizeKeyword(keyword);
    if (normalized == null) {
      return Specification.unrestricted();
    }
    String pattern = "%" + escapeLikePattern(normalized).toLowerCase(Locale.ROOT) + "%";
    return (root, query, cb) -> {
      Predicate nameMatches = cb.like(cb.lower(root.get("name")), pattern, ESCAPE_CHAR);
      Predicate descriptionMatches =
          cb.like(cb.lower(root.get("description")), pattern, ESCAPE_CHAR);
      return cb.or(nameMatches, descriptionMatches);
    };
  }

  /**
   * リソース一覧の絞り込み条件をすべて AND で合成して返す（BR-07）。
   *
   * <p>合成した述語は {@code ResourceService.list} の 2 経路（ページネーション経路と全件取得経路）が共有する。 分岐より前に 1
   * 回だけ組み立てることで、片方の経路への適用漏れが起きない（BR-08）。
   *
   * @param category カテゴリフィルタ（{@code null} 可）
   * @param keyword キーワードフィルタ（{@code null} 可）
   * @param isAdmin ADMIN ロールであれば {@code true}
   * @return 合成済みの述語
   */
  public static Specification<Resource> listFilter(
      ResourceCategory category, String keyword, boolean isAdmin) {
    return Specification.allOf(
        List.of(activeOnly(isAdmin), categoryEquals(category), keywordMatches(keyword)));
  }

  /**
   * LIKE パターン中のワイルドカードをリテラルとしてエスケープする（BR-06）。
   *
   * <p>バックスラッシュを最初に処理する。順序を誤ると、{@code %} のエスケープで挿入した {@code \} が さらにエスケープされて二重になる。
   *
   * @param value エスケープ対象の文字列
   * @return エスケープ済みの文字列
   */
  private static String escapeLikePattern(String value) {
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
  }
}
