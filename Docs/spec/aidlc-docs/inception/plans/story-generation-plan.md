# Story Generation Plan

対象：リソース一覧のキーワード検索追加（`docs-next/docs/spec/enhancements/beginner/resource-list-filter.md`）
入力：`Docs/spec/aidlc-docs/inception/requirements/requirements.md`（FR-01〜FR-15、NFR-01〜NFR-07、US-01〜US-07）
前提判定：`Docs/spec/aidlc-docs/inception/plans/user-stories-assessment.md`（Execute = Yes）

> 確認質問は `.claude/rules/aidlc-questions.md` に従い、質問ファイルの `[Answer]:` タグ方式ではなく `AskUserQuestion` ツールで行う。回答は下記「決定事項」に記録する。

---

## ストーリー分解方式の選択肢

| 方式 | 内容 | 本課題での利点 | 本課題での難点 |
|---|---|---|---|
| **User Journey-Based** | 利用者の操作の流れ（入力 → 絞り込む → 結果確認 → ページ送り → リセット）に沿って並べる | 「空にして絞り込むと解除される」「ページ送りで条件が残る」といった操作の連なりが自然に表現される | ロール差（ADMIN の可視範囲）が journey の中に埋もれやすい |
| **Feature-Based** | システム機能（キーワード照合・条件合成・入力欄・URL 連携）ごとに並べる | 実装ファイルとの対応が取りやすい | 利用者視点を離れ、要件表の言い換えになりやすい |
| **Persona-Based** | ペルソナ（MEMBER / APPROVER / ADMIN）ごとにグルーピングする | 可視範囲の差が独立したストーリーとして明示される | APPROVER と MEMBER の振る舞いが本課題では同一で、重複が生じる |
| **Domain-Based** | 業務ドメイン（リソース照会 / 予約 / 承認）で分ける | 本課題はリソース照会ドメインに閉じるため、分割の意味が乏しい | 実質1グループになる |
| **Epic-Based** | 上位エピックと子ストーリーの階層にする | 後続課題（ソート順選択）と束ねやすい | 単一エンハンス課題には階層が過剰 |
| **ハイブリッド（Journey × Persona）** | 操作の流れでストーリーを並べ、ロール差が生じるものを別ストーリーとして切り出す | 操作の連なりと可視範囲の差を両立できる | ストーリー数がやや増える |

## 受入基準の記述形式の選択肢

| 形式 | 例 | 利点 | 難点 |
|---|---|---|---|
| **Given/When/Then** | 「無効リソースが存在する状態で、MEMBER がその名称で検索したとき、結果に含まれない」 | 前提条件が明示され、テストの Arrange / Act / Assert に対応づけやすい | 記述が冗長になる |
| **チェックリスト** | 「結果に無効リソースが含まれない」 | 簡潔で、要求シートの受入条件と形式が揃う | 前提条件が省略され、テスト設計時に補完が要る |

---

## 決定事項（`AskUserQuestion` の回答）

| 項目 | 決定 |
|---|---|
| ストーリー分解方式 | ハイブリッド（User Journey ベースを主軸に、ロール差が生じる振る舞いを Persona で切り出す） |
| 受入基準の記述形式 | Given/When/Then |

---

## 実行チェックリスト

### 1. ペルソナの整理

- [x] 1.1 既存ロール（MEMBER / APPROVER / ADMIN）を `docs-next/docs/spec/requirements.md` と `backend/.../Role.java` から確認する
- [x] 1.2 本課題で振る舞いに差が出るロールを特定する（可視範囲の差は ADMIN のみ）
- [x] 1.3 各ペルソナの目的・利用文脈・本課題での関心事を記述する
- [x] 1.4 `Docs/spec/aidlc-docs/inception/user-stories/personas.md` を生成する

### 2. ストーリーの起草

- [x] 2.1 利用者の操作の流れを洗い出す（入力 → 絞り込む → 結果確認 → ページ送り → リセット）
- [x] 2.2 流れの各段階を「〜として、〜したい。なぜなら〜」の形式のストーリーに起こす
- [x] 2.3 ロール差が生じる振る舞い（無効リソースの可視性）を独立したストーリーとして切り出す
- [x] 2.4 要件（FR-01〜FR-15）の全項目がいずれかのストーリーで被覆されることを確認する
- [x] 2.5 要求シートの受入条件6項目がいずれかのストーリーで被覆されることを確認する

### 3. 受入基準の付与

- [x] 3.1 各ストーリーに Given/When/Then 形式の受入基準を付ける
- [x] 3.2 境界的な入力（空文字・空白のみ・`%` や `_` を含む文字列・`description` が null のリソース）を受入基準に含める
- [x] 3.3 各受入基準が、バックエンドとフロントエンドのどちらで検証されるかを示す

### 4. INVEST 適合の確認

- [x] 4.1 Independent：ストーリー間の実装順序依存がないことを確認する
- [x] 4.2 Negotiable：実装手段ではなく利用者の目的として書かれていることを確認する
- [x] 4.3 Valuable：各ストーリーが利用者にとっての価値を述べていることを確認する
- [x] 4.4 Estimable：見積もり可能な粒度であることを確認する
- [x] 4.5 Small：1ストーリーが数十分から1時間程度の作業に収まることを確認する
- [x] 4.6 Testable：受入基準がそのままテストケースに落とせることを確認する

### 5. トレーサビリティ

- [x] 5.1 ストーリーと要件（FR / NFR）の対応表を作る
- [x] 5.2 ペルソナとストーリーの対応表を作る
- [x] 5.3 `Docs/spec/aidlc-docs/inception/user-stories/stories.md` を生成する

### 6. 状態更新

- [x] 6.1 本プランのチェックボックスをすべて `[x]` にする
- [x] 6.2 `Docs/spec/aidlc-state.md` の User Stories を完了にする
- [x] 6.3 `Docs/spec/aidlc-audit.md` に記録する

---

## 生成必須の成果物

- [x] `Docs/spec/aidlc-docs/inception/user-stories/personas.md` — ペルソナの原型と特性
- [x] `Docs/spec/aidlc-docs/inception/user-stories/stories.md` — INVEST に沿ったユーザーストーリーと受入基準、トレーサビリティ表

## 本ステージで扱わないこと

- 優先順位付け・スプリント計画・工数見積もり
- 技術的な実装方式（Requirements Analysis で JPA Specification に確定済み）
- 変更対象ファイルの列挙（Code Generation の Part 1 で扱う）
