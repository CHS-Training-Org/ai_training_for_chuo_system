# Component Methods

業務ルールの詳細は requirements.md（FR-06〜08）で確定済み。ここではシグネチャのみ。

## ResourceSpecifications（domain）
```java
public final class ResourceSpecifications {
  public static Specification<Resource> isActive();
  public static Specification<Resource> hasCategory(ResourceCategory category);   // null なら条件なし
  public static Specification<Resource> keywordContains(String keyword);          // null か空なら条件なし
  public static Specification<Resource> forList(
      ResourceCategory category, String keyword, boolean isAdmin);                // 上 3 つを AND で合成
  static String escapeLike(String keyword);                                       // テスト用に package-private
}
```
- `keywordContains`: `lower(name) LIKE :p ESCAPE '\'` OR `lower(description) LIKE :p ESCAPE '\'`。`p` は `%` + エスケープ済み小文字 keyword + `%`

## ResourceRepository（domain）
```java
public interface ResourceRepository
    extends JpaRepository<Resource, UUID>, JpaSpecificationExecutor<Resource> {
  Optional<Resource> findByIdForUpdate(UUID id);  // 既存のまま
}
```

## ResourceController（presentation）
```java
public Page<ResourceResponse> list(
    @RequestParam(required = false) ResourceCategory category,
    @RequestParam(required = false) String keyword,       // 追加
    @RequestParam(required = false) LocalDateTime from,
    @RequestParam(required = false) LocalDateTime to,
    @PageableDefault(size = 20) Pageable pageable,
    @CurrentUser User currentUser);
// private static String normalizeKeyword(String raw)  // trim、空なら null、101 文字以上は ValidationException
```

## ResourceService（application）
```java
public Page<ResourceResponse> list(
    ResourceCategory category, String keyword,            // keyword を追加
    LocalDateTime from, LocalDateTime to,
    boolean isAdmin, Pageable pageable);
// private Page<ResourceResponse> listPaginated(...)             // findAll(spec, pageable)
// private Page<ResourceResponse> listWithAvailabilityFilter(...) // findAll(spec) → Java 判定 → 手動ページング
```
- `fetchAllCandidates` は削除し、`ResourceSpecifications.forList` に置き換える

## Frontend
```ts
interface ListResourcesParams { category?: string; keyword?: string; from?: string; to?: string; page?: number; size?: number }
interface ResourceFilterFormProps { defaultCategory?: string; defaultKeyword?: string; defaultFrom?: string; defaultTo?: string }
```
