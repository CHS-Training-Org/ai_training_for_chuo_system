# Story Generation Plan — 予約の下書き保存

**対象**: `docs-next/docs/spec/enhancements/intermediate/reservation-draft.md`
**入力**: `Docs/spec/aidlc-docs/inception/requirements/reservation-draft/requirements.md`（FR-01〜FR-07、NFR-01〜NFR-04）
**前提判定**: [`user-stories-assessment.md`](./user-stories-assessment.md)（Execute = Yes）

> 確認質問は `.claude/rules/aidlc-questions.md` に従い、質問ファイルの `[Answer]:` タグ方式ではなく `AskUserQuestion` ツールで行う。

---

## 決定事項

前回ワークフロー（`resource-keyword-search`）で学習者が承認した方式を引き継ぐ。

| 項目 | 決定 | 引き継ぎ元 |
|---|---|---|
| ストーリー分解方式 | ハイブリッド（User Journey を主軸に、ロール差が生じる振る舞いを Persona で切り出す） | 前回の `story-generation-plan.md` |
| 受入基準の記述形式 | Given/When/Then | 同上 |

本課題でこの方式が適する理由は、下書きの操作が「保存して離れ、後で戻って申請する」という時間をまたぐ流れを持ち、
かつ APPROVER の可視範囲が既存の権限モデルから変わるという、流れとロールの両方に論点があるため。

---

## 想定する操作の流れ

```
予約申請フォームを開く
        |
        v
  内容を入力する
        |
        +---- 「申請する」 ----> PENDING または APPROVED（既存の流れ）
        |
        +---- 「下書き保存」 --> DRAFT
                                    |
                                    v
                          予約一覧の「ドラフト」タブ
                                    |
                                    v
                              下書きの詳細を開く
                                    |
                    +---------------+---------------+
                    |                               |
                    v                               v
             内容を再編集する                  正式申請する
                                                    |
                                                    v
                                   requires_approval により PENDING または APPROVED
```

---

## 実行チェックリスト

### 1. ペルソナの整理

- [x] 1.1 既存ロール（MEMBER / APPROVER / ADMIN）の定義を `docs-next/docs/spec/requirements.md` と `Role.java` から確認する
- [x] 1.2 本課題で振る舞いに差が出る点を特定する（下書きの可視範囲、編集可否、承認フローとの関係）
- [x] 1.3 APPROVER の可視範囲が既存の権限モデルから変わる点を明記する
- [x] 1.4 `Docs/spec/aidlc-docs/inception/user-stories/reservation-draft/personas.md` を生成する

### 2. ストーリーの起草

- [x] 2.1 上記の操作の流れを段階に分ける（保存 → 一覧で見つける → 再編集 → 正式申請）
- [x] 2.2 各段階を「〜として、〜したい。なぜなら〜」の形式のストーリーに起こす
- [x] 2.3 ロール差が生じる振る舞い（APPROVER からの不可視、ADMIN の閲覧専用、承認フローへの非流入）を独立したストーリーとして切り出す
- [x] 2.4 要件 FR-01 から FR-07 の全項目がいずれかのストーリーで被覆されることを確認する
- [x] 2.5 要求シートの受入条件6項目がいずれかのストーリーで被覆されることを確認する

### 3. 受入基準の付与

- [x] 3.1 各ストーリーに Given/When/Then 形式の受入基準を付ける
- [x] 3.2 境界的な振る舞いを受入基準に含める（下書き保存時は重複チェックを行わない、正式申請の時点で競合が判明しうる、`DRAFT` 以外からの遷移指定は 422、`requires_approval=false` では正式申請が `APPROVED` になる）
- [x] 3.3 各受入基準が、バックエンドとフロントエンドのどちらで検証されるかを示す
- [x] 3.4 403 の検証はバックエンドのテストで行うことを明示する（frontend にエラーバウンダリがなく、画面表示は既存挙動のままのため。要件定義 §8 を参照）

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
- [x] 5.3 要求シートの受入条件とストーリーの対応表を作る
- [x] 5.4 `Docs/spec/aidlc-docs/inception/user-stories/reservation-draft/stories.md` を生成する

### 6. 状態更新

- [x] 6.1 本プランのチェックボックスをすべて `[x]` にする
- [x] 6.2 `Docs/spec/aidlc-state.md` の User Stories を完了にする
- [x] 6.3 `Docs/spec/aidlc-audit.md` に記録する

---

## 生成必須の成果物

- [x] `Docs/spec/aidlc-docs/inception/user-stories/reservation-draft/personas.md` — ペルソナの原型と特性
- [x] `Docs/spec/aidlc-docs/inception/user-stories/reservation-draft/stories.md` — INVEST に沿ったユーザーストーリーと受入基準、トレーサビリティ表

## 本ステージで扱わないこと

- 優先順位付け・スプリント計画・工数見積もり
- 技術的な実装方式（要件定義で確定済み）
- 変更対象ファイルの列挙（Code Generation の Part 1 で扱う）
