---
type: note
title: Business Rules（Functional Design）
description: AI-DLC Functional Design ステージが生成したリソース一覧ソート機能の業務ルール
tags:
  - ai-dlc
  - functional-design
timestamp: 2026-08-13
---

# Business Rules — リソース一覧ソート機能

## BR-01: 許可されるソートフィールド

`sort` パラメータで指定できるフィールドは `name`・`capacity`・`createdAt` の3種のみ。それ以外のフィールド名が指定された場合はエラーとする（BR-04参照）。

- **根拠**: `resource-list-sort.md` RES-01
- **検証方法**: `sort` に許可外フィールドを指定した場合に400が返るテストを追加する

## BR-02: デフォルトソート順

`sort` パラメータ未指定時は `createdAt` の昇順（登録日時が古い順）を適用する。既存の暗黙動作を変更しない。

- **根拠**: `resource-list-sort.md` RES-02
- **同値時の順序**: `createdAt` が同一のリソースが複数存在する場合、それらの間の順序は未定義とする（第2ソートキーは設けない）。issue #22 の受入条件は同一登録日時の順序を要求しておらず、第2キー導入は本課題のスコープを超えるため
- **検証方法**: `sort` 未指定時の一覧順が変更前と一致することを既存テストで確認する

## BR-03: `capacity` ソート時の null 定員の扱い

`capacity` でソートする場合、`capacity` が `null`（未設定）のリソースは、昇順・降順のどちらを選択した場合でも常に一覧の**末尾**に表示する。

- **根拠**: 受入条件に未記載のため設計判断として明記（`requirements.md` RES-05）。定員未設定のリソースが「定員が多い順」の先頭に来る、または「定員が少ない順」の先頭に来ると直感に反するため、どちらの方向でも末尾固定とする
- **実装上の注意**: DB の `ORDER BY capacity DESC` に委譲する実装では、PostgreSQL の既定（`DESC` は `NULLS FIRST`）により null が先頭に来てしまい本ルールを満たさない（2026-08-13 実測、`aidlc-audit.md` 参照）。`ResourceService` は `from`/`to` の指定有無によらず、候補リストをアプリケーション側で全件取得し `Comparator`（`nullsLast`）でソートする（`business-logic-model.md` 参照）
- **検証方法**: `capacity` が null のリソースを含むデータで昇順・降順それぞれをテストし、null のリソースが最後の要素になることを確認する

## BR-04: 不正な `sort` 値の扱い

`sort` に BR-01 の許可フィールド以外の値、または `asc`/`desc` 以外の方向が指定された場合、`ValidationException`（既存クラス、`GlobalExceptionHandler` で400にマッピング済み）を送出する。

- **根拠**: `requirements.md` RES-07。未定義の入力に対する挙動を明確化するための設計判断
- **検証方法**: 許可外フィールド・許可外方向それぞれで400が返ることをテストする

## BR-05: `name` ソートの大文字小文字非依存

`name` でソートする場合、アルファベットの大文字・小文字を区別せずに比較する。

- **根拠**: `resource-list-sort.md` 背景節「リソース名のアルファベット順」の意図を汲んだ設計判断（`requirements.md` RES-06）
- **実装上の注意**: DB の `ORDER BY name ASC` に委譲する実装では、DB のロケール（例：`en_US.utf8`）に依存した辞書式順序になり、大文字小文字を区別しない比較と一致する保証がない（2026-08-13 実測、`aidlc-audit.md` 参照）。BR-03 と同じ理由で、`ResourceService` はアプリケーション側で `String.CASE_INSENSITIVE_ORDER` による `Comparator` を適用する
- **検証方法**: 大文字・小文字が混在する名称データで昇順ソートし、期待順（大文字小文字を無視した辞書順）と一致することを確認する

## BR-06: フィルタとの組み合わせ

`category`・`from`/`to`（空き確認フィルタ）と `sort` は独立して組み合わせ可能であり、どの組み合わせでも `sort` の指定が適用される。

- **根拠**: `resource-list-sort.md` 受入条件（キーワード検索を除く）
- **検証方法**: `category`+`sort`、`from`/`to`+`sort` それぞれの組み合わせでソート順が適用されることをテストする
