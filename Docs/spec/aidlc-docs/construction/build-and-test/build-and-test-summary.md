---
type: working-doc
title: Build and Test Summary（ユニット：reservation-draft）
description: AI-DLC Build and Test ステージの実行結果サマリ
timestamp: 2026-11-14
---

# Build and Test Summary

## Build Status

| 項目 | backend | frontend |
|---|---|---|
| Build Tool | Gradle Wrapper | pnpm / Next.js |
| Build Status | ✅ Success（`./gradlew build`） | ✅ Success（`pnpm build`、型チェック含む） |
| Build Artifacts | `backend/build/libs/*.jar` | `frontend/.next/`（全 11 ルート生成確認済み） |

## Test Execution Summary

### Unit Tests

| 項目 | backend | frontend |
|---|---|---|
| Total Tests | 194 | 114 |
| Passed | 194 | 114 |
| Failed | 0 | 0 |
| Skipped | 0 | 0 |
| Status | ✅ Pass | ✅ Pass |

本ユニットに関わるテストの内訳：

- `ReservationServiceTest`：51 件（`Create` 10、`Get` 9、`Update` 14、`Cancel` 7、`Delete` 6、`ListReservations` 5）。下書きの作成・閲覧権限・下書き保存・正式申請（重複・承認ありなし）・削除の 404/403/422・取消の 422・一覧の `DRAFT` 除外を含む
- `ReservationControllerTest`：46 件。`POST draft:true`、`GET` の下書き（本人・ADMIN・他人）、`PUT` の分岐、`DELETE` の 204/403/404/422 を MockMvc と H2 で確認
- `reservation-permissions.test.ts`：11 件（新規、`getReservationActions` の状態 × 本人 × ADMIN の組み合わせ）
- `reservations.test.ts`（Server Action）：28 件。`draft` オプション、`deleteReservationAction`、`tryUpdateReservationAction`（重複を値として返す。4 件）を含む

### Integration Tests

- **Status**: N/A（`ReservationControllerTest` が MockMvc + 実 H2 DB による統合テストを兼ねており、Unit Tests の一部として実施済み。単一サービス内の変更でサービス間連携を伴わない）

### Performance Tests

- **Status**: N/A（NFR Requirements をスキップ済み。新規の性能要件なし）

### Additional Tests

- **Contract Tests**: N/A（マイクロサービス構成ではない）
- **Security Tests**: N/A（Security Baseline 拡張は Requirements Analysis でスキップ済み。下書きの閲覧・更新・削除の権限は `ReservationServiceTest` / `ReservationControllerTest` で確認済み）
- **E2E Tests**: 未実施（Playwright は実行していない。本ユニットでは E2E テストを追加していない）

## Lint / Format

| 項目 | backend | frontend |
|---|---|---|
| コマンド | `spotlessCheck`・`checkstyleMain`・`checkstyleTest` | `pnpm lint`（oxlint）・`pnpm format:check`（oxfmt）・`tsc --noEmit` |
| 結果 | ✅ クリーン（既存コード由来の Checkstyle 警告のみ） | ✅ クリーン |

## 未実施・確認済みの項目

- **ブラウザでの動作確認**: 観点 1〜7 をすべて確認済み（学習者が実施）。重複エラーの画面で不具合が見つかり、修正後に再確認した。他人の下書きの 403 がエラー画面になる点は、仕様どおりのため対象外
- **docs-next のビルド**: `npm ci` のあと `npm run build` を実行し、成功した（exit 0）。リンク切れ・アンカー切れはなし（`onBrokenLinks` / `onBrokenAnchors` は throw 設定）。警告は、drawio の図 16 枚の寸法が読めない（今回変更した 1 枚を含む。変更していない 15 枚も同じ警告のため、今回の変更が原因ではない）と、Docusaurus の設定の非推奨通知 2 件
- **E2E（Playwright）**: 実行していない。既存の E2E は `frontend/tests/e2e/example.spec.ts`（トップページの見出しの確認）の 1 本だけで、本ユニットの変更とは無関係。CI（`ci-frontend.yml`）は E2E を実行しない（lint・format:check・build・test のみ）。画面の動きは、学習者のブラウザ確認（観点 1〜7）で代えた

## Overall Status

- **Build**: Success
- **All Tests**: Pass
- **Ready for Operations**: Yes（E2E は未実施）

## Next Steps

テスト・ビルド・Lint はすべて成功した。OPERATIONS フェーズ（BookFlow では `/commit-push` → `/create-pr` → `@claude pr-review`）に進む準備が整った。
