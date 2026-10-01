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
 * {@link ResourceSpecifications} の検索条件を H2 の実 DB で検証するテスト。
 *
 * <p>Mockito ではクエリの実挙動を確認できないため、Repository 経由で実際に SQL を発行する。 各テストはトランザクション内で実行され、終了時にロールバックされる。
 *
 * <p>テスト命名規約（ADR-018）: {@code methodName_condition_expectedBehavior}
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ResourceSpecificationsTest {

  @Autowired private ResourceRepository resourceRepository;

  private Resource room;
  private Resource equipmentByDescription;
  private Resource nullDescription;
  private Resource inactive;
  private Resource underscoreName;
  private Resource percentName;
  private Resource backslashName;

  @BeforeEach
  void setUp() {
    room = save("第1会議室", ResourceCategory.ROOM, "Projector 完備", true);
    equipmentByDescription = save("Alpha", ResourceCategory.EQUIPMENT, "持ち出し用ノートPC", true);
    nullDescription = save("Beta", ResourceCategory.EQUIPMENT, null, true);
    inactive = save("旧会議室", ResourceCategory.ROOM, "老朽化", false);
    underscoreName = save("a_b", ResourceCategory.EQUIPMENT, null, true);
    percentName = save("100%OFF", ResourceCategory.EQUIPMENT, null, true);
    backslashName = save("C:\\temp", ResourceCategory.EQUIPMENT, null, true);
  }

  private Resource save(
      String name, ResourceCategory category, String description, boolean active) {
    return resourceRepository.save(
        Resource.create(name, category, null, null, false, active, description));
  }

  private List<Resource> search(String keyword) {
    return resourceRepository.findAll(ResourceSpecifications.nameOrDescriptionContains(keyword));
  }

  @Test
  void nameOrDescriptionContains_nameMatches_returnsResource() {
    assertThat(search("会議室")).contains(room, inactive).doesNotContain(equipmentByDescription);
  }

  @Test
  void nameOrDescriptionContains_descriptionMatches_returnsResource() {
    assertThat(search("ノートPC")).containsExactly(equipmentByDescription);
  }

  @Test
  void nameOrDescriptionContains_differentCase_matchesCaseInsensitively() {
    assertThat(search("PROJECTOR")).containsExactly(room);
    assertThat(search("alpha")).containsExactly(equipmentByDescription);
  }

  @Test
  void nameOrDescriptionContains_nullDescription_doesNotThrowAndMatchesByName() {
    assertThat(search("beta")).containsExactly(nullDescription);
  }

  @Test
  void nameOrDescriptionContains_noMatch_returnsEmpty() {
    assertThat(search("存在しないキーワード")).isEmpty();
  }

  @Test
  void nameOrDescriptionContains_surroundingSpaces_areTrimmed() {
    assertThat(search("  alpha  ")).containsExactly(equipmentByDescription);
  }

  @Test
  void nameOrDescriptionContains_nullOrBlank_returnsAll() {
    int total = resourceRepository.findAll().size();
    assertThat(search(null)).hasSize(total);
    assertThat(search("")).hasSize(total);
    assertThat(search("   ")).hasSize(total);
  }

  @Test
  void nameOrDescriptionContains_underscore_matchesLiteralUnderscoreOnly() {
    assertThat(search("_")).containsExactly(underscoreName);
  }

  @Test
  void nameOrDescriptionContains_percent_matchesLiteralPercentOnly() {
    assertThat(search("%")).containsExactly(percentName);
  }

  @Test
  void nameOrDescriptionContains_backslash_matchesLiteralBackslashWithoutError() {
    assertThat(search("\\")).containsExactly(backslashName);
    assertThat(search("C:\\t")).containsExactly(backslashName);
  }

  @Test
  void combined_keywordCategoryAndActive_appliesAllConditionsWithAnd() {
    Specification<Resource> spec =
        ResourceSpecifications.nameOrDescriptionContains("会議室")
            .and(ResourceSpecifications.hasCategory(ResourceCategory.ROOM))
            .and(ResourceSpecifications.isActive());

    assertThat(resourceRepository.findAll(spec)).containsExactly(room);
  }

  @Test
  void combined_withoutActiveCondition_includesInactive() {
    Specification<Resource> spec =
        ResourceSpecifications.nameOrDescriptionContains("会議室")
            .and(ResourceSpecifications.hasCategory(ResourceCategory.ROOM));

    assertThat(resourceRepository.findAll(spec)).containsExactlyInAnyOrder(room, inactive);
  }
}
