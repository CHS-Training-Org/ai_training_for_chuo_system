---
sidebar_position: 3
title: 利用実績の集計・グラフ表示
description: リソース別・期間別の予約利用実績を集計してグラフで可視化するエンハンス課題ビジネス要求シート
tags:
  - spec
  - enhancement
  - statistics
  - analytics
audience: 学習者・運営者
references:
  - ../../requirements.md
  - ../index.md
last_updated: '2026-11-01T00:00:00+09:00'
---

# 利用実績の集計・グラフ表示

---

## 背景

BookFlow の管理者ダッシュボード（`/`）は現在、承認待ち件数などの概要情報を表示しています。リソースごとの利用率・稼働時間を集計して可視化することで、管理者がリソースの稼働状況を把握し、増設・廃止の判断材料にできます。

バックエンドには `reservations` テーブルに実績データが蓄積されていますが、集計 API は存在しません（`GET /api/reservations` は個別の予約一覧のみを返します）。本課題では集計クエリを新 API として実装し、フロントエンドにグラフ表示を追加します。これは要件定義書の[対象外（学習者拡張課題）](../../requirements.md#learner-extensions)にある「利用実績の集計・グラフ表示」にあたり、主要ユースケース一覧にはまだありません。実装するときに、UC-10（利用統計）として要件定義書に追加します（番号は[ユースケース番号の割り当て](../index.md#uc-numbering)で課題ごとに決めています）。

## 依存関係

- 前提課題：なし（既存の `reservations` テーブルの蓄積データのみに依存）
- 競合する課題：[CSV 帳票出力](./csv-export.md)。どちらの課題も `requirements.md` の主要ユースケース一覧を編集するため、マージのときに同じ行が衝突することがあります（番号は UC-09 と UC-10 に分けてあります）。そのほかは、新規エンドポイント `GET /api/statistics/resources` と新規統計ページの追加が中心です。
- 推奨着手順序：後続として [OpenAPI クライアント自動生成](../advanced/openapi-client-gen.md) がある。

## 要件

| # | 要件 |
|---|------|
| DASH-01 | `GET /api/statistics/resources` エンドポイントを新設し、リソースごとの承認済み予約件数・合計稼働時間（`APPROVED` ステータスの `start_at`〜`end_at` の合計）を返す |
| DASH-02 | 集計期間（`from`・`to`）をクエリパラメータで指定できる |
| DASH-03 | ADMIN ロールのみアクセスできる（Spring Security で保護） |
| DASH-04 | 管理者ダッシュボードまたは新規統計ページに、リソース別利用率のグラフ（棒グラフ等）を表示する |
| DASH-05 | グラフにはリソース名・予約件数・合計時間数を表示する |

## 受入条件

- [ ] ADMIN でサインインして統計ページを開くと、リソース別の予約件数・稼働時間のグラフが表示される
- [ ] 期間を変更するとグラフが再取得・再描画される
- [ ] MEMBER / APPROVER ロールでアクセスすると 403 が返る
- [ ] `GET /api/statistics/resources` が OpenAPI ドキュメント（Springdoc）に反映される
- [ ] バックエンドに集計クエリのユニットテストを追加する

## 影響範囲

- 推定工数：半日〜1日
- 対象レイヤー：両方
- 更新が必要な spec：
  - `api-spec.md`：§統計（新セクション）として `GET /api/statistics/resources` を追記
  - `screen-spec.md`：統計ページ（新画面）または §ダッシュボードを追記
  - `requirements.md`：主要ユースケース一覧と本文に UC-10（利用統計）を追加する。一覧の前文は件数を書かず、「UC-01〜UC-08 はベース実装、UC-09 以降は学習者拡張課題で追加したユースケース」という内容に書き換える（ほかの課題の番号が欠番でもかまわない）。既存の UC-08「管理者がリソースを登録・編集する」は書き換えない

## AI 活用ポイント

- plan mode で「集計を JPQL / ネイティブクエリ / DB ビューのどれで実装するか」を相談する
- `@Query` アノテーションを使った GROUP BY 集計クエリを AI に生成させ、`reservations.end_at - reservations.start_at`（稼働時間計算）の SQL 方言（PostgreSQL）を確認する
- グラフライブラリの選定（`recharts`・`chart.js` 等）を plan mode で相談し、shadcn/ui との相性を確認する
