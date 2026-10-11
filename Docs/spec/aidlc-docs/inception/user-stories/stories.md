# User Stories — csv-report

## US-01: CSV ダウンロード

**ADMIN として**、予約一覧画面のボタンから予約を CSV ファイルでダウンロードしたい。**それによって** 画面で見ている条件のまま、予約データを外部ツールに持ち出せる。

### 受入条件

```gherkin
Scenario: ボタンをクリックすると CSV ファイルがダウンロードされる
  Given ADMIN が予約一覧（/reservations）を開いている
  When 「CSV ダウンロード」ボタンをクリックする
  Then ブラウザが CSV ファイルをダウンロードする
  And ファイル名は reservations_yyyyMMdd.csv（出力日）になる
  And レスポンスの Content-Type は text/csv; charset=UTF-8 で、Content-Disposition は attachment である

Scenario: 現在の絞り込み条件が CSV に引き継がれる
  Given ADMIN が予約一覧で status と期間（from / to）を指定している
  When 「CSV ダウンロード」ボタンをクリックする
  Then 画面の status・from・to と同じ条件の CSV がダウンロードされる
  And 画面の resourceName 絞り込みは CSV に引き継がれない
```

## US-02: CSV の内容

**ADMIN として**、Excel で開いて文字化けせず、一目で意味が分かる CSV を受け取りたい。**それによって** 受け取った後の加工や報告にそのまま使える。

### 受入条件

```gherkin
Scenario: 日本語ヘッダ行と 7 列で出力される
  Given 条件に合う予約が 1 件以上ある
  When CSV をダウンロードする
  Then 1 行目に日本語のヘッダ行（予約 ID・リソース名・申請者名・開始日時・終了日時・目的・承認状態）がある
  And 2 行目以降に予約が開始日時の昇順（同値は予約 ID の昇順）で 1 行ずつ出力される

Scenario: 承認状態は画面と同じ日本語ラベルで出力される
  Given PENDING・APPROVED・REJECTED・CANCELLED の予約が存在する
  When CSV をダウンロードする
  Then 承認状態の列は 承認待ち・承認済み・却下・キャンセル済み と出力される

Scenario: 日時は yyyy-MM-dd HH:mm 形式で出力される
  Given 開始日時が 2026-10-12 09:30 の予約がある
  When CSV をダウンロードする
  Then 開始日時の列は 2026-10-12 09:30 と出力される

Scenario: Excel で文字化けしない
  When CSV をダウンロードする
  Then 本文の先頭 3 バイトが EF BB BF（UTF-8 BOM）である
  And 本文は UTF-8、改行は CRLF である

Scenario: 条件に合う予約が 0 件のときはヘッダ行のみ返す
  Given 条件に合う予約が存在しない
  When CSV をダウンロードする
  Then ヘッダ行のみの CSV が 200 で返る
```

## US-03: 期間とステータスでの絞り込み

**ADMIN として**、期間とステータスを指定して対象を限定した CSV を取得したい。**それによって** 月次報告などに必要な範囲だけを出力できる。

### 受入条件

```gherkin
Scenario: 期間を指定すると期間重複する予約だけが出力される
  Given 2026-10-10 から 2026-10-20 の間に重なる予約と、重ならない予約がある
  When from=2026-10-10T00:00:00 と to=2026-10-20T00:00:00 を指定して CSV をダウンロードする
  Then 期間が重なる予約だけが出力される（r.startAt < to かつ r.endAt > from）
  And 境界が一致しているだけの隣接する予約は含まれない

Scenario: from と to の片方だけを指定すると 400 になる
  When from だけ、または to だけを指定してリクエストする
  Then 400（code: VALIDATION_ERROR）が返る

Scenario: from と to を両方とも指定しないと全期間が対象になる
  When from と to を指定せずに CSV をダウンロードする
  Then 期間条件なしで予約が出力される

Scenario: status を指定しない場合は DRAFT を含めない
  Given PENDING と DRAFT の予約が存在する
  When status を指定せずに CSV をダウンロードする
  Then PENDING の予約は出力され、DRAFT の予約は出力されない

Scenario: status を明示すると指定したステータスだけが出力される
  When status=DRAFT を指定して CSV をダウンロードする
  Then DRAFT の予約だけが出力される
  And status を複数指定した場合はそのいずれかに一致する予約が出力される

Scenario: 不正な status は 400 になる
  When status に定義にない値を指定してリクエストする
  Then 400 が返る
```

## US-04: 権限のないロールの拒否

**MEMBER・APPROVER として**、自分の権限では全予約の CSV を取得できないことを保証してほしい。**それによって** 他人の予約情報が権限のない人に持ち出されない。

### 受入条件

```gherkin
Scenario: MEMBER が API を呼ぶと 403 になる
  Given MEMBER としてログインしている
  When GET /api/reports/reservations/csv を呼ぶ
  Then 403（code: FORBIDDEN）が返る

Scenario: APPROVER が API を呼ぶと 403 になる
  Given APPROVER としてログインしている
  When GET /api/reports/reservations/csv を呼ぶ
  Then 403（code: FORBIDDEN）が返る

Scenario: 未認証だと 401 になる
  Given 認証トークンがない
  When GET /api/reports/reservations/csv を呼ぶ
  Then 401 が返る

Scenario: ボタンは ADMIN にだけ表示される
  Given MEMBER または APPROVER が予約一覧（/reservations）を開いている
  Then 「CSV ダウンロード」ボタンは表示されない

Scenario: 画面経由でもバックエンドの拒否がそのまま返る
  Given ADMIN ではないロールが CSV の Route Handler を直接開く
  Then バックエンドの 401 または 403 がそのまま返り、CSV は返らない
```

## US-05: 特殊文字と数式の安全な出力

**ADMIN として**、利用目的などに記号や改行が含まれていても、CSV が壊れず安全に開ける状態で受け取りたい。**それによって** Excel で開いたときに列がずれたり、数式が実行されたりしない。

### 受入条件

```gherkin
Scenario: カンマ・二重引用符・改行を含むフィールドは引用符で囲んでエスケープする
  Given 利用目的が 会議, 来客 "A社" と 2 行目 のように、カンマ・二重引用符・改行を含む予約がある
  When CSV をダウンロードする
  Then そのフィールドは二重引用符で囲まれ、内部の二重引用符は 2 つ重ねて出力される（RFC 4180）
  And 列数が他の行とずれない

Scenario: 先頭が数式を開始する文字のフィールドは無害化される
  Given 利用目的が =SUM(A1:A9) のように、先頭が =、+、-、@、タブ、復帰のいずれかの予約がある
  When CSV をダウンロードする
  Then そのフィールドの先頭に ' が付き、Excel で数式として実行されない

Scenario: 通常の文字列は変更されない
  Given 利用目的が 定例会議 の予約がある
  When CSV をダウンロードする
  Then 利用目的の列は 定例会議 のまま出力される
```

## 受入条件との対応

| requirements.md の受入条件 | 対応するストーリー |
|---|---|
| ボタンで予約一覧が CSV ダウンロードされる | US-01 |
| 日本語ヘッダ行、UTF-8（BOM 付き） | US-02 |
| 期間・ステータスで絞り込める | US-03 |
| MEMBER / APPROVER は 403 | US-04 |
| CSV 生成ロジックのユニットテスト | US-02（形式）と US-05（エスケープ・数式対策）の各 Scenario を `CsvWriterTest` と `ReservationReportServiceTest` のテスト項目に対応付ける |
