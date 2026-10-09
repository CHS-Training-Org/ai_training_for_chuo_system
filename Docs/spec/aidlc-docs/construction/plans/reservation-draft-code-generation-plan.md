# Code Generation Plan — `reservation-draft`

**ユニット**: `reservation-draft`（単一・縦切り）
**作成日時**: 2026-10-02T11:02:40+00:00
**ワークスペース**: `/workspace`（Brownfield・既存ファイルは in-place で変更する）

**入力**:

- [要件定義](../../inception/requirements/reservation-draft/requirements.md)（FR-01〜FR-07、NFR-01〜NFR-04）
- [ユーザーストーリー](../../inception/user-stories/reservation-draft/stories.md)（US-01〜US-07、受入基準34件）
- [業務ロジック](../reservation-draft/functional-design/business-logic-model.md)
- [業務ルール](../reservation-draft/functional-design/business-rules.md)（BR-01〜BR-26）
- [ドメインモデル](../reservation-draft/functional-design/domain-entities.md)
- [フロントエンド設計](../reservation-draft/functional-design/frontend-components.md)

> この計画が Code Generation の唯一の指示書である。ここに書かれていないファイルは変更しない。

---

## ユニットの文脈

| 項目 | 内容 |
|---|---|
| 実装するストーリー | US-01 から US-07（全7件） |
| 他ユニットへの依存 | なし（単一ユニット） |
| 所有するデータベースエンティティ | `reservations`（既存・スキーマ変更なし） |
| 新規マイグレーション | なし（`DRAFT` は V001 の CHECK 制約に定義済み） |
| 変更しない既存の振る舞い | `draft` と `status` を省略したリクエストの処理経路（NFR-03） |

---

## 変更対象ファイル一覧

### バックエンド（6ファイル・うち新規0件）

| ファイル | 変更内容 |
|---|---|
| `backend/src/main/java/com/example/bookflow/presentation/dto/CreateReservationRequest.java` | `draft` フィールド追加 |
| `backend/src/main/java/com/example/bookflow/presentation/dto/UpdateReservationRequest.java` | `status` フィールド追加 |
| `backend/src/main/java/com/example/bookflow/domain/Reservation.java` | `markPending()` 追加 |
| `backend/src/main/java/com/example/bookflow/application/ReservationService.java` | `create` / `update` / `checkReadAccess` の分岐追加 |
| `backend/src/test/java/com/example/bookflow/application/ReservationServiceTest.java` | テストケース追加 |
| `backend/src/test/java/com/example/bookflow/presentation/ReservationControllerTest.java` | テストケース追加 |

### フロントエンド（8ファイル・うち新規3件）

| ファイル | 変更内容 |
|---|---|
| `frontend/src/lib/reservation-permissions.ts` | **新規**。編集可否と正式申請可否の純関数 |
| `frontend/src/server/actions/reservations.ts` | `createReservationAction` と `updateReservationAction` の引数拡張 |
| `frontend/src/app/(authenticated)/reservations/[id]/SubmitDraftButton.tsx` | **新規**。正式申請ボタン |
| `frontend/src/app/(authenticated)/reservations/new/ReservationForm.tsx` | 下書き保存ボタン追加 |
| `frontend/src/app/(authenticated)/reservations/page.tsx` | `DRAFT` タブ追加 |
| `frontend/src/app/(authenticated)/reservations/[id]/page.tsx` | ボタン表示条件の変更 |
| `frontend/src/app/(authenticated)/reservations/[id]/edit/page.tsx` | `DRAFT` を編集対象に含める |
| `frontend/tests/unit/server/actions/reservations.test.ts` | テストケース追加 |
| `frontend/tests/unit/reservation-permissions.test.ts` | **新規**。権限判定の純関数テスト |

`ReservationController.java` と `ReservationEditForm.tsx` と `lib/schemas/reservation.ts` は変更しない。
Controller は Service へ委譲する構造を維持し、`draft` と `status` はフォームの入力項目ではないため Zod スキーマに含めない。

---

## 実行ステップ

### バックエンド

- [x] **Step 1**: `CreateReservationRequest` に `Boolean draft` を追加する。バリデーション注釈は付けない（省略可能・既定は `false` 扱い）。Javadoc に下書き保存の指定であることを記す。（US-01 / BR-01、BR-02）
- [x] **Step 2**: `UpdateReservationRequest` に `ReservationStatus status` を追加する。省略可能とし、Javadoc に正式申請の指定であることと `PENDING` のみ受け付けることを記す。（US-04 / BR-14、BR-15）
- [x] **Step 3**: `Reservation` に `markPending()` を追加する。既存の `cancel()` / `markApproved()` / `markRejected()` と同じ形（引数なし・固定ステータス・`updatedAt` 更新）にする。（US-04 / ドメインモデル設計）
- [x] **Step 4**: `ReservationService` を変更する。（US-01 から US-07 / BR-01 から BR-25）
  - [x] 4.1 `create`: `draft` が真のとき、悲観ロックなしでリソースを取得し、重複チェックと承認ステップ生成を行わず `DRAFT` で保存する。偽・省略時は既存経路のまま。（BR-01 から BR-04）
  - [x] 4.2 `update`: ステータスガードを `DRAFT` と `PENDING` に広げる。（BR-08、BR-10）
  - [x] 4.3 `update`: `status` 省略時は内容のみ更新し、現在が `DRAFT` なら重複チェックを行わない。（BR-11 から BR-13）
  - [x] 4.4 `update`: `status` 指定時は正式申請として扱う。`PENDING` 以外の値、および現在が `DRAFT` 以外なら 422。重複チェックを実行し、`requires_approval` により `markPending()` + 承認ステップ生成、または `markApproved()` に分岐する。（BR-14 から BR-20）
  - [x] 4.5 `checkReadAccess`: `DRAFT` のとき申請者本人と ADMIN 以外を 403 にする。`DRAFT` 以外の判定は変えない。（BR-22 から BR-24）
  - [x] 4.6 クラス Javadoc の業務ルール一覧に下書き保存の項目を追記する。
