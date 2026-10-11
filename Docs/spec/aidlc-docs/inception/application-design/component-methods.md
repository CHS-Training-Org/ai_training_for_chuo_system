# Component Methods

業務ルールの詳細は Code Generation の計画で確定する。ここではシグネチャと目的のみ示す。

## ResourceSpecifications（domain、新規）

```java
public final class ResourceSpecifications {
  public static Specification<Resource> isActiveTrue();
  public static Specification<Resource> hasCategory(ResourceCategory category);
  public static Specification<Resource> keywordContains(String keyword);
}
```

| メソッド | 目的 | 入出力 |
|----------|------|--------|
| `isActiveTrue()` | 非 ADMIN 用。`is_active = true` に限定する | なし → Specification |
| `hasCategory(category)` | カテゴリ一致 | `ResourceCategory` → Specification |
| `keywordContains(keyword)` | `name` または `description` への部分一致（OR）。大文字小文字無視。`%` `_` `\` はエスケープして通常の文字として扱う。description が NULL の行は name のみで判定される | 正規化済みの非空 `String` → Specification |

`keywordContains` は lower(列) LIKE lower(パターン) ESCAPE `\` をバインドパラメータで組み立てる（文字列連結でクエリを組まない）。PostgreSQL と H2 の両方で動く比較方式とする。

## ResourceRepository（domain、変更）

```java
public interface ResourceRepository
    extends JpaRepository<Resource, UUID>, JpaSpecificationExecutor<Resource> {
  Optional<Resource> findByIdForUpdate(UUID id); // 維持
  // findAll(Specification, Pageable) / findAll(Specification) は継承
}
```

## ResourceService（application、変更）

```java
public Page<ResourceResponse> list(
    ResourceCategory category, String keyword,
    LocalDateTime from, LocalDateTime to,
    boolean isAdmin, Pageable pageable);          // keyword を追加

private Specification<Resource> buildSpec(
    ResourceCategory category, String keyword, boolean isAdmin);

private static String normalizeKeyword(String keyword); // trim。null / 空白のみは null を返す
```

| メソッド | 目的 |
|----------|------|
| `list(...)` | keyword 付きの一覧。`from` と `to` が両方ある場合は空き確認経路、それ以外は通常経路 |
| `buildSpec(...)` | 条件のリストを組み立て、`Specification.allOf(conditions)` で AND 結合する。`isAdmin` が false のときだけ `isActiveTrue()` を加える（ADMIN は条件を加えない）。category があれば `hasCategory`、正規化後 keyword があれば `keywordContains` を加える。**戻り値は常に非 null**（契約は下記） |
| `normalizeKeyword(...)` | trim。空・空白のみは「条件なし」として null |

### buildSpec の契約

- 戻り値は常に非 null。条件が 1 つもない場合（ADMIN かつ category・keyword 未指定）は、`Specification.allOf` が空リストに対して返す `Specification.unrestricted()`（WHERE なし）になる。spring-data-jpa 4.0.5 のバイトコードで確認済み
- `Specification.where(null)` は使わない。4.0.5 の `where(Specification)` は `Assert.notNull("Specification must not be null")` で例外になる
- `findAll` にリテラル `null` を渡さない。4.0 では `findAll(PredicateSpecification)` のオーバーロードがあり、曖昧になる
- ADMIN・条件なしの `findAll(spec, pageable)` / `findAll(spec)` は、現行の `findAll(pageable)` / `findAll()` と同じ WHERE なしの問合せで、結果とソート（指定なし）は変わらない

## ResourceController（presentation、変更）

```java
public Page<ResourceResponse> list(
    @RequestParam(required = false) ResourceCategory category,
    @RequestParam(required = false) String keyword,
    @RequestParam(required = false) LocalDateTime from,
    @RequestParam(required = false) LocalDateTime to,
    @PageableDefault(size = 20) Pageable pageable,
    @CurrentUser User currentUser);
```

## Frontend

- `listResourcesAction`: 引数の SearchParams 相当に `keyword?: string` を追加。値があるときのみ `keyword` を API に付与する
- `ResourceFilterForm`: props に `defaultKeyword?: string` を追加。`handleSubmit` で `keyword` を trim し、非空のときだけ `params.set("keyword", ...)`
