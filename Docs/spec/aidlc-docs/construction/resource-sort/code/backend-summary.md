# Backend Summary — resource-sort

## 変更ファイル（すべて既存ファイルの修正、新規ファイルなし）

- `backend/src/main/java/com/example/bookflow/application/ResourceService.java`
  - `applyCapacityNullsLast(Pageable)`: `Sort` の `capacity` オーダーを `nullsLast()` に差し替えた新しい `Pageable` を組み立てる private ヘルパーを追加
  - `buildComparator(Sort)`: `Sort` から `Comparator<Resource>` を組み立てる private ヘルパーを追加（`capacity` は方向に関わらず `nullsLast` でラップ、複数 `Sort.Order` は `thenComparing` で連結）
  - `listPaginated`: repository 呼び出し直前に `applyCapacityNullsLast` を適用するよう変更
  - `listWithAvailabilityFilter`: 占有判定フィルタ後・手動ページネーション前に `candidates.sort(buildComparator(pageable.getSort()))` を追加
  - **メソッドシグネチャの変更なし**（`list` は既に `Pageable` を引数に持つため）
- `backend/src/main/java/com/example/bookflow/presentation/ResourceController.java`
  - `@PageableDefault` に `sort = "createdAt", direction = Sort.Direction.ASC` を追加（RES-02）
  - `pageable.getSort()` の各 `Sort.Order.getProperty()` を `ALLOWED_SORT_PROPERTIES`（`name`/`capacity`/`createdAt`）と照合し、不一致があれば `ValidationException` を throw するチェックを追加（RES-06）
  - **メソッドシグネチャの変更なし**
- **`backend/src/main/java/com/example/bookflow/domain/ResourceRepository.java`（`domain` 層）は変更不要**: 既存の全 Page 返却メソッドは `Pageable` 引数を持ち、Spring Data JPA が `Sort` を自動的に `ORDER BY` へ変換するため

## テスト

- `backend/src/test/java/com/example/bookflow/application/ResourceServiceTest.java`
  - ソート検証用ヘルパー `makeSortTestResource`（capacity・createdAt を指定可能）を追加
  - `List_` ネストクラスに新規テスト 5 件：`capacity` 昇順/降順での `nullsLast` 付与、`name` 等の非 `capacity` オーダーが変更されないこと、`listWithAvailabilityFilter` 経路での `name` 順ソート、同経路での `capacity` 降順時の NULL 末尾維持
- `backend/src/test/java/com/example/bookflow/presentation/ResourceControllerTest.java`
  - ソート検証専用 seed 3 件（`SORT_A_ID`/`SORT_B_ID`/`SORT_C_ID`、`VEHICLE` カテゴリで他 seed から分離、`SORT_B_ID` は `capacity` NULL）を追加
  - 統合テスト 8 件を追加：name 昇順/降順、capacity 昇順/降順（NULL 末尾）、デフォルトソート（`createdAt,asc`）、許可されていないフィールドでの 400、keyword との組み合わせ、from/to（`listWithAvailabilityFilter`）経路との組み合わせ

## 実行結果

- `./gradlew spotlessApply checkstyleMain`：差分なし。Checkstyle 警告 2 件は本変更と無関係な既存コード（`ReservationRepository` のメソッド名）
- `./gradlew test --tests "*ResourceServiceTest" --tests "*ResourceControllerTest"`：BUILD SUCCESSFUL（`ResourceServiceTest$List_` 14 件、`ResourceControllerTest` 38 件、すべて成功）

## 技術判断の根拠（Functional Design からの変更なし）

- `capacity` の NULL 処理は、DB 側に委ねる経路（`Sort.Order.nullsLast()`）と Java 側で明示する経路（`Comparator.nullsLast(...)`）を使い分けた。H2 実データでの結合テスト（`list_sortByCapacityAscending_placesNullCapacityLast`・`list_sortByCapacityDescending_placesNullCapacityLast`）により、Hibernate が H2 上で `nullsLast()` を正しく `NULLS LAST` 構文に変換することを確認済み
