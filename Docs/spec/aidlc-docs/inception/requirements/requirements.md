---
type: note
title: Requirements（Requirements Analysis）
description: AI-DLC Requirements Analysis ステージが生成したissue #27（カレンダービュー）の要件定義
tags:
  - ai-dlc
  - requirements
timestamp: 2026-08-14
---

# Requirements Analysis — カレンダービュー（Issue #27）

## Intent Analysis Summary

- **User Request**: `Docs/spec/enhancements/calendar-view.md`（issue #27）に基づき、リソース詳細画面（`/resources/{id}`）に週・月単位のカレンダー形式で予約状況を表示する
- **Request Type**: New Feature（既存画面への新規UI追加）
- **Scope Estimate**: Single Component（frontend のみ。バックエンド・DBの変更なし）
- **Complexity Estimate**: Moderate（週・月グリッドの日付計算、既存 `OccupiedSlot[]` から空き枠を導出するロジック、クリック時のクエリパラメータ引き渡しが新規ロジック）

## 入力（真実の源）

- `Docs/spec/enhancements/calendar-view.md`（要件 RSV-01〜05、受入条件6点）
- `frontend/src/app/(authenticated)/resources/[id]/page.tsx`（変更対象の既存実装）
- `backend/src/main/java/com/example/bookflow/presentation/ResourceController.java`・`ResourceService.java`・`dto/OccupiedSlot.java`（既存API、本タスクでは変更しない）

## スコープ確定事項（ユーザー確認済み）

- **カレンダー実装方式**: 外部ライブラリ（`react-big-calendar`・`@fullcalendar/react`）は導入せず、shadcn/ui のプリミティブと Tailwind CSS を用いた自作コンポーネントとする。理由：本タスクの見積り工数（半日〜1日）に対し外部ライブラリのテーマ調整コストが見合わないこと、ライセンス確認の手間を避けられること。
- **既存の空き状況リスト表示**: 削除せず、カレンダーの下に両方表示する（RSV-05「共存するか置き換えるかは実装者の判断に委ねる」への回答）。
- **週の開始曜日**: 月曜始まり。
- **カレンダーに表示する時間帯**: 終日24時間を全表示する（営業時間の概念は既存データに存在しないため導入しない）。
- **空き枠クリック時に予約申請フォームへ渡す時間の粒度**: 1時間単位。
- **拡張機能（Resiliency Baseline・Security Baseline・Property-Based Testing）**: いずれも適用しない。理由：frontendのみの小規模UI機能であり、可用性・DR設計や追加の認証・認可面の変更がなく、PBT対象となる複雑な純粋関数もないため。

## Functional Requirements

| # | 要件 | 出典 |
|---|------|------|
| RSV-01 | リソース詳細画面（`/resources/{id}`）にカレンダー形式の空き状況ビューを追加する | calendar-view.md |
| RSV-02 | カレンダーは週表示・月表示を切り替えられる | calendar-view.md |
| RSV-03 | カレンダー上で予約済み枠はグレーアウト、空き枠はクリック可能。クリックすると `/reservations/new` に開始日時（1時間単位）をクエリパラメータで引き渡す | calendar-view.md |
| RSV-04 | 表示期間を前後に移動（週表示は前週・次週、月表示は前月・次月）すると、その期間に応じた `from`/`to` を再計算し `GET /api/resources/{id}/availability` を呼び直す | calendar-view.md |
| RSV-05 | 既存の空き確認リスト表示は削除せず、カレンダーの下に併存させる（カレンダーの表示期間ナビゲーションとは連動させず、常に当日〜7日後固定のまま表示する） | ユーザー確認済み（本書「スコープ確定事項」） |
| RSV-06（新規、設計判断） | カレンダーの週は月曜始まり、時間帯は0時〜24時を表示する（週表示のみ。月表示はRSV-08参照） | ユーザー確認済み |
| RSV-07（新規、設計判断） | 空き枠の算出は、既存の `OccupiedSlot[]`（`reservationId`・`startAt`・`endAt`）を表示期間の1時間刻みグリッドに写像し、いずれの `OccupiedSlot` とも重複しない枠を空きと判定する。重複判定は既存バックエンドの半開区間 `[start, end)` の定義（`ResourceService.overlaps`）に合わせる。過去日時の枠も他の枠と同様にクリック可能とし、本課題側で無効化しない（過去日時の申請可否は既存の予約作成APIのバリデーションに委ねる） | 既存API仕様との整合性確保のための設計判断 |
| RSV-08（新規、設計判断） | 月表示は日単位の要約セル（1日1マス、予約有無を色・件数で要約表示）とする。1時間刻みの時間グリッドは週表示のみで用いる。月表示のセルをクリックすると、その日を含む週表示に切り替える | ユーザー確認済み（Functional Design時の確認） |
| RSV-09（新規、設計判断） | カレンダー上の空き枠クリック時、`/reservations/new` は `resourceId`・`startAt`（1時間単位、`YYYY-MM-DDTHH:mm:ss`形式）の両方をクエリパラメータとして受け取り、`startAt` をフォームの開始日時欄の初期値に設定する。既存の `ReservationForm.tsx` は `startAt` クエリパラメータを解釈しない実装だったため、`/reservations/new/page.tsx`・`ReservationForm.tsx` への変更を本課題のスコープに含める | ユーザー確認済み（Functional Design時の既存コード再検証で判明） |

