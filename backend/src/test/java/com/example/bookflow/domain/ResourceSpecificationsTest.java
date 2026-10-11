package com.example.bookflow.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

/**
 * {@link ResourceSpecifications} 単体テスト（ADR-018 準拠）。
 *
 * <p>実クエリ（部分一致・大文字小文字・NULL）の検証は {@code ResourceRepositoryTest} が担う。ここでは DB に依存しない LIKE
 * エスケープだけを検証する。 テスト命名規約（ADR-018）: {@code methodName_condition_expectedBehavior}
 */
class ResourceSpecificationsTest {

  @Nested
  class EscapeLike {

    @Test
    void escapeLike_plainText_returnsUnchanged() {
      assertThat(ResourceSpecifications.escapeLike("projector room")).isEqualTo("projector room");
    }

    @Test
    void escapeLike_percent_isEscaped() {
      assertThat(ResourceSpecifications.escapeLike("100%")).isEqualTo("100\\%");
    }

    @Test
    void escapeLike_underscore_isEscaped() {
      assertThat(ResourceSpecifications.escapeLike("a_b")).isEqualTo("a\\_b");
    }

    @Test
    void escapeLike_backslash_isEscaped() {
      assertThat(ResourceSpecifications.escapeLike("C:\\temp")).isEqualTo("C:\\\\temp");
    }

    @Test
    void escapeLike_allMetaCharacters_backslashIsNotEscapedTwice() {
      // 入力は 50%_\ の 4 文字。\ を先に処理するため、% と _ のために付けた \ は再エスケープされない
      assertThat(ResourceSpecifications.escapeLike("50%_\\")).isEqualTo("50\\%\\_\\\\");
    }

    @Test
    void escapeLike_upperCase_isNotLowerCased() {
      assertThat(ResourceSpecifications.escapeLike("ABC")).isEqualTo("ABC");
    }

    @Test
    void escapeLike_emptyString_returnsEmpty() {
      assertThat(ResourceSpecifications.escapeLike("")).isEmpty();
    }
  }
}
