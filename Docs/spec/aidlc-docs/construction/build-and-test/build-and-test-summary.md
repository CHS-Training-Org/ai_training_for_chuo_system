---
title: Build and Test Summary — reservation-draft
description: Construction フェーズ Build and Test ステージの実行結果（バックエンド・フロントエンド・ドキュメントサイト）
---

# Build and Test Summary — reservation-draft

新規エンドポイント（`DELETE`）と既存 `POST` / `PUT` の分岐追加で、DB スキーマ変更・外部連携・性能要求はない。そのため `CLAUDE.md` の「よく使うコマンド」の実コマンドで検証した（統合テストは Spring の結合テスト `ReservationControllerTest` が H2 で担う。性能・セキュリティ・E2E の個別テンプレートは対象外。理由は、拡張 3 種が不採用で新規 NFR がなく、既存の悲観ロック方式を踏襲しているため）。

> 実行日: 2026-11-16。前ワークフロー（resource-detail-info）の同名ファイルは本内容で置き換えた（履歴は git に残る）。

## バックエンド

| コマンド | 結果 |
|---|---|
| `cd backend && ./gradlew clean test spotlessCheck checkstyleMain` | ✅ BUILD SUCCESSFUL。JUnit 164 件・失敗 0・エラー 0・スキップ 0 |

- 新規の下書き系テスト: `ReservationServiceTest`（`Create` に 3 件、`Draft` ネスト 20 件）、`ReservationControllerTest`（17 件）。`DRAFT`→`PENDING` / `DRAFT`→`APPROVED` の遷移ケースを含む
- Checkstyle の warning は 4 件で、`resource-detail-info` 時点と同数（`ReservationRepository` の既存誤検知と `Resource` の `ParameterNumber`）。本変更による増加なし。Gradle は warning でビルドを失敗させない

## フロントエンド

| コマンド | 結果 |
|---|---|
| `cd frontend && pnpm lint` | ✅ 警告・エラーなし |
| `cd frontend && pnpm format:check` | ✅ 全ファイル整形済み |
| `cd frontend && pnpm test` | ✅ 16 ファイル・115 テスト全件 pass |
| `cd frontend && pnpm build` | ✅ 型チェック・本番ビルド成功（11 ページ生成。`/reservations/**` を含む全ルート） |

## ドキュメントサイト

| コマンド | 結果 |
|---|---|
| `cd docs-next && npm run build` | ✅ 成功（リンク・アンカー破損なし）。draw.io SVG の読込警告は既存で、本変更と無関係 |

## 受入条件チェック（`reservation-draft.md` より）

- [x] 「下書き保存」で `DRAFT` 保存 — `create_draftTrue_returns201DraftWithoutApprovalStep`、`reservation-form.test.tsx`
- [x] 一覧の `DRAFT` フィルタで表示 — `reservations/page.tsx` の `ALL_STATUSES` に `DRAFT` を追加（ビルドで型・描画確認。表示そのものの自動テストは無し）
- [x] 詳細から再編集・正式申請（要承認 → `PENDING`、承認不要 → `APPROVED`）— `update_draftWithSubmitOn{Approval,NoApproval}Resource_*`、`reservation-detail-page.test.tsx`
- [x] 承認一覧に出ない — `create_draftTrue_*` で `approval_steps` が 0 件であることを検証。承認一覧は `approval_steps` 経由のため自然に出ない
- [x] 本人と ADMIN 以外は 403（APPROVER も）— `get_draftByApprover_returns403`、`get_draftByApprover_throwsAccessDeniedException`
- [x] 削除は本人のみ、`DRAFT` 以外は 422 — `delete_draftByOwner_*`、`delete_nonDraft_returns422`、`delete_draftByAdmin_returns403`
- [x] 正式申請の重複は 409 で `DRAFT` 維持 — `update_draftSubmitWithConflict_returns409AndStaysDraft`（DB の status を検証）
- [x] 遷移テストに `DRAFT`→`PENDING` と `DRAFT`→`APPROVED` を追加

## 未検証の事項（正直な記録）

- ブラウザでの手動確認と Playwright E2E は未実施（ローカルではブラウザサインインが動かないため、確認するなら開発用ロール別ログインボタンを使う）
- 承認者不在（422 `APPROVER_NOT_AVAILABLE`）で `DRAFT` のまま残ることは、DB の status を検証するテストがない（`ReservationServiceTest` のモックで例外伝播のみ確認。409 の経路は DB まで検証済み）

## PR AI レビュー NG への対応（フロントエンドのテスト追加）

AI レビューで「新規ロジックにテストがない」と NG になった 4 分岐に、変更を取り消すと失敗するテストを追加した。

- [x] 編集ページの `DRAFT` 許可 — `reservation-edit-page.test.tsx`
- [x] 一覧の「下書き」タブ（`?status=DRAFT`） — `reservations-list-page.test.tsx`
- [x] `SubmitDraftButton` の 409 / 承認者不在メッセージ — `reservation-draft-buttons.test.tsx`
- [x] `DeleteDraftButton` の確認後の削除と一覧遷移 — `reservation-draft-buttons.test.tsx`

4 分岐を元に戻して 5 件が失敗することを確認した。

## Overall Status

- **Build**: Success（backend / frontend / docs-next）
- **All Tests**: Pass（BE 164 / FE 128）
- **Ready for Operations**: Yes（PR 作成後、CI Frontend / CI Backend で再検証される）
