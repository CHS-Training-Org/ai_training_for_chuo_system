---
sidebar_position: 8
type: guide
title: Playwright とは
description: ブラウザを操作して利用者から見える振る舞いを確かめるテストツール Playwright について、何のための道具か、何ができるか、BookFlow でどう組み込まれているかを説明する。
tags:
  - testing
  - e2e
  - playwright
audience: 学習者
references:
  - ./integration-test/viewpoints.md
  - ./troubleshooting.md
  - ../operations/playwright-adoption.md
  - ../reference/adr/ADR-032-integration-test-tutorial-adoption.md
timestamp: 2026-10-03
---

# Playwright とは ![](/img/playwright-logo.svg)

**Playwright** は、ブラウザを実際に操作してアプリケーションの振る舞いを確かめるテストツールです。  
これまで手作業で行っていた結合テストを、繰り返し実行できるコードにします。

試験観点から順に作っていく手順は[結合テストのチュートリアル](./integration-test/viewpoints.md)にあります。

---

## 何を解決するのか {#why}

BookFlow の検証の工程は3つあります。

| 手段           | 確かめていること                         |
| -------------- | ---------------------------------------- |
| lint と Vitest | 構文と、実装の内部構造に依存した振る舞い |
| JUnit          | バックエンド各層の振る舞い               |
| AI レビュー    | 差分の妥当性                             |

何れも**画面から実際に操作した結果は確かめていません**。Playwright が確かめるのはここです。

![これまでの検証と Playwright が通す範囲](/diagrams/guide/playwright-verification-gap.drawio.svg)

実装をエージェントに任せる開発では、この確認の欠落が従来と比較し問題となります。  
実装の速度が上がった以上、作ったものが業務として成立しているかの確認も同じ速さで回さなければ、確認の側が開発全体の待ち時間になります。単体テストの範囲はすでにテストコードとして自動で回っていますが、画面から通した確認は人が手で画面を触るしかなく、実装の速さに追いついていません。

---

## できること {#can}

![Playwright の動き](/diagrams/guide/playwright-how-it-works.drawio.svg)

- 実際のブラウザで、入力、クリック、画面遷移を再現し、表示された内容を検証する
- 非同期に変わる画面を自動で待つ。要素が現れるまで検証を再試行するため、待ち時間を自分で書かなくてよい
- 失敗したときに、そのときの画面と操作の記録を残す
- 複数のテストを並列に実行する

### 複数のブラウザエンジンで動く {#browsers}

Playwright は **Chromium**、**Firefox**、**WebKit** の3つのブラウザエンジンに対応しています。  
同じテストコードを、設定を変えるだけで各エンジンに対して実行できます。加えて、スマートフォンやタブレットの画面サイズと挙動をエミュレートする設定も用意されています。

BookFlow では Chromium だけをテスト対象にします。

### CI に載せられる {#ci}

Playwright のテストは任意の CI 上で動かせます。修正のたびに走らせ、想定していない影響が画面から DB までを通して出ていないかを確認できます。

:::note[本リポジトリの CI には載せていない]
本リポジトリでは GitHub Actions に載せず、テストはローカルで実行するのみとしています。
:::

### AI エージェント向けの機能がある {#agents}

Playwright には、AI エージェントにテストを作らせたり直させたりする機能が3つあります。

| エージェント | 役割                                                   |
| ------------ | ------------------------------------------------------ |
| planner      | アプリケーションを探索し、テスト計画を Markdown で作る |
| generator    | その計画から実行できる Playwright のコードを生成する   |
| healer       | 失敗したテストを再生し、画面を調べて修正案を出す       |

![planner、generator、healer の関係](/diagrams/guide/playwright-agents.drawio.svg)

本リポジトリでは**採用していません**。試験観点の作成には運営者が用意したスキルを使います。

これとは別に、Claude Code 自身にブラウザを操作させる使い方（Playwright MCP）もあります。

---

## 他のテストとの違い {#layers}

![実装を書き換えたときの違い](/diagrams/guide/playwright-test-layers.drawio.svg)

