# Functional Design Plan — ユニット: recurring-reservation（繰り返し予約）

## Unit Context

- **Stories**: US-01〜US-08（`Docs/spec/aidlc-docs/inception/user-stories/stories.md`）
- **Application Design**: SKIP 済みのため、requirements.md・stories.md と既存コードの実調査を入力として使う。クラスの署名と責務は本ステージで定義する
- **対象範囲**
  - backend：`V003` マイグレーション、`domain/RecurrenceType`・`domain/Reservation`（3 列と `joinSeries`）、`application/RecurrenceSchedule`（日付生成の純粋関数、新規）、`application/ReservationService`（一括作成、詳細のシリーズ件数）、`domain/ReservationRepository`（2 つの件数クエリ）、`presentation/dto/CreateReservationRequest`・`ReservationResponse`、`presentation/ReservationController`（配列のレスポンス）
  - frontend：`lib/types/enums.ts`・`lib/types/api.ts`・`lib/labels.ts`・`lib/schemas/reservation.ts`、`server/actions/reservations.ts`、`reservations/new/ReservationForm.tsx`、`reservations/[id]/page.tsx`

## Functional Design 実施中に確定した追加事実

Code Generation 前の設計検証として、既存コードを確認して次を確定した。

- **`Reservation.create` の引数は 7 個のまま変えない**：Checkstyle の `ParameterNumber`（最大 7）に達しているため、系列の 3 列は作成後に呼ぶ `joinSeries(seriesId, type, until)` で設定する。`create` はテストから呼ばれておらず（0 件）、`create` の署名を保てば既存の呼び出しに影響しない
- **`CreateReservationRequest` の構成子の呼び出しはテスト 8 件**：すべて `ReservationServiceTest` にある。レコードに 2 項目を足すとコンパイルが通らなくなるため、Code Generation で 8 件を更新する。副構成子（6 引数）は足さない（Jackson のレコード構成子の選択に曖昧さを持ち込まないため）
- **400 の検証は Service で行い、ロックの前に置く**：既存の `ValidationException`（400 `VALIDATION_ERROR`）を使う。入力だけで判定できる検証は DB に触れる前に済ませ、不正な入力でリソース行のロックを取らない
- **既存予約の取得は 1 回にまとめる**：既存の `checkConflict` は呼ぶたびに `findByResource_IdAndStatusIn` で全件を取得する。N 回の呼び出しは N 回の取得になるため、一括作成では 1 回取得して、各日程と比較する（更新の `checkConflict` はそのまま残す）
- **保存した兄弟予約が次の重複判定に見えるかに依存しない**：自己重複は、保存前の日程どうしの比較で検出する。Hibernate の自動フラッシュには頼らない
- **`ReservationResponse` は 1 つのレコードで、新しい項目を null 許容にする**：一覧・更新・キャンセルは `from(r)` でシリーズ件数と残り回数が null、詳細だけ `from(r, seriesCount, remainingCount)` で値を入れる。別の詳細用 DTO は作らない（フロントのスキーマも 1 つに保てる）
- **`api-client` の `post` は変更しない**：`schema.parse(json)` なので、`z.array(ReservationResponseSchema)` をそのまま渡せる
- **トーストは導入済み**：`layout.tsx` に `<Toaster>`、承認画面が `toast.success` を使っている。新しい依存は要らない

## 実行チェックリスト

- [x] Step A: `domain-entities.md` を生成する（列、`RecurrenceType`、`Reservation` の追加、DTO の項目、Repository の追加クエリ）
- [x] Step B: `business-logic-model.md` を生成する（日付生成のアルゴリズム、一括作成の処理手順、重複判定の方式、詳細のシリーズ件数）
- [x] Step C: `business-rules.md` を生成する（ルール一覧、ストーリーとテストの対応）
- [x] Step D: `frontend-components.md` を生成する（フォーム、スキーマ、Server Action、詳細画面、テスト）
- [x] Step E: 設計全体が requirements.md の決定事項 12 件、既定の前提 7 件、stories.md の受入条件を網羅していることを確認する

## 確認事項

要件の決定事項と既存コードの実調査で、設計に必要な曖昧点は解消済みと判断する。追加の確認質問はない。次の設計上の判断は、レビューで変更できる（`business-logic-model.md` の「設計上の判断」に理由を記載）。

- 繰り返しの種別が `NONE` 以外なら、生成が 1 件だけでも `series_id` を付ける
- `V003` に、`recurrence_type`・`series_id`・`recurrence_until` の整合を保つ CHECK 制約を足す
- 終了日の検証（400）は、`endAt > startAt` の検証（422）より前に行う
