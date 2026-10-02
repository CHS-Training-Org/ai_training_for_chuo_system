# Requirements — カレンダービュー（Issue #27）

## Intent Analysis Summary

- **User Request**: `/aidlc` 起動（ブランチ `feature/CHS-KOBAYASHI-TOSHINORI/27-calendar-view` から対象タスクを特定）。タスク本体は `docs-next/docs/spec/enhancements/intermediate/calendar-view.md`（カレンダービュー エンハンス課題）。
- **Request Type**: Enhancement（既存のリソース詳細画面への表示拡張）
- **Scope Estimate**: Single Component（`frontend/src/app/resources/[id]/` 配下。バックエンド変更なし）
- **Complexity Estimate**: Moderate（外部カレンダーライブラリ選定・週/月表示切り替え・既存空き確認APIとの連携が必要。業務ロジックの新規追加はなし）
- **Reverse Engineering**: SKIP と判定（根拠は `Docs/spec/aidlc-audit.md` 参照。`docs-next/docs/reference/architecture.md` と `docs-next/docs/spec/{screen-spec,api-spec}.md` を代替コンテキストとして使用）

## 背景（課題シートより）

BookFlow のリソース詳細画面（`/resources/{id}`）には、当日〜7日後の空き時間帯リスト（`GET /api/resources/{id}/availability` が返す `OccupiedSlot` の一覧）が表示されているが、リスト形式では週・月単位の混雑感が把握しにくい。週・月単位のカレンダー形式で予約状況を視覚化し、利用者が空き枠を見つけやすくする。既存の空き確認 API を活用し、フロントエンドのみの変更で実現する（ユースケース UC-02 の表示拡張）。

## 依存関係（課題シートより）

- 前提課題：なし（既存の空き確認 API `GET /api/resources/{id}/availability` のみに依存）
- 競合する課題：[リソース詳細画面の情報拡充](../../../../../docs-next/docs/spec/enhancements/beginner/resource-detail-info.md)・[リソース画像アップロード](../../../../../docs-next/docs/spec/enhancements/advanced/resource-image-upload.md)。いずれも `/resources/{id}` を共有して変更するため同時並行はマージ競合の可能性がある。
- 推奨着手順序：本課題の完成後に [既存機能の E2E テスト追加](../../../../../docs-next/docs/spec/enhancements/beginner/e2e-test-coverage.md) を行うとよい。

## Functional Requirements

| # | 要件 | 出典 |
|---|------|------|
| RSV-01 | リソース詳細画面（`/resources/{id}`）にカレンダー形式の空き状況ビューを追加する | 課題シート |
| RSV-02 | カレンダーは週表示・月表示の切り替えができる | 課題シート |
| RSV-03 | カレンダー上で予約済み枠はグレーアウト、空き枠はクリック可能（クリックで予約申請フォームに日時を引き渡す） | 課題シート |
| RSV-04 | 表示期間を変更（前週・次週／前月・次月）すると、その期間の空き情報を取得して更新する | 課題シート |
| RSV-05 | 既存の空き確認リスト表示と**共存する**（置き換えない） | 課題シート（実装者判断）＋本分析での決定（下記参照） |
| RSV-06（新規） | 月表示で空き枠の日セルをクリックすると、その日を含む週の週表示に切り替える（時間枠単位のクリック・予約フォーム遷移は週表示側で行う） | Clarifying Question 1 の回答 |

## Non-Functional / Design Decisions

- **RSV-05 の決定（共存）**: 既存リストを削除せず、カレンダーと併存させる。理由: (a) 削除・置換は本課題の見積り（半日〜1日）に対して追加の画面構成変更リスクを増やす、(b) 後続の依存課題「既存機能の E2E テスト追加」が既存リストの挙動を前提にしている可能性があり、無用な回帰リスクを避ける、(c) カレンダーが不得手な「直近の一覧性」をリストが補完できる。表示順序・折りたたみ等の具体配置は Code Generation 時に決定する。
- **拡張ルール適用状況**（Clarifying Questions で確認済み）:
  - Security Baseline: **適用しない**（既存の読み取り専用APIを消費するのみでバックエンド変更がなく、新規攻撃面が増えないため）
  - Resiliency Baseline: **適用しない**（推奨）（フロントエンドのみの変更で新規のインフラ・可用性要件が発生しないため）
  - Property-Based Testing: **適用しない**（推奨）（複雑なビジネスロジック・シリアライズ処理を新規に持たないため）
- **対象 API**: `GET /api/resources/{id}/availability`（`from`/`to` クエリで期間指定、既存仕様のまま。バックエンド変更なし）
- **既存コードベースとの整合**: Server Components 優先・クライアント状態は Zustand で最小限、という BookFlow フロントエンド規約（`CLAUDE.md`）に従う。カレンダーの期間・週/月表示状態はクライアント操作に紐づくため Client Component 側で保持する（状態管理の具体手段は Workflow Planning / Code Generation で決定）。
- **ライブラリ選定**: 外部カレンダーライブラリ（`react-big-calendar` 等）を導入するか、`shadcn/ui` ベースで自作するかは Workflow Planning で検討する（課題シートの AI 活用ポイントに明記されている論点のため、要件分析ではなく計画立案フェーズで扱う）。

## 受入条件（課題シートより、変更なし）

- [ ] リソース詳細画面でカレンダー形式の空き状況が表示される
- [ ] 週表示と月表示を切り替えられる
- [ ] カレンダー上の空き枠をクリックすると予約申請フォーム（`/reservations/new`）に開始日時が引き渡される
- [ ] 予約済み枠は視覚的に区別されている（色・パターン・テキスト等）
- [ ] 表示期間を前後に移動できる
- [ ] 既存の空き確認 API（`GET /api/resources/{id}/availability`）以外のバックエンド変更が不要である

## 影響範囲

- 推定工数：半日〜1日
- 対象レイヤー：frontend のみ
- 更新が必要な spec：`docs-next/docs/spec/screen-spec.md` §`/resources/{id}`（カレンダー表示 UI・操作・月表示クリック時の週表示遷移を追記）

## Clarifying Questions と回答（AskUserQuestion、2026-10-02 実施）

1. **月表示での日セルクリック時の挙動** → 「週表示に切り替える」を選択（上記 RSV-06 として要件化）
2. **Security Baseline 適用** → 適用しない
3. **Resiliency Baseline 適用** → 適用しない（推奨）
4. **PBT 拡張 適用** → 適用しない（推奨）

矛盾・曖昧な回答は検出されなかった。