|                      | 単体テスト（Vitest、JUnit）         | ブラウザから確かめるテスト（Playwright） |
| -------------------- | ----------------------------------- | ---------------------------------------- |
| 確かめるもの         | 関数やクラスなど部品単位の振る舞い  | 画面から DB までを通した業務の流れ       |
| テストが依存するもの | 実装の内部構造                      | 利用者から見える操作と結果               |
| 実装の変更への強さ   | ❌ 内部を書き換えると書き直しが要る | ✅ 内部が入れ替わっても残る              |
| 実行の速さ           | ✅ 速い                             | ❌ 遅い（ブラウザと実データを通すため）  |
| 画面からの動作の確認 | ❌ できない                         | ✅ できる                                |

---

## BookFlow での実行 {#run}

Playwright は導入済みで、テストは `frontend/tests/e2e/` に置きます。

手元で起動するのは postgres、cognito-local、バックエンドです。devcontainer では前の2つが起動済みなので、起動するのはバックエンドだけです。

```bash
# devcontainer の外で作業する場合のみ
docker compose -f .devcontainer/docker-compose.yml up -d

cd backend && ./gradlew bootRun
```

これ以外の設定は `playwright.config.ts` にあります。使うブラウザ、フロントエンドの起動、サインイン済みの状態、前回の実行が残したデータの削除です。

実行と結果の確認は `frontend/` で行います。

```bash
pnpm test:e2e                      # すべてのテストを実行する
pnpm exec playwright show-report   # 直前の実行の結果を開く
pnpm test:e2e:workflow             # 結合テストのワークフローで生成したテスト（tests/e2e/workflow/）だけを実行する
```

`tests/e2e/workflow/` のテストは学習者の成果物で、`pnpm test:e2e` には含まれません。前提のデータ（同じ時間帯の既存予約、無効なリソースなど）を API で用意する関数は `tests/e2e/helpers/setup-data.ts` にあります。

`tests/e2e/workflow/` のテストは、開発用とは別の、結合テスト専用のデータベース（`bookflow_e2e`）で動かします。テストごとに、このデータベースを初期データ（`scripts/seed.sql`）だけの状態に戻すためです。開発用のデータベースを戻すと、手で作ったデータまで消えてしまいます。動かす前に、専用のデータベースを作り、バックエンドをそこにつないで起動します。

```bash
node scripts/e2e-workflow/db.mjs create                                     # 専用のデータベースを作る（初回だけ）
cd backend && DB_URL=jdbc:postgresql://postgres:5432/bookflow_e2e ./gradlew bootRun   # 専用のデータベースにつないで起動する（表が作られる）
node scripts/e2e-workflow/db.mjs reset                                      # 初期データを入れる（pnpm test:e2e:workflow で流す前に要る）
```

作った直後のデータベースには表しかなく、ログインに使うユーザーもいません。`node scripts/e2e-workflow/run.mjs` で流すときは、スクリプトが流す前に初期データを入れます。

バックエンドが開発用のデータベースにつながったまま流すと、テストは最初に止まり、その旨を表示します。開発用のデータベースが初期データとまったく同じ状態のときだけは、見分けられません。

[結合テストのチュートリアル](./integration-test/execution.md)では、この準備と実行も AI（案内スキル）が行います。準備には `node scripts/e2e-workflow/env.mjs up` を使い、専用のデータベースの用意とバックエンドの起動をまとめて行います。

---

## テストコードの基本 {#locators}

**学習者がテストコードを書くことも読むことも、結合テストのチュートリアルではありません**。試験ケースからのコード生成も、テストの実行も AI が行い、学習者は実行の証拠で判断します。この節は、テストがどう動いているかを知りたいときのための参考です。

```typescript
test("予約を申請すると一覧画面に遷移する", async ({ page }, testInfo) => {
  await page.goto("/reservations/new");
  await page.getByLabel("利用目的 *").fill(purposeFor(testInfo));
  await page.getByRole("button", { name: "予約を申請する" }).click();
  await expect(page).toHaveURL(/\/reservations/);
});
```

