# Requirements — 予約の下書き保存（Issue #30）

## Intent Analysis Summary

- **User Request**: エンハンス課題シート `docs-next/docs/spec/enhancements/intermediate/reservation-draft.md`（予約の下書き保存）を対象タスクとして実装する
- **Request Type**: Enhancement（既存ユースケース UC-03「社員がリソースを予約申請する」の拡張）
- **Scope Estimate**: Multiple Components（backend: domain/application/presentation の3層＋frontend: 予約申請フォーム・予約一覧・予約詳細・予約編集の4画面）
- **Complexity Estimate**: Moderate（新規サービス・新規テーブルは不要だが、予約に新しいライフサイクル（DRAFT → PENDING/APPROVED）と、ステータス限定のアクセス制御分岐が加わる）

## 背景

BookFlow の `reservations.status` には `DRAFT` が DB の CHECK 制約（`chk_reservations_status`）に定義済みだが、アプリケーション層では未使用（`POST /api/reservations` は常に `PENDING`/`APPROVED` のいずれかで確定する）。本タスクは、予約申請を完了前に `DRAFT` として保存し、後から再編集・正式申請できる機能を追加する。

## Design Decisions（確認質問により確定した設計判断）

Requirements Analysis 段階で、要求シート単体では確定できない設計判断が4点あったため `AskUserQuestion` で確認した（回答はすべて提示した推奨案）。加えて、確認質問では扱わなかったが実装に直結する判断が2点あり、既存実装の設計と対称になるよう本ドキュメントで決定する（レビュー対象として明記する）。

| # | 論点 | 決定 | 根拠 |
|---|------|------|------|
| D1 | 下書き保存時の必須項目 | 既存必須項目（`resourceId`/`startAt`/`endAt`/`purpose`）を維持する。DB マイグレーションは不要 | `reservations` テーブルは `start_at`/`end_at`/`purpose` が `NOT NULL` かつ `end_at > start_at` の CHECK 制約付き。要求シートの要件表・受入条件・影響範囲のいずれにもスキーマ変更の記載がなく、`POST /api/reservations` に `draft` フラグを足すだけの変更として要件が組まれている |
| D2 | DRAFT → PENDING 正式申請の呼び出し方法 | `PUT /api/reservations/{id}` に真偽フラグ `submit` を追加する。`submit` が false／未指定の場合は内容更新のみ行い `DRAFT` のまま保持する（再編集）。`submit=true` の場合は UC-03 と同じ `requires_approval` 分岐（`false` → 即 `APPROVED`、`true` → `PENDING` ＋ `approval_steps` 生成）で正式申請する | 要求シート RSV-03 は文言上 `DRAFT → PENDING` 固定だが、`requires_approval=false` のリソースをそのまま `PENDING` に固定すると承認機構が存在しないため永久に確定しない不整合が生じる。UC-03/UC-04 と同一の分岐を適用するのが既存ロジックと整合する |
| D3 | DRAFT 予約の削除 | 新規エンドポイントは追加せず、既存の `POST /api/reservations/{id}/cancel` を拡張して `DRAFT` もキャンセル対象に含める（`CANCELLABLE_STATUSES` に `DRAFT` を追加）。物理削除は行わず `CANCELLED` に遷移させる。`cancel()` の所有権チェック（申請者本人 or ADMIN）は変更しないため、**ADMIN は他人の `DRAFT` もキャンセルできる**（閲覧のみに限定される D4 とは別の話。編集・正式申請〔`update()`〕は既存どおり ADMIN には及ばない） | 既存の状態遷移パターン（論理キャンセルのみ・物理削除なし）と一貫させる。`cancel()` の所有権チェックを `DRAFT` だけ特別扱いする理由がなく、既存の「ADMIN はすべての予約をキャンセルできる」（RSV-05）という前提をそのまま適用するのが一貫している |
| D4 | DRAFT の閲覧アクセス制御 | `DRAFT` ステータスに限り、申請者本人と `ADMIN` 以外は 403 とする。`APPROVER` も対象に含める（`PENDING`/`APPROVED`/`REJECTED`/`CANCELLED` では現状どおり `APPROVER` は全件閲覧可のまま変更しない） | 受入条件「申請者本人以外が `DRAFT` 予約の詳細にアクセスすると 403（ADMIN は除く）」を文言通りに適用すると `APPROVER` も本人以外は対象になる。`DRAFT` は承認フローに乗らないため `APPROVER` が閲覧する業務上の理由がない |
| D5（追加判断） | DRAFT 作成時の重複予約チェック | `POST /api/reservations` で `draft=true` を指定した場合、既存の `checkConflict`（重複予約チェック）は実行しない | 重複チェック対象は `OCCUPIED_STATUSES = [PENDING, APPROVED]` であり `DRAFT` は他者の予約枠を占有しない。作成側だけ重複チェックを課すと「他者を妨げないが自分は妨げられる」非対称になる。**この判断は確認質問で扱っていないため、本ドキュメントの承認時にレビューを依頼する** |
| D6（追加判断） | 所有権・アクセス制御チェックの実装場所 | `ReservationService` 内（`checkReadAccess` 等の既存メソッド）に実装する。Spring Security の `@PreAuthorize` は使わない | `ReservationController` の既存 javadoc に「行レベルの所有権チェックは `ReservationService` が担当する（`@PreAuthorize` 不使用）」と明記されている。加えて、既存の `@PreAuthorize` 使用例（`ResourceController`/`ApprovalController`/`UserController`）はいずれも JWT のロールクレームのみで判定できる静的なエンドポイント全体のゲート（`hasRole('ADMIN')` 等）であり、対象データを見ない。今回の「`DRAFT` の予約は本人か ADMIN のみ」という判定は対象レコードの `requester_id`/`status` に依存する行レベル判定であり、`@PreAuthorize` で実装すると判定用に予約を再フェッチするカスタム Bean が必要になり（`ReservationService` 側の取得と二重化する）、認可ロジックが Controller 側と Service 側の2箇所に分散する。書き込み系（`update`/`cancel`）は `@PostAuthorize`（戻り値ベースの事後判定）でも保護できないため、既存パターン（Service 内の事前チェック）を維持するのが妥当 |
| D7（追加判断） | `DRAFT → PENDING/APPROVED` 遷移バリデーションの実装場所 | 不正遷移の防止（`submit=true` は現在 `DRAFT` の予約にのみ許可等）は **`ReservationService`** に置く。`Reservation` エンティティ側は事前条件を持たない無条件セッターのみとする | `cancel()`（119行目、javadocに「呼び出し前に Service 層で確認すること」と明記）・`markApproved()`・`markRejected()` がいずれも無条件セッターであり、遷移の可否判断はすべて `ReservationService` 側（`update()`/`cancel()`）に集約されている既存パターンと一致させる |

