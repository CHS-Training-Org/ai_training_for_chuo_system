---
type: guide
title: 評価基準・レビュー観点
description: PR レビュー時の評価基準と学習者・メンターの観点別チェックリスト
tags: [guide, review, criteria]
timestamp: 2026-06-17
audience: メンター・リポジトリ管理者
references:
  - Docs/guide/dev-workflow.md
  - Docs/spec/index.md
---

# 評価基準・レビュー観点

このページは、第 2 ゲート（メンターレビュー）で使う**評価レンズ**を一元化します。各基準の実体は真実の源（リンク先）が持ちます——このページはリンクと重み付けのみを提供します。

レビュー応答方針・役割分担（オーナー / メンター / 学習者）は [**運用ガイド**](./operations-guide.md) で扱います（[§役割分担](./operations-guide.md#roles) / [§レビュー・応答方針](./operations-guide.md#response-policy)）。

---

## 評価基準（完了条件チェックリスト） { #completion-criteria }

PR を Approve する前に、以下の項目をすべて確認してください。

- [ ] **受入条件**：該当の要件シート（[`spec/enhancements/<課題>.md`](../spec/enhancements/)）の受入条件をすべて満たしている。選択課題の難易度・レイヤー確認は [enhancement-catalog.md §カタログの使い方](./enhancement-catalog.md#catalog) を参照。
- [ ] **CI green**：`CI Frontend / ci`・`CI Backend / ci`・`Security Scan / trivy` がいずれも通過している（[dev-workflow.md §標準開発フロー](./dev-workflow.md#flow) §8 参照）。
- [ ] **セルフレビュー済み**：PR 作成者が [coding-conventions.md §コミット・PR 規約](./coding-conventions.md#commit-pr) のセルフレビューを実施している。
- [ ] **Spec-first 遵守**：仕様変更が伴う場合、[spec/index.md §レビュー観点（メンター向け）](../spec/index.md#review-mentor) の観点で仕様差分を先にレビューしている。
- [ ] **PR テンプレート記入**：[`.github/PULL_REQUEST_TEMPLATE.md`](../../.github/PULL_REQUEST_TEMPLATE.md) の必須項目（対応 Issue リンク・Spec-first チェック・AI 活用箇所）がすべて記入されている。

---

## レビュー観点表 { #review-rubric }

学習者のレベルに応じて重点を変えてレビューします。◎ = 重点的に確認、○ = 確認する。

| 観点 | 内容 | 新人 | 中堅 |
|------|------|:----:|:----:|
| 動作確認 | 受入条件の動作を手元または CI で確認できるか | ◎ | ○ |
| 可読性 | 命名・コメント・関数粒度が [共通方針](./coding-conventions.md#common) に沿っているか | ◎ | ○ |
| 既存パターン整合性 | BookFlow の既存実装（4 レイヤー構成・Server Components 優先等）に沿っているか | ◎ | ○ |
| テスト妥当性 | ユニット / E2E テストが意図したシナリオを検証しているか。境界値・異常系の網羅が適切か | ○ | ◎ |
| AI 活用の適切さ | [ai-tools-guide.md §AI 利用ポリシー](./ai-tools-guide.md#prohibited) と [aidlc-guardrails.md](../../.claude/rules/aidlc-guardrails.md) の方針（過信防止・コンテンツ検証・Spec-first）に沿って AI を使っているか。AI 出力を無検証でコミットしていないか | ○ | ◎ |

### レベル別の重点

- **新人**：「動く・読める・既存に倣う」を最優先。AI 活用の誤りよりも、AI 出力を確認せずマージする習慣形成のリスクに注目する。
- **中堅**：設計判断の妥当性（なぜその実装か）とテストの意図を重点確認。AI 活用については、prohibited 事項の遵守と guardrails の内面化を評価する。

---

## 前方互換メモ { #forward-compat }

検討 A 案 2（AI 一次レビュー）を採用する場合、このページの観点表が機械可読ルールの起点となりうる。実装は検討 A の結論後。

---

## 関連ドキュメント

- 第 2 ゲートの流れ：[dev-workflow.md §標準開発フロー](./dev-workflow.md#flow)
- 仕様差分のレビュー観点：[spec/index.md §レビュー観点（メンター向け）](../spec/index.md#review-mentor)
- セルフレビュー規約：[coding-conventions.md §コミット・PR 規約](./coding-conventions.md#commit-pr)
- AI 利用ポリシー：[ai-tools-guide.md §AI 利用ポリシー](./ai-tools-guide.md#prohibited)
- AI ガードレール：[.claude/rules/aidlc-guardrails.md](../../.claude/rules/aidlc-guardrails.md)
- 運用ガイド（役割分担・サポートフロー・応答方針）：[operations-guide.md](./operations-guide.md)
