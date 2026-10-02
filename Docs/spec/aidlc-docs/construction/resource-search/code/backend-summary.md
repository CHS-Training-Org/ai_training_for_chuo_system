# Backend Summary — resource-search

## 変更ファイル（すべて既存ファイルの修正、新規ファイルなし）

- `backend/src/main/java/com/example/bookflow/domain/ResourceRepository.java`
  - keyword 検索用 `@Query`（JPQL）メソッドを 4 パターン × Page/List 版で追加（計 8 メソッド）：
    `findByIsActiveTrueAndKeyword` / `findByCategoryAndIsActiveTrueAndKeyword` / `findByKeyword` /
    `findByCategoryAndKeyword`
  - 共通の keyword 一致条件（`name` または `description` への大文字小文字非依存部分一致）をインターフェース定数 `KEYWORD_MATCH` に集約し、8 クエリ間の重複・ズレを防止
  - ESCAPE 文字は `\`（バックスラッシュ）ではなく `!` を採用。Java 文字列リテラルと JPQL の二重エスケープを避けるため
- `backend/src/main/java/com/example/bookflow/application/ResourceService.java`
  - `list` のシグネチャに `String keyword` を追加（`category, from, to, keyword, isAdmin, pageable` の順）
  - `normalizeKeyword`（trim・空文字→null）、`escapeLikeKeyword`（`!`→`!!`、`%`→`!%`、`_`→`!_` の順でエスケープ）を追加
  - `listPaginated` / `fetchAllCandidates`（`listWithAvailabilityFilter` 経由）の両方に keyword 分岐を追加。keyword が null の場合は既存の派生クエリ呼び出しを変更しない
- `backend/src/main/java/com/example/bookflow/presentation/ResourceController.java`
  - `GET /api/resources` に `@RequestParam(required = false) String keyword` を追加し `resourceService.list(...)` へ中継

## テスト

- `backend/src/test/java/com/example/bookflow/application/ResourceServiceTest.java`
  - 既存 4 箇所の `resourceService.list(...)` 呼び出しに `keyword` 引数（`null`）を追加
  - keyword 関連の新規テスト 5 件（空白のみ入力の未適用、keyword 単独、category との AND、ワイルドカード文字のエスケープ、from/to 経路への適用）を `List_` ネストクラスに追加
  - Mockito 単体テストのため Repository はモック。大文字小文字非依存・`description` NULL の実際の LIKE 照合は検証できない旨をプランに注記し、Controller 結合テスト（H2）側でカバー
- `backend/src/test/java/com/example/bookflow/presentation/ResourceControllerTest.java`
  - keyword 検索専用の seed リソース 7 件（`KEYWORD_NAME_ID` / `KEYWORD_DESC_ID` / `KEYWORD_PERCENT_ID` / `KEYWORD_PERCENT_DECOY_ID` / `KEYWORD_UNDERSCORE_ID` / `KEYWORD_UNDERSCORE_DECOY_ID` / `KEYWORD_INACTIVE_ID`）を追加
  - keyword 検索の統合テスト 9 件を追加：大文字小文字非依存の name 一致、description のみ一致（NULL description の非エラー確認を兼ねる）、`%` のリテラル扱い（デコイで判別）、`_` のリテラル扱い（デコイで判別）、category との AND、ロール別可視範囲（MEMBER/ADMIN）、from/to 経路との組み合わせ、空白のみ入力時の未適用

## 実行結果

- `./gradlew spotlessApply checkstyleMain`：差分なし（整形済み）。Checkstyle 警告 2 件は本変更と無関係な既存コード（`ReservationRepository` のメソッド名）
- `./gradlew test --tests "*ResourceServiceTest" --tests "*ResourceControllerTest"`：BUILD SUCCESSFUL（`ResourceServiceTest$List_` 9 件、`ResourceControllerTest` 30 件、すべて成功）

## 技術判断の根拠（Functional Design からの変更なし）

- `@Query`（JPQL）＋ 分岐メソッド方式を採用し、`(:category IS NULL OR r.category = :category)` のような null 許容 OR 条件は使わない。H2（テスト環境）と PostgreSQL（本番環境）でパラメータ型推論の挙動差が出うるリスクを避け、既存コードの「カテゴリ・ロールの組み合わせごとに専用メソッドを用意する」パターンとの一貫性を優先した