**D2 に伴う追加ガード**: `submit=true` が `DRAFT` 以外（`PENDING` 等）の予約に指定された場合は `422 VALIDATION_ERROR` とする（既存のステータスガードと同じ扱い）。この判定は `ReservationService.update()` が行う（D7）。

**DRAFT → PENDING/APPROVED の遷移メソッド（D7 の具体化）**: `Reservation` エンティティに `markApproved()`（既存を再利用）と対になる無条件セッター `markPending()` を追加する。`requires_approval` 分岐・重複予約チェック・`approval_steps` 生成の呼び出し順序はいずれも `ReservationService.update()` が担う（`create()` において「ステータス決定は Service、ドメイン層は決定済みの値を受け取るだけ」という役割分担と同一）。

## Functional Requirements

要求シートのローカル ID（RSV-01〜05）は `requirements.md` 既存の UC-07 セクションで既に `RSV-01`〜`RSV-07` が使用済みのため衝突する。`/update-spec` 実施時は `RSV-08` 以降で採番する（前例：Issue #23 では `RES-09` を採番）。

| 要求シート ID | requirements.md 採番（予定） | 要件 |
|---|---|---|
| RSV-01 | RSV-08 | `POST /api/reservations` に `draft`（真偽値、任意・デフォルト `false`）を追加する。`true` の場合、`requires_approval` 分岐・重複予約チェック（D5）・`approval_steps` 生成をいずれもスキップし、ステータス `DRAFT` で保存する |
| RSV-02（閲覧・編集） | RSV-09 | `DRAFT` ステータスの予約は、申請者本人と `ADMIN` のみ閲覧・編集できる（D4）。`approval_steps` は生成しないため承認一覧（`GET /api/approvals/pending`）には現れない |
| RSV-03 | RSV-10 | `PUT /api/reservations/{id}` に `submit`（真偽値、任意・デフォルト `false`）を追加する（D2）。ステータスガードを `DRAFT` ∪ `PENDING` に拡張する |
| RSV-02（削除） | RSV-11 | `DRAFT` 予約は `POST /api/reservations/{id}/cancel` でキャンセル（`CANCELLED` 化）できる（D3） |
| RSV-04 | RSV-12 | 予約申請フォーム（`/reservations/new`）に「下書き保存」ボタンを追加する |
| RSV-05 | RSV-13 | 予約一覧（`/reservations`）に `DRAFT` 用のステータスフィルタ（タブ）を追加する。バックエンド API は変更不要（`GET /api/reservations?status=DRAFT` は既存の `List<ReservationStatus>` バインドがそのまま受理する） |
| （画面遷移として要件表に明記なし・受入条件に基づく補完） | RSV-14 | 予約詳細（`/reservations/{id}`）に `DRAFT` 時の「再編集」（`/reservations/{id}/edit` へ遷移）・「正式申請」（`submit=true` で `PUT` 呼び出し）導線を追加する |
| （同上） | RSV-15 | 予約編集画面（`/reservations/{id}/edit`）の対象ステータスを `PENDING` のみから `DRAFT` ∪ `PENDING` に拡張する。`DRAFT` 編集時は見出し・ボタン文言を「下書きを編集」等に調整し、「正式申請」導線と区別する |