## Non-Functional Requirements

- **Performance**: 月表示・週表示のいずれも `GET /api/resources/{id}/availability` への呼び出しは表示期間1回分のみとする（バックエンドの `from`/`to` に範囲上限のバリデーションがないことをコード確認済み）。月表示は日単位の要約セル（最大42セル）、週表示は1時間刻みグリッド（7日 × 24時間 = 168セル）であり、いずれもセル数は小規模なため専用の性能対策（仮想スクロール等）は不要。
- **Accessibility**: 空き枠・予約済み枠の区別を色のみに依存させず、テキストまたはパターンでも判別できるようにする（受入条件「予約済み枠は視覚的に区別されている（色・パターン・テキスト等）」）。
- **Backward Compatibility**: 既存の空き確認リスト表示（`page.tsx` 内の `<ul>` 表示部分）・既存の `getAvailabilityAction` の関数シグネチャは変更しない。既存の `ReservationForm.tsx` の `resourceId` によるリソース初期選択の挙動も変更しない（`startAt` 初期値設定を追加するのみ）。

## User Scenarios

1. 利用者がリソース詳細画面を開く→デフォルトで当週のカレンダー（月曜始まり、週表示）が表示され、その下に既存の空き状況リストが表示される。
2. 利用者が「月表示」に切り替える→当月のカレンダーが表示され、`from`/`to` が当月の範囲に更新されて空き状況が再取得される。
3. 利用者が「次週」ボタンを押す→表示期間が1週間後に進み、その期間の空き状況が再取得されてカレンダーが更新される。
4. 利用者がカレンダー上の空き枠（例：8月20日14時〜15時）をクリックする→`/reservations/new?resourceId={id}&startAt=2026-08-20T14:00:00` に遷移し、予約申請フォームに開始日時が引き渡される。
5. 利用者が予約済み枠をクリックしようとする→クリック不可（グレーアウトされ操作を受け付けない）。

## Business Context

- **Goals**: リスト形式では把握しにくい週・月単位の混雑感を可視化し、利用者が空き枠を見つけやすくする（calendar-view.md 背景節）。
- **Constraints**: 既存の空き確認API以外のバックエンド変更を行わない（受入条件、フロントエンドのみの変更で実現する制約）。
- **Success Criteria**: 受入条件6点をすべて満たし、既存のフロントエンドテスト（`pnpm test`）・型チェック（`pnpm build`）が通過すること。

## Technical Context

- **Integration Points**: `frontend/src/app/(authenticated)/resources/[id]/page.tsx`（Server Component、既存の`getResourceAction`/`getAvailabilityAction`呼び出し元）に、新規クライアントコンポーネント（カレンダー本体、週・月切り替え、期間ナビゲーション）を追加する構成とする。加えて、`frontend/src/app/(authenticated)/reservations/new/page.tsx`（`searchParams`から`startAt`を読み取る）・`ReservationForm.tsx`（`defaultStartAt` propを受け取りフォーム初期値に設定する）に変更を加える（RSV-09）。
- **状態管理**: カレンダーの表示モード（週/月）・表示期間の起点日は画面内に閉じたクライアント状態であるため、`useState` で管理する（Zustand はページをまたぐ共有状態向けであり本機能には該当しない）。
- **データモデル**: バックエンドのテーブル・APIとも変更不要。既存の `OccupiedSlot`（`reservationId`・`startAt`・`endAt`）のみを入力として使う。

## Quality Attributes

- 新規ロジック（表示期間からの `from`/`to` 算出、`OccupiedSlot[]` からのグリッドマッピング、週・月切り替え時の再取得）にはユニットテスト（Vitest）を追加する。
- 仕様書更新：`Docs/spec/screen-spec.md` §`/resources/{id}` にカレンダー表示UIと操作（期間切り替え・クリック動作）を追記する（calendar-view.md「影響範囲」節に明記済み）。Build and Test 完了後、`/update-spec` で反映する。

## 未解決の疑問点

なし（ライブラリ選定・既存リスト表示の扱い・週開始曜日・表示時間帯・クリック粒度・拡張機能適用可否はいずれもユーザー確認済み。次のWorkflow Planningで実行計画を提示する）
