# User Stories

> Minimal 深さでの生成（`../plans/user-stories-assessment.md` 参照）。ストーリーは1件。受入条件は `requirements.md`（FR-01〜FR-07）および元のエンハンス課題シートの受入条件と一致させている。

## STORY-01: キーワードでリソースを検索する

**As a** 会員（検索する利用者）
**I want to** リソース名・説明文に含まれるキーワードで一覧を絞り込みたい
**So that** カテゴリや期間だけでは絞り込めない場合でも、目的のリソースを素早く見つけられる

### INVEST チェック

- **Independent**: 既存のカテゴリ・期間フィルタの実装を変更せず、`keyword` 条件を追加するだけで成立する
- **Negotiable**: 検索方式（`@Query` カスタム JPQL、`LOWER()` 比較）は実装の詳細であり、ストーリー自体は「キーワードで絞り込める」という結果にのみ依存する
- **Valuable**: 検索性向上というエンハンス課題の背景（「リソース数が増えると目当てのリソースを見つけるのに手間がかかる」）に直接対応する
- **Estimable**: 既存の `ResourceFilterForm` 実装パターン・`ResourceRepository` のテストパターンが参照可能であり、見積もりは容易（エンハンス課題シート記載の推定工数1日）
- **Small**: 単一フィールド・単一エンドポイントの変更に閉じる
- **Testable**: 下記の受け入れ基準はすべて既存のテストパターン（`ResourceServiceTest`/`ResourceControllerTest`）で自動テスト可能

### 受け入れ基準

- [ ] キーワードを入力して絞り込むと、`resources.name` または `description` に当該キーワードを含むリソースのみが表示される（大文字・小文字は区別しない）
- [ ] キーワードに `%` や `_` が含まれていても、ワイルドカードとして解釈されずリテラル文字列として検索される
- [ ] キーワード欄を空、または空白のみにして絞り込むと、キーワード条件が解除される（未指定時と同じ全件対象）
- [ ] カテゴリ・期間フィルタとキーワードを同時に指定すると、3条件すべてを満たす AND 条件で絞り込まれる
- [ ] ADMIN がキーワード検索した場合も、`is_active=false` を含む既存の可視性ルールは変わらない
- [ ] 既存の `ResourceServiceTest` / `ResourceControllerTest` が pass し続ける

## Persona Mapping

| Story | Persona |
|---|---|
| STORY-01 | 会員（検索する利用者） |