## Non-Functional Requirements

- 追加の Extension（Security Baseline / Resiliency Baseline / Property-Based Testing）は Requirements Analysis で確認済み、いずれも Disabled（前回タスクと同じ判断）
- 新規の性能・可用性要件はなし。既存の悲観ロック（`findByIdForUpdate`）・トランザクション境界を踏襲する

## User Scenarios（概要・詳細は User Stories ステージで生成）

1. MEMBER が予約申請フォームに入力途中の内容（全項目入力済み）を「下書き保存」する。一覧の `DRAFT` タブで確認できる
2. MEMBER が下書きを再編集し、内容を更新したまま `DRAFT` で保存し直す
3. MEMBER が下書きを正式申請する。`requires_approval` に応じて即時 `APPROVED` または `PENDING`（承認待ち）になる
4. MEMBER が不要になった下書きをキャンセル（`CANCELLED`）する
5. 申請者本人以外（他の MEMBER・APPROVER）が他人の `DRAFT` 予約にアクセスすると 403 になる。ADMIN は例外的にアクセスできる

新規ペルソナはなく、既存ロール（MEMBER/APPROVER/ADMIN）の予約ライフサイクルが拡張される。ただし「下書き→再編集→正式申請」という新しいユーザーワークフローが加わるため、User Stories ステージは EXECUTE と判定する（Workflow Planning で確定）。

## Technical Context（影響ファイルの見立て）

**Backend**
- `domain/Reservation.java`：`submit()` メソッド追加（D2/D6）
- `domain/ReservationStatus.java`：変更なし（`DRAFT` は定義済み）
- `application/ReservationService.java`：`create()` の `draft` 分岐（D1/D5）、`update()` のステータスガード拡張と `submit` 分岐（D2）、`checkReadAccess()` の `DRAFT` 限定拡張（D4/D6）、`CANCELLABLE_STATUSES` への `DRAFT` 追加（D3）
- `presentation/ReservationController.java`：`create`/`update` のパラメータ受け渡し
- `presentation/dto/CreateReservationRequest.java`：`draft` フィールド追加
- `presentation/dto/UpdateReservationRequest.java`：`submit` フィールド追加
- `list()`／`ReservationController#list`：変更不要（D6の根拠どおり）

**Frontend**
- `reservations/new/ReservationForm.tsx`：「下書き保存」ボタン
- `reservations/page.tsx`：`DRAFT` タブ・ステータスバッジ色（`STATUS_VARIANTS`/`statusBadgeClass`/`STATUS_LABELS`/`ALL_STATUSES` に追加）
- `reservations/[id]/page.tsx`：`DRAFT` 時の「再編集」「正式申請」導線
- `reservations/[id]/edit/ReservationEditForm.tsx`・`edit/page.tsx`：`DRAFT` 対応（見出し・アクセス制御メッセージ）
- `server/actions/reservations.ts`・`lib/schemas/reservation.ts`：`draft`/`submit` パラメータ配線（`lib/types/enums.ts` の `ReservationStatusSchema` は変更不要、`DRAFT` は定義済み）

**Docs（`/update-spec` で対応、Code Generation 前に実施）**
- `docs-next/docs/spec/requirements.md`：142行目・227行目の「`DRAFT` はベース実装では未使用」系の注記を実仕様に更新。UC-03/UC-07 セクションに RSV-08〜15 を追記
- `docs-next/docs/spec/api-spec.md`：489行目（`status` クエリパラメータ列挙）・537行目（レスポンスの `status` 列挙注記）・POST/PUT の各節を更新
- `docs-next/docs/spec/er-diagram.md`：75行目の「`DRAFT` はベース実装では未使用」注記を更新
- `docs-next/docs/spec/screen-spec.md`：§予約の4画面（RSV-12〜15）を更新
- `docs-next/static/diagrams/spec/requirements-reservation-status.drawio`：予約ステータス遷移図（Markdown 編集では反映されない drawio アセット）を `drawio-skill` で更新し、`.svg` を再生成する。Workflow Planning の実行計画にこの作業項目を明記する

## 受入条件のうち実装ではなく検証で満たされるもの

- 「下書き予約は承認一覧に表示されない」：`draft=true` 作成時に `approval_steps` を生成しないため自動的に満たされる。実装項目ではなくテスト項目として計画する
