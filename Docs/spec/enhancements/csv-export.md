---
type: spec
title: CSV 帳票出力
description: 予約一覧・利用実績を CSV 形式でエクスポートするエンハンス課題のビジネス要求シート
tags:
  - spec
  - enhancement
  - csv-export
timestamp: 2026-07-06
audience: 学習者・メンター
references:
  - Docs/spec/requirements.md
  - Docs/spec/enhancements/index.md
---

# CSV 帳票出力

---

## 背景

BookFlow の予約データは画面上では閲覧できますが、Excel 等への転記や社内報告への利用には CSV 形式でのエクスポートが求められます。現在 `GET /api/reservations` はページネーション付き JSON のみを返し、CSV ダウンロード機能は存在しません。

管理者が予約一覧・利用実績を CSV でダウンロードできる機能を追加することで、外部ツールとの連携を容易にします。これはユースケース UC-07（CSV・帳票出力）の実装にあたります。

## 依存関係

- 前提課題：なし（既存の `reservations` データを CSV 化する新規エンドポイント `GET /api/reports/reservations/csv` の追加が中心）
- 競合する課題：なし
- 推奨着手順序：後続として [OpenAPI クライアント自動生成](./openapi-client-gen.md)・[既存機能の E2E テスト追加](./e2e-test-coverage.md) がある。

## 要件

| # | 要件 |
|---|------|
| RPT-01 | `GET /api/reports/reservations/csv` エンドポイントを新設し、`Content-Type: text/csv` で予約一覧を CSV ダウンロードできる |
| RPT-02 | CSV には予約 ID・リソース名・申請者名・開始日時・終了日時・目的・承認状態を含む |
| RPT-03 | 出力対象期間（`from`・`to`）と承認ステータス（`status`）をクエリパラメータで絞り込める |
| RPT-04 | ADMIN ロールのみアクセスできる（Spring Security で保護） |
| RPT-05 | フロントエンドの管理者ページに「CSV ダウンロード」ボタンを追加し、クリックでブラウザに CSV ファイルをダウンロードさせる |

## 受入条件

- [ ] 「CSV ダウンロード」ボタンをクリックすると、予約一覧が CSV ファイルとしてダウンロードされる
- [ ] CSV には日本語ヘッダ行が含まれ、文字コードは UTF-8（BOM 付き、Excel での文字化けを防ぐ）
- [ ] 期間・ステータスを絞り込んで対象データを限定した CSV をダウンロードできる
- [ ] MEMBER / APPROVER ロールでアクセスすると 403 が返る
- [ ] バックエンドに CSV 生成ロジックのユニットテストを追加する

## 影響範囲

- 推定工数：半日〜1日
- 対象レイヤー：両方
- 更新が必要な spec：
  - `api-spec.md`：§帳票出力（新セクション）として `GET /api/reports/reservations/csv` を追記
  - `screen-spec.md` §`/admin/resources` または管理者向けページ：CSV ダウンロードボタンの UI 要素を追記

## AI 活用ポイント

- plan mode で「Spring の `StreamingResponseBody` を使う方法 vs. `ResponseEntity<byte[]>` に一括してレスポンスする方法」の実装選択を相談する（大量データの場合はストリーミングが推奨）
- CSV 生成に `opencsv` ライブラリを使うか `StringBuilder` で手書きするかを AI と比較する
- フロントエンドでのダウンロード実装（`<a href>` ダウンロードリンク vs. Fetch + Blob）を AI に確認する
