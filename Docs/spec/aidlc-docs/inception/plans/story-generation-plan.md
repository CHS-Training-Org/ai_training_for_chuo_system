# Story Generation Plan: CSV 帳票出力（Issue #29）

## 入力

- `Docs/spec/aidlc-docs/inception/requirements/requirements.md`（承認済み 2026-10-24T04:30:00+00:00）
- `docs-next/docs/spec/enhancements/intermediate/csv-export.md`（ビジネス要求シート）
- `Docs/spec/aidlc-docs/inception/plans/user-stories-assessment.md`（実行判定）

## 方針

- 役割はプロダクトオーナーとして、要件をユーザー視点のストーリーに変換する。技術的な実装方式（ダウンロード経路、CSV 生成方法など）はストーリーに書かない（`requirements.md` の「設計上の検討事項」として Application Design に送り済み）
- ストーリーは INVEST（Independent / Negotiable / Valuable / Estimable / Small / Testable）を満たすように書く
- 各ストーリーに受入条件を付け、シートの受入条件と要件 ID（RPT-01〜05）への対応を示す
- 文書は日本語で書く

## ストーリー分割の選択肢

| 方式 | 内容 | 本課題での利点 | 本課題での欠点 |
|------|------|--------------|--------------|
| User Journey-Based | ADMIN の操作の流れ（画面を開く → 条件を決める → ダウンロード → Excel で開く）に沿う | 利用者の体験として読みやすい | ロール制限の検証が流れの中に埋もれやすい |
| Feature-Based | 機能（全件出力、絞り込み、アクセス制限）ごとに分ける | 受入条件とテストに 1 対 1 で対応しやすい | 体験の流れは読み取りにくい |
| Persona-Based | ペルソナごとに分ける | ロール別の振る舞いが明確 | ADMIN 以外は「使えない」だけなので、偏りが大きい |
| Domain-Based | 業務領域ごとに分ける | 複数領域の課題向き | 本課題は予約の帳票という単一領域で、分ける軸がない |
| Epic-Based | エピック配下にサブストーリーを置く | 大規模な課題向き | 本課題の規模（半日〜1 日）には階層が過剰 |

選択した方式は「確認質問と回答」の Q2 を参照。

## 確認質問と回答

BookFlow では質問ファイルの `[Answer]:` 記入方式を採らず、`AskUserQuestion` で確認する（`.claude/rules/aidlc-questions.md`）。回答はこの節に転記する。

### Q1 ペルソナの範囲
personas.md にどのロールを載せるか。

- A) ADMIN のみ
- B) ADMIN を主ペルソナとし、MEMBER / APPROVER を「使えないことを確認する対象」として併記する

[Answer]: B（ADMIN を主ペルソナとし、MEMBER / APPROVER を併記）

### Q2 ストーリーの分割方式
- A) Feature-Based（全件出力 / 絞り込み / アクセス制限などに分ける）
- B) User Journey-Based（ADMIN の操作の流れに沿って 1〜2 本にまとめる）

[Answer]: A（Feature-Based）

### Q3 受入条件の書式
- A) Given / When / Then 形式
- B) チェックリスト形式（シートの受入条件と同じ書き方）

[Answer]: A（Given / When / Then）

### 回答の分析

3 問とも単一の選択肢で回答され、曖昧な表現や回答間の矛盾はない。Q1 で MEMBER / APPROVER を併記するため、Q2 の Feature-Based ではアクセス制限を独立したストーリーとして立てる。

## ストーリーの見込み（Part 2 で確定）

Feature-Based で次の 3〜4 本を見込む。本数と境界は Part 2 の手順 2 で確定する。

- 全件の CSV をダウンロードする（ボタン、ヘッダ、BOM、表記、並び順、0 件時）
- 期間で絞り込んで CSV をダウンロードする（開始日時での判定、両方指定、`from` ≧ `to` の 400）
- ステータスで絞り込んで CSV をダウンロードする（複数指定、期間との組み合わせ）
- ADMIN 以外は CSV 出力を使えない（ボタン非表示、API 403、未認証 401）

## 実行チェックリスト（Part 2 で実施）

- [x] 1. 回答に基づき、ペルソナを `Docs/spec/aidlc-docs/inception/user-stories/personas.md` に作成する（属性、目的、ロールと権限、本機能との関係）
- [x] 2. 選択した分割方式でストーリーを洗い出し、`Docs/spec/aidlc-docs/inception/user-stories/stories.md` に作成する（US-1〜US-4 の 4 本で確定）
  - [x] 2.1 各ストーリーを「〜として、〜したい。それは〜のためだ」の形式で書く
  - [x] 2.2 各ストーリーに、選択した書式で受入条件を付ける
  - [x] 2.3 要件の確定した解釈（期間の判定、両方指定、`from` ≧ `to` の 400、0 件時、並び順、表記、ヘッダ、BOM）を、いずれかのストーリーの受入条件に必ず含める
- [x] 3. ストーリーと要件 ID（RPT-01〜05）、シートの受入条件 5 項目の対応表を `stories.md` に載せ、漏れがないことを確認する
- [x] 4. ペルソナとストーリーの対応表を `stories.md` に載せる
- [x] 5. 各ストーリーを INVEST の観点で点検し、結果を `stories.md` に記録する
