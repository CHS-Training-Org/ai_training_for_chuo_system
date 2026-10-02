# Functional Design Plan — ユニット: resource-search（リソース検索・フィルタ追加）

## Unit Context

Application Design / Units Generation は Workflow Planning で SKIP と決定済み（新規コンポーネント不要、Issue #23 自体が単一 units of work）。本ユニットの入力は `Docs/spec/aidlc-docs/inception/requirements/requirements.md` と `Docs/spec/aidlc-docs/inception/user-stories/stories.md`・`personas.md` を直接使用する。

## 実行チェックリスト

- [ ] Step 1: `business-logic-model.md` を生成する（keyword 正規化 → 既存フィルタとの AND 合成のデータフロー）
- [ ] Step 2: `business-rules.md` を生成する（大文字小文字非依存・部分一致・空白扱い・エスケープ・NULL 許容などの業務ルール）
- [ ] Step 3: `domain-entities.md` を生成する（`Resource` エンティティの検索対象フィールド、スキーマ変更なしの確認）
- [ ] Step 4: `frontend-components.md` を生成する（`ResourceFilterForm` の状態・イベント、`resources/page.tsx` の空状態分岐拡張）

## 曖昧点の確認

Requirements Analysis・User Stories の各ステージですでに以下を確定済みのため、本ステージで新たに確認すべき曖昧点はない：

- 空白のみのキーワードは「未入力」として扱う（RES-05）
- keyword 検索 0 件時は専用メッセージを表示する（US-04）
- keyword フィルタは `listPaginated`／`listWithAvailabilityFilter` の両経路に適用する（requirements.md 技術コンテキスト）
- 既存 `ResourceServiceTest` の strict-stubs を壊さない設計方針（同上）

このため、本ステージでは `AskUserQuestion` による追加確認は行わず、Step 1〜4 の成果物生成に進む。**具体的な JPA 実装機構（`@Query` JPQL か `Specification` か）の選定は、本ステージ（技術非依存の業務ロジック設計）の対象外とし、Code Generation の Part 1 Planning で決定する。**
