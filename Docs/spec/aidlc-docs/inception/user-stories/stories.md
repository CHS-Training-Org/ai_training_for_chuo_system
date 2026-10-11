# User Stories — reservation-draft

## US-01: 下書き保存

**MEMBER として**、予約申請フォームで入力中の内容を下書きとして保存したい。**それによって** 複雑な予約をゆっくり準備できる。

### 受入条件

```gherkin
Scenario: 下書き保存ボタンをクリックすると DRAFT ステータスで保存される
  Given MEMBER が予約申請フォーム（/reservations/new）で必要項目を入力している
  When 「下書き保存」ボタンをクリックする
  Then 予約がステータス DRAFT で保存される
  And 承認フローには流れない（approval_steps が作成されない）
```

## US-02: 下書きの再編集

**MEMBER として**、保存した下書きの内容を後から編集したい。**それによって** 必要な情報が揃うまで申請を確定させずに準備を続けられる。

### 受入条件

```gherkin
Scenario: 下書きの内容を編集して DRAFT のまま保存する
  Given MEMBER が自分の DRAFT 状態の予約の詳細ページを開いている
  When 内容（開始日時・終了日時・利用目的・参加人数）を編集して保存する（正式申請はしない）
  Then 予約の内容が更新され、ステータスは DRAFT のまま変わらない
```

## US-03: 正式申請（DRAFT → PENDING/APPROVED）

**MEMBER として**、準備が整った下書きを正式に申請したい。**それによって** リソースの予約が確定または承認待ちになる。

### 受入条件

```gherkin
Scenario: 承認不要リソースの下書きを正式申請すると即座に確定する
  Given MEMBER が自分の DRAFT 状態の予約（承認不要リソース）の詳細ページを開いている
  When 「正式申請」を行う
  Then 予約のステータスが APPROVED になる
  And approval_steps は作成されない

Scenario: 要承認リソースの下書きを正式申請すると承認待ちになる
  Given MEMBER が自分の DRAFT 状態の予約（要承認リソース）の詳細ページを開いている
  When 「正式申請」を行う
  Then 予約のステータスが PENDING になる
  And approval_steps が作成され、承認一覧（/approvals）に表示される
```

## US-04: 下書きの削除

**MEMBER として**、不要になった下書きを削除したい。**それによって** 使わない下書きを一覧に残さずに済む。

### 受入条件

```gherkin
Scenario: 下書きをキャンセル操作で削除する
  Given MEMBER が自分の DRAFT 状態の予約の詳細ページを開いている
  When 既存のキャンセル操作を行う
  Then 予約のステータスが CANCELLED になる（物理削除ではなく既存のキャンセル機構を転用する）
```

## US-05: 下書き一覧の表示

**MEMBER として**、自分の下書きを一覧で確認したい。**それによって** 保存した下書きを見失わずに管理できる。

### 受入条件

```gherkin
Scenario: 「下書き」タブで DRAFT 予約を確認できる
  Given MEMBER が DRAFT 状態の予約を持っている
  When 予約一覧（/reservations）の「下書き」タブを開く
  Then その DRAFT 予約が一覧に表示される

Scenario: デフォルト表示（「すべて」タブ）には下書きが含まれない
  Given MEMBER が DRAFT 状態の予約を持っている
  When 予約一覧の「すべて」タブ（既定表示）を開く
  Then その DRAFT 予約は一覧に表示されない
```

## US-06: 他人の下書きへのアクセス拒否

**APPROVER として**、他人がまだ正式申請していない下書きの内容を見たくない。**それによって** 承認判断に関係ない情報に惑わされずに済む。

### 受入条件

```gherkin
Scenario: APPROVER が他人の下書きの詳細にアクセスすると403になる
  Given ある MEMBER が DRAFT 状態の予約を持っている
  When 別の APPROVER がその予約の詳細（GET /api/reservations/{id}）にアクセスする
  Then 403 が返る

Scenario: 他の MEMBER が他人の下書きの詳細にアクセスすると403になる
  Given ある MEMBER が DRAFT 状態の予約を持っている
  When 別の MEMBER がその予約の詳細にアクセスする
  Then 403 が返る

Scenario: ADMIN は他人の下書きの詳細にアクセスできる
  Given ある MEMBER が DRAFT 状態の予約を持っている
  When ADMIN がその予約の詳細にアクセスする
  Then 200 で予約内容が返る

Scenario: 下書きは承認一覧に表示されない
  Given ある MEMBER が DRAFT 状態の予約を持っている
  When APPROVER が承認一覧（/approvals）を開く
  Then その DRAFT 予約は表示されない（approval_steps が存在しないため）
```

## 受入条件カバレッジ（requirements.md との対応）

| requirements.md の受入条件 | 対応ストーリー |
|---|---|
| 「下書き保存」ボタンをクリックすると、DRAFT ステータスで予約が保存される | US-01 |
| 下書きは予約一覧の DRAFT フィルタで表示される | US-05 |
| 下書き詳細ページから再編集・正式申請ができる | US-02, US-03 |
| 下書き予約は承認一覧に表示されない | US-06 |
| 申請者本人以外が DRAFT 予約の詳細にアクセスすると 403 が返る（ADMIN は除く） | US-06 |
| バックエンドのステータス遷移テストに DRAFT → PENDING のケースを追加する | US-03（Code Generation段階でテストとして具体化） |
