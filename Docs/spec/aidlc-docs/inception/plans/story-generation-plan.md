# Story Generation Plan — resource-detail-info

## 採用する分解アプローチ: Persona-Based

本課題は「入力する ADMIN」と「閲覧する MEMBER/APPROVER」という2つの異なるペルソナにはっきり分かれるため、Persona-Based での分解を採用する。

**他アプローチとのトレードオフ**（参考）:

| アプローチ | 本課題への適合 |
|---|---|
| User Journey-Based | ADMIN の「登録→編集」という単線フローのみで、分岐が少なく過剰 |
| Feature-Based | ペルソナ軸と実質同じ分解になるため Persona-Based に吸収される |
| **Persona-Based（採用）** | ADMIN（入力）・MEMBER/APPROVER（閲覧）の2軸が要件と自然に一致する |
| Domain-Based | 単一ドメイン（Resource）のみのため分解不要 |
| Epic-Based | 本課題の規模（3〜4時間）に対して階層化は過剰 |

## 明確化が必要な論点の確認

要件（`requirements.md`）・RE 調査（`code-structure.md`）を精査した結果、ストーリー生成に影響する曖昧な点は見当たらなかった：

- ペルソナ：ADMIN（登録・編集）・MEMBER/APPROVER（閲覧、挙動は同一のため1ペルソナとして統合）の2者で確定
- ストーリー粒度：新規登録・編集は同一フォーム（`ResourceForm`）を共用するため1ストーリーに統合
- 受入条件形式：本リポジトリの既存ユニット（resource-search・resource-sort・reservation-list-filter）で確立済みの Gherkin 形式を踏襲

## 実行ステップ

- [x] Step 1: `personas.md` を生成（ADMIN・MEMBER/APPROVER の2ペルソナ）
- [x] Step 2: `stories.md` を生成（INVEST 原則に従うストーリー、各ストーリーに Gherkin 受入条件とペルソナ対応表を含む）

## 含めるストーリー（概要）

| ID | タイトル | ペルソナ |
|---|---|---|
| US-01 | 設備情報・利用上の注意を登録・編集する | ADMIN |
| US-02 | リソース詳細画面で設備情報・利用上の注意を確認する | MEMBER/APPROVER |
| US-03 | 未登録のリソースでは新フィールドが表示されない | MEMBER/APPROVER |
