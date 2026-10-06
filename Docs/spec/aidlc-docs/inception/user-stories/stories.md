# User Stories — resource-detail-info

## US-01: 設備情報・利用上の注意を登録・編集する

**As a** ADMIN
**I want** リソース登録・編集画面で設備情報（equipment）・利用上の注意（notes）を入力したい
**So that** 利用者が予約前に必要な情報を確認できるようにしたい

### 受入条件（Gherkin）

```gherkin
Given ADMIN がリソース新規登録画面を開いている
When 設備情報・利用上の注意を入力して登録する
Then 登録されたリソースに設備情報・利用上の注意が保存される

Given ADMIN が既存リソースの編集画面を開いている
When 設備情報・利用上の注意を入力（または空のまま）して保存する
Then 更新されたリソースに入力内容が反映される（未入力の場合は null のまま）
```

- **INVEST**: Independent・Negotiable・Valuable・Estimable・Small・Testable
- **対応要件**: RES-01, RES-02, RES-03

## US-02: リソース詳細画面で設備情報・利用上の注意を確認する

**As a** MEMBER/APPROVER
**I want** リソース詳細画面で設備情報・利用上の注意を確認したい
**So that** 予約前に目的に合ったリソースかどうかを判断できるようにしたい

### 受入条件（Gherkin）

```gherkin
Given 設備情報・利用上の注意が登録されているリソースの詳細画面を開いている
When 画面を表示する
Then 設備情報・利用上の注意が表示される（改行は保持される）
```

- **INVEST**: Independent・Negotiable・Valuable・Estimable・Small・Testable
- **対応要件**: RES-04

## US-03: 未登録のリソースでは新フィールドが表示されない

**As a** MEMBER/APPROVER
**I want** 設備情報・利用上の注意が未登録のリソースでは、該当欄が表示されないようにしたい
**So that** 空欄や「未設定」といった無意味な表示に惑わされず、登録されている情報だけを確認できるようにしたい

### 受入条件（Gherkin）

```gherkin
Given 設備情報が未登録（null）のリソースの詳細画面を開いている
When 画面を表示する
Then 設備情報の欄は表示されない

Given 利用上の注意が未登録（null）のリソースの詳細画面を開いている
When 画面を表示する
Then 利用上の注意の欄は表示されない
```

- **INVEST**: Independent・Negotiable・Valuable・Estimable・Small・Testable
- **対応要件**: RES-04（受入条件「未登録時は非表示でよい」）

## ペルソナ対応表

| ストーリー | ADMIN | MEMBER/APPROVER |
|---|---|---|
| US-01 | ✅ | — |
| US-02 | — | ✅ |
| US-03 | — | ✅ |
