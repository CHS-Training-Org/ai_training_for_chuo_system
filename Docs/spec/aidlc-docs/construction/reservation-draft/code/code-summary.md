---
type: working-doc
title: Code Summary（ユニット：reservation-draft）
description: AI-DLC Code Generation ステージで変更・追加したファイルと、設計との差分の要約
timestamp: 2026-11-14
---

# Code Summary — reservation-draft

**略記**: `BE/` = `backend/src/main/java/com/example/bookflow/`、`BT/` = `backend/src/test/java/com/example/bookflow/`、`FE/` = `frontend/src/`、`FT/` = `frontend/tests/`、`R/` = `FE/app/(authenticated)/reservations/`

## バックエンド

### 変更したファイル

| ファイル | 内容 |
|---|---|
| `BE/domain/Reservation.java` | `markPending()` を追加（`DRAFT` から `PENDING`）。`markApproved()` を下書きの正式申請にも使う旨を Javadoc に追記 |
| `BE/presentation/dto/CreateReservationRequest.java` | 任意の `Boolean draft` を末尾に追加 |
| `BE/presentation/dto/UpdateReservationRequest.java` | 任意の `Boolean draft` を末尾に追加 |
| `BE/application/ReservationService.java` | `create` に下書きの分岐、`update` を状態と `draft` の分岐に拡張、`delete` を新設、`checkReadAccess` に下書きの規則、`list` で `status` 未指定のとき下書きを除く |
| `BE/domain/ReservationRepository.java` | 未使用になった `findAllFetch` と `findByRequesterIdFetch` を削除（参照が無いことを確認済み） |
| `BE/presentation/ReservationController.java` | `DELETE /api/reservations/{id}`（204）を追加。Javadoc を更新 |
| `BT/application/ReservationServiceTest.java` | 下書きのテストを追加（作成、更新、正式申請、閲覧、削除、一覧、取消）。既存の DTO 呼び出し 10 か所に `draft` の引数（`null`）を追加 |
| `BT/presentation/ReservationControllerTest.java` | 下書きの API テストを追加（POST、PUT、DELETE、一覧、詳細、取消）。初期データに下書き 3 件を追加 |

### `ReservationService` の主な構成

- `createDraft`: リソースを通常取得（ロックしない）し、日時を検証して `DRAFT` で保存する。
- `updateDraft`: 日時を検証して、下書きのまま更新する。
- `submitDraft`: リソースをロックし、重複判定（自己除外）、更新、状態の遷移、承認ステップの生成を行う。
- `updatePending`: 承認待ちの従来どおりの更新（`update` から切り出し）。
- 補助: `isOwner`、`validateTimeRange`、`lockResource`。`create` と更新の日時検証も `validateTimeRange` に共通化した（挙動は同じ）。

## フロントエンド

### 変更したファイル

| ファイル | 内容 |
|---|---|
| `FE/lib/api-client.ts` | `deleteEmpty(path)` を追加 |
| `FE/server/actions/reservations.ts` | `createReservationAction` と `updateReservationAction` に `options?: { draft?: boolean }` を追加。`deleteReservationAction` を新設。`tryUpdateReservationAction` を追加（重複 409 を `{ ok: false, conflict: true }` の値で返す） |
| `FE/lib/labels.ts` | `DRAFT` の表示名を「ドラフト」から「下書き」に変更 |
| `R/new/ReservationForm.tsx` | 「下書き保存」ボタンを追加。成功したら `/reservations?status=DRAFT` へ遷移 |
| `R/[id]/page.tsx` | ボタンの出し分けを `getReservationActions` に変更。「正式申請」「削除」を追加 |
| `R/[id]/edit/page.tsx` | 開ける条件を `getReservationActions` の `canEdit` に変更。下書きの説明文を追加 |
| `R/[id]/edit/ReservationEditForm.tsx` | 状態を受け取り、下書きでは「下書き保存」「申請する」、承認待ちでは「更新する」を出す |
| `R/page.tsx` | 「下書き」タブを追加（`STATUS_TABS`） |
| `FT/unit/msw/handlers.ts` | `POST` と `PUT` が `draft: true` のとき `DRAFT` を返す。`DELETE` のハンドラを追加 |
| `FT/unit/server/actions/reservations.test.ts` | `draft` の有無による本文の違い、日時の正規化、`deleteReservationAction` のテストを追加 |

