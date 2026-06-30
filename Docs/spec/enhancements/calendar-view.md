---
type: spec
title: カレンダービュー
description: 予約状況をカレンダー形式で可視化するエンハンス課題のビジネス要求シート
tags:
  - spec
  - enhancement
  - calendar
timestamp: 2026-06-16
audience: 学習者・メンター
references:
  - Docs/spec/requirements.md
  - Docs/spec/enhancements/index.md
---

# カレンダービュー

---

## 背景

BookFlow のリソース詳細画面（`/resources/{id}`）には、当日〜7 日後の空き時間帯リスト（`GET /api/resources/{id}/availability` が返す `OccupiedSlot` の一覧）が表示されています。しかしリスト形式では週・月単位でのリソースの混雑感が把握しにくく、直感的に空き枠を選びにくい状況です。

週・月単位のカレンダー形式で予約状況を視覚的に表示することで、利用者が空き枠を見つけやすくなります。既存の空き確認 API（`GET /api/resources/{id}/availability`）を活用してフロントエンドのみの変更で実現します。これはユースケース UC-02（リソース一覧・空き確認）の表示拡張にあたります。

## 要件

| # | 要件 |
|---|------|
| RSV-01 | リソース詳細画面（`/resources/{id}`）にカレンダー形式の空き状況ビューを追加する |
| RSV-02 | カレンダーは週表示・月表示の切り替えができる |
| RSV-03 | カレンダー上で予約済み枠はグレーアウト、空き枠はクリック可能（クリックで予約申請フォームに日時を引き渡す） |
| RSV-04 | 表示期間を変更（前週・次週 等）すると、その期間の空き情報を取得して更新する |
| RSV-05 | 既存の空き確認リスト表示と共存する（または置き換える）かは実装者の判断に委ねる |

## 受入条件

- [ ] リソース詳細画面でカレンダー形式の空き状況が表示される
- [ ] 週表示と月表示を切り替えられる
- [ ] カレンダー上の空き枠をクリックすると予約申請フォーム（`/reservations/new`）に開始日時が引き渡される
- [ ] 予約済み枠は視覚的に区別されている（色・パターン・テキスト等）
- [ ] 表示期間を前後に移動できる
- [ ] 既存の空き確認 API（`GET /api/resources/{id}/availability`）以外のバックエンド変更が不要である

## 影響範囲

- 対象レイヤー：frontend
- 更新が必要な spec：
  - `screen-spec.md` §`/resources/{id}` — カレンダー表示 UI と操作（期間切り替え・クリック動作）を追記

## 依存関係

- 前提課題：なし（既存の空き確認 API `GET /api/resources/{id}/availability` のみに依存）
- 競合する課題：[リソース詳細画面の情報拡充](./resource-detail-info.md)・[リソース画像アップロード](./resource-image-upload.md) — いずれもリソース詳細画面（`/resources/{id}`）を共有して変更するため、同時並行ではマージ競合の可能性がある。
- 推奨着手順序：本課題の完成後に [既存機能の E2E テスト追加](./e2e-test-coverage.md) を行うとよい。

## AI 活用ポイント

- plan mode で「カレンダーライブラリ（`react-big-calendar`・`@fullcalendar/react`・`shadcn/ui` をベースにした自作）の選定」を相談する（外部ライブラリ導入時は `pnpm add` 前にライセンスを確認する）
- `GET /api/resources/{id}/availability` の `from`/`to` を表示期間に合わせて動的に計算するロジックを AI に生成させる
- カレンダーの週・月切り替えロジックは `Zustand` に載せるか `useState` で管理するかを AI と議論する
