package com.example.bookflow.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

/**
 * {@link ResourceSpecifications} の単体テスト（ADR-018 準拠）。
 *
 * <p>キーワードの正規化規則（BR-05）は純粋関数として検証できるため、ここで扱う。 述語が生成する SQL の挙動（部分一致・大文字小文字非依存・ワイルドカードのエスケープ）は
 * モックでは検証できないため、実 DB に対して実行される {@code com.example.bookflow.presentation.ResourceControllerTest}
 * が担当する。
 *
 * <p>テスト命名規約（ADR-018）: {@code methodName_condition_expectedBehavior}
 */
class ResourceSpecificationsTest {

  @Nested
  class NormalizeKeyword {

    @Test
    void normalizeKeyword_null_returnsNull() {
      assertThat(ResourceSpecifications.normalizeKeyword(null)).isNull();
    }

    @Test
    void normalizeKeyword_emptyString_returnsNull() {
      assertThat(ResourceSpecifications.normalizeKeyword("")).isNull();
    }

    @Test
    void normalizeKeyword_halfWidthSpacesOnly_returnsNull() {
      assertThat(ResourceSpecifications.normalizeKeyword("   ")).isNull();
    }

    /** 全角空白のみの入力も「指定なし」として扱う（{@code trim()} では落とせないケース）。 */
    @Test
    void normalizeKeyword_fullWidthSpacesOnly_returnsNull() {
      assertThat(ResourceSpecifications.normalizeKeyword("　　")).isNull();
    }

    @Test
    void normalizeKeyword_surroundedByHalfWidthSpaces_returnsStrippedValue() {
      assertThat(ResourceSpecifications.normalizeKeyword("  会議  ")).isEqualTo("会議");
    }

    @Test
    void normalizeKeyword_surroundedByFullWidthSpaces_returnsStrippedValue() {
      assertThat(ResourceSpecifications.normalizeKeyword("　会議　")).isEqualTo("会議");
    }

    /** 内部の空白は保持し、入力全体を 1 つのリテラルとして扱う（語への AND 分解はしない）。 */
    @Test
    void normalizeKeyword_containsInnerSpace_keepsInnerSpace() {
      assertThat(ResourceSpecifications.normalizeKeyword(" 会議 プロジェクター ")).isEqualTo("会議 プロジェクター");
    }

    @Test
    void normalizeKeyword_plainValue_returnsSameValue() {
      assertThat(ResourceSpecifications.normalizeKeyword("会議")).isEqualTo("会議");
    }
  }

  @Nested
  class UnrestrictedCases {

    /** キーワードが指定なしの場合は制約を課さない述語を返す。 */
    @Test
    void keywordMatches_blankKeyword_returnsSpecification() {
      assertThat(ResourceSpecifications.keywordMatches("   ")).isNotNull();
    }

    @Test
    void categoryEquals_nullCategory_returnsSpecification() {
      assertThat(ResourceSpecifications.categoryEquals(null)).isNotNull();
    }

    @Test
    void activeOnly_admin_returnsSpecification() {
      assertThat(ResourceSpecifications.activeOnly(true)).isNotNull();
    }

    @Test
    void listFilter_allUnspecified_returnsSpecification() {
      assertThat(ResourceSpecifications.listFilter(null, null, false)).isNotNull();
    }
  }
}
