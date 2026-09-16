# Domain Entities — `resource-keyword-search`

本ユニットはドメインモデルを変更しない。新規エンティティ・新規フィールド・関連の追加はなく、DB スキーマも現状のままである。以下は、キーワード照合の設計判断の前提となる既存エンティティの性質を確認したものである。

## `Resource`（既存・変更なし）

| フィールド | 型 | DB 列定義 | null 可否 | 本ユニットでの役割 |
|---|---|---|---|---|
| `id` | `UUID` | NOT NULL | 不可 | 識別子 |
| `name` | `String` | varchar(100) NOT NULL | **不可** | **キーワード照合の対象** |
| `category` | `ResourceCategory` | varchar(20) NOT NULL | 不可 | 既存のカテゴリ絞り込み条件 |
| `capacity` | `Integer` | integer | 可 | 対象外 |
| `location` | `String` | varchar(200) | 可 | 対象外（要求シートが照合対象を `name` と `description` に限定） |
| `requiresApproval` | `boolean` | NOT NULL | 不可 | 対象外 |
| `isActive` | `boolean` | NOT NULL | 不可 | 既存のロール別可視範囲の条件 |
| `description` | `String` | TEXT | **可** | **キーワード照合の対象** |
| `createdAt` | `LocalDateTime` | NOT NULL | 不可 | 対象外 |

### 設計上の含意

**`name` と `description` の null 可否が異なる。** `name` は NOT NULL だが `description` は null を取りうる。SQL の3値論理では `NULL LIKE '%x%'` は TRUE でも FALSE でもなく UNKNOWN と評価される。したがって「`name` に一致する **または** `description` に一致する」を OR で結ぶとき、`description` が null の行は OR の片側が UNKNOWN になる。

OR の評価規則上、`TRUE OR UNKNOWN` は TRUE なので、`name` 側が一致していれば `description` が null でもその行は残る。一方 `FALSE OR UNKNOWN` は UNKNOWN であり、WHERE 句では行が採用されない。これは意図どおりの挙動である（どちらにも一致していないのだから除外されるべき）。

したがって **OR で素直に結べば FR-14 は満たされる**。`COALESCE(description, '')` のような回避策は不要である。この点は AC-01-3 で検証する。

## `ResourceCategory`（既存・変更なし）

`ROOM` / `EQUIPMENT` / `VEHICLE` の3値を持つ列挙型。本ユニットでは変更しない。

## `Reservation`（既存・変更なし・間接的に関与）

空き確認（`from` / `to`）でリソースを除外するために参照される。本ユニットはこの判定ロジックに手を入れない。ただし、キーワード条件がこの経路にも適用される必要がある点で関係する（`business-logic-model.md` を参照）。

## 新設する概念

### リソース検索条件（述語の集合）

エンティティではなく、リソース絞り込みの条件を組み立てる domain 層のユーティリティとして導入する。

| 述語 | 入力 | 意味 |
|---|---|---|
| 有効リソース限定 | ADMIN か否か | 非 ADMIN のとき `isActive = true` に限定する。ADMIN のときは制約を課さない |
| カテゴリ一致 | カテゴリ（null 可） | 指定があればそのカテゴリに限定する |
| キーワード一致 | キーワード（null 可） | 指定があれば `name` または `description` への部分一致に限定する |

3つの述語はいずれも「指定がなければ制約を課さない」という共通の形を持ち、AND で合成される。これにより、条件の組み合わせごとにリポジトリのメソッドを増やす現在の構造（6メソッド）を置き換えられる。

**永続化層への配置**：述語は JPA の `Specification<Resource>` として表現し、`ResourceRepository` が `JpaSpecificationExecutor<Resource>` を継承することで適用する。`Specification` は Spring Data JPA の型であるため、これを domain 層に置くことは domain が永続化技術を知ることを意味する。ただし BookFlow の既存構成では `ResourceRepository` インターフェース自体が `JpaRepository` を継承して domain 層に置かれており、同じ前提のうえに乗る配置である（NFR-05 の4レイヤー維持に反しない）。
