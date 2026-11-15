---
type: working-doc
title: Code Generation Plan（ユニット：reservation-draft）
description: AI-DLC Code Generation ステージの実行計画。この計画が実装の唯一の正とする
timestamp: 2026-11-14
---

# Code Generation Plan — reservation-draft

**この計画が、Code Generation の唯一の正である。** 生成は、上から順に、1 ステップずつ行う。完了したステップは、その場で `[x]` にする。

**略記**: `BE/` = `backend/src/main/java/com/example/bookflow/`、`BT/` = `backend/src/test/java/com/example/bookflow/`、`FE/` = `frontend/src/`、`FT/` = `frontend/tests/`、`R/` = `FE/app/(authenticated)/reservations/`

## ユニットの文脈

- **ユニット**: reservation-draft（作業単位は 1 つ。Issue #30）
- **ストーリー**: 作らない（User Stories は省略）。代わりに、要件書の機能要件（FR-01〜FR-12）に対応づける。
- **入力の成果物**: 要件書、設計（`Docs/spec/aidlc-docs/construction/reservation-draft/functional-design/` の 4 ファイル）、更新済みの仕様書（`requirements.md`、`screen-spec.md`、`api-spec.md`、`er-diagram.md`）
- **依存**: 他のユニットや外部サービスへの依存はない。frontend は backend の API の契約（`api-spec.md`）に依存するため、backend を先に作る。
- **データベース**: 変更しない（Flyway の追加なし）。
- **サービスの境界**: 4 層（domain、application、presentation、infrastructure）を守る。状態遷移の検証と権限判定は `ReservationService` に置く。

## 実装の方針（設計からの確認）

- 下書きの判定と遷移は、`ReservationService` に集約する。`Reservation` は状態を変えるだけ（`markPending()` を追加）。
- 一覧は、新しいクエリを足さず、既存の `findByStatusInFetch` と `findByRequesterIdAndStatusInFetch` に、`DRAFT` を除く 4 状態を渡して実現する。
- 画面のボタンの出し分けは、純関数（`reservation-permissions.ts`）にまとめ、ユニットテストで担保する（既存の `buildResourceFilterParams` と同じ流儀）。
- 操作できる要素には、`data-testid` を付ける（`{部品}-{要素の役割}` の形）。

## 実行ステップ

### バックエンド

- [x] **Step 1**: `Reservation.markPending()` を追加する（`BE/domain/Reservation.java`）。`DRAFT` から `PENDING` へ遷移し、`updatedAt` を更新する。（設計: domain-entities。FR-06）
- [x] **Step 2**: `CreateReservationRequest` と `UpdateReservationRequest` に、任意の `Boolean draft` を末尾に追加する（`BE/presentation/dto/`）。Javadoc を更新する。（FR-01、FR-04、FR-05）
- [x] **Step 3**: `ReservationService` を変更する（`BE/application/ReservationService.java`）。（FR-01〜FR-08、FR-12）
  - `create`: `draft` が `true` のとき、リソースを通常取得（ロックしない）し、時刻を検証して `DRAFT` で保存する。重複判定と承認ステップ生成はしない。
  - `update`: 本人確認のあと、状態と `draft` で分岐する（下書きの更新、正式申請、承認待ちの更新、`PENDING` への `draft: true` は 422、それ以外は 422）。正式申請は、ロック、時刻の検証、重複判定（自分を除く）、`update`、`markPending()` または `markApproved()`、承認ステップ生成の順に行う。
  - `delete`（新設）: 404、403、422 の順に判定し、`ReservationRepository.delete(...)` で物理削除する。
  - `checkReadAccess`: 予約が `DRAFT` のとき、本人と ADMIN だけを許可する。
  - `list`: `status` 未指定のとき、`DRAFT` を除く 4 状態の集合を使う。
- [x] **Step 4**: `ReservationRepository` から、未使用になった `findAllFetch` と `findByRequesterIdFetch` を削除する（`BE/domain/ReservationRepository.java`）。削除前に、`BE/` と `BT/` に参照が無いことを再確認する。
- [x] **Step 5**: `ReservationController` に `DELETE /{id}`（204 No Content）を追加し、`update` などの Javadoc を更新する（`BE/presentation/ReservationController.java`）。（FR-12）
- [x] **Step 6**: `ReservationServiceTest` にテストを追加する（`BT/application/ReservationServiceTest.java`）。（NFR-05）
  - 作成: 下書き保存、下書きで重複判定をしないこと、必須項目の検証
  - 更新: 下書きの更新、正式申請（承認要は `PENDING` と承認ステップ、承認不要は `APPROVED`）、正式申請の重複（409）、承認者なし（422）、`PENDING` への `draft: true`（422）、本人以外（ADMIN を含む）の拒否（403）
  - 削除: 本人の下書き、他人（ADMIN を含む）の 403、`DRAFT` 以外の 422、存在しない場合の 404
  - 閲覧: 他人の下書きの APPROVER（403）、他人の MEMBER（403）、ADMIN と本人（可）
  - 一覧: `status` 未指定で下書きを除くこと、`status=DRAFT` で下書きを返すこと
  - 取消: `DRAFT` の取消は 422
