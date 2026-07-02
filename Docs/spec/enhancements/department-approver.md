---
type: spec
title: 部署ごとの承認者設定
description: 部署単位で承認者を設定できる権限管理エンハンス課題のビジネス要求シート
tags:
  - spec
  - enhancement
  - approver
  - department
timestamp: 2026-06-16
audience: 学習者・メンター
references:
  - Docs/spec/requirements.md
  - Docs/spec/enhancements/index.md
---

# 部署ごとの承認者設定

---

## 背景

現在の `ApprovalService.createStep()` は APPROVER ロールの中から最初の 1 名を承認者として選定しています（`findFirstByRole(Role.APPROVER)`）。実際の組織では「営業部の予約は営業部長が承認する」というように、申請者の所属部署によって承認者を変えたいケースがあります。

`departments` テーブルには `parent_id` による階層構造がすでに定義されており、`users` テーブルは `department_id` で部署に紐づいています。本課題では管理者が部署ごとに承認者を割り当て、予約申請時に申請者の部署に対応した承認者へ自動ルーティングする機能を実装します。これはユースケース UC-05（承認フロー）の拡張で、`ApprovalService` のコメント「部署別ルーティングは拡張課題」に対応します。

## 要件

| # | 要件 |
|---|------|
| DEPT-01 | `departments` テーブルまたは新規テーブルに、部署ごとの承認者（APPROVER ユーザー）を設定できるデータ構造を追加する |
| DEPT-02 | 管理者が部署と承認者の対応を登録・変更・削除できる API を実装する |
| DEPT-03 | `ApprovalService.createStep()` を拡張し、申請者の所属部署に対応した承認者を選定する（対応する承認者が未設定の場合は既存のフォールバック動作とする） |
| DEPT-04 | 管理者ダッシュボードまたは管理画面に、部署ごとの承認者を管理できる UI を追加する |
| DEPT-05 | ADMIN ロールのみが承認者の割り当てを操作できる |

## 受入条件

- [ ] 管理者が部署と承認者の対応を UI から設定できる
- [ ] 設定した部署の申請者が予約申請すると、その部署の承認者に承認ステップが割り当てられる
- [ ] 部署に承認者が未設定の場合、既存の `findFirstByRole(Role.APPROVER)` フォールバックが動作する
- [ ] 承認者の割り当て変更は新規申請から有効になる（既存の pending 承認ステップには影響しない）
- [ ] MEMBER / APPROVER ロールが承認者設定 API にアクセスすると 403 が返る
- [ ] バックエンドにルーティングロジックのユニットテストを追加する

## 影響範囲

- 対象レイヤー：両方
- 更新が必要な spec：
  - `er-diagram.md`：部署×承認者の対応を保持するデータ構造（カラム追加 or 新テーブル）を追記
  - `api-spec.md`：部署承認者設定の CRUD エンドポイントを新セクションとして追記
  - `screen-spec.md`：管理画面に部署承認者設定 UI を追記
  - `requirements.md` §DEPT：承認者割り当て要件を追記

## 依存関係

- 前提課題：なし（ベースシステムの既存承認フロー・`departments` 階層構造のみに依存）
- 競合する課題：[多段階承認フロー](./multi-step-approval.md)。両課題とも `ApprovalService.createStep()`（`backend/.../application/ApprovalService.java`）を別方向に拡張するため、並行着手は非推奨。一方を完成させてからもう一方に着手する。
- 推奨着手順序：本課題の完成後に [既存機能の E2E テスト追加](./e2e-test-coverage.md) で承認ルーティングのリグレッションをカバーするとよい。

## AI 活用ポイント

- plan mode で「`departments` テーブルに `approver_id` カラムを追加するか、別テーブル（`department_approvers`）として管理するか」を相談する（将来の多段階承認との組み合わせを考慮）
- `departments.parent_id` の階層構造を使った「部署が未設定なら親部署の承認者を使う」フォールバックロジックを AI に相談する
- 権限チェックの `@PreAuthorize("hasRole('ADMIN')")` 適用箇所を AI に提案させる
