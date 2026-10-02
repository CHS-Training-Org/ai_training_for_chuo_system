# Story Generation Plan — リソース一覧の検索・フィルタ追加

## 方針

- **Breakdown Approach**: Feature-Based（`ResourceFilterForm` へのキーワード検索追加という単一機能に対する受入条件ベースのストーリー）を採用する。User Journey-Based や Persona-Based は、ロール間で検索挙動に差がないため過剰と判断
- **粒度**: `requirements.md` の受入条件 6 件に 1:1 対応する 4 ストーリー（空入力・空白のみ入力の 2 条件は 1 ストーリーに統合）+ 既存ユニットテストの継続 pass は非機能要件として扱いストーリー化しない
- **ペルソナ**: 単一ペルソナ「BookFlow 認証済みユーザー」を基本とし、ADMIN 固有の挙動（inactive リソースも検索対象に含む）のみ補助ペルソナとして扱う

## 実行チェックリスト

- [ ] Step A: `personas.md` を生成する（認証済みユーザー・ADMIN の 2 ペルソナ）
- [ ] Step B: `stories.md` を生成する（INVEST 準拠、受入条件を Gherkin 風の Given/When/Then で記述）
- [ ] Step C: ペルソナとストーリーのマッピング表を `stories.md` 末尾に含める

## Clarifying Question（Step 3 対応）

要件書（`requirements.md`）には「keyword 検索で 0 件になった場合の画面表示」が明記されていない。既存の `page.tsx`（72〜77行目）の空状態メッセージは `hasTimeFilter`（from/to 指定の有無）のみで分岐しており、`hasTimeFilter` が false の場合は一律「リソースがありません。」と表示される。これは keyword 検索で 0 件だった場合にも表示されるが、文言としては「絞り込み条件に一致するリソースがありません」の方が正確であり、`screen-spec.md` の該当箇所の更新が必要になる可能性がある。

BookFlow の運用規約（`.claude/rules/aidlc-questions.md`）に従い、この質問は `AskUserQuestion` ツールで確認する（ファイル方式は採用しない）。

**回答**: 新しい専用文言を追加する。keyword 指定時に 0 件なら「絞り込み条件に一致するリソースがありません。」（仮）を表示するよう `page.tsx` の空状態分岐を拡張し、`screen-spec.md` §`/resources` にも追記する（`/update-spec` スキルで Code Generation 前に反映）。

## 承認

この計画に対する承認を得てから Part 2（生成）に進む。
