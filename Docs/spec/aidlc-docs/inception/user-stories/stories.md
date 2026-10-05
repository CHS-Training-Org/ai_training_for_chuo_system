# User Stories — リソース一覧の検索・フィルタ追加（Issue #23）

INVEST 準拠（Independent / Negotiable / Valuable / Estimable / Small / Testable）。各ストーリーは `requirements.md` の受入条件と 1:1 対応する。

---

## US-01: キーワードでリソースを絞り込む

**As a** BookFlow 認証済みユーザー
**I want to** `/resources` 画面のキーワード欄にリソース名や説明文の一部を入力して絞り込む
**So that** カテゴリ・期間フィルタだけでは特定しづらいリソースを素早く見つけられる

### Acceptance Criteria

```gherkin
Given /resources 画面を開いている
When キーワード欄に "会議室" と入力し「絞り込む」を押す
Then name または description に "会議室" を含むリソースのみが一覧表示される

Given /resources 画面を開いている
When キーワード欄に大文字小文字の異なる表記（例: "ROOM" / "room"）を入力する
Then 大文字小文字を区別せず同じ結果が返る
```

**対応要件**: RES-01, RES-02（`requirements.md`）

---

## US-02: キーワードを解除して全件に戻す

**As a** BookFlow 認証済みユーザー
**I want to** キーワード欄を空、または空白のみにして「絞り込む」を押す
**So that** 意図せず条件を残したままにせず、簡単に全件表示へ戻せる

### Acceptance Criteria

```gherkin
Given キーワードで絞り込んだ状態の /resources 画面を開いている
When キーワード欄を空にして「絞り込む」を押す
Then keyword 条件が解除され、他のフィルタ条件のみが適用された結果が表示される

Given /resources 画面を開いている
When キーワード欄にスペースのみを入力して「絞り込む」を押す
Then スペースのみの入力は「未入力」として扱われ、keyword 条件は付与されない

Given /resources 画面を初めて開く（keyword パラメータ自体が存在しない）
When 一覧が表示される
Then 現状と同一の挙動（全件取得）になる
```

**対応要件**: RES-05, NFR-02

---

## US-03: カテゴリ・期間とキーワードを組み合わせる

**As a** BookFlow 認証済みユーザー
**I want to** カテゴリ・空き確認期間・キーワードを同時に指定する
**So that** 複数条件を満たすリソースだけに絞り込める

### Acceptance Criteria

```gherkin
Given /resources 画面を開いている
When カテゴリ "ROOM"・期間・キーワード "会議室" を同時に指定して「絞り込む」を押す
Then 3条件すべて（AND 条件）を満たすリソースのみが表示される

Given ADMIN としてサインインしている
When keyword で絞り込む
Then 無効化済み（is_active=false）リソースも検索対象に含まれる（既存仕様の維持）
```

**対応要件**: RES-04

---

## US-04: 検索結果が 0 件のときに分かりやすい表示を見る

**As a** BookFlow 認証済みユーザー
**I want to** キーワード検索で該当リソースが無かったときに、その旨が分かるメッセージを見る
**So that** 「一覧が壊れている」のか「単に該当なし」なのかを迷わず判断できる

### Acceptance Criteria

```gherkin
Given /resources 画面を開いている
When 該当するリソースが存在しないキーワードで絞り込む
Then 「絞り込み条件に一致するリソースがありません。」（確定文言は screen-spec.md 更新時に決定）が表示される（現状の一律「リソースがありません。」から変更）
```

**対応要件**: User Stories Step 3 で特定した空状態メッセージの論点（`story-generation-plan.md` 参照）。`screen-spec.md` §`/resources` の更新が必要（`/update-spec` スキルで Code Generation 前に反映）

---

## ペルソナ・ストーリー マッピング

[`personas.md`](./personas.md) の「ペルソナ・ストーリー マッピング」を参照。