| 要素                  | 意味                                                            |
| --------------------- | --------------------------------------------------------------- |
| `test("...", ...)`    | テスト1件。先頭の文字列が、失敗したときレポートに出る名前になる |
| `page`                | 開いているブラウザのページ。これを通して画面を操作する          |
| `goto` `fill` `click` | 操作。画面を開く、入力する、押す                                |
| `expect`              | 検証。期待した状態かを確かめる。満たさなければテストは失敗する  |
| `await`               | その行の処理が終わるまで次の行に進まない                        |

操作したい要素は、`getByRole`（ボタンや見出しといった役割と、読み上げられる名前）や `getByLabel`（入力欄に結び付いたラベル）で指します。利用者から見える手がかりで指すやり方であり、BookFlow ではこれだけを使うと決めています。CSS セレクタのように DOM の構造を指す書き方は、実装を整理しただけでテストが落ちるため使いません。

利用目的に渡している `purposeFor` は、テストごとに異なる文字列を返す関数です（[冪等性](#reservation-fixture)）。

---

## 工程ごとの役割分担 {#roles}

[結合テストのチュートリアル](./integration-test/workflow.md)は3つの段階に分かれます。どの段階も、AI が成果物を出し、学習者が関門で判断して確定させます。

| 段階 | 学習者 | AI | 機構（運営者が用意し、学習者は意識しない） |
|---|---|---|---|
| 1 試験観点 | 仕様を読み、何を確かめるかを決める | 仕様書から観点のたたき台を出す | なし |
| 2 試験ケース | 展開された試験ケースを、観点と突き合わせて確かめる | 観点を試験ケースに展開する | なし |
| 3 テストコードと実行 | テストコードは読まずに、説明の判断が要るところと、実行の証拠を見て判断する | テストコードを作って流し、フェイルしたケースに見立てを書く | 認証（サインイン済みの状態で始める）、テストごとのデータの初期化、実行の証拠の収集 |

---

## 学習者が意識しなくてよいこと

次の2つは、運営側の用意した機構が担います。テストコードや手順に書く必要はありません。

### 認証 {#auth}

ローカル環境ではブラウザからのサインインが成立しません。開発用のロール別ログインでセッションを作ってあり、テストは**一般社員でサインイン済みの状態から始まります**。

### 冪等性 {#reservation-fixture}

予約を申請するテストは、データベースに行が残ります。2 回目の実行が前回のデータとぶつかってフェイルしないよう、テストごとに使う時間帯を割り当て、テストが作った予約を実行後にキャンセルしています。

これは普段の `pnpm test:e2e` の仕組みです。結合テストのワークフローで生成したテストは、各テストの前に専用のデータベースを初期データに戻すので、後片付けをしません（[テストの実行](#run)）。

---

## 失敗したときに確認すること {#debug}

テストがフェイルした原因を調べる手段は3つあります。AI が切り分けた結果を確かめるときにも使います。

| 手段          | 開き方                             | 分かること                                 |
| ------------- | ---------------------------------- | ------------------------------------------ |
| HTML レポート | `pnpm exec playwright show-report` | どのステップでフェイルしたか、そのときの画面 |
| トレース      | HTML レポートから開く              | 操作を1ステップずつ遡れる                  |
| UI モード     | `pnpm exec playwright test --ui`   | テストを選び、実行しながらステップを追える |

トレースが記録されるのは再試行したときです。手元の実行は再試行しない設定なので、記録するには `--trace on` を付けます。

環境側の問題は[トラブルシューティング](./troubleshooting.md)にまとめてあります。バックエンドの起動漏れや、初期データの投入漏れがこれに当たります。

---

## 公式ドキュメント

本ページで扱っていない機能は公式ドキュメントを参照します。

- [Writing tests](https://playwright.dev/docs/writing-tests)
- [Locators](https://playwright.dev/docs/locators)
- [Running and debugging tests](https://playwright.dev/docs/running-tests)
- [Continuous Integration](https://playwright.dev/docs/ci-intro)
- [Browsers](https://playwright.dev/docs/browsers)
- [Test Agents](https://playwright.dev/docs/test-agents)

冒頭のロゴは Playwright プロジェクト（Apache-2.0）の公式素材です。
