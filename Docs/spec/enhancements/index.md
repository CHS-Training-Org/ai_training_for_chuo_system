---
type: index
title: エンハンス要件（ビジネス要求シート）
description: BookFlow のエンハンス課題ビジネス要求シートの一覧と管理規約
tags:
  - spec
  - enhancement
  - index
timestamp: 2026-06-16
audience: 学習者・メンター
references:
  - Docs/spec/requirements.md
  - Docs/spec/index.md
---

# エンハンス要件（ビジネス要求シート）

---

## このディレクトリについて

学習者が取り組む拡張課題（エンハンス課題）の要件を、**1 課題＝1 ファイル**のビジネス要求シートとして管理します。ファイルはこのディレクトリ（`Docs/spec/enhancements/`）配下にケバブケースのファイル名（`<short-desc>.md`）で配置します。

## 原則（真実の源）

- ビジネス要求シートを**真実の源**とし、対応する GitHub Issue はシートをリンク参照します（内容を二重管理しない）。
- 受入条件もシート側が正です。Issue 本文には受入条件を再掲しません。
- シートは AI-DLC の Inception 成果物（要件・受入条件）に相当します。

## シートの様式

シートは **背景／依存関係／要件／受入条件／影響範囲／AI 活用ポイント** の 6 節構成です。**依存関係**節は、他のエンハンス課題との前提・競合・推奨着手順序を記述し、複数の学習者が並行着手する際のマージ競合や、着手可否に関わる情報を早い段階で把握できるようにする節のため、背景の直後に配置します。

テンプレート本体・記述規約は [`spec-conventions.md`](../../../.claude/skills/update-spec/references/spec-conventions.md) の「enhancements/\<課題\>.md — ビジネス要求シートのテンプレート」を参照してください。新規シートを作成する際は Claude Code の `/update-spec` スキルを使います。

対応する GitHub Issue は `.github/ISSUE_TEMPLATE/` の「選択課題（エンハンス）」テンプレートから起票し、本シートへのリンクを記入します。

## シート一覧

選択課題の一覧（難易度・推定工数・対象レイヤー）は [選択課題カタログ](../../guide/enhancement-catalog.md) を参照してください。

各課題のビジネス要求シートは、4.3 で `enhancements/<short-desc>.md` として作成し、下表に追記します。

| ファイル | 課題名 |
|---------|--------|
| [resource-list-filter.md](./resource-list-filter.md) | リソース一覧の検索・フィルタ追加 |
| [resource-list-sort.md](./resource-list-sort.md) | リソース一覧のソート順選択 |
| [reservation-list-filter.md](./reservation-list-filter.md) | 予約一覧のフィルタ拡張 |
| [resource-detail-info.md](./resource-detail-info.md) | リソース詳細画面の情報拡充 |
| [e2e-test-coverage.md](./e2e-test-coverage.md) | 既存機能の E2E テスト追加 |
| [recurring-reservation.md](./recurring-reservation.md) | 繰り返し予約 |
| [calendar-view.md](./calendar-view.md) | カレンダービュー |
| [usage-statistics.md](./usage-statistics.md) | 利用実績の集計・グラフ表示 |
| [csv-export.md](./csv-export.md) | CSV 帳票出力 |
| [reservation-draft.md](./reservation-draft.md) | 予約の下書き保存 |
| [multi-step-approval.md](./multi-step-approval.md) | 多段階承認フロー |
| [department-approver.md](./department-approver.md) | 部署ごとの承認者設定 |
| [resource-image-upload.md](./resource-image-upload.md) | リソース画像アップロード |
| [audit-log.md](./audit-log.md) | 操作ログ・監査証跡 |
| [openapi-client-gen.md](./openapi-client-gen.md) | OpenAPI クライアント自動生成 |
