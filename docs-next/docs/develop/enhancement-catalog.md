---
sidebar_position: 7
title: 選択課題カタログ
description: 学習者が選択できるエンハンス課題の一覧と選択・着手手順
tags:
  - guide
  - enhancement
  - catalog
audience: 学習者・運営者
references:
  - ../learn/curriculum.md
  - ../spec/enhancements/index.md
  - ./dev-workflow.md
  - ./coding-conventions.md
  - ../operations/operations-guide.md
last_updated: '2026-09-04T00:00:00+09:00'
---

# 選択課題カタログ

このページは、BookFlow の**選択課題（エンハンス課題）**を一覧化したカタログです。  
難易度、推定工数、対象レイヤーを確認し、[学習パスマップ](../learn/curriculum.md#path-map)の各段階で取り組む課題を選んでください。

---

## カタログの使い方 {#catalog}
### 推定工数の目安

推定工数は、**学習者が課題 Issue に着手してからセルフマージするまでの純粋な作業時間**（要件シート確認・Workflow Planning でのセルフ承認・Spec-first 更新・実装・テスト・セルフレビューを含む）を指します。マージに運営者の承認は不要なため、承認待ちの時間は含みません。初めて `/aidlc` や `/update-spec` を使う場合は、ツールの使い方に慣れるまでの時間が上乗せされることがあります。

### 難易度の目安

| 難易度 | 内容の目安 | 学習パス上の位置づけ |
|--------|-----------|-------------------|
| 初級 | フロントエンド中心の局所的な改善・追加。実装範囲が明確で影響が限定的 | 必須（1 課題を選び、STEP-03 と STEP-04 で 2 回実装する） |
| 中級 | フロントエンドとバックエンドにまたがる縦切り機能。設計判断が必要 | 必須（中級課題で 1 課題） |
| 上級 | 外部サービス連携・複雑な業務ロジック・ツールチェーン構築。設計とインフラの知識が必要 | 発展（任意） |

必須パスは全員共通で、初級を 1 課題（2 回実装）、中級を 1 課題です。どの課題を選ぶかは学習者が決めますが、どの難易度をやるかは段階ごとに決まっています。

### 課題の進め方

各課題は [dev-workflow.md §標準開発フロー](./dev-workflow.md#flow) に沿って進めます。

1. 取り組む課題を決め、対応する**要件シート**（`docs-next/docs/spec/enhancements/<難易度>/<short-desc>.md`）を参照する
2. 対応する GitHub Issue（課題ごとに運営者が起票済み）を確認する
3. 自分のトランクブランチから `feature/<GitHubユーザー名>/<issue番号>-<short-desc>` ブランチを切り、`/aidlc` を起動して実装計画を作成し、チャットで自分自身が承認して実装に進む
4. **Spec-first** で仕様を更新してから実装する（`/update-spec` スキルを使う）
5. `/create-pr` で PR を作成する（base は自分のトランクブランチ）。[review-criteria.md](./review-criteria.md) のチェックリストでセルフレビューし、満たしていることを確認したら自分のトランクブランチへマージする

:::note[ラベルについて]

課題 Issue には `難易度：初級` / `難易度：中級` / `難易度：上級` のラベルが運営者から付与されます（ラベル体系の詳細は [issue-registration.md](../operations/issue-registration.md) を参照）。

:::
---

## 初級（Beginner） {#beginner}
フロントエンド中心の局所的な改善、追加課題です。着手前に [コードベース理解ガイド](../learn/curriculum.md#codebase-understanding) を参照すると、実装対象の処理フローを把握しやすくなります。

ここから 1 課題を選び、2 回実装します。1 回目は [curriculum.md §STEP-03](../learn/curriculum.md#step-03) の完了条件に従い、標準開発フロー（AI-DLC）を**使わずに**進めます（この回の PR はマージしません）。2 回目は同じ課題を、下記の[課題の進め方](#catalog)のとおり標準開発フロー（AI-DLC）で進め、自分のトランクブランチへマージします。2 回目のブランチは 1 回目と名前が重複するため、末尾に `-aidlc` を付けて切り直します（[同じ課題を 2 回実装するときのブランチ名](./coding-conventions.md#branch-redo)）。同じ課題を 2 回繰り返すのは、AI-DLC の有無だけを変えて差を観察するためです。

| 課題名 | 概要 | 推定工数 | 対象レイヤー |
|--------|------|----------|-------------|
| [リソース一覧の検索・フィルタ追加](../spec/enhancements/beginner/resource-list-filter.md) | リソース一覧画面にキーワード（名称・説明文）による絞り込みを追加する（バックエンドに検索パラメータを実装し、フロントエンドに入力フィールドを追加） | 2〜3時間 | 両方 |
| [リソース一覧のソート順選択](../spec/enhancements/beginner/resource-list-sort.md) | リソース一覧画面に名称・定員・カテゴリでの並び替え選択 UI を追加し、バックエンドにソートパラメータを実装する | 1〜2時間 | 両方 |
| [予約一覧のフィルタ拡張](../spec/enhancements/beginner/reservation-list-filter.md) | 予約一覧画面にリソース名・予約期間による絞り込みフィルタを追加する（既存のステータスタブと共存し、バックエンドに対応パラメータを実装） | 2〜3時間 | 両方 |
| [リソース詳細画面の情報拡充](../spec/enhancements/beginner/resource-detail-info.md) | リソース詳細画面に設備一覧・利用上の注意などのフィールドを追加する（DB カラム追加＋API 拡張＋表示実装） | 3〜4時間 | 両方 |
| [既存機能の E2E テスト追加](../spec/enhancements/beginner/e2e-test-coverage.md) | Playwright でサインイン・リソース確認・予約申請・承認の主要ユーザーフローをカバーする E2E テストシナリオを作成し、CI で自動実行できる状態にする | 3〜5時間 | frontend |

「リソース一覧のソート順選択」は「リソース一覧の検索・フィルタ追加」を前提課題とします（[resource-list-sort.md §依存関係](../spec/enhancements/beginner/resource-list-sort.md)）。フィルタ機能が存在しない状態では受入条件の一部（フィルタとの組み合わせ確認）を検証できないため、必須の 1 課題としてこれを選ぶ場合は避けてください。

---

## 中級（Intermediate） {#intermediate}
フロントエンドとバックエンドにまたがる縦切り機能の実装課題です。設計判断と両レイヤーへの理解が求められます。

| 課題名 | 概要 | 推定工数 | 対象レイヤー |
|--------|------|----------|-------------|
| [繰り返し予約](../spec/enhancements/intermediate/recurring-reservation.md) | 毎週・毎月のパターンを指定して一括予約できる機能を実装する（UI・API・DB スキーマ拡張） | 1〜2日 | 両方 |
| [カレンダービュー](../spec/enhancements/intermediate/calendar-view.md) | リソースの予約状況を週・月単位のカレンダー形式で閲覧できる画面を実装する（既存の空き確認 API を活用） | 半日〜1日 | frontend |
| [利用実績の集計・グラフ表示](../spec/enhancements/intermediate/usage-statistics.md) | リソースごとの利用率・稼働時間を集計し、管理者が確認できるグラフ付きレポート画面を実装する | 半日〜1日 | 両方 |
| [CSV 帳票出力](../spec/enhancements/intermediate/csv-export.md) | 予約一覧・利用実績を CSV 形式でダウンロードできる機能を実装する | 半日〜1日 | 両方 |
| [予約の下書き保存](../spec/enhancements/intermediate/reservation-draft.md) | 入力途中の予約申請を DRAFT（下書き）として保存し後から再編集・申請できる機能を実装する（DB スキーマの DRAFT ステータスを活用） | 半日〜1日 | 両方 |

---

## 上級（Advanced） {#advanced}
外部サービス連携、複雑な業務ロジック、ツールチェーン構築を伴う課題です。設計、インフラの知識と自律的な問題解決力が求められます。

必須パスの外にある任意課題です。中級課題まで終えたうえで、さらに取り組みたい場合に選んでください。

| 課題名 | 概要 | 推定工数 | 対象レイヤー |
|--------|------|----------|-------------|
| [多段階承認フロー](../spec/enhancements/advanced/multi-step-approval.md) | 承認者を 2 段階以上の連鎖で設定できる承認フローを実装する（DB に `step_order` カラムが存在。ベースは 1 段階固定） | 2〜3日 | backend |
| [部署ごとの承認者設定](../spec/enhancements/advanced/department-approver.md) | 管理者が部署ごとに承認者（APPROVER ロール）を割り当て・変更できる管理機能を実装する | 2〜3日 | 両方 |
| [リソース画像アップロード](../spec/enhancements/advanced/resource-image-upload.md) | リソース登録・編集画面に画像アップロード機能を追加し、LocalStack 上の Amazon S3 互換ストレージに保存・表示する | 1〜2日 | 両方 |
| [操作ログ・監査証跡](../spec/enhancements/advanced/audit-log.md) | 予約・承認操作の履歴を LocalStack 上の Amazon DynamoDB に記録し、管理者が閲覧できる監査証跡機能を実装する | 1〜2日 | 両方 |
| [OpenAPI クライアント自動生成](../spec/enhancements/advanced/openapi-client-gen.md) | Springdoc が生成する OpenAPI Spec からフロントエンドの API クライアントコードを自動生成する仕組みを構築し、型安全な API 呼び出しに置き換える | 半日〜1日 | 両方 |
