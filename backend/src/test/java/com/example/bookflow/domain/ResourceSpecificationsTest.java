package com.example.bookflow.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

/**
 * {@link ResourceSpecifications} のテスト（H2 の実クエリで検索条件を検証する）。
 *
 * <p>テスト命名規約（ADR-018）: {@code methodName_condition_expectedBehavior}
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ResourceSpecificationsTest {

  @Autowired private ResourceRepository resourceRepository;

  @BeforeEach
  void seed() {
    resourceRepository.deleteAll();
    resourceRepository.save(
        Resource.create(
            "Conference Room A", ResourceCategory.ROOM, 10, "3F", false, true, "プロジェクター完備"));
    resourceRepository.save(
        Resource.create("ノートPC", ResourceCategory.EQUIPMENT, null, "棚1", false, true, null));
    resourceRepository.save(
        Resource.create("100%稼働の車", ResourceCategory.VEHICLE, 4, "駐車場", false, true, "a_b と c\\d"));
    resourceRepository.save(
        Resource.create("旧会議室", ResourceCategory.ROOM, 6, "2F", false, false, null));
    resourceRepository.flush();
  }

  private List<String> find(Specification<Resource> spec) {
    return resourceRepository.findAll(spec).stream().map(Resource::getName).sorted().toList();
  }

  @Test
  void keywordContains_matchesNameCaseInsensitively() {
    assertThat(find(ResourceSpecifications.keywordContains("conference")))
        .containsExactly("Conference Room A");
    assertThat(find(ResourceSpecifications.keywordContains("ROOM A")))
        .containsExactly("Conference Room A");
  }

  @Test
  void keywordContains_matchesDescription() {
    assertThat(find(ResourceSpecifications.keywordContains("プロジェクター")))
        .containsExactly("Conference Room A");
  }

  @Test
  void keywordContains_matchesNameOrDescription() {
    // 「会議」は旧会議室の名称にのみ、「完備」は Conference Room A の説明にのみ含まれる
    assertThat(find(ResourceSpecifications.keywordContains("会議"))).containsExactly("旧会議室");
    assertThat(find(ResourceSpecifications.keywordContains("完備")))
        .containsExactly("Conference Room A");
  }

  @Test
  void keywordContains_descriptionNull_doesNotMatchOrFail() {
    assertThat(find(ResourceSpecifications.keywordContains("ノート"))).containsExactly("ノートPC");
  }

  @Test
  void keywordContains_percentIsLiteral() {
    // % がワイルドカードなら全件ヒットする。リテラルなら「100%稼働の車」のみ
    assertThat(find(ResourceSpecifications.keywordContains("%"))).containsExactly("100%稼働の車");
  }

  @Test
  void keywordContains_underscoreIsLiteral() {
    // _ がワイルドカードなら 1 文字の任意の文字に一致して複数ヒットする。リテラルなら説明文の "a_b" のみ
    assertThat(find(ResourceSpecifications.keywordContains("a_b"))).containsExactly("100%稼働の車");
    assertThat(find(ResourceSpecifications.keywordContains("_"))).containsExactly("100%稼働の車");
  }

  @Test
  void keywordContains_backslashIsLiteral() {
    assertThat(find(ResourceSpecifications.keywordContains("c\\d"))).containsExactly("100%稼働の車");
  }

  @Test
  void keywordContains_nullOrEmpty_noRestriction() {
    assertThat(find(ResourceSpecifications.keywordContains(null))).hasSize(4);
    assertThat(find(ResourceSpecifications.keywordContains(""))).hasSize(4);
  }

  @Test
  void forList_member_excludesInactive() {
    assertThat(find(ResourceSpecifications.forList(null, null, false)))
        .doesNotContain("旧会議室")
        .hasSize(3);
  }

  @Test
  void forList_admin_includesInactive() {
    assertThat(find(ResourceSpecifications.forList(null, null, true))).hasSize(4);
  }

  @Test
  void forList_categoryAndKeyword_combinedWithAnd() {
    assertThat(find(ResourceSpecifications.forList(ResourceCategory.ROOM, "会議", true)))
        .containsExactly("旧会議室");
    assertThat(find(ResourceSpecifications.forList(ResourceCategory.EQUIPMENT, "会議", true)))
        .isEmpty();
  }

  @Test
  void forList_memberKeywordMatchesInactiveOnly_returnsEmpty() {
    assertThat(find(ResourceSpecifications.forList(null, "会議", false))).isEmpty();
  }

  @Test
  void escapeLike_escapesMetaCharacters() {
    assertThat(ResourceSpecifications.escapeLike("a%b_c\\d")).isEqualTo("a\\%b\\_c\\\\d");
  }
}
