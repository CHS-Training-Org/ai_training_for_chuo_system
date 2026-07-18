---
type: spec
title: 利用実績の集計・グラフ表示
description: リソース別・期間別の予約利用実績を集計してグラフで可視化するエンハンス課題ビジネス要求シート
tags:
  - spec
  - enhancement
  - statistics
  - analytics
timestamp: 2026-07-06
audience: 学習者・メンター
references:
  - Docs/spec/requirements.md
  - Docs/spec/enhancements/index.md
---

# 利用実績の集計・グラフ表示

---

## 背景

BookFlow の管理者ダッシュボード（`/`）は現在、承認待ち件数などの概要情報を表示しています。リソースごとの利用率・稼働時間を集計して可視化することで、管理者がリソースの稼働状況を把握し、増設・廃止の判断材料にできます。

バックエンドには `reservations` テーブルに実績データが蓄積されていますが、集計 API は存在しません（`GET /api/reservations` は個別の予約一覧のみを返します）。本課題では集計クエリを新 API として実装し、フロントエンドにグラフ表示を追加します。これはユースケース UC-08（利用統計・管理）の実装にあたります。

## 依存関係

- 前提課題：なし（既存の `reservations` テーブルの蓄積データのみに依存）
- 競合する課題：なし（新規エンドポイント `GET /api/statistics/resources` と新規統計ページの追加が中心）
- 推奨着手順序：後続として [OpenAPI クライアント自動生成](./openapi-client-gen.md)・[既存機能の E2E テスト追加](./e2e-test-coverage.md) がある。

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
  - `requirements.md` §UC-08：実装済みとして内容を更新

## AI 活用ポイント

- plan mode で「集計を JPQL / ネイティブクエリ / DB ビューのどれで実装するか」を相談する
- `@Query` アノテーションを使った GROUP BY 集計クエリを AI に生成させ、`reservations.end_at - reservations.start_at`（稼働時間計算）の SQL 方言（PostgreSQL）を確認する
- グラフライブラリの選定（`recharts`・`chart.js` 等）を plan mode で相談し、shadcn/ui との相性を確認する