- [x] **Step 5**: `ReservationServiceTest` に `Draft` ネストクラスを追加する。（受入基準 AC-01-2 から AC-01-4、AC-03-2、AC-03-5、AC-04-2 から AC-04-7、AC-05-1）
  - [x] 5.1 `draft=true` で `requires_approval` が真・偽のいずれでも `DRAFT` になること
  - [x] 5.2 `draft=true` で承認ステップが生成されないこと
  - [x] 5.3 `draft=true` で時間帯が重複していても 409 にならないこと
  - [x] 5.4 `DRAFT` の内容更新が通り、ステータスが変わらないこと
  - [x] 5.5 正式申請で `requires_approval=true` なら `PENDING` になり承認ステップが1件生成されること
  - [x] 5.6 正式申請で `requires_approval=false` なら `APPROVED` になり承認ステップが生成されないこと
  - [x] 5.7 正式申請時の重複で 409 になり、ステータスが `DRAFT` のままであること
  - [x] 5.8 `DRAFT` 以外への `status` 指定、および `PENDING` 以外の値が 422 になること
  - [x] 5.9 `DRAFT` の読み取りが本人と ADMIN で 200、APPROVER と他の MEMBER で 403 になること
- [x] **Step 6**: `ReservationControllerTest` に `DRAFT` の権限ケースを追加する。（AC-06-1 から AC-06-3、AC-07-1、AC-07-3）

### フロントエンド

- [x] **Step 7**: `frontend/src/lib/reservation-permissions.ts` を新規作成する。`canEditReservation` と `canSubmitDraft` を純関数として定義する。予約詳細画面と予約編集画面の2箇所から使う。（AC-03-1、AC-03-3、AC-04-1、AC-07-4）
- [x] **Step 8**: `server/actions/reservations.ts` を変更する。（US-01、US-04）
  - [x] 8.1 `createReservationAction` に第2引数 `draft?: boolean` を追加し、真のときのみボディに `draft` を含める
  - [x] 8.2 `updateReservationAction` に第3引数 `status?: "PENDING"` を追加し、指定時のみボディに `status` を含める
- [x] **Step 9**: `reservations/[id]/SubmitDraftButton.tsx` を新規作成する。`CancelButton` と同じ Dialog による確認を置き、409 を捕捉してダイアログ内にメッセージを出す。成功時は `router.refresh()` する。`data-testid` を付ける。（AC-04-1、AC-04-4、AC-04-8）
- [x] **Step 10**: `reservations/new/ReservationForm.tsx` に「下書き保存」ボタンを追加する。`type="button"` とし `form.handleSubmit` 経由で送信してバリデーションを通す。成功時は作成した予約の詳細画面へ遷移する。`data-testid` を付ける。（AC-01-1、AC-01-5、AC-01-6）
- [x] **Step 11**: `reservations/page.tsx` の `ALL_STATUSES` の先頭に `DRAFT` を追加する。（AC-02-1 から AC-02-4）
- [x] **Step 12**: `reservations/[id]/page.tsx` を変更する。Step 7 の純関数で編集ボタンと正式申請ボタンの表示を制御し、`SubmitDraftButton` を組み込む。（AC-03-1、AC-04-1、AC-07-4）
- [x] **Step 13**: `reservations/[id]/edit/page.tsx` を変更する。`notFound()` の条件、画面の説明文、ファイル冒頭のコメントの3箇所を `DRAFT` 対応にする。（AC-03-3）

### テストと記録

- [x] **Step 14**: `tests/unit/server/actions/reservations.test.ts` に、`draft` と `status` がリクエストボディに含まれる場合と含まれない場合のテストを追加する。（AC-01-1、AC-04-7）
- [x] **Step 15**: `tests/unit/reservation-permissions.test.ts` を新規作成し、ステータスとロールの組み合わせで編集可否と正式申請可否を検証する。（AC-03-1、AC-04-1、AC-07-4）
- [x] **Step 16**: `Docs/spec/aidlc-docs/construction/reservation-draft/code/generation-summary.md` に、変更・新規作成したファイルの一覧と受入基準の対応を記録する。

---

## ストーリーの実装追跡

- [x] US-01 予約を下書きとして保存する（Step 1、4.1、8.1、10）
- [x] US-02 保存した下書きを一覧から見つける（Step 11）
- [x] US-03 下書きの内容を直す（Step 4.2、4.3、13）
- [x] US-04 下書きを正式に申請する（Step 2、3、4.4、8.2、9、12）
- [x] US-05 下書きが承認業務に流れ込まない（Step 4.1）
- [x] US-06 他人の下書きを開けない（Step 4.5）
- [x] US-07 管理者が下書きを把握する（Step 4.5、7、12）

---

## 守る規約

- Brownfield のため既存ファイルは in-place で変更する。`ClassName_new.java` のような複製を作らない。
- アプリケーションコードはワークスペース直下の既存構造に置く。`Docs/spec/aidlc-docs/` にはマークダウンの記録だけを置く。
- バックエンドは4レイヤー構成を守る。権限判定と遷移判定は `ReservationService` に置き、`@PreAuthorize` は使わない（NFR-01）。
- フロントエンドは Server Components を優先し、クライアント状態を増やさない。
- `data-testid` は本ユニットで新規に追加する操作要素（下書き保存ボタン・正式申請ボタン）にのみ付ける。既存要素には遡って付けない。
- テストの実行は Build and Test ステージで行う。本ステージではコードの生成までとする。
