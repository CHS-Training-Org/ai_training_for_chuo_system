# Business Logic Model — reservation-draft

`ReservationService` の各メソッドに対する `DRAFT` 対応の業務フローを定義する。既存の役割分担（Service が判断・分岐、domain エンティティは無条件セッター）を維持する（`requirements.md` D6/D7）。

## 1. 予約作成（`create()`）— `draft` 分岐の追加

```
1. リソース存在確認（既存、悲観ロック）
2. 日時整合性チェック（endAt > startAt）（既存）
3. draft が true か判定
   3a. true の場合：
       - 重複予約チェック（checkConflict）を実行しない（D5）
       - ステータス = DRAFT で保存
       - approval_steps を生成しない
   3b. false の場合（既存の挙動）：
       - 重複予約チェックを実行する
       - requires_approval に応じて APPROVED / PENDING を決定
       - PENDING の場合のみ approval_steps を生成する
4. 予約保存
```

**分岐点**：Step 3 の `draft` フラグ判定が唯一の追加分岐。既存の3〜4はそのまま既存パス（3b）として温存する。

## 2. 予約内容更新・正式申請（`update()`）— `submit` 分岐の追加

```
1. 予約存在確認（既存）
2. 所有権チェック：申請者本人のみ（既存、ADMIN例外なし）
3. ステータスガード：現在のステータスが DRAFT または PENDING であること（従来は PENDING のみ）
   - それ以外（APPROVED/REJECTED/CANCELLED）は 422 VALIDATION_ERROR（既存のまま）
4. submit フラグの評価
   4a. submit が true の場合：
       - 現在のステータスが DRAFT でなければ 422 VALIDATION_ERROR（PENDING に対する submit=true は不正遷移）
       - 日時整合性チェック（既存）
       - 重複予約チェック（checkConflict、自己除外）を実行する（D7：下書き放置中に枠が埋まっている可能性があるため。UC-06 の承認時再チェックと同じ論法）
       - 内容を更新する（update()）
       - requires_approval に応じて markApproved() または markPending() を呼ぶ
       - markPending() を呼んだ場合のみ approvalService.createInitialStep() を呼ぶ
   4b. submit が false または未指定の場合（既存の PENDING 編集はこの経路を通る。DRAFT の再編集も同じ経路）：
       - 日時整合性チェック（既存）
       - 重複予約チェック（checkConflict、自己除外）を実行する（既存のまま。ステータスは変えない）
       - 内容を更新する（update()）。ステータスは現在のまま（DRAFT なら DRAFT のまま、PENDING なら PENDING のまま）
```

**設計決定（Functional Design で追加）**：「正式申請」操作（stories.md Story 5）は詳細ページの専用ボタンから行い、フォーム入力を伴わない。呼び出し時は**保存済みの下書きの現在値**（`startAt`/`endAt`/`purpose`/`attendeesCount`）をそのまま `submit=true` とともに送信する。したがって 4a の日時整合性チェック・重複予約チェックは「内容が変わらない」ケースがほとんどだが、下書き保存後に他の予約で枠が埋まった場合の再チェックとして機能する（意味があるのは重複チェックのみ。日時整合性チェックは通常falseにならないが、既存の `update()` 経路を単純に再利用するため個別に外さない）。

## 3. キャンセル（`cancel()`）— `DRAFT` を対象に追加

```
1. 予約存在確認（既存）
2. 所有権チェック：申請者本人 or ADMIN（既存のまま、DRAFT専用の特別扱いはしない。D3）
3. ステータスガード：CANCELLABLE_STATUSES に DRAFT を追加（DRAFT/PENDING/APPROVED が対象）
4. cancel() を呼ぶ（既存の無条件セッター、変更なし）
```

## 4. 予約詳細取得（`get()`）— `checkReadAccess()` の `DRAFT` 例外

```
1. 予約存在確認（既存）
2. 読み取りアクセスチェック：
   2a. 対象予約のステータスが DRAFT の場合：
       - 現在のユーザーが申請者本人 または ADMIN でなければ 403 AccessDeniedException（D4）
       - APPROVER であっても本人でなければ 403（既存の「APPROVERは全件閲覧可」からDRAFTのみ除外）
   2b. 対象予約のステータスが DRAFT 以外の場合（既存の挙動、変更なし）：
       - 現在のユーザーが MEMBER かつ本人でなければ 403（APPROVER/ADMIN は全件閲覧可）
```

## 5. 予約一覧（`list()`）— 変更不要

`GET /api/reservations?status=DRAFT` は既存の `List<ReservationStatus> status` パラメータバインドがそのまま受理する（`ReservationStatus` enum に `DRAFT` が定義済み）。非ADMINユーザーは既存どおり自分の予約のみ返る（DRAFTも含む）ため、リストの可視範囲は自動的に正しく絞られる。ADMIN は既存どおり全件（他人のDRAFT含む）が返る（D3のcancel同様、閲覧はできるが編集・正式申請はできない、という非対称は一覧取得自体には影響しない）。**コード変更なし**。
