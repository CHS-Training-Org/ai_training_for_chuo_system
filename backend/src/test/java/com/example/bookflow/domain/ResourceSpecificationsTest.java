package com.example.bookflow.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyChar;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Root;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * {@link ResourceSpecifications} 単体テスト（ADR-018 準拠・Mockito）。
 *
 * <p>実際の DB は使わず、検索条件の組み立て役（{@link CriteriaBuilder}）に渡された値を検証する。 テスト命名規約（ADR-018）: {@code
 * methodName_condition_expectedBehavior}
 */
@ExtendWith(MockitoExtension.class)
class ResourceSpecificationsTest {

  @Mock private Root<Resource> root;
  @Mock private CriteriaBuilder cb;

  /** forList の検索条件を組み立てる（組み立て時に cb へ渡された値を後で検証する）。 */
  private void build(ResourceCategory category, boolean isAdmin, String keyword) {
    ResourceSpecifications.forList(category, isAdmin, keyword).toPredicate(root, null, cb);
  }

  /** cb.like に渡された検索文字列（パターン）をすべて集める。 */
  private List<String> capturedPatterns(int expectedCalls) {
    ArgumentCaptor<String> pattern = ArgumentCaptor.forClass(String.class);
    verify(cb, times(expectedCalls))
        .like(ArgumentMatchers.<Expression<String>>any(), pattern.capture(), eq('\\'));
    return pattern.getAllValues();
  }

  @Test
  void forList_keywordWithUpperCase_searchesWithLowerCasePattern() {
    build(null, true, "ROOM");

    assertThat(capturedPatterns(2)).containsOnly("%room%");
  }

  @Test
  void forList_keywordWithWildcards_escapesThemAsOrdinaryCharacters() {
    // 入力: 50%_a\b（% _ \ はいずれも LIKE の特別な文字）
    build(null, true, "50%_a\\b");

    // 期待: 各特別文字の前に \ が付く（\ 自身は \\ になる）
    assertThat(capturedPatterns(2)).containsOnly("%50\\%\\_a\\\\b%");
  }

  @Test
  void forList_keywordGiven_searchesBothNameAndDescription() {
    build(null, true, "会議");

    verify(root).get("name");
    verify(root).get("description");
    assertThat(capturedPatterns(2)).containsOnly("%会議%");
  }

  @Test
  void forList_keywordNull_addsNoKeywordCondition() {
    build(null, true, null);

    verify(cb, never()).like(ArgumentMatchers.<Expression<String>>any(), anyString(), anyChar());
    verify(root, never()).get("name");
    verify(root, never()).get("description");
  }

  @Test
  void forList_nonAdmin_restrictsToActiveResources() {
    build(null, false, null);

    verify(root).get("isActive");
  }

  @Test
  void forList_admin_doesNotRestrictToActiveResources() {
    build(null, true, null);

    verify(root, never()).get("isActive");
  }

  @Test
  void forList_categoryGiven_filtersByCategory() {
    build(ResourceCategory.ROOM, true, null);

    verify(root).get("category");
  }

  @Test
  void forList_categoryNull_doesNotFilterByCategory() {
    build(null, true, null);

    verify(root, never()).get("category");
  }
}
