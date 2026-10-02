# NFR Design Patterns — resource-list-filter

## Resilience Patterns

- **評価**: N/A。`nfr-requirements.md` で Reliability は「既存の `ValidationException` ハンドリングパターンを踏襲」とのみ判定済み。リトライ・サーキットブレーカー等の新規耐障害パターンは不要（DB呼び出しは既存の `ResourceRepository` 経由のトランザクション管理に乗るだけで、新しい外部呼び出しを増やさないため）

## Scalability Patterns

- **評価**: N/A。`nfr-requirements.md` で明記済み（チュートリアル規模、スケーリング機構の変更なし）

## Performance Patterns

- **評価**: N/A。追加のキャッシュ・非同期化・バッチ処理は導入しない。既存の `listPaginated`/`fetchAllCandidates` の実行順序（DB側絞り込み→候補取得→Java側占有除外→手動ページング）をそのまま維持する

## Security Patterns

`tech-stack-decisions.md` の決定1〜4を、具体的な設計として以下のように配置する。

### パターン1: パラメータ化クエリ + null許容条件（`@Query`）

- **配置場所**: `ResourceRepository`
- **設計**:
  ```java
  @Query("""
      SELECT r FROM Resource r
      WHERE (:category IS NULL OR r.category = :category)
        AND (:isActiveOnly = false OR r.isActive = true)
        AND (:keyword IS NULL OR
             LOWER(r.name) LIKE LOWER(CONCAT('%', :keyword, '%')) ESCAPE '\\'
             OR LOWER(r.description) LIKE LOWER(CONCAT('%', :keyword, '%')) ESCAPE '\\')
      """)
  Page<Resource> search(
      @Param("category") ResourceCategory category,
      @Param("isActiveOnly") boolean isActiveOnly,
      @Param("keyword") String keyword,
      Pageable pageable);

  List<Resource> search(
      @Param("category") ResourceCategory category,
      @Param("isActiveOnly") boolean isActiveOnly,
      @Param("keyword") String keyword);
  ```
- **既存メソッドとの関係**: 既存の `findByCategoryAndIsActiveTrue` 等4メソッドは、この新しい `search` メソッドに置き換えるのではなく **並存** させるか **置き換える** かは Code Generation 時に既存呼び出し元（`ResourceService`）の呼び出し箇所を見て判断する（置き換えの場合は既存テストの呼び出しも追従させる）
- **関連SECURITYルール**: SECURITY-05（パラメータ化クエリによるインジェクション対策）

### パターン2: アプリケーション層でのワイルドカードエスケープ

- **配置場所**: `ResourceService`（`ResourceRepository` 呼び出し直前）、または `Resource*` 専用のプライベートヘルパーメソッド
- **設計**: `keyword` を trim → 空文字列なら `null` に変換 → `%`/`_` を `\%`/`\_` にエスケープ → `ResourceRepository.search(...)` に渡す。エスケープ処理は小さな純粋関数として切り出し、ユニットテスト可能にする（例: `escapeLikeWildcards(String raw): String`）
- **関連SECURITYルール**: SECURITY-05（インジェクション対策の一部としてのワイルドカード無害化）

### パターン3: 入力長バリデーション

- **配置場所**: `ResourceController`
- **設計**: 既存の `from`/`to` 片方指定チェック（手動 `if` + `ValidationException`）と同じ関数内で、`keyword != null && keyword.length() > 100` の場合に `ValidationException` を送出する。Bean Validation（`@Size(max = 100)`）を `@RequestParam` に付与する方式も既存コードベースで前例がないため、今回は既存の手動チェックパターンに統一する
- **関連SECURITYルール**: SECURITY-05（長さ上限の強制）

## Logical Components

- **評価**: N/A。キュー・キャッシュ・サーキットブレーカー等の新規インフラコンポーネントは不要。既存の `ResourceController`/`ResourceService`/`ResourceRepository` の3クラスのみで完結する
