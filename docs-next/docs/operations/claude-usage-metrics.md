---
sidebar_position: 5
type: guide
title: Claude Code のトークン消費量の確認
description: claude.yml の実行が消費したトークン量・コストを週次で集計する仕組みの見方、計測できる範囲、バックフィルと復旧の手順
tags:
  - operations
  - ci
  - metrics
  - ai
audience: 運営者
references:
  - ../reference/adr/ADR-033-claude-usage-metrics.md
  - ../reference/adr/ADR-024-ai-first-review-adoption.md
last_updated: '2026-09-21T00:00:00+09:00'
---

# Claude Code のトークン消費量の確認

`claude.yml` の実行（`@claude` への応答と AI レビュー）が消費したトークン量とコストを、週次で自動集計しています。  
このページは、集計結果の見方と、計測できる範囲の制約をまとめたものです。判断の経緯は [トークン消費量の計測と保持](../reference/adr/ADR-033-claude-usage-metrics.md) にあります。

---

## 集計結果を見る {#view}

GitHub の Actions タブから **Claude Usage Report** ワークフローを開き、任意の実行の Summary を表示します。次の内容が 1 ページにまとまっています。

- 今週・今月・直近 12 か月の合計トークン数とコスト
- 月別（直近 13 か月）と週別（直近 13 週）の推移
- 実行者別の内訳（今月・直近 12 か月）

集計は JST の暦で区切ります。週は月曜始まりの ISO 週です。

---

## 計測できる範囲 {#coverage}

トークン数は Actions のジョブログ本文にしか出力されず、**ログの保持期間は 90 日**です。そのため、この仕組みが動き出す前の実行に遡ってトークン数を求めることはできません。1 年分の推移が揃うのは運用開始から 1 年後で、それまでは蓄積済みの期間だけが表示されます。

集計表の実行回数に「うち未計測」と付く行は、コストは記録できたがトークン数が得られなかった実行です。`show_full_output: true` を指定していないジョブではトークン数が秘匿されるため、このフラグを入れる前の実行がこれに当たります。

表示されるコストは list price 換算の参考値です。実行はサブスクリプション認証で行っているため、**実際の請求額とは一致しません**。消費量の相対比較には使えますが、費用計上の根拠にはなりません。

---

## データの保存場所 {#storage}

収集したデータは `metrics/claude-usage` ブランチに置かれます。`main` には含まれないため、GitHub 上でブランチを切り替えて参照します。

| ファイル | 内容 |
|---|---|
| `claude-usage.jsonl` | ジョブ 1 件ごとの生データ。`job_id` が一意キー |
| `weekly.csv` | 週別の集計 |
| `monthly.csv` | 月別の集計 |
| `by-user-monthly.csv` | 実行者 × 月の集計 |

CSV は JSONL から毎回作り直されます。集計の定義を変えたときは、過去分も含めて再生成されます。

---

## 手動実行とバックフィル {#backfill}

Actions タブの **Claude Usage Report** から `Run workflow` で手動実行できます。`since` に `YYYY-MM-DD` を入れると、その日以降に作成された実行を収集対象にします。未指定なら 35 日前からです。

収集済みのジョブはログを再取得しないため、期間を重ねて実行しても結果は変わりません。週次実行が何度か失敗した後の復旧では、失敗し始めた日付を `since` に指定して手動実行します。ただしログの保持期間を過ぎた実行は復旧できません。

---

## 仕組みを変更するとき {#maintenance}

収集はジョブログの出力様式に依存しており、`anthropics/claude-code-action` 側の様式が変わるとパースが壊れます。壊れたときは、集計表の実行回数が伸びているのにトークン数が増えない、という形で現れます。

パースの挙動は実ログを写したフィクスチャで検証しています。次のコマンドで実行できます。

```bash
node --test .github/scripts/lib/claude-usage.test.mjs
```

様式が変わったときは、まず実際のログを見てフィクスチャを更新し、テストが落ちることを確認してから `.github/scripts/lib/claude-usage.mjs` を直します。

---

## 関連ドキュメント

- [トークン消費量の計測と保持](../reference/adr/ADR-033-claude-usage-metrics.md)
- [AI 一次レビューの採用](../reference/adr/ADR-024-ai-first-review-adoption.md)
- [運用ガイド](./operations-guide.md)
