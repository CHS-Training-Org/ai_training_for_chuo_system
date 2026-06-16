# 予約一覧のフィルタ拡張

> 対象読者：学習者・メンター
> 参照：[../requirements.md](../requirements.md) / [index.md](./index.md)

---

## 背景

BookFlow の予約一覧画面（`/reservations`）には、承認ステータスによるタブ絞り込みが実装されています。しかし「どのリソースを予約したか」による絞り込みや、予約期間（from/to）による絞り込みは実装されていません（`GET /api/reservations` は `status`・`page` のみ受け付けます）。

予約件数が増えると特定のリソースや期間の予約を探すのが困難になるため、リソース名と予約期間のフィルタを追加します。これはユースケース UC-04（予約管理）の使い勝手向上にあたります。

## 要件

| # | 要件 |
|---|------|
| RSV-01 | `GET /api/reservations` にリソース名フィルタパラメータ（`resourceName`）を追加し、部分一致で絞り込める |
| RSV-02 | `GET /api/reservations` に予約期間フィルタパラメータ（`from`・`to`）を追加し、指定期間内に開始または終了する予約を返せる |
| RSV-03 | 予約一覧画面に上記フィルタの入力 UI を追加し、既存のステータスタブと AND 条件で組み合わせられる |

## 受入条件

- [ ] リソース名で絞り込むと、そのリソース名を含む予約のみ表示される
- [ ] 期間（from/to）で絞り込むと、指定期間にかかる予約のみ表示される
- [ ] ステータスタブ・リソース名・期間を組み合わせて絞り込める
- [ ] フィルタをリセットすると全件表示に戻る
- [ ] バックエンドの既存テストが引き続き pass する

## 影響範囲

- 対象レイヤー：両方
- 更新が必要な spec：
  - `api-spec.md` §`GET /api/reservations` — `resourceName`・`from`・`to` パラメータを追記
  - `screen-spec.md` §`/reservations` — フィルタ UI 要素を追記

## AI 活用ポイント

- `ReservationRepository` への期間フィルタ条件（`startAt`/`endAt` と from/to の重なり判定）の JPA クエリを AI に生成させてセルフレビューする
- 既存の `checkConflict` ロジック（`ReservationService:306`）と期間の重なり定義が一致するかを AI に確認させる
