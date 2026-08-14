---
type: note
title: Requirements（Requirements Analysis）
description: AI-DLC Requirements Analysis ステージが生成したissue #22（リソース一覧のソート順選択）の要件定義
tags:
  - ai-dlc
  - requirements
timestamp: 2026-08-07
---

# Requirements Analysis — リソース一覧のソート順選択（Issue #22）

## Intent Analysis Summary

- **User Request**: `Docs/spec/enhancements/resource-list-sort.md`（issue #22）に基づき、リソース一覧（`/resources`）に並び替え機能を追加する
- **Request Type**: Enhancement（既存機能の拡張）
- **Scope Estimate**: Multiple Components（backend: Controller/Service/Repository、frontend: フォーム/BFF/ラベル、Docs: api-spec/screen-spec）
- **Complexity Estimate**: Moderate（`ResourceService` の2経路分岐への個別対応が必要）

## 入力（真実の源）

- `Docs/spec/enhancements/resource-list-sort.md`（要件 RES-01〜03、受入条件5点）
- `Docs/spec/aidlc-docs/inception/reverse-engineering/`（本ワークフローで生成したRE成果物一式）

## スコープ確定事項（ユーザー確認済み）

前提課題「[リソース一覧の検索・フィルタ追加](../../../enhancements/resource-list-filter.md)」（キーワード検索）は現時点で未実装であることを RE ステージで確認した。issue #22 の見積り工数（半日）はキーワード検索の実装を含まないため、**本タスクではソート機能を単独実装し、キーワード検索との組み合わせ検証は対象外とする**（ユーザー承認済み）。

この決定に伴い、以下2点のビジネス要求シートの更新が必要（Code Generation 完了後、`/update-spec` で反映）:
- `resource-list-sort.md` の受入条件「カテゴリ・期間フィルタやキーワード検索との組み合わせでもソートが適用される」→「カテゴリ・期間フィルタとの組み合わせでもソートが適用される」に変更（キーワード検索を対象外に）
- `resource-list-sort.md` の依存関係節：前提課題を「なし」に変更
- `resource-list-filter.md` の依存関係節：「本課題を前提課題とする」という記述を削除（順序の前提が崩れたため）

## Functional Requirements

| # | 要件 | 出典 |
|---|------|------|
| RES-01 | `GET /api/resources` に `sort` クエリパラメータを追加し、`name`・`capacity`・`createdAt` のいずれかのフィールド × `asc`/`desc` の方向を指定できる | resource-list-sort.md |
| RES-02 | `sort` パラメータ未指定時のデフォルトは `createdAt,asc`（現行の暗黙動作を維持） | resource-list-sort.md |
| RES-03 | `ResourceFilterForm` にソート選択 UI を追加し、選択値を URL パラメータ（`sort`）として付与する | resource-list-sort.md |
| RES-04（新規、RE起因） | `ResourceService` の一覧取得ロジックにソートを適用する。当初は `from`/`to` 指定時の手動ページネーション経路（`listWithAvailabilityFilter`）にのみ個別対応する想定だったが、Code Generation Planning 時の実測（`aidlc-audit.md` 参照）により `listPaginated`（Spring Data 標準経路）側もDB委譲ではBR-03・BR-05を満たせないと判明したため、両経路を「全件取得→Comparatorソート」の単一フローに統合する | RE: code-quality-assessment.md の技術的負債 |
| RES-05（新規、設計判断） | `capacity` でのソート時、`capacity` が `null` のリソースは昇順・降順いずれでも末尾に固定する | 受入条件に未記載のため設計判断として明記。理由：nullを先頭固定すると「定員順」の直感に反するため |
| RES-06（新規、設計判断） | `name` でのソートは大文字・小文字を区別しない | 受入条件の「名称のアルファベット順」という意図を汲んだ設計判断 |
| RES-07（新規、設計判断） | `sort` に許可されていないフィールド名・方向が指定された場合は 400 Bad Request を返す | 未定義の入力に対する挙動を明確化。既存の他パラメータのバリデーション方針（`ResourceControllerTest` の400系テスト）との一貫性を優先 |

## Non-Functional Requirements

- **Performance**: リソース件数は学習用途のため小規模（数十〜数百件）と想定。`listWithAvailabilityFilter` 経路のインメモリソートによる性能劣化は許容範囲とする（新規NFR設計は不要）
- **Testability**: 新規ロジック（2経路それぞれのソート適用、null定員の扱い、不正な`sort`値の400応答）にはユニットテストを追加する（RE: 既存テストにソート関連ケースがゼロという指摘を反映）
- **Backward Compatibility**: `sort` 未指定時の既存の挙動（`createdAt` 昇順）・既存の `category`/`from`/`to`/`page` パラメータの挙動は変更しない（RES-02、既存 `ResourceServiceTest`/`ResourceControllerTest` が引き続き pass すること）

## User Scenarios

1. 利用者が `/resources` でカテゴリを選ばず一覧を開く→デフォルトの登録日時昇順で表示される（現行どおり）
2. 利用者が並び替えドロップダウンで「名称順（昇順）」を選択し「絞り込む」を押す→URLに `sort=name,asc` が付与され、名称のアルファベット順（大文字小文字区別なし）で一覧が再表示される
3. 利用者がカテゴリ「会議室」+期間指定+「定員順（降順）」を選択する→会議室カテゴリ・当該期間に空きのあるリソースが、定員の多い順（定員未設定は末尾）で表示される
4. （対象外・将来課題）利用者がキーワード検索と並び替えを同時に使う→本タスクでは未対応。キーワード検索実装後に別途検証する

## Business Context

- **Goals**: リソース数増加時の一覧の見つけやすさ向上（resource-list-sort.md 背景節）
- **Constraints**: 学習用チュートリアルのため、Spring Data の `Pageable`/`Sort` を活用した最小限の実装を志向する（AI活用ポイント節）
- **Success Criteria**: 受入条件5点（キーワード検索関連を除く）を満たし、バックエンド既存テストが pass すること

## Technical Context

- **Integration Points**: `ResourceController` → `ResourceService` → `ResourceRepository`（backend）、`ResourceFilterForm.tsx` → `page.tsx` → `server/actions/resources.ts`（frontend）
- **UI設計判断**: ソート選択UIは既存の「カテゴリ」`Select`（shadcn/ui）と同じパターンのドロップダウンとする（カラムヘッダクリック方式は不採用。理由：現在の一覧はカードレイアウトでテーブルではないため、カラムヘッダという概念が存在しない）
- **データモデル**: テーブル・カラムの変更は不要（`resources` テーブルは既存カラムのみで対応可能）

## Quality Attributes

- 新規ロジック（RES-04〜07）はいずれも「取り消すと落ちる」ユニットテストで検証する（本リポジトリのAIレビュー基準に合わせる）
- 仕様書更新：`Docs/spec/api-spec.md`（`sort`パラメータ）・`Docs/spec/screen-spec.md`（ソート選択UI）を Build and Test 完了後、`/update-spec` で反映する

## 未解決の疑問点

なし（前提課題の依存関係についてはユーザー確認済み。UI方式・null定員の扱い・不正値の挙動はAI活用ポイントに基づく設計判断として本書に明記し、次のWorkflow Planningで提示する）
