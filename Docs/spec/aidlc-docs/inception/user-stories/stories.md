# User Stories — リソース一覧のソート順選択

## US-01: 名称順でリソースを並べ替える

**As a** BookFlow 認証済みユーザー
**I want** リソース一覧を名称順（昇順・降順）で並べ替えたい
**So that** 名前の手がかりから目的のリソースを素早く見つけられる

### 受入条件（Gherkin）

```gherkin
Given /resources 画面を開いている
When ソート選択ドロップダウンで「名称順（昇順）」を選ぶ
Then リソース一覧が名称のあいうえお順（アルファベット順）に並び替えて表示される

Given /resources 画面を開いている
When ソート選択ドロップダウンで「名称順（降順）」を選ぶ
Then リソース一覧が名称の逆順に並び替えて表示される
```

- **INVEST**: Independent（他ストーリーと機能的に独立）・Negotiable・Valuable・Estimable・Small・Testable
- **対応要件**: RES-01, RES-06

## US-02: 定員順でリソースを並べ替える

**As a** BookFlow 認証済みユーザー
**I want** リソース一覧を定員順（昇順・降順）で並べ替えたい
**So that** 必要な人数を収容できるリソースを効率的に探せる

### 受入条件（Gherkin）

```gherkin
Given /resources 画面を開いている
When ソート選択ドロップダウンで「定員順（昇順）」を選ぶ
Then リソース一覧が定員の小さい順に並び替えて表示される
And 定員が未設定（NULL）のリソースは一覧の最後に表示される

Given /resources 画面を開いている
When ソート選択ドロップダウンで「定員順（降順）」を選ぶ
Then リソース一覧が定員の大きい順に並び替えて表示される
And 定員が未設定（NULL）のリソースは一覧の最後に表示される
```

- **INVEST**: Independent・Negotiable・Valuable・Estimable・Small・Testable
- **対応要件**: RES-01, RES-05, NFR-02

## US-03: ソート未選択時は登録日時順で表示される

**As a** BookFlow 認証済みユーザー
**I want** ソートを何も選択していないとき、これまでどおり登録日時の古い順でリソース一覧を見たい
**So that** 既存の画面を使い続けているユーザーの体験が変わらない

### 受入条件（Gherkin）

```gherkin
Given /resources 画面を初めて開く（ソートパラメータを指定しない）
When リソース一覧が表示される
Then 登録日時の昇順（既存の挙動）で並んでいる

Given ソートを選択した状態から「リセット」ボタンを押す
When リソース一覧が再表示される
Then 登録日時の昇順に戻る
```

- **INVEST**: Independent・Negotiable・Valuable・Estimable・Small・Testable
- **対応要件**: RES-02

## US-04: カテゴリ・期間・キーワードフィルタと組み合わせてソートする

**As a** BookFlow 認証済みユーザー
**I want** カテゴリ・空き確認期間・キーワード検索と同時にソートを適用したい
**So that** 絞り込んだ結果に対しても自分が見やすい順序で確認できる

### 受入条件（Gherkin）

```gherkin
Given カテゴリフィルタでリソースを絞り込んでいる
When ソート選択ドロップダウンで並び替えを指定する
Then 絞り込み結果に対してソートが適用される

Given 空き確認期間（from/to）でリソースを絞り込んでいる
When ソート選択ドロップダウンで並び替えを指定する
Then 絞り込み結果に対してソートが適用される（空き判定後の候補に対してソートされる）

Given キーワード検索でリソースを絞り込んでいる
When ソート選択ドロップダウンで並び替えを指定する
Then 絞り込み結果に対してソートが適用される

Given ソートを変更する
When 現在2ページ目を表示している状態でソートを変更する
Then 1ページ目にリセットされて表示される
```

- **INVEST**: Independent・Negotiable・Valuable・Estimable・Small・Testable
- **対応要件**: RES-04

## ペルソナ・ストーリー マッピング

`personas.md` 参照。本ユニットはロールによるソート挙動の差がないため、ADMIN 補助ペルソナは「既存の is_active 可視範囲がソートと独立して維持されること」の確認観点としてのみ各ストーリーに関与する。
