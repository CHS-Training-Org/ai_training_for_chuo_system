---
type: spec
title: 繰り返し予約
description: 定期的なスケジュールで繰り返し予約を自動生成するエンハンス課題のビジネス要求シート
tags:
  - spec
  - enhancement
  - recurring
  - reservation
timestamp: 2026-07-06
audience: 学習者・メンター
references:
  - Docs/spec/requirements.md
  - Docs/spec/enhancements/index.md
---

# 繰り返し予約

---

## 背景

BookFlow では毎週月曜の定例会議室や月次報告で使う会議室を毎回個別に予約しなければなりません。繰り返しパターン（毎週・毎月）を 1 回の操作で一括登録できる機能を追加することで、定期的な利用者の手間を大幅に減らせます。

現在の `reservations` テーブルには繰り返しに関するカラムが存在せず、`POST /api/reservations` も 1 件ずつの登録のみ対応しています。本課題ではスキーマ拡張・API 拡張・UI 追加を縦切りで実装します。これはユースケース UC-03（予約申請・管理）の拡張にあたります。

## 依存関係

- 前提課題：なし（ベースシステムの既存 `POST /api/reservations`・予約申請フォームのみに依存）
- 競合する課題：
  - [予約の下書き保存](./reservation-draft.md)。両課題とも `POST /api/reservations` と予約申請フォーム（`/reservations/new`）を変更するため、並行着手は非推奨。
  - **Flyway マイグレーションの番号衝突**：本課題は新規マイグレーションを追加する。Flyway のバージョン番号は対象テーブルに関係なく**リポジトリ全体で1本のグローバル連番**のため、同じく新規マイグレーションを追加する [リソース詳細画面の情報拡充](./resource-detail-info.md)・[リソース画像アップロード](./resource-image-upload.md) と `V002` の**番号衝突**が起きる（現状は `V001` のみ）。並行着手する場合は採番を調整する。
- 推奨着手順序：本課題の完成後に [既存機能の E2E テスト追加](./e2e-test-coverage.md) を行うとよい。

## 要件

| # | 要件 |
|---|------|
| RSV-01 | `reservations` テーブルに繰り返し設定を格納するカラム（例：`recurrence_type`「NONE / WEEKLY / MONTHLY」・`recurrence_until`「繰り返し終了日」）を Flyway マイグレーションで追加する |
| RSV-02 | `POST /api/reservations` にて繰り返しパターン（`recurrenceType`・`recurrenceUntil`）を受け付け、指定パターンに従い複数の予約レコードを一括作成する |
| RSV-03 | 一括作成した予約はそれぞれ独立した予約として管理される（個別にキャンセル・変更が可能） |
| RSV-04 | 一括作成時に 1 件でも重複（`checkConflict`）が検出された場合は全件ロールバックし、エラーを返す |
| RSV-05 | 予約申請フォーム（`/reservations/new`）に繰り返しパターンの入力 UI を追加する（「繰り返さない」「毎週」「毎月」と終了日） |

## 受入条件

- [ ] 「毎週」を選択して申請すると、開始日から終了日まで毎週同じ曜日・時間帯の予約が一括登録される
- [ ] 「毎月」を選択して申請すると、開始日から終了日まで毎月同日の予約が一括登録される
- [ ] 一括登録された予約は予約一覧に個別に表示され、それぞれ詳細確認・キャンセルが可能
- [ ] 繰り返し範囲内に重複する予約がある場合、全件登録がロールバックされエラーメッセージが表示される
- [ ] 「繰り返さない」（デフォルト）を選択した場合は従来どおり 1 件の予約として登録される
- [ ] Flyway マイグレーションが正常に実行され、既存データへの影響がない
- [ ] バックエンドの既存テストが引き続き pass する
- [ ] 繰り返し生成ロジックに対応するユニットテストを追加する

## 影響範囲

- 推定工数：1〜2日
- 対象レイヤー：両方
- 更新が必要な spec：
  - `er-diagram.md` §`reservations` テーブル：`recurrence_type`・`recurrence_until` カラムを追記
  - `api-spec.md` §`POST /api/reservations`：繰り返しパラメータ（`recurrenceType`・`recurrenceUntil`）とレスポンス（複数件返却）を追記
  - `screen-spec.md` §`/reservations/new`：繰り返し入力 UI を追記

## AI 活用ポイント

- plan mode で「繰り返し予約レコードをまとめる `reservation_series` テーブルを別途作るか、各レコードに `series_id` を持たせるか、完全独立 FK なしにするか」の設計トレードオフを相談する（本要件では「独立した予約」と定義しているが、将来の一括変更・キャンセルの要件次第で最適設計は変わる）
- `@Transactional` で複数件の一括 INSERT とロールバックを AI に実装させ、`checkConflict` の呼び出し順序（全件チェック後に INSERT する方式 vs. 1 件ずつチェック＆INSERT）を議論する
- 日付生成ロジック（毎週 N 週後・毎月同日）は Java の `java.time` API を活用する方法を AI に確認する
