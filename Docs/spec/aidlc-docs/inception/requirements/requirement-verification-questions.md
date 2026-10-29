# Requirements Clarification Questions（CSV 帳票出力）

対象: `docs-next/docs/spec/enhancements/intermediate/csv-export.md`（Issue #29）。
各質問の `[Answer]:` の後ろに選択肢の記号（A、B など）を書いてください。「Other」を選ぶ場合は内容も書いてください。

## Question 1

CSV の「承認状態」列（RPT-02）には、どの値を出力しますか？

A) 予約ステータス（`reservations.status`）を日本語ラベルで出力する（承認待ち、承認済み、却下、キャンセル、下書き。画面の表示と同じ）

B) 予約ステータスを英語の値のまま出力する（`PENDING`、`APPROVED` など）

C) 承認ステップのステータス（`approval_steps.status`）を出力する（承認不要の予約は空欄になる）

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2

`status` による絞り込み（RPT-03）の指定方法はどれですか？

A) 複数指定できる（`?status=PENDING&status=APPROVED`）。予約一覧 API と同じ形式で、未指定なら全ステータス

B) 1 つだけ指定できる。未指定なら全ステータス

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3

期間（`from`、`to`）は、予約のどの日時を基準に絞り込みますか？

A) 利用開始日時（`start_at`）が期間内にある予約

B) 利用時間帯が期間と重なる予約（`start_at < to` かつ `end_at > from`）

C) 申請日時（`created_at`）が期間内にある予約

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 4

`from` と `to` の指定形式と省略時の扱いはどうしますか？

A) 日付（`2026-10-01`）で指定し、両端を含む。片方だけの指定も可、両方省略なら全期間

B) 日時（`2026-10-01T00:00:00`）で指定する。片方だけの指定も可、両方省略なら全期間

C) 日付で指定し、`from` と `to` は両方必須（片方だけは 400）

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 5

「CSV ダウンロード」ボタンはどの画面に置きますか？（既存の管理者ページは `/admin/resources` と `/admin/users` で、予約系の管理者ページはありません）

A) 既存の `/reservations`（ADMIN には「全予約一覧」として全件が表示される）に、ADMIN のときだけボタンを出す

B) 新しい管理者ページ `/admin/reservations` を作り、サイドナビの管理者メニューに追加してそこに置く（期間・ステータスの入力欄もそのページに置く）

C) 既存の `/admin/resources` に置く

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 6

CSV の日時列の書式はどうしますか？

A) `2026-10-01 10:00`（Excel でそのまま日時として扱いやすい形式）

B) `2026-10-01T10:00:00`（API と同じ ISO 形式）

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 7

ダウンロードされるファイル名はどうしますか？

A) `reservations_20261029.csv`（出力日）

B) `reservations_20261001_20261031.csv`（指定期間。期間未指定の場合は出力日）

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 8

Excel で開いたときに数式として実行されうる値（先頭が `=`、`+`、`-`、`@` の文字列。利用目的は利用者が自由入力できる）の扱いはどうしますか？

A) 先頭にシングルクォート（`'`）を付けて無害化する

B) 特別な処理はしない（RFC 4180 のエスケープのみ）

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 9

シートにある要件定義書の UC 番号（UC-07）の食い違い（Issue #162 で別途起票済み）は、今回の作業でどう扱いますか？

A) 今回は触らない。`requirements.md` の権限マトリクスに CSV API の行を足すだけにする

B) 今回、要件定義書に新しいユースケース（例：UC-09 帳票出力）を追加し、`csv-export.md` の番号もそれに合わせる

C) 今回、`csv-export.md` から UC 番号の記述だけを外す

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 10: Security Extensions

Should security extension rules be enforced for this project?

A) Yes — enforce all SECURITY rules as blocking constraints (recommended for production-grade applications)

B) No — skip all SECURITY rules (suitable for PoCs, prototypes, and experimental projects)

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 11: Resiliency Extensions

Should the resiliency baseline be applied to this project?
（設計時の方向づけとなるベストプラクティスを適用するものです。本番稼働の保証や認証にはなりません。）

A) Yes — apply the resiliency baseline as directional best practices and design-time guidance

B) No — skip the resiliency baseline (suitable for PoCs, prototypes, and experimental projects)

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 12: Property-Based Testing Extension

Should property-based testing (PBT) rules be enforced for this project?

A) Yes — enforce all PBT rules as blocking constraints

B) Partial — enforce PBT rules only for pure functions and serialization round-trips (CSV のエスケープ処理などが該当)

C) No — skip all PBT rules (suitable for simple CRUD applications, UI-only projects, or thin integration layers)

X) Other (please describe after [Answer]: tag below)

[Answer]: C
