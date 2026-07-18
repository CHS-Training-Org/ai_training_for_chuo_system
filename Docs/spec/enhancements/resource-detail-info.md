---
type: spec
title: リソース詳細画面の情報拡充
description: リソース詳細画面に稼働状況・予約履歴・メモなどの追加情報を表示するエンハンス課題ビジネス要求シート
tags:
  - spec
  - enhancement
  - resource
  - detail
timestamp: 2026-07-06
audience: 学習者・メンター
references:
  - Docs/spec/requirements.md
  - Docs/spec/enhancements/index.md
---

# リソース詳細画面の情報拡充

---

## 背景

BookFlow の `resources` テーブルが持つカラムは `name`・`category`・`capacity`・`location`・`requires_approval`・`is_active`・`description` です。リソース詳細画面（`/resources/{id}`）はこれらを表示していますが、予約前に確認したい情報（設備の一覧、利用上の注意など）を格納するフィールドが存在しません。

設備情報（プロジェクターの有無、ホワイトボード数など）や利用注意事項をリソースごとに登録・表示できるようにすることで、利用者が予約前に必要な情報を確認できるようになります。これはユースケース UC-02（リソース一覧・空き確認）の拡張にあたります。

## 依存関係

- 前提課題：なし（ベースシステムの既存 `resources` テーブル・リソース画面のみに依存）
- 競合する課題：
  - [リソース画像アップロード](./resource-image-upload.md)。両課題とも `resources` テーブルへの新規 Flyway マイグレーション、`GET /api/resources/{id}` レスポンス、`/admin/resources` 編集画面を変更する。並行着手は非推奨。
  - [カレンダービュー](./calendar-view.md)。リソース詳細画面（`/resources/{id}`）を共有して変更するため、同時並行ではマージ競合の可能性がある。
  - **Flyway マイグレーションの番号衝突**：本課題は新規マイグレーションを追加する。Flyway のバージョン番号は対象テーブルに関係なく**リポジトリ全体で1本のグローバル連番**のため、同じく新規マイグレーションを追加する [リソース画像アップロード](./resource-image-upload.md)・[繰り返し予約](./recurring-reservation.md) と `V002` の**番号衝突**が起きる（現状は `V001` のみ）。並行着手する場合は採番を調整する。
- 推奨着手順序：本課題の完成後に [既存機能の E2E テスト追加](./e2e-test-coverage.md) を行うとよい。

## 要件

| # | 要件 |
|---|------|
| RES-01 | `resources` テーブルに情報拡充用のフィールド（例：`equipment TEXT`「設備一覧」・`notes TEXT`「利用上の注意」）を Flyway マイグレーション（新規 SQL ファイル）で追加する |
| RES-02 | `Resource` エンティティ・`ResourceResponse` DTO に新フィールドを追加し、`GET /api/resources/{id}` のレスポンスに含める |
| RES-03 | `CreateResourceRequest` / `UpdateResourceRequest` に新フィールドの入力を追加し、管理者が登録・編集できるようにする |
| RES-04 | リソース詳細画面（`/resources/{id}`）に新フィールドの表示を追加する |
| RES-05 | `GET /api/resources` の一覧レスポンスは従来どおり（`ResourceResponse` に含めてよい） |

## 受入条件

- [ ] 管理者がリソース登録・編集画面から設備情報・利用上の注意を入力・更新できる
- [ ] リソース詳細画面に設備情報・利用上の注意が表示される（未登録時は非表示でよい）
- [ ] Flyway マイグレーションが正常に実行され、既存データへの影響がない（`NULL` 許容）
- [ ] `GET /api/resources/{id}` のレスポンスに新フィールドが含まれる
- [ ] バックエンドの既存テストが引き続き pass する
- [ ] 新フィールドを含む API 動作のテストを追加する

## 影響範囲

- 推定工数：3〜4時間
- 対象レイヤー：両方
- 更新が必要な spec：
  - `er-diagram.md` §`resources` テーブル：新カラムを追記
  - `api-spec.md` §`GET /api/resources/{id}` / §`POST /api/resources` / §`PUT /api/resources/{id}`：新フィールドをリクエスト・レスポンスに追記
  - `screen-spec.md` §`/resources/{id}`：新フィールドの表示を追記；§`/admin/resources`：入力欄を追記

## AI 活用ポイント

- Spec-first で er-diagram.md / api-spec.md / screen-spec.md を先に更新してから実装する（`/update-spec` スキルを使う）
- plan mode で「フィールドを追加するか、別テーブル（`resource_attributes`）にするか」の設計トレードオフを相談する
- Flyway の命名規則（`V002__...sql`）を AI に確認させ、既存の `V001__create_initial_schema.sql` と番号が衝突しないようにする
