# 予約の下書き保存

> 対象読者：学習者・メンター
> 参照：[../requirements.md](../requirements.md) / [index.md](./index.md)

---

## 背景

BookFlow の `reservations.status` に `DRAFT` ステータスが定義されています（`V001__create_initial_schema.sql` の CHECK 制約に含まれる）。しかし現在の予約申請フロー（`POST /api/reservations`）はステータスを `PENDING` で固定しており、下書き保存機能は実装されていません。

フォーム入力途中の予約を `DRAFT` として保存し、後から再編集・正式申請できる機能を追加することで、複雑な予約（目的・参加人数の確認が必要な場合など）をゆっくり準備できるようになります。これはユースケース UC-03（予約申請・管理）の拡張にあたります。

## 要件

| # | 要件 |
|---|------|
| RSV-01 | `POST /api/reservations` に下書き保存オプションを追加し、`"draft": true` を指定するとステータス `DRAFT` で予約を作成する |
| RSV-02 | `DRAFT` ステータスの予約は承認フローに流れない（`approval_steps` が作成されない）。申請者本人のみが閲覧・編集・削除できる |
| RSV-03 | `PUT /api/reservations/{id}` で `DRAFT` → `PENDING` への遷移（正式申請）をサポートする |
| RSV-04 | 予約申請フォームに「下書き保存」ボタンを追加する |
| RSV-05 | 予約一覧の「下書き」タブまたはフィルタで `DRAFT` 予約を確認できる |

## 受入条件

- [ ] 「下書き保存」ボタンをクリックすると、`DRAFT` ステータスで予約が保存される
- [ ] 下書きは予約一覧（`/reservations`）の `DRAFT` フィルタで表示される
- [ ] 下書き詳細ページ（`/reservations/{id}`）から再編集・正式申請（`PENDING` に変更）ができる
- [ ] 下書き予約は承認一覧（`/approvals`）に表示されない
- [ ] 申請者本人以外が `DRAFT` 予約の詳細にアクセスすると 403 が返る（ADMIN は除く）
- [ ] バックエンドのステータス遷移テストに `DRAFT` → `PENDING` のケースを追加する

## 影響範囲

- 対象レイヤー：両方
- 更新が必要な spec：
  - `api-spec.md` §`POST /api/reservations` — `draft` フラグとステータス `DRAFT` での作成を追記；§`PUT /api/reservations/{id}` — `DRAFT` → `PENDING` 遷移を追記
  - `screen-spec.md` §`/reservations/new` — 「下書き保存」ボタンを追記；§`/reservations` — `DRAFT` タブ・フィルタを追記；§`/reservations/{id}` — 下書き時の操作（再編集・正式申請）を追記
  - `requirements.md` §予約ステータス遷移 — `DRAFT` 遷移パターンを追記

## AI 活用ポイント

- plan mode で「`DRAFT` → `PENDING` のステータス遷移バリデーション（不正遷移の防止）をどこで実装するか（Service 層 vs. ドメイン層）」を相談する
- `ReservationService.update()` への遷移ロジック追加と、`DRAFT` 時に `approval_steps` 作成をスキップする条件分岐を AI に実装させる
- 権限チェック（`DRAFT` は本人のみ編集可）を Spring Security の `@PreAuthorize` で実装する方法を AI に確認する
