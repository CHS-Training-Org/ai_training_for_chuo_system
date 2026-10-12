# Requirements Clarification Questions（recurring-reservation）

Issue #31「繰り返し予約」の要件を確定するための質問です。各質問の `[Answer]:` の後に選択肢の記号を記入してください。どれも合わない場合は最後の「Other」を選び、内容を書いてください。

## 確定済みの前提（質問しません）

次の 7 点は、ユーザーの指示で決定済みです。

- `recurrenceType` は `NONE` / `WEEKLY` / `MONTHLY` の 3 値
- 月次で存在しない日（31 日など）は、その月をスキップする
- `reservations` に `series_id`（UUID、NULL 許容）を追加する
- 予約は作成時に全件を生成する
- 1 件でも重複があれば、全件をロールバックする
- `POST /api/reservations` のレスポンスは、常に配列を返す
- シリーズの一括変更・一括削除は、今回のスコープ外

## Question 1
ビジネス要求シートの要件 ID `RSV-01` から `RSV-05` は、`requirements.md` の既存 `RSV-01` から `RSV-07`（一覧・詳細・キャンセル・編集）と衝突します。要件 ID はどうしますか。

A) 新しい接頭辞 `REC-` で採番し、ユースケースも新しい番号を振る（直前ユニットの `USG-` と同じ扱い）

B) 既存の `RSV-` の続きとして `RSV-08` 以降を採番する

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2
`reservations` テーブルに保存する列はどれですか。シートの RSV-01 は `recurrence_type` と `recurrence_until` を挙げていますが、決定済みの前提は `series_id` だけです。

A) `series_id` のみ（繰り返しの種別と終了日は生成のための入力で、保存しない）

B) `series_id`、`recurrence_type`、`recurrence_until` の 3 列を各予約に保存する（シートの RSV-01 どおり）

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 3
下書き保存（`draft: true`、Issue #30 で実装済み）と繰り返しの併用はどうしますか。

A) 併用不可とする。`draft: true` かつ `recurrenceType` が `NONE` 以外ならエラーにし、フォームでも繰り返し選択時は下書きボタンを無効にする

B) 併用可とする。全件を `DRAFT` で生成し、同じ `series_id` を付ける

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 4
1 回のリクエストで生成できる予約の件数に、上限を設けますか。上限を超えた場合は、全件を作らずにエラーにします。

A) 52 件を上限とする（毎週で 1 年分）

B) 100 件を上限とする

C) 上限を設けず、終了日だけで範囲を決める

X) Other (please describe after [Answer]: tag below)

[Answer]: C

## Question 5
繰り返しの終了日（`recurrenceUntil`）に、終了日当日の回を含めますか。

A) 含める。終了日の日付が最後の回の日付以上であれば、その回まで生成する

B) 含めない。終了日の前日までで生成を止める

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 6
`recurrenceType` が `NONE` のリクエストに `recurrenceUntil` が含まれていた場合は、どう扱いますか。

A) 無視して、従来どおり 1 件の予約として登録する

B) 不整合としてエラーにする

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 7
1 回の予約が日をまたぐ場合（`startAt` と `endAt` の日付が異なる場合）に、繰り返しを許しますか。

A) 許す。開始から終了までの長さを保ち、各回に同じ長さの予約を生成する

B) 許さない。繰り返しは、開始と終了が同じ日の予約に限る

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 8
承認が必要なリソース（`requires_approval` が真）で繰り返し予約を作ると、予約は `PENDING` で N 件でき、承認ステップも N 件になります。承認画面には N 件が個別に並び、まとめて承認する手段はありません。

A) 既存の挙動のまま許容する（N 件を個別に承認する）

B) 承認が必要なリソースでは、繰り返し予約を許さずエラーにする

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 9
重複エラー（409 `RESERVATION_CONFLICT`）のメッセージに、衝突した日付を含めますか。

A) 含めない。既存の固定文言をそのまま使う

B) 最初に衝突した日付だけを含める

C) 衝突した日付をすべて含める

X) Other (please describe after [Answer]: tag below)

[Answer]: （曖昧のため保留。「系列内重複も含める（1件でも重複なら全体失敗）」→ requirement-clarification-questions.md で確認）

## Question 10
繰り返し予約の登録に成功したあとの画面は、どうしますか。

A) 従来どおり `/reservations` へ遷移し、「N 件の予約を登録しました」とトーストで知らせる

B) 従来どおり `/reservations` へ遷移するだけで、通知は出さない

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 11
予約一覧・詳細で、繰り返しで作られた予約をどう見せますか。

A) 見せない。`seriesId` は API のレスポンスに含めるが、画面は変えない

B) 一覧と詳細に「繰り返し」であることが分かる表示を追加する

X) Other (please describe after [Answer]: tag below)

[Answer]: X（詳細画面のみ表示。一覧は表示しない。表示内容は requirement-clarification-questions.md で確認）

## Question: Security Extensions
Should security extension rules be enforced for this project?

A) Yes — enforce all SECURITY rules as blocking constraints (recommended for production-grade applications)

B) No — skip all SECURITY rules (suitable for PoCs, prototypes, and experimental projects)

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question: Resiliency Extensions
Should the resiliency baseline be applied to this project?

**What this extension is.** Enabling it applies a set of **directional, design-time best practices** for building resilient systems, derived from the **AWS Well-Architected Framework (Reliability Pillar)** and resilience-review guidance. It steers requirements, design, and code toward fault tolerance, high availability, observability, and recoverability — covering 15 practice areas across business goals, change management, observability, high availability, disaster recovery, and continuous improvement.

**What this extension is NOT.** Enabling it does **not** make your workload production-ready, nor does it certify or guarantee any availability, RTO, or RPO target. It is a **starting point** that scaffolds good resiliency decisions early — it is not a substitute for a formal **AWS Well-Architected Review** of the built system.

Treat the output as a well-grounded **first draft of your resiliency posture** to build on and validate — not a finished, production-certified result.

A) Yes — apply the resiliency baseline as directional best practices and design-time guidance (recommended for business-critical workloads, as an informed starting point that you can validate and harden before go-live)

B) No — skip the resiliency baseline (suitable for PoCs, prototypes, and experimental projects where rapid iteration matters more than reliability)

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question: Property-Based Testing Extension
Should property-based testing (PBT) rules be enforced for this project?

A) Yes — enforce all PBT rules as blocking constraints (recommended for projects with business logic, data transformations, serialization, or stateful components)

B) Partial — enforce PBT rules only for pure functions and serialization round-trips (suitable for projects with limited algorithmic complexity)

C) No — skip all PBT rules (suitable for simple CRUD applications, UI-only projects, or thin integration layers with no significant business logic)

X) Other (please describe after [Answer]: tag below)

[Answer]: C
