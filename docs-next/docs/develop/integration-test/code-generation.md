---
sidebar_position: 3
type: guide
title: Playwright コードを生成する
description: 確定した試験ケースを、AI を使って Playwright のテストコードに変換し、要素の指定方法と実行安定性の観点でレビューする。
tags:
  - testing
  - e2e
  - playwright
  - tutorial
audience: 学習者
timestamp: 2026-09-21
references:
  - ./cases.md
  - ./execution.md
  - ../../operations/playwright-adoption.md
  - ../coding-conventions.md
---

# Playwright コードを生成する

[試験ケースに展開するチュートリアル](./cases.md)で確定した試験ケースを、AI を使って実行できる Playwright のテストコードへ変換します。ここから先はコードを書く工程になりますが、判断の中心は変わりません。AI が生成したコードが、確定した試験ケースを正しく実現しているかを確かめるのは学習者です。

## 学習目標

このチュートリアルを終えると、次ができるようになります。

- 試験ケースから Playwright のテストコードを生成できる
- 要素を役割とラベルで指定するコードと、そうでないコードを見分けられる
- 繰り返し実行しても同じ結果になるコードかどうかを判断できる

## ゴール

次を満たす Playwright のテストコードを完成させます。

- 確定した試験ケースの操作と期待結果を過不足なく再現している
- 要素を役割とラベルで指定している
- 繰り返し実行しても同じ結果になる

---

## 前提：この画面で決まっている書き方

道具そのものの説明は[Playwright とは](../playwright-guide.md)にあります。生成されたコードをレビューするときの基準になるのは、次の4点です。

| 決まり | 書き方 |
|---|---|
| 要素は役割とラベルで指定する | `getByRole` と `getByLabel` を使い、`data-testid` は追加しない（[テストコードの掴み](../playwright-guide.md#locators)） |
| 必須項目のラベルには `*` が付く | `getByLabel("開始日時 *")` のように実装どおりに書く |
| 認証は自動で行われる | サインイン操作は書かない（[認証](../playwright-guide.md#auth)） |
| 予約の日時と後片付けは機構に任せる | `slotFor` と `purposeFor` を使い、`afterEach` で後片付けする（[冪等性](../playwright-guide.md#reservation-fixture)） |

テストは MEMBER でログイン済みの状態から始まります。必須項目のラベルは、末尾に半角スペースと `*` が付きます。

---

## 手順1 AI にテストコードを生成させる

確定した試験ケースを、Playwright のテストコードへ変換します。前提の書き方をプロンプトに含めておくと、レビューの手間が減ります。

```text
以下の試験ケースを Playwright のテストコードに変換してください。

＜試験ケースを貼り付け＞

次の書き方に従ってください。

・要素は getByRole・getByLabel で指定する。data-testid は使わない
・認証は済んでいる前提でよい（サインイン操作は書かない）
・予約を作るケースは、日時を自分で決めずに
　tests/e2e/helpers/reservations.ts の slotFor(testInfo) から受け取る。
　利用目的には purposeFor(testInfo) を使う
・予約を作る spec には、afterEach で
　cancelE2EReservations({ purpose: purposeFor(testInfo) }) を呼ぶ後片付けを書く
```

できたファイルは `frontend/tests/e2e/` に置きます。ファイル名は対象の機能が分かる名前にします（例：`reservation-validation.spec.ts`）。

---

## 手順2 生成されたコードをレビューする

生成されたコードが前提に沿っているかを、次の5点で確認します。

| 見つけたら直すもの | 直し方 |
|---|---|
| `data-testid` や CSS セレクタでの指定 | `getByRole` と `getByLabel` に書き直す |
| コードに直接書いた日時、現在時刻からの計算 | `slotFor` から受け取る形に置き換える |
| `afterEach` の後片付けがない予約のテスト | `cancelE2EReservations` の呼び出しを足す |
| 要素の存在だけを見ている `expect` | メッセージの文言や遷移先まで検証する |
| `page.waitForTimeout` による固定時間の待機 | 削除する |

後半の3つには、見落としやすい理由があります。

後片付けのないテストは、そのテスト単体では通っても、次の実行を落とします（[冪等性](../playwright-guide.md#reservation-fixture)）。存在確認だけの `expect` は、試験ケースが決めた期待結果を確かめたことになりません。固定時間の待機は、`expect` が要素の出現を自動で待つため不要なうえ、実行時間を伸ばし、環境によっては待ち時間が足りずに失敗します。

:::warning[AI の出力をうのみにしない]

AI が生成したコードが、これまでの前提（役割とラベルによる指定、時間帯の割り当てと後片付けの機構）に従っていないことがあります。実行する前に、必ずコードを読んで確認してください。

:::

---

## 手順3 テストコードを確定する

手順2 で見つけた問題を、自分で直すか AI に直させるかして解消します。

---

## 次のステップ

書いたテストコードを、次は[実際に実行する](./execution.md)チュートリアルで動かして確かめます。
