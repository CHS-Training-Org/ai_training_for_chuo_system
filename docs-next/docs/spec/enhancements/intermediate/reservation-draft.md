---
sidebar_position: 5
title: 予約の下書き保存
description: 予約申請を完了前に下書きとして保存できる機能のエンハンス課題ビジネス要求シート
tags:
  - spec
  - enhancement
  - reservation
  - draft
audience: 学習者・運営者
references:
  - ../../requirements.md
  - ../index.md
last_updated: '2026-11-16T21:00:00+09:00'
---

# 予約の下書き保存

---

## 背景

BookFlow の `reservations.status` に `DRAFT` ステータスが定義されています（`V001__create_initial_schema.sql` の CHECK 制約に含まれる）。しかし現在の予約申請フロー（`POST /api/reservations`）はステータスを `PENDING` で固定しており、下書き保存機能は実装されていません。

フォーム入力途中の予約を `DRAFT` として保存し、後から再編集・正式申請できる機能を追加することで、複雑な予約（目的・参加人数の確認が必要な場合など）をゆっくり準備できるようになります。これはユースケース UC-03（予約申請・管理）の拡張にあたります。

## 依存関係

- 前提課題：なし（`reservations.status` の `DRAFT` は既存スキーマの CHECK 制約に定義済み）
- 競合する課題：
  - [繰り返し予約](./recurring-reservation.md)。両課題とも `POST /api/reservations` と予約申請フォーム（`/reservations/new`）を変更するため、並行着手は非推奨。
  - [予約一覧のフィルタ拡張](../beginner/reservation-list-filter.md)。両課題とも予約一覧画面（`/reservations`）のタブ・フィルタと `GET /api/reservations` を変更するため、同時並行ではマージ競合の可能性がある。

## 要件

| # | 要件 |
|---|------|
| RSV-01 | `POST /api/reservations` に下書き保存オプションを追加し、`"draft": true` を指定するとステータス `DRAFT` で予約を作成する |
| RSV-02 | `DRAFT` ステータスの予約は承認フローに流れない（`approval_steps` が作成されない）。閲覧できるのは申請者本人と ADMIN のみで、編集・削除できるのは申請者本人のみ |
| RSV-03 | `PUT /api/reservations/{id}` で `DRAFT` からの正式申請をサポートする。遷移先はリソースの `requires_approval` で決まり、`true` なら `PENDING`（`approval_steps` を作成する）、`false` なら `APPROVED`（即時確定）とする |
| RSV-04 | 予約申請フォームに「下書き保存」ボタンを追加する |
| RSV-05 | 予約一覧の「下書き」タブまたはフィルタで `DRAFT` 予約を確認できる |
| RSV-06 | 申請者本人は `DRAFT` ステータスの予約を削除できる。削除の API をどう設計するか（エンドポイント・レスポンス）は実装者が決め、`api-spec.md`（API 仕様）に記載する |
| RSV-07 | `DRAFT` ステータスの予約は時間帯を占有しない（他の予約の重複予約チェックの対象にならない）。下書き保存時は重複予約チェックを行わず、正式申請時に行う。重複していれば `409 Conflict` を返し、予約は `DRAFT` のまま残す |

## 受入条件

- [ ] 「下書き保存」ボタンをクリックすると、`DRAFT` ステータスで予約が保存される
- [ ] 下書きは予約一覧（`/reservations`）の `DRAFT` フィルタで表示される
- [ ] 下書き詳細ページ（`/reservations/{id}`）から再編集・正式申請ができる（承認が必要なリソースは `PENDING`、承認不要のリソースは `APPROVED` になる）
- [ ] 下書き予約は承認一覧（`/approvals`）に表示されない
- [ ] 申請者本人と ADMIN 以外が `DRAFT` 予約の詳細にアクセスすると 403 が返る（APPROVER も 403）
- [ ] 申請者本人は下書きを削除できる。申請者本人以外（ADMIN を含む）は下書きを編集・削除できない
- [ ] 同じ時間帯に `PENDING` または `APPROVED` の予約があっても下書き保存はできる。その下書きを正式申請すると 409 が返り、予約は `DRAFT` のまま残る
- [ ] バックエンドのステータス遷移テストに `DRAFT` → `PENDING` と `DRAFT` → `APPROVED` のケースを追加する

## 影響範囲

- 推定工数：半日〜1日
- 対象レイヤー：両方
- 更新が必要な spec：
  - `api-spec.md` §`POST /api/reservations`：`draft` フラグとステータス `DRAFT` での作成を追記；§`PUT /api/reservations/{id}`：`DRAFT` からの正式申請（`PENDING` または `APPROVED` への遷移）と、正式申請時の重複予約チェックを追記；`DRAFT` 予約の削除と、`DRAFT` 予約の詳細の閲覧権限を追記
  - `screen-spec.md` §`/reservations/new`：「下書き保存」ボタンを追記；§`/reservations`：`DRAFT` タブ・フィルタを追記；§`/reservations/{id}`：下書き時の操作（再編集・正式申請・削除）を追記
  - `requirements.md` §予約ステータス遷移：`DRAFT` 遷移パターンを追記；§重複予約チェック仕様：`DRAFT` を対象外とすることと、正式申請時にチェックすることを追記

## AI 活用ポイント

- plan mode で「`DRAFT` からの正式申請のステータス遷移バリデーション（不正遷移の防止）をどこで実装するか（Service 層 vs. ドメイン層）」を相談する
- `ReservationService.update()` への遷移ロジック追加と、`DRAFT` 時に `approval_steps` 作成をスキップする条件分岐を AI に実装させる
- 権限チェック（`DRAFT` は本人のみ編集可）を Spring Security の `@PreAuthorize` で実装する方法を AI に確認する
