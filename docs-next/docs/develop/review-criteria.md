---
sidebar_position: 5
title: 評価基準・レビュー観点
description: PR 提出前のセルフレビュー基準と学習者・運営者の観点別チェックリスト
tags:
  - guide
  - review
  - criteria
audience: 学習者・運営者
references:
  - ./dev-workflow.md
  - ../reference/adr/ADR-030-personal-trunk-branch-strategy.md
  - ../spec/index.md
last_updated: '2026-08-01T11:56:18+09:00'
---

# 評価基準・レビュー観点

このページは、**PR を提出する前に学習者自身がセルフレビューで使う評価レンズ**を一元化します。運営者も、任意でコメントする際の参考として使えます。  
各基準の実体は真実の源（リンク先）が持ちます。このページはリンクと重み付けのみを提供します。

レビュー応答方針、役割分担（運営者 / 学習者）は [**運用ガイド**](../operations/operations-guide.md) で扱います（[§役割分担](../operations/operations-guide.md#roles) / [§レビュー・応答方針](../operations/operations-guide.md#response-policy)）。

---

## 評価基準（完了条件チェックリスト） {#completion-criteria}
PR を提出する前に、以下の項目をすべて自分で確認してください。

- [ ] **受入条件**：該当の[要件シート](../spec/enhancements/index.md)の受入条件をすべて満たしている。選択課題の難易度、レイヤー確認は [enhancement-catalog.md §カタログの使い方](./enhancement-catalog.md#catalog) を参照。
- [ ] **CI green**：`CI Frontend / ci`・`CI Backend / ci` がいずれも通過している（[dev-workflow.md §標準開発フロー](./dev-workflow.md#flow) §8 参照）。
- [ ] **セルフレビュー済み**：PR 作成者が [coding-conventions.md §コミット・PR 規約](./coding-conventions.md#commit-pr) のセルフレビューを実施している。
- [ ] **Spec-first 遵守**：仕様変更が伴う場合、[spec/index.md §レビュー観点（セルフチェック）](../spec/index.md#spec-review-checklist) の観点で仕様差分を先にレビューしている。
- [ ] **PR テンプレート記入**：[`.github/PULL_REQUEST_TEMPLATE.md`](https://github.com/CHS-Training-Org/ai_training_for_chuo_system/blob/main/.github/PULL_REQUEST_TEMPLATE.md) の必須項目（対応 Issue リンク・Spec-first チェック・AI 活用箇所）がすべて記入されている。
- [ ] **AI レビューの総合判定が「完了」**：`@claude pr-review` によるレビューで観点1・観点2が `OK`、CI green、かつ観点3が確定している（[§AI レビューとの対応](#ai-review)）。観点3は質問への回答が必要なため、少なくとも2回のやり取りを要します。誤答があっても「完了」は妨げられません。

---

## レビュー観点表 {#review-rubric}
取り組んでいる課題の段階に応じて重点を変えてセルフレビューします。◎ = 重点的に確認、○ = 確認する。運営者が任意でコメントする際も同じ観点を参考にできます。

| 観点 | 内容 | 初級課題時 | 中級課題時 |
|------|------|:----------:|:----------:|
| 動作確認 | 受入条件の動作を手元または CI で確認できるか | ◎ | ○ |
| 可読性 | 命名・コメント・関数粒度が [共通方針](./coding-conventions.md#common) に沿っているか | ◎ | ○ |
| 既存パターン整合性 | BookFlow の既存実装（4 レイヤー構成・Server Components 優先等）に沿っているか | ◎ | ○ |
| テスト妥当性 | ユニット / E2E テストが意図したシナリオを検証しているか。境界値・異常系の網羅が適切か | ○ | ◎ |
| AI 活用の適切さ | [ai-tools-guide.md §AI 利用ポリシー](../learn/ai-tools-guide.md#prohibited) と [aidlc-guardrails.md](https://github.com/CHS-Training-Org/ai_training_for_chuo_system/blob/main/.claude/rules/aidlc-guardrails.md) の方針（過信防止・コンテンツ検証・Spec-first）に沿って AI を使っているか。AI 出力を無検証でコミットしていないか | ○ | ◎ |

### 段階別の重点

- **初級課題（Beginner）**：「動く・読める・既存に倣う」を最優先で自己確認する。AI 活用の誤りよりも、AI 出力を確認せずマージする習慣がついてしまうリスクに注意する。
- **中級課題（Intermediate）**：設計判断の妥当性（なぜその実装か）とテストの意図を重点的に自己確認する。AI 活用については、prohibited 事項の遵守と guardrails の内面化を自己評価する。

---

## AI レビューとの対応 {#ai-review}
AI レビューの採用は [ADR-024](../reference/adr/ADR-024-ai-first-review-adoption.md)、タスク完了判定としての位置づけは [ADR-025](../reference/adr/ADR-025-ai-review-completion-gate.md) で決着済みです。学習者が PR に `@claude pr-review` とコメントすると、以下の3観点で判定されます（実装は `.github/workflows/claude.yml` の `claude-review` ジョブ、判定基準の定義本体は `.github/workflows/references/pr-review-rubric/`、運用は [operations-guide.md §AI レビュー](../operations/operations-guide.md#ai-review) を参照）。

| AI レビューの観点 | 対応する評価基準・観点 |
|---|---|
| 観点1 要求整合性 | §評価基準の「受入条件」「Spec-first 遵守」、§レビュー観点表の「動作確認」 |
| 観点2 実装と非機能部分の整合性 | §レビュー観点表の「テスト妥当性」 |
| 観点3 理解度チェック | §レビュー観点表の「AI 活用の適切さ」 |

出力は観点ごとに1件、最後にサマリを1件の計4件のコメントです。観点1・観点2の判定は `OK`・`NG`・`判定不能` の3値で、ビジネス要求シートが未リンクの場合や PR 本文の該当欄が未記入の場合は `判定不能` になります。

観点3だけは3値ではなく**状態**（`未回答` / `全問正解` / `誤答N問・解説済み`）で表示されます。**観点1・観点2が `OK`、CI green、かつ観点3が確定しているとき**に総合判定が「完了」になり、これがタスク完了の条件です。観点3の誤答は完了を妨げません（[ADR-026](../reference/adr/ADR-026-comprehension-check-quiz-format.md)）。誤答はコードの欠陥ではなく理解度であり、修正して解消できる種類のものではないためです。ただし誤答は PR コメントに記録として残ります。

観点3は3〜5問の4択です。1回目のレビューは出題にとどまるため、**「問番号＋選んだ選択肢＋選んだ理由を一文」の形式（例：`1-B。理由は…`）で PR の会話コメントに回答**してから、再度 `@claude pr-review` とコメントしてください。2回目のレビューで判定と、**正誤にかかわらず全問の解説**が返ります。差分の行に付けるレビューコメントは読み取れないため、会話コメントで投稿してください。

総合判定はタスク完了の条件ですが、必須 status check には含めません。マージは学習者自身が、自分のトランクブランチへ行います（`main` へは学習者は誰もマージしません。[ADR-030](../reference/adr/ADR-030-personal-trunk-branch-strategy.md)）。静的解析（GHAS・CodeQL）は学習用スコープ外のため採用していません。

---

## 関連ドキュメント

- セルフレビュー・マージの流れ：[dev-workflow.md §標準開発フロー](./dev-workflow.md#flow)
- 仕様差分のレビュー観点：[spec/index.md §レビュー観点（セルフチェック）](../spec/index.md#spec-review-checklist)
- セルフレビュー規約：[coding-conventions.md §コミット・PR 規約](./coding-conventions.md#commit-pr)
- AI 利用ポリシー：[ai-tools-guide.md §AI 利用ポリシー](../learn/ai-tools-guide.md#prohibited)
- AI ガードレール：[.claude/rules/aidlc-guardrails.md](https://github.com/CHS-Training-Org/ai_training_for_chuo_system/blob/main/.claude/rules/aidlc-guardrails.md)
- 運用ガイド（役割分担・サポートフロー・応答方針）：[operations-guide.md](../operations/operations-guide.md)
- AI レビュー採用の意思決定：[ADR-024](../reference/adr/ADR-024-ai-first-review-adoption.md)
- AI レビューをタスク完了判定に格上げした意思決定：[ADR-025](../reference/adr/ADR-025-ai-review-completion-gate.md)
