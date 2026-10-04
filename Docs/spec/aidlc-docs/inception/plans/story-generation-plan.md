# Story Generation Plan — リソース一覧のソート順選択

## 方針

- **Breakdown Approach**: Feature-Based（`ResourceFilterForm` へのソート選択追加という単一機能に対する受入条件ベースのストーリー）を採用する。resource-search ユニットと同じ判断基準で、User Journey-Based / Persona-Based は過剰と判断
- **粒度**: `requirements.md` の受入条件 5 件のうち、ユーザー向け挙動（名称順・定員順・デフォルト・組み合わせ）を 4 ストーリーに対応させる。「バックエンドの既存テストが引き続き pass する」は非機能要件として扱いストーリー化しない
- **ペルソナ**: resource-search ユニットと同じ 2 ペルソナ構成（単一ペルソナ「BookFlow 認証済みユーザー」＋ ADMIN 補助ペルソナ）を踏襲するが、本ユニットはソート挙動に ADMIN 固有の差がないため、ADMIN 補助ペルソナは「既存の is_active 可視範囲がソートと独立して維持されること」の確認観点としてのみ登場する

## 実行チェックリスト

- [x] Step A: `personas.md` を生成する（認証済みユーザー・ADMIN の 2 ペルソナ。resource-search ユニット版を上書きし、本ユニットの文脈に合わせて書き直す）
- [x] Step B: `stories.md` を生成する（INVEST 準拠、受入条件を Gherkin 風の Given/When/Then で記述）
- [x] Step C: ペルソナとストーリーのマッピング表を `stories.md` 末尾に含める

## Clarifying Questions（Step 3 対応・AskUserQuestion で確認済み）

1. **ソート選択 UI の構造**: フィールド（名称/定員/登録日時）と方向（昇順/降順）を 1 つの Select に統合する（例: 「名称順（昇順）」〜「登録日時順（デフォルト）」の 5 選択肢）。既存の `category` Select と同じ UI パターンで実装規模が小さいため
2. **ソート変更時のページネーション**: category/from/to/keyword 変更時と同様、1 ページ目にリセットする（`ResourceFilterForm#handleSubmit` が既に新しい `URLSearchParams` を丸ごと組み立てて `router.push` する実装のため、追加改修なしで自然に実現される）

## 承認

この計画に対する承認を得てから Part 2（生成）に進む。
