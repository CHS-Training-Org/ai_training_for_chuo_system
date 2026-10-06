# Story Generation Plan — 予約一覧のフィルタ拡張

## 方針

- **Breakdown Approach**: Feature-Based（`ReservationFilterForm` への resourceName・期間フィルタ追加という単一機能に対する受入条件ベースのストーリー）を採用する。resource-search・resource-sort と同じ判断基準で、User Journey-Based / Persona-Based は過剰と判断
- **粒度**: `requirements.md` の受入条件 5 件のうち、ユーザー向け挙動（resourceName絞り込み・期間絞り込み・組み合わせ・リセット）を 4 ストーリーに対応させる。「既存テストが引き続き pass する」は非機能要件として扱いストーリー化しない
- **ペルソナ**: resource-search・resource-sort と同じ 2 ペルソナ構成（単一ペルソナ「BookFlow 認証済みユーザー」＋ ADMIN 補助ペルソナ）を踏襲する。本ユニットは既存の「ADMIN は全予約、それ以外は自分の予約のみ」という可視範囲がフィルタと独立して維持されることを ADMIN 補助ペルソナの確認観点とする

## 実行チェックリスト

- [x] Step A: `personas.md` を生成する（認証済みユーザー・ADMIN の 2 ペルソナ）
- [x] Step B: `stories.md` を生成する（INVEST 準拠、受入条件を Gherkin 風の Given/When/Then で記述）
- [x] Step C: ペルソナとストーリーのマッピング表を `stories.md` 末尾に含める

## Clarifying Questions（Step 3 対応）

Requirements Analysis で主要な曖昧点（期間フィルタの意味論・resourceName の大文字小文字）はすでに解消済みであり、ストーリー作成固有の新たな曖昧点は無いと判断。追加の `AskUserQuestion` は実施しない。

## 承認

この計画に対する承認を得てから Part 2（生成）に進む。
