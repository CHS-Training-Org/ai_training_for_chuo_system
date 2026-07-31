package com.example.bookflow.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.domain.Specification;

/**
 * {@link ResourceSpecifications} 単体テスト（ADR-018 準拠）。
 *
 * <p>null/空文字条件の除外ロジック（BR-04）を検証する。実際の SQL 述語としての正しさ（name/description への大文字小文字を区別しない部分一致・AND合成）は
 * {@code ResourceControllerTest}（H2 結合テスト）で検証する。
 *
 * <p>テスト命名規約（ADR-018）: {@code methodName_condition_expectedBehavior}
 */
class ResourceSpecificationsTest {

  @Test
  void hasCategory_nullCategory_returnsNull() {
    assertThat(ResourceSpecifications.hasCategory(null)).isNull();
  }

  @Test
  void hasCategory_nonNullCategory_returnsSpecification() {
    assertThat(ResourceSpecifications.hasCategory(ResourceCategory.ROOM)).isNotNull();
  }

  @Test
  void isActive_returnsSpecification() {
    Specification<Resource> spec = ResourceSpecifications.isActive();
    assertThat(spec).isNotNull();
  }

  @Test
  void keywordMatches_nullKeyword_returnsNull() {
    assertThat(ResourceSpecifications.keywordMatches(null)).isNull();
  }

  @Test
  void keywordMatches_emptyKeyword_returnsNull() {
    assertThat(ResourceSpecifications.keywordMatches("")).isNull();
  }

  @Test
  void keywordMatches_blankKeyword_returnsNull() {
    assertThat(ResourceSpecifications.keywordMatches("   ")).isNull();
  }

  @Test
  void keywordMatches_nonBlankKeyword_returnsSpecification() {
    assertThat(ResourceSpecifications.keywordMatches("会議室")).isNotNull();
  }
}
