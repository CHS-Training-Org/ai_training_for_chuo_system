---
type: guide
title: 選択課題カタログ
description: 学習者が選択できるエンハンス課題の一覧と選択・着手手順
tags:
  - guide
  - enhancement
  - catalog
timestamp: 2026-06-16
audience: 学習者（新人・中堅）・メンター
references:
  - Docs/guide/curriculum.md
  - Docs/spec/enhancements/index.md
  - Docs/guide/dev-workflow.md
---

# 選択課題カタログ

このページは、BookFlow の**選択課題（エンハンス課題）**を一覧化したカタログです。  
難易度、推定工数、対象レイヤーを確認し、必須ステップ（STEP-01〜05）を終えたあとに取り組む課題を選んでください。

---

## カタログの使い方 { #catalog }

### 難易度の目安

| 難易度 | 内容の目安 | 推奨される学習者 |
|--------|-----------|----------------|
| Beginner | フロントエンド中心の局所的な改善・追加。実装範囲が明確で影響が限定的 | 新人（STEP-05 完了後） |
| Intermediate | フロントエンドとバックエンドにまたがる縦切り機能。設計判断が必要 | 新人（Beginner 完了後）・中堅 |
| Advanced | 外部サービス連携・複雑な業務ロジック・ツールチェーン構築。設計とインフラの知識が必要 | 中堅以上 |

### 課題の進め方

各課題は [dev-workflow.md §標準開発フロー](./dev-workflow.md#flow) に沿って進めます。

1. 取り組む課題を決め、対応する**要件シート**（`Docs/spec/enhancements/<short-desc>.md`）を参照する
2. `.github/ISSUE_TEMPLATE/` の「選択課題（エンハンス）」テンプレートから Issue を起票する
3. `feature/<issue番号>-<short-desc>` ブランチを切り、**plan mode** で実装計画を作成してメンターの承認（第 1 ゲート）を受ける
4. **Spec-first** で仕様を更新してから実装する（`/update-spec` スキルを使う）
5. PR を作成し `/draft-pr` で下書きを生成してメンターのレビュー（第 2 ゲート）を受ける

!!! note "ラベルについて"
    課題 Issue には `難易度：初級` / `難易度：中級` / `難易度：上級` のラベルがメンターから付与されます（ラベル体系の詳細は [issue-registration.md](./issue-registration.md) を参照）。

---

## Beginner { #beginner }

フロントエンド中心の局所的な改善、追加課題です。新人が STEP-05 完了後に最初に取り組むことを想定しています。

| 課題名 | 概要 | 推定工数 | 対象レイヤー | 要件シート |
|--------|------|----------|-------------|-----------|
| リソース一覧の検索・フィルタ追加 | リソース一覧画面にキーワード（名称・説明文）による絞り込みを追加する（バックエンドに検索パラメータを実装し、フロントエンドに入力フィールドを追加） | 1日 | 両方 | [resource-list-filter.md](../spec/enhancements/resource-list-filter.md) |
| リソース一覧のソート順選択 | リソース一覧画面に名称・定員・カテゴリでの並び替え選択 UI を追加し、バックエンドにソートパラメータを実装する | 半日 | 両方 | [resource-list-sort.md](../spec/enhancements/resource-list-sort.md) |
| 予約一覧のフィルタ拡張 | 予約一覧画面にリソース名・予約期間による絞り込みフィルタを追加する（既存のステータスタブと共存し、バックエンドに対応パラメータを実装） | 1日 | 両方 | [reservation-list-filter.md](../spec/enhancements/reservation-list-filter.md) |
| リソース詳細画面の情報拡充 | リソース詳細画面に設備一覧・利用上の注意などのフィールドを追加する（DB カラム追加＋API 拡張＋表示実装） | 1日 | 両方 | [resource-detail-info.md](../spec/enhancements/resource-detail-info.md) |
| 既存機能の E2E テスト追加 | Playwright でサインイン・リソース確認・予約申請・承認の主要ユーザーフローをカバーする E2E テストシナリオを作成し、CI で自動実行できる状態にする | 2〜3日 | frontend | [e2e-test-coverage.md](../spec/enhancements/e2e-test-coverage.md) |

---

## Intermediate { #intermediate }

フロントエンドとバックエンドにまたがる縦切り機能の実装課題です。設計判断と両レイヤーへの理解が求められます。

| 課題名 | 概要 | 推定工数 | 対象レイヤー | 要件シート |
|--------|------|----------|-------------|-----------|
| 繰り返し予約 | 毎週・毎月のパターンを指定して一括予約できる機能を実装する（UI・API・DB スキーマ拡張） | 1週間以上 | 両方 | [recurring-reservation.md](../spec/enhancements/recurring-reservation.md) |
| カレンダービュー | リソースの予約状況を週・月単位のカレンダー形式で閲覧できる画面を実装する（既存の空き確認 API を活用） | 2〜3日 | frontend | [calendar-view.md](../spec/enhancements/calendar-view.md) |
| 利用実績の集計・グラフ表示 | リソースごとの利用率・稼働時間を集計し、管理者が確認できるグラフ付きレポート画面を実装する | 2〜3日 | 両方 | [usage-statistics.md](../spec/enhancements/usage-statistics.md) |
| CSV 帳票出力 | 予約一覧・利用実績を CSV 形式でダウンロードできる機能を実装する | 2〜3日 | 両方 | [csv-export.md](../spec/enhancements/csv-export.md) |
| 予約の下書き保存 | 入力途中の予約申請を DRAFT（下書き）として保存し後から再編集・申請できる機能を実装する（DB スキーマの DRAFT ステータスを活用） | 2〜3日 | 両方 | [reservation-draft.md](../spec/enhancements/reservation-draft.md) |

---

## Advanced { #advanced }

外部サービス連携、複雑な業務ロジック、ツールチェーン構築を伴う課題です。設計、インフラの知識と自律的な問題解決力が求められます。

| 課題名 | 概要 | 推定工数 | 対象レイヤー | 要件シート |
|--------|------|----------|-------------|-----------|
| 多段階承認フロー | 承認者を 2 段階以上の連鎖で設定できる承認フローを実装する（DB に `step_order` カラムが存在。ベースは 1 段階固定） | 1週間以上 | backend | [multi-step-approval.md](../spec/enhancements/multi-step-approval.md) |
| 部署ごとの承認者設定 | 管理者が部署ごとに承認者（APPROVER ロール）を割り当て・変更できる管理機能を実装する | 1週間以上 | 両方 | [department-approver.md](../spec/enhancements/department-approver.md) |
| リソース画像アップロード | リソース登録・編集画面に画像アップロード機能を追加し、LocalStack 上の Amazon S3 互換ストレージに保存・表示する | 1週間以上 | 両方 | [resource-image-upload.md](../spec/enhancements/resource-image-upload.md) |
| 操作ログ・監査証跡 | 予約・承認操作の履歴を LocalStack 上の Amazon DynamoDB に記録し、管理者が閲覧できる監査証跡機能を実装する | 1週間以上 | 両方 | [audit-log.md](../spec/enhancements/audit-log.md) |
| OpenAPI クライアント自動生成 | Springdoc が生成する OpenAPI Spec からフロントエンドの API クライアントコードを自動生成する仕組みを構築し、型安全な API 呼び出しに置き換える | 2〜3日 | 両方 | [openapi-client-gen.md](../spec/enhancements/openapi-client-gen.md) |
