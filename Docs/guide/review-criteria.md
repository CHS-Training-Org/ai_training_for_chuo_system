---
type: guide
title: 評価基準・レビュー観点
description: PR 提出前のセルフレビュー基準と学習者・メンターの観点別チェックリスト
tags:
  - guide
  - review
  - criteria
timestamp: 2026-07-27
audience: 学習者・メンター
references:
  - Docs/guide/dev-workflow.md
  - Docs/spec/index.md
---

# 評価基準・レビュー観点

このページは、**PR を提出する前に学習者自身がセルフレビューで使う評価レンズ**を一元化します。メンターも、任意でコメントする際の参考として使えます。  
各基準の実体は真実の源（リンク先）が持ちます。このページはリンクと重み付けのみを提供します。

レビュー応答方針、役割分担（オーナー / メンター / 学習者）は [**運用ガイド**](./operations-guide.md) で扱います（[§役割分担](./operations-guide.md#roles) / [§レビュー・応答方針](./operations-guide.md#response-policy)）。

---

## 評価基準（完了条件チェックリスト） { #completion-criteria }

PR を提出する前に、以下の項目をすべて自分で確認してください。

- [ ] **受入条件**：該当の要件シート（[`spec/enhancements/<課題>.md`](../spec/enhancements/)）の受入条件をすべて満たしている。選択課題の難易度、レイヤー確認は [enhancement-catalog.md §カタログの使い方](./enhancement-catalog.md#catalog) を参照。
- [ ] **CI green**：`CI Frontend / ci`・`CI Backend / ci` がいずれも通過している（[dev-workflow.md §標準開発フロー](./dev-workflow.md#flow) §8 参照）。
- [ ] **セルフレビュー済み**：PR 作成者が [coding-conventions.md §コミット・PR 規約](./coding-conventions.md#commit-pr) のセルフレビューを実施している。
- [ ] **Spec-first 遵守**：仕様変更が伴う場合、[spec/index.md §レビュー観点（メンター向け）](../spec/index.md#review-mentor) の観点で仕様差分を先にレビューしている。
- [ ] **PR テンプレート記入**：[`.github/PULL_REQUEST_TEMPLATE.md`](../../.github/PULL_REQUEST_TEMPLATE.md) の必須項目（対応 Issue リンク・Spec-first チェック・AI 活用箇所）がすべて記入されている。
- [ ] **AI レビューの総合判定が「完了」**：`@claude pr-review` によるレビューで3観点すべてが `OK` になっている（[§AI レビューとの対応](#ai-review)）。観点3は質問への回答が必要なため、少なくとも2回のやり取りを要します。

---

## レビュー観点表 { #review-rubric }

自分のレベルに応じて重点を変えてセルフレビューします。◎ = 重点的に確認、○ = 確認する。メンターが任意でコメントする際も同じ観点を参考にできます。

| 観点 | 内容 | 若手 | 中堅 |
|------|------|:----:|:----:|
| 動作確認 | 受入条件の動作を手元または CI で確認できるか | ◎ | ○ |
| 可読性 | 命名・コメント・関数粒度が [共通方針](./coding-conventions.md#common) に沿っているか | ◎ | ○ |
| 既存パターン整合性 | BookFlow の既存実装（4 レイヤー構成・Server Components 優先等）に沿っているか | ◎ | ○ |
| テスト妥当性 | ユニット / E2E テストが意図したシナリオを検証しているか。境界値・異常系の網羅が適切か | ○ | ◎ |
| AI 活用の適切さ | [ai-tools-guide.md §AI 利用ポリシー](./ai-tools-guide.md#prohibited) と [aidlc-guardrails.md](../../.claude/rules/aidlc-guardrails.md) の方針（過信防止・コンテンツ検証・Spec-first）に沿って AI を使っているか。AI 出力を無検証でコミットしていないか | ○ | ◎ |

### レベル別の重点

- **若手**：「動く・読める・既存に倣う」を最優先で自己確認する。AI 活用の誤りよりも、AI 出力を確認せずマージする習慣がついてしまうリスクに注意する。
- **中堅**：設計判断の妥当性（なぜその実装か）とテストの意図を重点的に自己確認する。AI 活用については、prohibited 事項の遵守と guardrails の内面化を自己評価する。

---

## AI レビューとの対応 { #ai-review }

AI レビューの採用は [ADR-024](../decision/ADR-024-ai-first-review-adoption.md)、タスク完了判定としての位置づけは [ADR-025](../decision/ADR-025-ai-review-completion-gate.md) で決着済みです。学習者が PR に `@claude pr-review` とコメントすると、以下の3観点で判定されます（実装は `.github/workflows/claude.yml` の `claude-review` ジョブ、判定基準の定義本体は `.github/workflows/references/pr-review-rubric/`、運用は [operations-guide.md §AI レビュー](./operations-guide.md#ai-review) を参照）。

| AI レビューの観点 | 対応する評価基準・観点 |
|---|---|
| 観点1 要求整合性 | §評価基準の「受入条件」「Spec-first 遵守」、§レビュー観点表の「動作確認」 |
| 観点2 実装と非機能部分の整合性 | §レビュー観点表の「テスト妥当性」 |
| 観点3 理解度チェック | §レビュー観点表の「AI 活用の適切さ」 |

出力は観点ごとに1件、最後にサマリを1件の計4件のコメントです。各観点の判定は `OK`・`NG`・`判定不能` の3値で、ビジネス要求シートが未リンクの場合や PR 本文の該当欄が未記入の場合は `判定不能` になります。3観点すべてが `OK` で、かつ CI green のとき総合判定が「完了」になり、これがタスク完了の条件です。

観点3は2ラウンド方式です。1回目のレビューは質問の提示にとどまり `判定不能（未回答）` となるため、質問に PR コメントで回答してから再度 `@claude pr-review` とコメントしてください。

総合判定はタスク完了の条件ですが、必須 status check には含めません。マージは学習者自身が行います。静的解析（GHAS・CodeQL）は学習用スコープ外のため採用していません。

---

## 関連ドキュメント

- セルフレビュー・マージの流れ：[dev-workflow.md §標準開発フロー](./dev-workflow.md#flow)
- 仕様差分のレビュー観点：[spec/index.md §レビュー観点（セルフチェック）](../spec/index.md#review-mentor)
- セルフレビュー規約：[coding-conventions.md §コミット・PR 規約](./coding-conventions.md#commit-pr)
- AI 利用ポリシー：[ai-tools-guide.md §AI 利用ポリシー](./ai-tools-guide.md#prohibited)
- AI ガードレール：[.claude/rules/aidlc-guardrails.md](../../.claude/rules/aidlc-guardrails.md)
- 運用ガイド（役割分担・サポートフロー・応答方針）：[operations-guide.md](./operations-guide.md)
- AI レビュー採用の意思決定：[ADR-024](../decision/ADR-024-ai-first-review-adoption.md)
- AI レビューをタスク完了判定に格上げした意思決定：[ADR-025](../decision/ADR-025-ai-review-completion-gate.md)
