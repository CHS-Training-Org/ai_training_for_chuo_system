# Tech Stack Decisions — resource-list-filter

本ユニットでは新規の技術選定は発生しない。既存スタックの使い方における決定事項のみを記録する。

## 決定1: 検索ロジックの実装方式

- **決定**: Spring Data の派生クエリメソッド追加ではなく、`ResourceRepository` に `@Query` カスタム JPQL メソッドを1つ追加する
- **理由**: 既存の派生メソッド方式（`category × isActive` で既に4メソッド）に `keyword` 軸を足すと組み合わせ爆発を起こすため（`requirements.md` NFR-01、Requirements Analysis 確認質問で決定済み）
- **却下した代替案**: JPA `Specification` の導入（本リポジトリに前例がなく、新パターン導入のコストが見合わないため却下）

## 決定2: 大文字小文字非区別の比較方法

- **決定**: `LOWER(column) LIKE LOWER(CONCAT('%', :keyword, '%'))` を JPQL に直接記述する
- **理由**: 結合テスト（H2）と本番（PostgreSQL）の両方で同一の構文・挙動を保証するため。PostgreSQL 固有の `ILIKE` は方言依存になるため採用しない（Requirements Analysis 確認質問で決定済み）

## 決定3: ワイルドカード文字のエスケープ

- **決定**: アプリケーション層（`ResourceService` または専用ユーティリティ）で `keyword` 中の `%` と `_` を `\%`・`\_` にエスケープしてから JPQL の `:keyword` にバインドする。JPQL 側は `LIKE ... ESCAPE '\\'` を明示する
- **理由**: ユーザーが検索語に `%` を含めても意図しないワイルドカード動作を起こさないため（Requirements Analysis 確認質問で決定済み）

## 決定4: バリデーション方式

- **決定**: `keyword` の最大長チェックは `ResourceController` の入力段階で行う（既存の `from`/`to` 片方指定チェックと同様、手動チェック＋ `ValidationException` のパターンを踏襲）。Bean Validation アノテーション（`@Size`）を `@RequestParam` に直接付与する方式も既存コードベースのパターンと整合するため、Code Generation 時にどちらが既存コードと一貫するか確認して選ぶ
- **理由**: 新規バリデーションライブラリの導入は不要。既存パターンの踏襲で SECURITY-05 を満たせる
