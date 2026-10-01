---
type: working-doc
title: Business Rules（Functional Design、ユニット: resource-list-filter）
description: AI-DLC Functional Design ステージが生成する業務ルール・バリデーション
timestamp: 2026-10-01
---

# Business Rules — resource-list-filter

## キーワードフィルタのルール

| # | ルール |
|---|------|
| BR-01 | `keyword` が `null` または空白のみの場合、キーワード条件は適用しない（既存の挙動を維持する） |
| BR-02 | `keyword` が指定された場合、前後の空白をトリムしたうえで小文字化し、`name` または `description` のいずれかに部分一致すれば結果に含める |
| BR-03 | `description` が `null` のリソースは、キーワード側のマッチングでは空文字列として扱う（`description` 未設定のリソースがキーワード検索で誤って例外・除外を起こさないようにする） |
| BR-04 | `category`・`from`/`to`（空き確認）・`keyword` は互いに独立した条件としてAND結合する（要件RES-04 = requirements.md RES-09） |
| BR-05 | LIKEパターンのワイルドカード文字（`%`・`_`）のエスケープは行わない（Requirements Analysisで明示的にスコープ外と確定済み。ユーザーがこれらの文字を含むキーワードを入力した場合の挙動は未規定のまま許容する） |

## 大文字小文字非区別の実現方法

- PostgreSQLの`ILIKE`演算子は使わない。H2（テストDB）がPostgreSQL固有演算子をサポートしないため、`LOWER(column) LIKE LOWER(:pattern)` 方式のJPQLで本番・テストの両方で同じ挙動にする（Reverse Engineeringで確認済みの制約）。
- `pattern` 文字列自体をJava側で小文字化してから渡す（`LOWER(:pattern)` と二重に小文字化しても結果は変わらないため、どちらか一方で統一する。Service側で小文字化し、JPQL側は `LOWER(column) LIKE :pattern` とする）。

## `keyword` が未指定のときの後方互換性

- `keyword` 未指定（`null`）時、`pattern` を `"%%"`（任意の文字列にマッチ）として扱うことで、既存の `category`・`isActive` のみによる絞り込み結果と完全に一致させる。これにより既存テスト（`ResourceServiceTest`・`ResourceControllerTest`）が無改修でpassすることを保証する（受入条件「`keyword` パラメータ未指定時の動作は既存と変わらない」）。

## フロントエンドのルール

| # | ルール |
|---|------|
| BR-06 | キーワード入力欄が空文字列の場合、URLクエリパラメータに `keyword` を含めない（送信しない）。これによりバックエンドのBR-01と整合する |
| BR-07 | キーワード入力欄は自由入力（バリデーションなし）。文字数制限・禁止文字チェックは行わない（要件シートに規定がないため） |
