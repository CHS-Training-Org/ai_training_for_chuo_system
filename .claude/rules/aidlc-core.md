---
name: aidlc-core
description: AI-DLC エンジンへのポインタ。エンジン本体は /aidlc スキルに移設済み。AI-DLC で開発を進める指定があれば /aidlc スキルを起動する。
---

# AI-DLC エンジン — ポインタ

AI-DLC エンジン本体は **`.claude/skills/aidlc/SKILL.md`** に移設した。

## AI-DLC を使うとき

「AI-DLC で進めて」「aidlc のワークフローで開発したい」等の指定があったとき、または `/aidlc` と明示起動されたときに `/aidlc` スキルを起動する。AI-DLC 指定のない小修正・質問・ドキュメント更新のみでは起動しない。

## 状態ファイル（参照先）

- 進捗トラッカー: `Docs/spec/aidlc-state.md`
- 監査ログ（追記専用）: `Docs/spec/aidlc-audit.md`
- 設計成果物: `Docs/spec/aidlc-docs/`
- ステージ詳細: `.aidlc-rule-details/`（エンジンがオンデマンドで読む）

移設経緯は `Docs/decision/ADR-020-aidlc-engine-adoption.md`（2026-06-24 追記）を参照。