- [x] **Step 7**: `ReservationControllerTest` に、API 経由のテストを追加する（`BT/presentation/ReservationControllerTest.java`）。`POST`（`draft: true` で 201 と `DRAFT`）、`PUT`（正式申請、下書きの更新）、`DELETE`（204、403、404、422）、`GET` の一覧（下書きの除外）、`GET /{id}`（APPROVER が 403）。受入条件の「`DRAFT` から `PENDING` のケースを、ステータス遷移テストに加える」を含む。（NFR-05）
- [x] **Step 8**: バックエンドの整形と静的検査を実行する。`./gradlew spotlessApply` と `./gradlew checkstyleMain checkstyleTest` と、コンパイル確認（`./gradlew compileJava compileTestJava`）。テストの実行は Build and Test で行う。

### フロントエンド

- [x] **Step 9**: `api-client` に `deleteEmpty(path)` を追加する（`FE/lib/api-client.ts`）。`request("DELETE", path)` を呼び、ボディなしで返す。
- [x] **Step 10**: Server Actions を変更する（`FE/server/actions/reservations.ts`）。`createReservationAction` と `updateReservationAction` に、任意の第 2 引数 `{ draft?: boolean }` を追加し、`draft` が `true` のときだけ本文に `draft: true` を入れる。`deleteReservationAction(id)` を新設する。
- [x] **Step 11**: `DRAFT` の表示名を「下書き」に変える（`FE/lib/labels.ts`）。
- [x] **Step 12**: ボタンの出し分けを純関数にまとめる（新規 `FE/lib/reservation-permissions.ts`）。入力は状態、本人かどうか、ADMIN かどうか。出力は `canEdit`、`canSubmit`、`canDelete`、`canCancel`。（設計: 画面の表示ルール。ADMIN の自分の下書きを含む）
- [x] **Step 13**: 予約申請フォームに「下書き保存」ボタンを追加する（`R/new/ReservationForm.tsx`）。既存の検証を使い、成功したら `/reservations?status=DRAFT` へ遷移する。`data-testid` を付ける。（FR-09）
- [x] **Step 14**: 詳細画面を変更する。`R/[id]/page.tsx` で Step 12 の純関数を使い、新規 `R/[id]/SubmitDraftButton.tsx`（現在の値を `PUT` で送る。409 は近くに表示）と `R/[id]/DeleteDraftButton.tsx`（既存の `CancelButton` と同じ作りの確認ダイアログ。成功したら `/reservations` へ遷移）を追加する。（FR-11、FR-12）
- [x] **Step 15**: 編集画面を変更する。`R/[id]/edit/page.tsx` の 404 の条件を Step 12 の純関数に合わせ、`R/[id]/edit/ReservationEditForm.tsx` に状態を渡して、下書きでは「下書き保存」と「申請する」、承認待ちでは「更新する」を出す。（FR-11）
- [x] **Step 16**: 予約一覧に「下書き」タブを追加する（`R/page.tsx`）。リンクは `?status=DRAFT`。「すべて」は `status` を付けない。（FR-10）
- [x] **Step 17**: フロントエンドのテストを追加・更新する。（NFR-05）
  - `FT/unit/msw/handlers.ts`: `POST` で `draft: true` のとき `DRAFT` を返す、`DELETE` のハンドラを追加する
  - `FT/unit/server/actions/reservations.test.ts`: `draft` の有無による本文の違い、`deleteReservationAction` が `DELETE` を呼ぶこと
  - 新規 `FT/unit/lib/reservation-permissions.test.ts`: 状態、本人、ADMIN の組み合わせ（ADMIN の自分の下書きを含む）
- [x] **Step 18**: フロントエンドの整形と静的検査を実行する。`pnpm format`、`pnpm lint`、型の確認（`pnpm exec tsc --noEmit` など、既存の設定に合う方法）。テストの実行は Build and Test で行う。

### まとめ

- [x] **Step 19**: 変更の要約を `Docs/spec/aidlc-docs/construction/reservation-draft/code/code-summary.md` に書く（変更したファイル、新規のファイル、設計との差分があればその理由）。アプリケーションコードは、このフォルダに置かない。

## 対象外の確認

| 項目 | 扱い |
|---|---|
| データベースのマイグレーション | なし（スキーマ変更なし） |
| デプロイ用の成果物 | なし |
| 承認の `ApprovalService` | 変更しない（`createInitialStep` を呼ぶだけ） |
| ステータスバッジの色の重複定義の整理 | 今回はしない（範囲外） |
| 予約一覧の並び順の指定 | 今回はしない（既存のまま） |

## 規模の見込み

- **ステップ数**: 19（バックエンド 8、フロントエンド 10、まとめ 1）
- **変更するファイル**: 18 前後（バックエンド本体 6、バックエンドのテスト 2、フロントエンド本体 8、フロントエンドのテスト 2）
- **新規のファイル**: 5（`SubmitDraftButton.tsx`、`DeleteDraftButton.tsx`、`reservation-permissions.ts`、`reservation-permissions.test.ts`、`code-summary.md`）

## 要件との対応

| 要件 | ステップ |
|---|---|
| FR-01、FR-02（下書き保存） | 2、3、6、7、10、13 |
| FR-03（閲覧権限） | 3、6、7 |
| FR-04、FR-05、FR-06（更新、正式申請） | 1、2、3、6、7、10、14、15 |
| FR-07（承認一覧と占有に出ない） | 3、6、7（既存の動作の維持をテストで担保） |
| FR-08（一覧の除外） | 3、6、7 |
| FR-09、FR-10（ボタン、タブ） | 13、16 |
| FR-11（詳細と編集画面） | 12、14、15 |
| FR-12（削除） | 3、5、6、7、9、10、14 |
| NFR-05（テスト） | 6、7、17 |
