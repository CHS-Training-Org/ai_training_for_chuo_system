# Requirements Clarification Questions（追加確認: recurring-reservation）

回答をありがとうございます。14 問のうち 11 問は確定しました。残りの 3 点に曖昧さがあるため、確認させてください。`[Answer]:` の後に記号を記入してください。

## 確定した回答の要約

- 要件 ID は `REC-`、保存列は `series_id`・`recurrence_type`・`recurrence_until` の 3 列
- 下書き保存と繰り返しは併用可、件数上限なし、終了日当日の回を含む
- `NONE` で `recurrenceUntil` が来たら 400、日をまたぐ予約の繰り返しは許可
- 承認が必要なリソースでは N 件の承認ステップを許可
- 登録成功後はトースト表示、拡張（Security / Resiliency / PBT）はすべて適用しない

## Ambiguity 1: 重複エラーの「系列内重複」の意味
Q9 の回答「系列内重複も含める（1件でも重複なら全体失敗）」は、次のどちらを指すか読み取れません。Q9 の選択肢はメッセージに衝突日を含めるかどうかを尋ねたもので、回答はそれと別の話に見えます。また Q7 で日をまたぐ予約を許可したため、開始から終了までが繰り返し間隔より長いと、生成した予約どうしが重なります（例：8 日間の予約を毎週繰り返す）。

### Clarification Question 1-1
「系列内重複」とは何を指しますか。

A) 既存の予約との重複のうち、「系列の中の 1 件でも衝突すれば全体を失敗させる」という既定の方針を確認しただけで、新しい要件ではない

B) 生成した予約どうしが重なる場合（系列内の自己重複）も検出し、1 件でもあれば全体を失敗させる

X) Other (please describe after [Answer]: tag below)

[Answer]: B

### Clarification Question 1-2
Q9 の本来の問い「重複エラーのメッセージに、衝突した日付を含めますか」には、どう答えますか。

A) 含めない。既存の固定文言をそのまま使う

B) 最初に衝突した日付だけを含める

C) 衝突した日付をすべて含める

X) Other (please describe after [Answer]: tag below)

[Answer]: 含めない（AskUserQuestion で回答）

### Clarification Question 1-3
1-1 で B（自己重複も検出）の場合、自己重複のエラーはどう返しますか。A を選んだ場合は回答不要です（`N/A` と記入してください）。

A) 既存の重複と同じ 409 `RESERVATION_CONFLICT` で返す

B) 入力の不整合として 422 `VALIDATION_ERROR` で返す（開始から終了までが繰り返し間隔より長い、という内容）

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Ambiguity 2: 詳細画面に表示するシリーズ情報の内容
Q11 の回答「詳細画面のみ表示（一覧は表示しない）」は、詳細画面に何を出すかが決まっていません。

### Clarification Question 2
詳細画面に表示する内容はどれですか。

A) 繰り返しの種別（毎週 / 毎月）と終了日だけを表示する

B) A に加えて、同じ系列の予約の件数を表示する

C) A に加えて、同じ系列の予約への一覧リンクを表示する

X) Other (please describe after [Answer]: tag below)

[Answer]: A（詳細画面でシリーズ件数・残り回数を表示。件数は全ステータス、残り回数は「この予約より後」で確定。AskUserQuestion で回答）

## Ambiguity 3: 繰り返し指定の検証ルールとエラーの種類
Q6 で「`NONE` で `recurrenceUntil` があれば 400」と決まりましたが、他の組み合わせは決まっていません。`WEEKLY` と `MONTHLY` の入力検証を確定する必要があります。

### Clarification Question 3-1
`WEEKLY` または `MONTHLY` で `recurrenceUntil` が欠けている場合は、どうしますか。

A) 400 `VALIDATION_ERROR` で拒否する（終了日は必須）

B) 受け付けず、既定の期間（例：開始日から 1 年）で補う

X) Other (please describe after [Answer]: tag below)

[Answer]: A

### Clarification Question 3-2
`recurrenceUntil` が開始日（`startAt` の日付）より前の場合は、どうしますか。開始日と同じ日は有効（1 件のみ生成）とします。

A) 400 `VALIDATION_ERROR` で拒否する

B) 422 `VALIDATION_ERROR` で拒否する（既存の `endAt > startAt` の検証と同じ扱い）

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## 注意（回答は不要）
Q4 で件数上限を設けないと決まったため、終了日を遠い将来にした毎週の繰り返しは、予約を大量に生成します。重複チェックはリソース単位の悲観ロックを取ったまま、既存予約を全件読み込んで行うので、件数が増えるほどロック時間が伸びます。上限なしのまま進めますが、この点は要件定義書の非機能要件にリスクとして記載します。
