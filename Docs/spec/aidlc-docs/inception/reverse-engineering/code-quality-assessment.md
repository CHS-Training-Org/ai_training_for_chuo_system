# Code Quality Assessment（Resource ドメインに限定）

## Test Coverage

- **Overall**: Good（Service層・Controller層ともに既存テストが充実）
- **Unit Tests**: `ResourceServiceTest.java` に 17 件（Mockito ベース、CRUD・一覧・空き照会の分岐を網羅）
- **Integration Tests**: `ResourceControllerTest.java` に 21 件（MockMvc + H2 実データ、ロール別認可・バリデーション含む）

## Code Quality Indicators

- **Linting**: 設定済み（Spotless + Checkstyle、backend／oxlint + oxfmt、frontend）
- **Code Style**: 一貫している（4レイヤーアーキテクチャ・record DTO・Bean Validation の型が全ドメインで統一）
- **Documentation**: Good（エンティティ・Service・Controller に Javadoc あり、クラス冒頭に設計意図のコメントが付与されている）

## Technical Debt

- `Resource.create`/`Resource#update` と `ResourceResponse.from` が全フィールドを位置引数で列挙する構造のため、フィールド追加のたびに複数箇所（エンティティ・DTO 3種・Service 呼び出し2箇所）を連動して変更する必要がある（本課題 Issue #25 でも同様の変更が必要）。既存の `requiresApproval`/`isActive` 追加時も同じパターンで対応されてきたと推測され、本リポジトリの確立された設計判断（ビルダーパターン等への置き換えは提案しない）。

## Patterns and Anti-patterns

- **Good Patterns**:
  - Controller を薄く保ち、業務ロジックを Service に集約する徹底（`ResourceController` に分岐ロジックが一切ない）。
  - DTO とエンティティの明確な分離（`ResourceResponse` がエンティティを外部に漏らさない）。
  - `@PreAuthorize("hasRole('ADMIN')")` によるメソッドレベル認可と、フロントエンド側のロール制御の二重チェック方針。
- **Anti-patterns**: 特になし。本ドメインは一貫した設計に従っている。
