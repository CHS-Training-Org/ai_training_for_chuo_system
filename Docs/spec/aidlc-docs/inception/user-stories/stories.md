# User Stories — 予約一覧のフィルタ拡張

## US-01: リソース名で予約を絞り込む

**As a** BookFlow 認証済みユーザー
**I want** 予約一覧をリソース名で絞り込みたい
**So that** 特定のリソースに関する予約だけを素早く見つけられる

### 受入条件（Gherkin）

```gherkin
Given /reservations 画面を開いている
When リソース名入力欄に、あるリソースの名前の一部を入力して絞り込む
Then そのリソース名を含む予約のみが一覧に表示される

Given リソース名入力欄に大文字・小文字が異なる文字列を入力する
When 絞り込みを実行する
Then 大文字小文字を区別せず一致する予約が表示される

Given リソース名入力欄を空白のみにして絞り込む
When 絞り込みを実行する
Then リソース名による絞り込みは適用されない（未入力として扱われる）
```

- **INVEST**: Independent・Negotiable・Valuable・Estimable・Small・Testable
- **対応要件**: RSV-01, RSV-04, RSV-05

## US-02: 期間で予約を絞り込む

**As a** BookFlow 認証済みユーザー
**I want** 予約一覧を期間（開始日時・終了日時）で絞り込みたい
**So that** 特定の期間にかかる予約だけを確認できる

### 受入条件（Gherkin）

```gherkin
Given /reservations 画面を開いている
When 開始日時・終了日時を指定して絞り込む
Then 指定期間と予約期間が重複する予約のみが表示される（境界が一致するだけの隣接予約は含まれない）

Given 開始日時のみを入力し終了日時を入力しない
When 絞り込みを実行する
Then 400 エラーとなり、両方の指定が必須であることが分かる
```

- **INVEST**: Independent・Negotiable・Valuable・Estimable・Small・Testable
- **対応要件**: RSV-02, RSV-06

## US-03: ステータス・リソース名・期間を組み合わせて絞り込む

**As a** BookFlow 認証済みユーザー
**I want** 既存のステータスタブとリソース名・期間フィルタを同時に使いたい
**So that** より絞り込んだ条件で目的の予約を見つけられる

### 受入条件（Gherkin）

```gherkin
Given ステータスタブで絞り込んでいる
When リソース名・期間フィルタも指定する
Then すべての条件を満たす予約のみが AND 条件で表示される

Given ADMIN としてログインしている
When リソース名・期間フィルタを指定する
Then 全ユーザーの予約から条件に一致するものが表示される（既存の可視範囲は維持される）

Given MEMBER としてログインしている
When リソース名・期間フィルタを指定する
Then 自分の予約のみから条件に一致するものが表示される（既存の可視範囲は維持される）
```

- **INVEST**: Independent・Negotiable・Valuable・Estimable・Small・Testable
- **対応要件**: RSV-03

## US-04: フィルタをリセットして全件表示に戻す

**As a** BookFlow 認証済みユーザー
**I want** 設定したフィルタを一括で解除したい
**So that** 絞り込み前の全件表示にすぐ戻れる

### 受入条件（Gherkin）

```gherkin
Given リソース名・期間フィルタを指定した状態
When リセット操作を行う
Then すべてのフィルタが解除され、既定の表示（ステータスタブ「すべて」相当）に戻る
```

- **INVEST**: Independent・Negotiable・Valuable・Estimable・Small・Testable
- **対応要件**: 受入条件「フィルタをリセットすると全件表示に戻る」

## ペルソナ・ストーリー マッピング

`personas.md` 参照。本ユニットはロールによるフィルタ挙動の差がないため、ADMIN 補助ペルソナは「既存の可視範囲（全予約／自分の予約のみ）がフィルタと独立して維持されること」の確認観点としてのみ各ストーリーに関与する。
