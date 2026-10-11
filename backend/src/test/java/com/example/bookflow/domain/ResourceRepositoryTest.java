package com.example.bookflow.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

/**
 * {@link ResourceRepository} と {@link ResourceSpecifications} の検索条件テスト（実クエリ・H2）。
 *
 * <p>{@code @DataJpaTest} は現行の依存関係に含まれないため、既存の Controller 結合テストと同じ {@code @SpringBootTest} + {@code
 * test} プロファイルを使う。各テストはロールバックされる。
 *
 * <p>テスト用 H2 は同じ JVM のほかのテストクラスと共有され、後始末されない行が残りうる。 そのため絶対件数は検証せず、一意なトークン {@value #TOKEN}
 * を含む自分の投入行の ID で検証する。 テスト命名規約（ADR-018）: {@code methodName_condition_expectedBehavior}
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ResourceRepositoryTest {

  private static final String TOKEN = "ZZ-FILTER-";

  @Autowired private ResourceRepository resourceRepository;

  // ---------------------------------------------------------------------------
  // ヘルパー
  // ---------------------------------------------------------------------------

  private Resource save(
      String name, ResourceCategory category, boolean isActive, String description) {
    return resourceRepository.saveAndFlush(
        Resource.create(name, category, null, null, false, isActive, description));
  }

  private Resource saveActive(String name, String description) {
    return save(name, ResourceCategory.ROOM, true, description);
  }

  private List<UUID> find(Specification<Resource> spec) {
    return resourceRepository.findAll(spec).stream().map(Resource::getId).toList();
  }

  // ---------------------------------------------------------------------------
  // keywordContains — 部分一致・大文字小文字・NULL
  // ---------------------------------------------------------------------------

  @Test
  void keywordContains_matchesName_returnsOnlyMatchingResource() {
    Resource hit = saveActive(TOKEN + "projector-room", null);
    Resource miss = saveActive(TOKEN + "other", null);

    List<UUID> ids = find(ResourceSpecifications.keywordContains(TOKEN + "projector"));

    assertThat(ids).contains(hit.getId()).doesNotContain(miss.getId());
  }

  @Test
  void keywordContains_matchesDescription_returnsResource() {
    Resource hit = saveActive("plain-name-1", "has " + TOKEN + "whiteboard inside");
    Resource miss = saveActive("plain-name-2", "nothing relevant");

    List<UUID> ids = find(ResourceSpecifications.keywordContains(TOKEN + "whiteboard"));

    assertThat(ids).contains(hit.getId()).doesNotContain(miss.getId());
  }

  @Test
  void keywordContains_matchesNeither_returnsNoOwnRows() {
    Resource row = saveActive(TOKEN + "alpha", "beta");

    List<UUID> ids = find(ResourceSpecifications.keywordContains(TOKEN + "gamma"));

    assertThat(ids).doesNotContain(row.getId());
  }

  @Test
  void keywordContains_differentCase_matchesRegardlessOfCase() {
    Resource byName = saveActive(TOKEN + "Projector Room", null);
    Resource byDescription = saveActive("plain", "Contains " + TOKEN + "WhiteBoard");

    assertThat(find(ResourceSpecifications.keywordContains(TOKEN.toLowerCase() + "projector")))
        .contains(byName.getId());
    assertThat(find(ResourceSpecifications.keywordContains(TOKEN + "PROJECTOR ROOM")))
        .contains(byName.getId());
    assertThat(find(ResourceSpecifications.keywordContains(TOKEN + "whiteboard")))
        .contains(byDescription.getId());
  }

  @Test
  void keywordContains_nullDescription_isJudgedByNameOnly() {
    Resource nullDescription = saveActive(TOKEN + "null-desc", null);

    // name に一致すればヒットし、NULL の description で例外にならない
    assertThat(find(ResourceSpecifications.keywordContains(TOKEN + "null-desc")))
        .contains(nullDescription.getId());
    // description にだけ現れる語では、NULL の行はヒットしない
    assertThat(find(ResourceSpecifications.keywordContains("only-in-description")))
        .doesNotContain(nullDescription.getId());
  }

  // ---------------------------------------------------------------------------
  // keywordContains — %・_・\ はリテラル
  // ---------------------------------------------------------------------------

  @Test
  void keywordContains_percent_isLiteralNotWildcard() {
    Resource percent = saveActive(TOKEN + "100%", null);
    Resource zeros = saveActive(TOKEN + "1000", null);

    List<UUID> ids = find(ResourceSpecifications.keywordContains(TOKEN + "100%"));

    assertThat(ids).contains(percent.getId()).doesNotContain(zeros.getId());
  }

  @Test
  void keywordContains_underscore_isLiteralNotSingleCharWildcard() {
    Resource underscore = saveActive(TOKEN + "a_b", null);
    Resource otherChar = saveActive(TOKEN + "axb", null);

    List<UUID> ids = find(ResourceSpecifications.keywordContains(TOKEN + "a_b"));

    assertThat(ids).contains(underscore.getId()).doesNotContain(otherChar.getId());
  }

  @Test
  void keywordContains_backslash_isLiteral() {
    Resource backslash = saveActive(TOKEN + "C:\\temp", null);
    Resource noBackslash = saveActive(TOKEN + "C:temp", null);

    List<UUID> ids = find(ResourceSpecifications.keywordContains(TOKEN + "C:\\temp"));

    assertThat(ids).contains(backslash.getId()).doesNotContain(noBackslash.getId());
  }

  // ---------------------------------------------------------------------------
  // 条件の組み合わせ（Specification.allOf）
  // ---------------------------------------------------------------------------

  @Test
  void isActiveTrue_withKeyword_excludesInactive() {
    Resource active = save(TOKEN + "active", ResourceCategory.ROOM, true, null);
    Resource inactive = save(TOKEN + "inactive", ResourceCategory.ROOM, false, null);

    List<UUID> ids =
        find(
            Specification.allOf(
                ResourceSpecifications.isActiveTrue(),
                ResourceSpecifications.keywordContains(TOKEN)));

    assertThat(ids).contains(active.getId()).doesNotContain(inactive.getId());
  }

  @Test
  void keywordOnly_withoutActiveCondition_includesInactive() {
    Resource active = save(TOKEN + "active", ResourceCategory.ROOM, true, null);
    Resource inactive = save(TOKEN + "inactive", ResourceCategory.ROOM, false, null);

    List<UUID> ids = find(Specification.allOf(ResourceSpecifications.keywordContains(TOKEN)));

    assertThat(ids).contains(active.getId(), inactive.getId());
  }

  @Test
  void allOf_noConditions_returnsAllRowsIncludingInactive() {
    Resource active = save(TOKEN + "active", ResourceCategory.ROOM, true, null);
    Resource inactive = save(TOKEN + "inactive", ResourceCategory.EQUIPMENT, false, null);

    // ADMIN・カテゴリなし・キーワードなし：条件が空のとき allOf は条件なし（WHERE なし）を返す
    List<UUID> ids = find(Specification.allOf(new ArrayList<Specification<Resource>>()));

    assertThat(ids).contains(active.getId(), inactive.getId());
  }

  @Test
  void hasCategory_withKeyword_combinesWithAnd() {
    Resource room = save(TOKEN + "room", ResourceCategory.ROOM, true, null);
    Resource equipment = save(TOKEN + "equipment", ResourceCategory.EQUIPMENT, true, null);

    List<UUID> ids =
        find(
            Specification.allOf(
                ResourceSpecifications.hasCategory(ResourceCategory.ROOM),
                ResourceSpecifications.keywordContains(TOKEN)));

    assertThat(ids).contains(room.getId()).doesNotContain(equipment.getId());
  }

  // ---------------------------------------------------------------------------
  // Page 版 — ページングと totalElements が条件適用後の件数になる
  // ---------------------------------------------------------------------------

  @Test
  void findAllWithPageable_keywordFiltered_paginatesFilteredRows() {
    Resource r1 = saveActive(TOKEN + "page-1", null);
    Resource r2 = saveActive(TOKEN + "page-2", null);
    Resource r3 = saveActive(TOKEN + "page-3", null);
    saveActive("not-matching-name", null);

    Specification<Resource> spec =
        Specification.allOf(ResourceSpecifications.keywordContains(TOKEN + "page-"));

    // トークン + "page-" で絞った母集団は、自分の投入行 3 件だけ
    Page<Resource> first = resourceRepository.findAll(spec, PageRequest.of(0, 2, Sort.by("name")));
    Page<Resource> second = resourceRepository.findAll(spec, PageRequest.of(1, 2, Sort.by("name")));

    assertThat(first.getTotalElements()).isEqualTo(3);
    assertThat(first.getContent())
        .extracting(Resource::getId)
        .containsExactly(r1.getId(), r2.getId());
    assertThat(second.getContent()).extracting(Resource::getId).containsExactly(r3.getId());
  }
}
