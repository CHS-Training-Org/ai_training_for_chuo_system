---
type: working-doc
title: Requirements（Requirements Analysis）
description: AI-DLC Requirements Analysis ステージが生成する要件定義（対象：リソース一覧のフィルタ・キーワード検索）
timestamp: 2026-09-29
---

# Requirements

## Intent Analysis Summary

- **User Request**: STEP-04（初級課題2回目、AI-DLCを使う）として、resource-list-filter エンハンス課題を AI-DLC を使って作り直す
- **Request Type**: Enhancement（既存機能の拡張）
- **Scope Estimate**: Multiple Components（フロントエンド＋バックエンドの両レイヤー）
- **Complexity Estimate**: Simple（推定工数2〜3時間、初級課題）
- **Depth**: Standard（機能要件はビジネス要求シートで明確。設計判断のみ明確化質問で解消）

## ソース

対象のビジネス要求シート: `docs-next/docs/spec/enhancements/beginner/resource-list-filter.md`

## 機能要件

| # | 要件 |
|---|------|
| RES-01 | `GET /api/resources` にキーワード検索クエリパラメータ（`keyword`）を追加し、`resources.name` および `resources.description` への部分一致で結果を絞り込める |
| RES-02 | キーワード検索は大文字・小文字を区別しない（`LOWER(...)` による比較） |
| RES-03 | `ResourceFilterForm` にキーワード入力フィールドを追加し、「絞り込む」送信時に `keyword` を URL パラメータとして付与する |
| RES-04 | 既存のカテゴリ・期間フィルタとキーワードフィルタは AND 条件で組み合わせられる |

## 非機能要件・設計方針（明確化質問で確定）

| # | 項目 | 決定事項 |
|---|------|------|
| NFR-01 | クエリ実装方式 | `@Query`（JPQL）による `search()` メソッドへの統合。既存の派生クエリメソッド6種（`isActive`×`category`）をこの1メソッドに集約する |
| NFR-02 | LIKEワイルドカードエスケープ | 今回のスコープに含めない（要件シートの受入条件に含まれないため）。既知の技術的負債として `code-quality-assessment.md` に記録済み、対応は将来課題とする |
| NFR-03 | フィルタ条件のパラメータオブジェクト化 | 今回のスコープに含めない。要件通り、各メソッドの引数に `keyword` を追加する最小変更に留める |

## 拡張機能（Opt-In）

| Extension | Enabled |
|---|---|
| Security Baseline | No |
| Resiliency Baseline | No |
| Property-Based Testing | No |

## ユーザーシナリオ

- 利用者（MEMBER/APPROVER/ADMIN）が `/resources` 画面でキーワードを入力し「絞り込む」を押すと、名称または説明にそのキーワードを含むリソースのみが一覧表示される
- キーワード欄を空にして送信すると、キーワード条件は解除され従来通りの一覧が表示される
- カテゴリ・期間フィルタとキーワードを同時に指定すると、すべての条件を満たすリソースのみが表示される（AND条件）
- `keyword` パラメータを指定しない場合（既存クライアント・既存テストからの呼び出し）は、従来と同じ動作を維持する

## 受入条件

- [ ] キーワードを入力して絞り込むと、リソース名または説明にそのキーワードを含む結果のみが表示される
- [ ] キーワードフィールドを空にして「絞り込む」を押すと、キーワード条件が解除される
- [ ] カテゴリ・期間フィルタとキーワードを同時に指定できる（AND条件で絞り込まれる）
- [ ] `keyword` パラメータ未指定時の動作は既存と変わらない（全件取得）
- [ ] バックエンドの既存テスト（`ResourceServiceTest` 等）が引き続き pass する
- [ ] 追加した検索ロジックに対応するユニットテストをバックエンドに追加する

## 技術的背景（Reverse Engineeringより）

- 対象レイヤー: バックエンド（`ResourceController`/`ResourceService`/`ResourceRepository`）、フロントエンド（`ResourceFilterForm.tsx`/`page.tsx`/`resources.ts`）
- 更新が必要な spec: `api-spec.md` §`GET /api/resources`、`screen-spec.md` §`/resources`
- H2（テストDB）は PostgreSQL 固有演算子（`ILIKE`）が使えないため、`LOWER(...) LIKE :pattern` 方式のJPQLで大文字小文字非区別を実現する

## 影響範囲

- 推定工数: 2〜3時間
- 対象レイヤー: 両方（フロントエンド・バックエンド）
- 更新spec: `api-spec.md`、`screen-spec.md`（Code Generationの前提として、実装計画に含める。統合自体は `/update-spec` で行う）
