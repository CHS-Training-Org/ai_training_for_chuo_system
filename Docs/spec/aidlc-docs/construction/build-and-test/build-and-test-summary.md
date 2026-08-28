---
type: note
title: Build and Test Summary
description: カレンダービュー（Unit：calendar-view）のBuild and Testステージ結果サマリー
tags:
  - ai-dlc
  - build-and-test
  - summary
timestamp: 2026-08-20
---

# Build and Test Summary — カレンダービュー（Unit: calendar-view）

## Build Status

- **Build Tool**: pnpm / Next.js（frontendのみ、バックエンドは変更なし）
- **Build Status**: Success
- **Build Artifacts**: `frontend/.next/`（既存ビルドへの統合、本課題専用の新規成果物はなし）
- **Build Time**: 約27秒

## Test Execution Summary

### Unit Tests

- **Total Tests**: 113（frontend全体、うち本課題追加分24：`calendar-logic.test.ts` 22件・`reservation-form.test.tsx` 2件）
- **Passed**: 113
- **Failed**: 0
- **Status**: Pass

### Integration Tests

- **判定**: SKIP
- **理由**: 本課題はバックエンド・DBの変更を伴わない単一frontendユニットであり、既存の`GET /api/resources/{id}/availability`をそのまま利用する。バックエンド側の結合テスト（`ResourceControllerTest`等）に変更はない。frontend↔backend間の実際の疎通は、下記「手動ブラウザ確認」で実機検証した。

### Performance Tests

- **判定**: SKIP
- **理由**: `requirements.md`のNFRで月表示は日単位要約セル（最大42セル）、週表示は1時間刻みグリッド（168セル）といずれも小規模と判定済み。専用の負荷試験を要する規模ではない。

### Additional Tests

- **Contract Tests**: N/A（サービス間契約の新設なし）
- **Security Tests**: N/A（認証・認可の変更なし、既存の空き確認APIをそのまま利用）
- **E2E Tests（自動化）**: SKIP（Issue #22と同様、本課題の規模ではユニットテストと手動確認で十分と判断）

## 手動ブラウザ確認（CLAUDE.md「UIまたはフロントエンドの変更」の要求に基づく実施）

ユニットテストではカバーしきれない実際の画面描画・操作性（`calendar-logic.ts`とコンポーネントの結線、バックエンドとの実通信）を、`run`スキル経由で一時的なPlaywrightスクリプト（作業終了後に削除済み、リポジトリに残していない）を用いて確認した。

**実行環境**: `./gradlew bootRun`でバックエンドを一時起動（DB_URL等は`.devcontainer/docker-compose.yml`のbackendサービス定義に準拠）、`pnpm dev`でフロントエンドを一時起動。確認後、両プロセスは停止済み。

**確認シナリオと結果**：

| # | シナリオ | 結果 |
|---|---|---|
| 1 | サインイン画面の開発専用ロール別ログインボタン（MEMBER）でログイン | ✅ 成功 |
| 2 | `/resources/{id}`を開くと週表示・当週のカレンダーが表示され、下に既存テキストリストが引き続き表示される（STORY-01 AC1・AC3） | ✅ 確認 |
| 3 | 「月表示」ボタンで日単位の要約セルに切り替わる（STORY-02 AC1、RSV-08） | ✅ 確認 |
| 4 | 「前月」を2回押して2026年6月へ移動し、予約（PENDING、6/3 14:00〜16:00）がある日に「予約 1件」の要約が表示される | ✅ 確認 |
| 5 | 月表示の日セル（6/3）をクリックすると、その週の週表示に切り替わる（BR-07） | ✅ 確認 |
| 6 | 境界不一致の予約（14:00〜16:00）が14-15時・15-16時の両セルを「予約済」としてグレーアウト表示する（STORY-04 AC2・AC4） | ✅ 確認（スクリーンショットで視覚的に確認） |
| 7 | 空きセル（6/3 9:00）をクリックすると`/reservations/new?resourceId=...&startAt=2026-06-03T09%3A00`に遷移し、開始日時欄に`2026-06-03, 09:00`が初期表示される（STORY-04 AC1、RSV-09） | ✅ 確認 |
| 8 | 上記操作中のブラウザコンソールエラー | ゼロ件 |
| 9 | 週表示で「次週」ボタンを押すと期間が1週間後に進む（STORY-03 AC1） | ✅ 確認（2026/8/17〜8/23 → 2026/8/24〜8/30） |
| 10 | 週表示で「前週」ボタンを押すと期間が1週間前に戻る（STORY-03 AC2） | ✅ 確認（2026/8/24〜8/30 → 2026/8/17〜8/23 → 2026/8/10〜8/16） |
| 11 | 週表示（アンカー日付が2026/8/10週）から月表示に切り替え、トゥールバーの「週表示」ボタンで戻すと、直前のアンカー日付を含む週がそのまま表示される（STORY-02 AC2） | ✅ 確認（2026/8/10〜8/16のまま復帰） |

初回の確認（受入条件・主要シナリオ）ではSTORY-02 AC2・STORY-03 AC1・AC2（週表示の次週・前週ボタン、月→週のトゥールバー切替）を実際にクリックせず、ユニットテストと同一コンポーネントの他ボタン（月表示側）での確認に留めていた。ユーザーからの再確認要請を受け、上記9〜11として追加の手動ブラウザ確認を実施し、いずれも正しく動作することを確認した。

**発見事項**：初回の月表示スクリーンショットで、期間移動直後の非同期データ取得が完了する前に予約件数が反映されていない瞬間があった（レースコンディション）。再現条件（連続クリック直後の即時スクリーンショット）を除いて再検証した結果、データ取得完了後は正しく「予約 1件」が表示されることを確認した。UIの`aria-busy`属性は取得中を示すが、月表示の要約セル自体に読み込み中の視覚的表現はない。受入条件・ストーリーの受け入れ基準には読み込み中表示の要求がなく、本課題のスコープ外と判断し、修正は行わない（将来のUX改善候補として記録に留める）。

## Overall Status

- **Build**: Success
- **All Tests**: Pass
- **手動ブラウザ確認**: Pass（受入条件6点・STORY-01〜04の受け入れ基準に対応する主要シナリオをすべて確認）
- **Ready for Operations**: Yes

## Next Steps

`/update-spec`で`screen-spec.md`（§`/resources/{id}`・§`/reservations/new`）・`requirements.md`を更新し、その後`/commit-push`・`/create-pr`でOPERATIONSフェーズ相当（CI品質ゲート）に引き継ぐ。
