---
type: spec
title: 多段階承認フロー
description: 予約申請に複数の承認者が関与する多段階承認ワークフローのエンハンス課題ビジネス要求シート
tags: [spec, enhancement, approval, workflow]
timestamp: 2026-06-17
audience: 学習者・メンター
references:
  - Docs/spec/requirements.md
  - Docs/spec/enhancements/index.md
---

# 多段階承認フロー

---

## 背景

BookFlow の承認フローは現在 1 段階固定です。`ApprovalService.createStep()` は `findFirstByRole(Role.APPROVER)` で取得した最初の APPROVER 1 名を `step_order = 1` で登録します（コメントに「ベース実装は 1 段階承認。部署別ルーティングは拡張課題」と明記）。

一方、`approval_steps.step_order` カラムはすでに DB スキーマに存在しており、多段階承認を想定した設計です。承認者を 2 段階以上の連鎖（例：課長承認 → 部長承認）で設定できる機能を実装することで、組織の承認ポリシーを反映したワークフローを実現します。これはユースケース UC-05（承認フロー）の拡張にあたります。

## 要件

| # | 要件 |
|---|------|
| APRV-01 | `requires_approval = true` のリソースに対して、複数の承認者と `step_order` を設定できる仕組みを実装する |
| APRV-02 | 予約申請時（`POST /api/reservations`）に設定された順序で複数の `approval_steps` レコードを生成する |
| APRV-03 | 承認は `step_order` の昇順に実行される。前のステップが `APPROVED` になるまで次のステップの承認者は操作できない |
| APRV-04 | いずれかのステップで `REJECTED` になった場合、予約全体を `REJECTED` に遷移し、残ステップの処理を終了する |
| APRV-05 | 最終ステップが `APPROVED` になると予約全体を `APPROVED` に遷移する |
| APRV-06 | 管理者が承認ステップ順序と承認者を設定できる UI（管理画面）を追加する |

## 受入条件

- [ ] 管理者が特定リソースの承認フローを「段階数・各段階の承認者」で設定できる
- [ ] 予約申請すると設定どおりの複数 `approval_steps` が生成される
- [ ] 第 1 ステップの承認者が承認すると、第 2 ステップの承認者の承認待ち一覧に表示される
- [ ] 途中のステップで却下すると予約全体が `REJECTED` になり、後続ステップは処理されない
- [ ] 全ステップ承認で予約全体が `APPROVED` になる
- [ ] 1 段階のみの設定（既存動作）が引き続き正常に機能する
- [ ] バックエンドのステータス遷移テストに多段階ケースを追加する

## 影響範囲

- 対象レイヤー：両方（バックエンド中心）
- 更新が必要な spec：
  - `api-spec.md` §`POST /api/reservations` — 多段階承認での `approval_steps` 生成を追記；§`POST /api/approvals/{stepId}/approve` / §`POST /api/approvals/{stepId}/reject` — ステップ連鎖の挙動を追記
  - `screen-spec.md` — 承認フロー設定の管理 UI を追記
  - `requirements.md` §APRV — 多段階フローの遷移パターンを追記

## 依存関係

- 前提課題：なし（ベースシステムの既存承認フローのみに依存）
- 競合する課題：[部署ごとの承認者設定](./department-approver.md) — 両課題とも `ApprovalService.createStep()`（`backend/.../application/ApprovalService.java`）を別方向に拡張するため、並行着手は非推奨。一方を完成させてからもう一方に着手する。
- 推奨着手順序：本課題の完成後に [既存機能の E2E テスト追加](./e2e-test-coverage.md) で承認フローのリグレッションをカバーするとよい。

## AI 活用ポイント

- plan mode で「承認ステップ順序をリソースに紐づけた設定テーブル（`resource_approval_flows`）として管理するか、都度指定するか」の設計を相談する
- `step_order` の現行スキーマへの影響がないことを確認しながら、`ApprovalService` の拡張設計を AI に提案させる
- 非活性ステップへのアクセス拒否ロジック（`step_order < 現在のアクティブステップ`）の境界条件テストケースを AI に生成させる
