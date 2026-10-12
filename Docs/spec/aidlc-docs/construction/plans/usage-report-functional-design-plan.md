# Functional Design Plan — ユニット: usage-report（利用実績の集計・グラフ表示）

## Unit Context

- **Stories**: US-01〜US-05（`Docs/spec/aidlc-docs/inception/user-stories/stories.md`）
- **Application Design**: SKIP 済みのため、requirements.md・stories.md と既存コードの実調査を入力として使う。クラスの署名と責務は本ステージで定義する
- **対象範囲**: backend（`StatisticsController`・`StatisticsService`・`UsageCalculator`・`UsageCondition`・`ResourceUsageResponse`・`ApprovedUsage`・`ReservationRepository` への 2 クエリ追加）、frontend（`/admin/reports` ページ・`UsageFilterForm`・`UsageBarChart`・`usage-format.ts`・Server Action・型・ナビ項目）

## Functional Design 実施中に確定した追加事実

Code Generation 前の設計検証として、既存コードを確認して次を確定した。

- **取得は構築子射影（コンストラクタ式）にする**：集計に必要なのは各予約の `resourceId`・`startAt`・`endAt` だけで、リソース名は別途リソース一覧から引く。`SELECT new ...ApprovedUsage(r.resource.id, r.startAt, r.endAt)` なら LAZY 関連を触らず（外部キー参照のみ）、`JOIN FETCH` も N+1 も不要になる。射影の record は `domain/ApprovedUsage.java`（既存の `presentation/dto/OccupiedSlot` と同様の小さな値型）に置く
- **Repository のクエリは個別メソッドにする**：既存は null 許容パラメータを避けて条件の組合せごとに専用メソッドを持つ（Postgres で null の timestamp パラメータの型が決まらない問題を避けるため）。集計も期間なし／期間ありの 2 メソッドにし、`status` は Service が引数 `APPROVED` として渡す（enum リテラルの FQN を JPQL に書かない）
- **全リソースは `findAll()` で取得する**：`ResourceRepository` には ADMIN 用の「inactive 含む全件」の `List` メソッドがない（カテゴリ別と有効のみはある）。`JpaRepository#findAll()` をそのまま使い、新しいクエリは足さない。有効・無効の絞り込みは Service で行う
- **`ReportController` と同じ `@PreAuthorize` 方式**：メソッド単位の `@PreAuthorize("hasRole('ADMIN')")`。`from`/`to` の検証は既存の予約一覧・CSV と同じく Controller で `ValidationException` を投げる
- **`from >= to` の検証**：`from` と `to` が同時指定されたとき `from.isBefore(to)` でなければ 400（`from は to より前にしてください。`）。重複判定に当たる予約の切り詰め時間が負になるのを防ぐ。計算側にも負なら 0 とする防御は置くが、到達しない前提
- **合算は秒で行い最後に分へ（切り捨て）**：各予約を分に丸めてから足すと誤差が累積しうるため、予約ごとの秒を足し、最後に 60 で割って切り捨てる。予約は分単位（`HH:mm:00`）の入力が通常で、通常は誤差が出ない
- **frontend の既存ページは `ApiClientError` を catch していない**：400 などはエラーバウンダリに流れる。統計ページは `from`/`to` の URL 直打ちで 400 になりうるため、`VALIDATION_ERROR` だけをページで catch して画面内にメッセージを出す。それ以外のエラーは再 throw する
- **ページ専用コンポーネントはページと同じディレクトリに置く**：`admin/reports/` に `UsageFilterForm.tsx`・`UsageBarChart.tsx`・`usage-format.ts` を置く（`ReservationFilterForm.tsx` と同じ運用）
- **棒グラフは Server Component で足りる**：棒の長さは `style` の幅（%）で表現でき、状態も `useEffect` も要らない。色は `globals.css` の `--color-chart-1`・`--color-chart-2` から生成される Tailwind のクラス（`bg-chart-1`・`bg-chart-2`）を使う。jsdom の `ResizeObserver` 問題も生じない
- **`toIsoWithSeconds` は共通ユーティリティにする**：既存では `server/actions/reservations.ts`（非公開）と `app/api/reports/reservations/csv/route.ts`（複製）の 2 か所にある。新しい Server Action で 3 か所目の複製を作らず、`lib/datetime.ts` に公開関数として切り出して新規コードだけが使う（既存 2 か所は本ユニットの範囲外のため変更しない）

## 実行チェックリスト

- [x] Step 1: `business-logic-model.md` を生成する（取得から集計・応答・画面表示までのフロー）
- [x] Step 2: `business-rules.md` を生成する（BR-01〜BR-19 と、ストーリー・テストとの対応）
- [x] Step 3: `domain-entities.md` を生成する（新規クラスの署名、Repository クエリ、既存への変更点）
- [x] Step 4: `frontend-components.md` を生成する（ページ・フォーム・棒グラフ・Server Action・ナビの変更点）

## 確認事項

requirements.md の決定事項（10 件）・既定の前提・User Stories で追加した `from >= to` の 400 により、設計に必要な曖昧点はすべて解消済みと判断する。追加の確認質問はない。
