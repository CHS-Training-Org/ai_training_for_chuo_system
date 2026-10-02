# NFR Requirements — resource-list-filter

## 評価範囲

本ユニットは既存の認証済み読み取り専用エンドポイント（`GET /api/resources`）への任意パラメータ追加であり、新規データストア・新規認証機構・新規インフラを伴わない。各NFRカテゴリを評価した結果は以下のとおり。

## Scalability Requirements

- **評価**: N/A。チュートリアル規模のデータ量（`V001__create_initial_schema.sql` のシードデータ相当）であり、将来の負荷増大やスケーリングトリガーの設計は本タスクのスコープ外
- **根拠**: `requirements.md` NFR-02 で、検索用インデックス追加も「今回は対象外」と確認済み

## Performance Requirements

- **評価**: N/A（明示的な性能目標なし）。ただし `code-quality-assessment.md` に記録済みの技術的負債（`name`/`description` への未インデックス）は、将来データ量が増えた際の改善候補として申し送る
- **レスポンスタイム目標**: 既存の `GET /api/resources` と同等（追加のベンチマーク要件なし）

## Availability Requirements

- **評価**: N/A。既存エンドポイントの可用性要件（本番 ECS Fargate 構成）から変更なし

## Security Requirements

- **評価**: 適用あり（Security Baseline 拡張、SECURITY-05: 入力バリデーション）
- **要件**:
  - `keyword` パラメータは最大長 **100文字** を上限とする（`resources.name` の `VARCHAR(100)` と整合）
  - 100文字を超える `keyword` を受け取った場合は `400 Bad Request`（既存の `VALIDATION_ERROR` パターンに合わせる）を返す
  - SQL インジェクション対策として、`@Query` では `:keyword` を `@Param` でバインドし、文字列連結による JPQL 組み立ては行わない
  - `keyword` 内の LIKE ワイルドカード文字（`%`, `_`）はアプリケーション層でエスケープしてからバインドする（リテラル検索を保証するため）
  - 他の SECURITY ルール（SECURITY-01〜04, 06〜15）は新規データストア・新規ネットワーク構成・新規認証機構を伴わないため **N/A**（詳細は `requirements.md` の Extension Configuration 節を参照）

## Tech Stack Selection

- **評価**: 新規技術選定なし。既存スタック（Spring Data JPA の `@Query`、Next.js Server Actions）をそのまま使用する
- **決定事項**: `tech-stack-decisions.md` 参照

## Reliability Requirements

- **評価**: 低リスク。既存の `ValidationException` ハンドリングパターン（`from`/`to` 片方指定時と同様）を `keyword` 長超過時にも適用する。新たなフォールトトレランス機構は不要

## Maintainability Requirements

- **評価**: 既存のテスト命名規約（ADR-018: `methodName_condition_expectedBehavior`）を新規テストでも踏襲する。コードコメントではなくテストで意図を示す方針（`.claude/rules` には明記されていないが、BookFlowの既存コードベースの慣行として `code-structure.md` で確認済み）

## Usability Requirements

- **評価**: `ResourceFilterForm` の既存フィールド（カテゴリ・期間）と同じ視覚的パターンでキーワード入力欄を追加し、`label` を適切に関連付ける。新たなアクセシビリティ要件は発生しない

## まとめ

本ユニットで具体的な実装方針を要するNFRは **Security（SECURITY-05）のみ**。最大長100文字・パラメータ化クエリ・ワイルドカードエスケープの3点を NFR Design で各クラスへの落とし込みとして設計する。
