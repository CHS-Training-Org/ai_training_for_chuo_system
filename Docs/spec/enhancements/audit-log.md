---
type: spec
title: 操作ログ・監査証跡
description: 予約操作の変更履歴・監査証跡をシステムに記録するエンハンス課題のビジネス要求シート
tags:
  - spec
  - enhancement
  - audit-log
timestamp: 2026-06-16
audience: 学習者・メンター
references:
  - Docs/spec/requirements.md
  - Docs/spec/enhancements/index.md
---

# 操作ログ・監査証跡

---

## 背景

BookFlow では予約申請・キャンセル・承認・却下がいつ誰によって行われたかを追跡する手段がありません。コンプライアンス要件や障害調査のために、これらの操作を監査証跡として記録・閲覧できる機能が求められます。

ARCHITECTURE.md の技術マッピングでは、操作ログの外部サービスとして **Amazon DynamoDB**（開発環境では LocalStack）が拡張先として明示されています。DynamoDB は書き込みスループットが高く、追記専用（append-only）のログ記録に適しています。本課題では予約・承認操作のイベントを DynamoDB に記録し、管理者が閲覧できる監査証跡機能を実装します。

## 要件

| # | 要件 |
|---|------|
| AUDIT-01 | 予約申請・更新・キャンセル・承認・却下の操作を DynamoDB テーブルに記録する（操作種別・操作者 ID・対象予約 ID・タイムスタンプ・操作前後のステータス） |
| AUDIT-02 | DynamoDB への書き込みは非同期（Spring の `@Async` または `ApplicationEvent`）で行い、主処理のレスポンスタイムに影響しない |
| AUDIT-03 | `GET /api/audit/reservations/{id}` エンドポイントを新設し、指定予約の操作履歴を返す |
| AUDIT-04 | `GET /api/audit/events` エンドポイントを新設し、全操作ログを期間・操作種別で絞り込み可能にする（ADMIN のみ） |
| AUDIT-05 | 管理者向けの監査証跡閲覧ページを追加する |

## 受入条件

- [ ] 予約を申請すると DynamoDB に `RESERVATION_CREATED` イベントが記録される
- [ ] 予約をキャンセル・承認・却下すると対応するイベントが DynamoDB に記録される
- [ ] 管理者が監査証跡ページで操作履歴を時系列で閲覧できる
- [ ] DynamoDB への書き込み失敗が予約・承認の主処理に影響しない（例外を握りつぶすか非同期で再試行）
- [ ] LocalStack の DynamoDB テーブルにレコードが保存されていることを確認できる
- [ ] MEMBER / APPROVER ロールが監査証跡 API にアクセスすると 403 が返る

## 影響範囲

- 対象レイヤー：両方
- 更新が必要な spec：
  - `api-spec.md` — §監査証跡（新セクション）として `GET /api/audit/reservations/{id}`・`GET /api/audit/events` を追記
  - `screen-spec.md` — 監査証跡閲覧ページ（新画面）を追記
  - `requirements.md` §技術マッピング — DynamoDB の採用用途を「操作ログ・監査証跡（実装済み）」に更新

## 依存関係

- 前提課題：なし（LocalStack の DynamoDB は `.devcontainer/docker-compose.yml` に定義済みのため、外部サービス準備も不要）
- 競合する課題：[リソース画像アップロード](./resource-image-upload.md) — 両課題とも LocalStack の初期化（本課題は DynamoDB テーブル作成、画像アップロードは S3 バケット作成）を追加するため、初期化スクリプトの配置箇所が重なる可能性がある。
- 推奨着手順序：本課題の完成後に [既存機能の E2E テスト追加](./e2e-test-coverage.md) を行うとよい。

## AI 活用ポイント

- plan mode で「DynamoDB のテーブル設計（パーティションキー：`reservationId`、ソートキー：`timestamp` 等）」を相談する
- LocalStack（DynamoDB）は `.devcontainer/docker-compose.yml` に `SERVICES: s3,dynamodb` で定義済み。サービス追加は不要で、**DynamoDB テーブルの初期化**（`awslocal` CLI または SDK での `CreateTable`）を AI に生成させる
- AWS SDK for Java v2 の `DynamoDbClient`（同期）vs. `DynamoDbAsyncClient`（非同期）の選択と Spring Bean 設定を AI に確認する
- `@EventListener` + Spring の `ApplicationEvent` を使ったイベント駆動のログ記録パターンと、主処理への影響分離を AI と議論する
