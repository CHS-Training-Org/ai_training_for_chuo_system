---
type: design
title: Application Design — CSV 帳票出力
description: CSV 帳票出力機能のコンポーネント構成・サービス層・依存関係の統合ドキュメント
tags:
  - ai-dlc
  - application-design
timestamp: 2026-09-11
---

# Application Design: CSV 帳票出力

本ドキュメントは以下4ファイルを統合したものである。詳細は各ファイルを参照。

- [components.md](./components.md) — コンポーネント一覧と責務
- [component-methods.md](./component-methods.md) — メソッドシグネチャ
- [services.md](./services.md) — サービス層のオーケストレーション
- [component-dependency.md](./component-dependency.md) — 依存関係とデータフロー

## 設計の要点

1. **新規サービス `ReservationReportService` を新設する**。既存の `ReservationService` への機能追加ではない。理由は、帳票出力が「全ユーザー分を対象とする」という点で既存の所有権ベースの絞り込みロジックと責務が異なること、および `StreamingResponseBody` のトランザクション境界を確立する主体として独立させる必要があることの2点
2. **`ReservationCsvRow` を `domain` パッケージに置く**。JPQL コンストラクタ式が FQCN を要求するため、`presentation.dto` に置くと domain → presentation の4層違反になる
3. **フロントエンドは既存の `api-client.ts` を経由しない**。JSON 専用の既存クライアントを変更するコストより、独立した Route Handler を新設するコストの方が小さく、既存の6本の Server Action テストへの影響もない
4. **認可の権威はバックエンドの `@PreAuthorize` に一本化する**。Route Handler・フロントエンドのいずれでもロールを再判定しない

## Requirements Analysis / User Stories との対応

| 成果物 | 対応する要件・ストーリー |
|---|---|
| `ReportController` | RPT-01・RPT-04、US-03（アクセス拒否） |
| `ReservationReportService`・`ReservationRepository`（追加） | RPT-03・RPT-06、US-02（絞り込み） |
| `ReservationCsvWriter`・`ReservationCsvRow` | RPT-02、非機能要件（CSV インジェクション対策・Excel 互換） |
| Route Handler・`ReportExportClient`・`page.tsx` | RPT-05、US-01 |