### 新規のファイル

| ファイル | 内容 |
|---|---|
| `FE/lib/reservation-permissions.ts` | ボタンの出し分けの純関数 `getReservationActions`（編集、正式申請、削除、キャンセル） |
| `R/[id]/SubmitDraftButton.tsx` | 詳細画面の「正式申請」ボタン。現在の値を `PUT` で送る。409 はボタンの近くに表示 |
| `R/[id]/DeleteDraftButton.tsx` | 詳細画面の「削除」ボタンと確認ダイアログ。成功したら `/reservations` へ遷移 |
| `FT/unit/lib/reservation-permissions.test.ts` | 状態、本人、ADMIN の組み合わせのテスト（ADMIN の自分の下書きを含む） |

## 設計との差分

設計の意図は変えていないが、次の点は設計書に書いていない判断を、実装時に決めた。

| 内容 | 理由 |
|---|---|
| 編集画面（下書き）で Enter キーを押すと、「申請する」ではなく「下書き保存」になる | 正式申請は取り消せないため、明示的に「申請する」を押したときだけ行うようにした |
| 詳細画面の「正式申請」の重複エラー文言を、「別の時間帯に変更してから申請してください」にした | この画面には日時の入力欄がなく、直すには編集画面へ行く必要があるため、次の行動が分かる文言にした |
| 一覧のタブと、詳細画面の編集ボタンに `data-testid` を付けた | 操作できる要素に付ける方針（Code Generation の規則）に合わせた |
| 下書き保存のとき、リソースの存在確認にロックを使わず `findById` を使う | 重複判定をしないため、ロックは不要（設計の方針どおり） |
| 申請・更新の重複エラーを、Server Action が投げる `ApiClientError` ではなく、戻り値で返すようにした（`tryUpdateReservationAction`。詳細の申請ボタンと編集画面が使う） | ブラウザ確認で、重複時にエラー画面になる不具合が見つかった。Server Action が投げたエラーはブラウザ側でクラスの情報を失い、`instanceof ApiClientError` が成り立たないため。変更前の `new/ReservationForm.tsx` にも同じ問題があるが、今回の対象外（元からある問題として PR に記載する） |

## 実施した確認

| 確認 | 結果 |
|---|---|
| バックエンド: `./gradlew spotlessApply` | 成功（整形を適用） |
| バックエンド: `compileJava`、`compileTestJava`、`checkstyleMain`、`checkstyleTest` | 成功。Checkstyle の警告は、テストメソッド名のアンダースコア（既存のテストにも同じ警告があり、命名規約 ADR-018 による） |
| フロントエンド: `oxfmt`（変更した 14 ファイル） | 成功 |
| フロントエンド: `pnpm lint` | 成功（指摘なし） |
| フロントエンド: `tsc --noEmit` | 成功（エラーなし） |
| テストの実行（`./gradlew test`、`pnpm test`） | **未実施**。Build and Test で実行する |

## PR の説明に書くこと（今回の対象外としたもの）

- `new/ReservationForm.tsx`: 時間帯が重複したときのエラーを、ブラウザ側の `instanceof ApiClientError` で判定しているため、エラー画面になる。変更前から同じ。今回は編集画面と詳細画面の申請ボタンだけ直した。
- 予約の詳細画面: 他人の下書きなどで 403・404 になると、エラー画面になる（開発時は赤いオーバーレイ）。screen-spec.md は「403 エラーを表示する」としており仕様どおり。見た目の整備は別の課題。
