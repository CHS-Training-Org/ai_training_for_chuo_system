---
type: spec
title: リソース一覧の検索・フィルタ追加
description: リソース一覧にキーワード検索・カテゴリフィルタ機能を追加するエンハンス課題のビジネス要求シート
tags: [spec, enhancement, resource, search, filter]
timestamp: 2026-06-16
audience: 学習者・メンター
references:
  - Docs/spec/requirements.md
  - Docs/spec/enhancements/index.md
---

# リソース一覧の検索・フィルタ追加

---

## 背景

BookFlow のリソース一覧画面（`/resources`）には、カテゴリ選択と空き確認期間（`from`/`to`）のフィルタがすでに実装されています。しかしリソース名・説明文によるキーワード検索は存在しません。`GET /api/resources` は `category`・`from`・`to`・`page` のみを受け付け、`ResourceFilterForm.tsx` にもキーワード入力欄がありません。

リソース数が増えると目当てのリソースを見つけるのに手間がかかるため、名称・説明文への部分一致検索を追加してユーザビリティを向上させます。これはユースケース UC-02（リソース一覧・空き確認）の拡張にあたります。

## 要件

| # | 要件 |
|---|------|
| RES-01 | `GET /api/resources` にキーワード検索クエリパラメータ（`keyword`）を追加し、`resources.name` および `resources.description` への部分一致で結果を絞り込める |
| RES-02 | キーワード検索は大文字・小文字を区別しない（ILIKE または小文字変換による比較） |
| RES-03 | `ResourceFilterForm` にキーワード入力フィールドを追加し、「絞り込む」送信時に `keyword` を URL パラメータとして付与する |
| RES-04 | 既存のカテゴリ・期間フィルタとキーワードフィルタは AND 条件で組み合わせられる |

## 受入条件

- [ ] キーワードを入力して絞り込むと、リソース名または説明にそのキーワードを含む結果のみが表示される
- [ ] キーワードフィールドを空にして「絞り込む」を押すと、キーワード条件が解除される
- [ ] カテゴリ・期間フィルタとキーワードを同時に指定できる（AND 条件で絞り込まれる）
- [ ] `keyword` パラメータ未指定時の動作は既存と変わらない（全件取得）
- [ ] バックエンドの既存テスト（`ResourceServiceTest` 等）が引き続き pass する
- [ ] 追加した検索ロジックに対応するユニットテストをバックエンドに追加する

## 影響範囲

- 対象レイヤー：両方
- 更新が必要な spec：
  - `api-spec.md` §`GET /api/resources` — `keyword` クエリパラメータと挙動を追記
  - `screen-spec.md` §`/resources` — フィルタフォームの UI 要素にキーワード入力欄を追記

## AI 活用ポイント

- plan mode で「JPA の `Specification` を使う方法 vs. `@Query` でカスタム JPQL を書く方法」の設計判断を相談する
- `ResourceRepository` への検索ロジック追加を AI に生成させ、既存の `findByCategory` / `listPaginated` との整合性をセルフレビューする
- フロントエンドの `ResourceFilterForm.tsx` への入力フィールド追加は既存コードのパターンに合わせて AI に提案させてみる
