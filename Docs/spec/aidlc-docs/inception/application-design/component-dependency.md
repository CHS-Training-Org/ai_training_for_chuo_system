# Component Dependencies

## 依存マトリクス（Backend）

| From \ To | ResourceSpecifications | ResourceRepository | ReservationRepository |
|-----------|:---:|:---:|:---:|
| ResourceController | - | - | - |
| ResourceService | uses | uses | uses |
| ResourceRepository | - | - | - |

ResourceController は ResourceService にのみ依存する（既存どおり）。`ResourceSpecifications` は domain 層内で完結し、上位層には依存しない。

## データフロー

```
Browser
  | GET /resources?category&keyword&from&to
  v
page.tsx (Server Component)
  | listResourcesAction(keyword を空でなければ付与)
  v
GET /api/resources?...keyword=...
  v
ResourceController.list  --keyword そのまま-->  ResourceService.list
                                                  | normalizeKeyword -> buildSpec
                                                  v
                                       ResourceRepository.findAll(spec[, pageable])
                                                  | (from/to あり: ReservationRepository で占有除外)
                                                  v
                                       Page<ResourceResponse>
```

## 通信パターン

- FE と BE の間は REST（`GET /api/resources`）。`keyword` は任意クエリで後方互換
- BE の層間は同期メソッド呼び出し。依存方向は presentation -> application -> domain（-> infrastructure の JPA 実装は Spring Data が提供）

## Package Change Sequence との対応

spec -> backend（Specifications -> Repository -> Service -> Controller -> テスト）-> frontend（Action -> page -> Form -> テスト）。execution-plan.md の順序と一致する。
