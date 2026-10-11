# Backend 層サマリ — ユニット: reservation-draft（予約の下書き保存）

## 変更ファイル一覧

| ファイル | 変更内容 |
|---|---|
| `presentation/dto/CreateReservationRequest.java` | `draft`（`Boolean`、任意）フィールドを追加。`isDraft()`（null安全判定）メソッドを追加 |
| `presentation/dto/UpdateReservationRequest.java` | `submit`（`Boolean`、任意）フィールドを追加。`isSubmit()`（null安全判定）メソッドを追加 |
| `domain/Reservation.java` | `submit(ReservationStatus newStatus)` メソッドを新規追加（DRAFT→PENDING/APPROVED遷移用。既存の`cancel()`・`markApproved()`と同様、ステータスガードはService層の責務） |
| `application/ReservationService.java` | `create`：`draft`に応じたステータス決定（DRAFT/PENDING/APPROVED）とapproval_steps作成条件の統一（「PENDINGになる瞬間」のみ生成）。`update`：ステータスガードをPENDING/DRAFT両対応に拡張、`submit=true`時のDRAFT→PENDING/APPROVED遷移を実装。`checkReadAccess`：DRAFT時のAPPROVER除外を追加。`CANCELLABLE_STATUSES`定数に`DRAFT`を追加（新規削除APIなしで下書きの削除を実現） |
| `presentation/ReservationController.java` | クラスJavadoc・各メソッドのJavadocをDRAFT対応に更新（実装ロジックの変更なし、ドキュメントのみ） |
| `src/test/java/.../application/ReservationServiceTest.java` | 既存の`CreateReservationRequest`/`UpdateReservationRequest`呼び出し箇所すべてに`draft`/`submit`引数（`false`）を追加。DRAFT作成（2件）・DRAFTアクセス制御（3件）・DRAFT更新/正式申請（5件）・DRAFTキャンセル（1件）の新規テストケースを追加 |
| `src/test/java/.../presentation/ReservationControllerTest.java` | `RESERVATION_DRAFT_ID`の新規seedデータ（MEMBER所有、要承認リソース）を追加。DRAFT作成・アクセス制御・正式申請・キャンセルのHTTPレベル結合テストを追加（`@WithMockApprover`を新規import） |

## 実装したロジック（Functional Design の確定内容をそのまま実装）

- **作成時のステータス決定**：`draft=true`なら`requires_approval`の値に関わらず常に`DRAFT`、`approval_steps`は作成しない。`draft=false`（省略時含む）は既存ロジック（`requires_approval`に応じてPENDING/APPROVED）を維持
- **approval_steps統一作成条件**：新規作成時に直接PENDINGになる場合、DRAFTから正式申請してPENDINGになる場合の両方で、「ステータスがPENDINGになる瞬間」にのみ生成する共通ルールとして実装
- **更新時のステータスガード**：`PENDING`または`DRAFT`を許可するよう拡張（`APPROVED`/`REJECTED`/`CANCELLED`は従来どおり422）
- **正式申請（DRAFT→PENDING/APPROVED）**：`submit=true`かつ現在`DRAFT`の場合のみ、新規作成時と同じ`requires_approval`判定を再実行してステータスを確定する。`PENDING`の予約では`submit`の値を無視する
- **アクセス制御**：`checkReadAccess`に、`status==DRAFT`かつ`currentUser.getRole()==APPROVER`かつ非本人の場合のみ403を返す条件を追加（`DRAFT`以外のステータスでは既存どおりAPPROVER/ADMINは全件閲覧可能）
- **下書きの削除**：既存の`cancel`メソッド・`POST /api/reservations/{id}/cancel`エンドポイントをそのまま流用。`CANCELLABLE_STATUSES`に`DRAFT`を追加するのみで、新規の物理削除APIは追加していない

## 自己検証（break-and-verify）

以下3点について、対象ロジックを一時的に無効化し、意図したテストのみがredになることを確認してから復元した。

1. `create`のapproval_steps生成条件（`createsApprovalStep = false` → `true`に変更）→ `create_draftTrueRequiresApprovalTrue_returnsDraftWithoutApprovalStep`がred
2. `checkReadAccess`のDRAFT時APPROVER除外条件（`if`条件を`false`に変更）→ `get_draftByApprover_throwsAccessDeniedException`がred
3. `update`の正式申請分岐（`if (wasDraft && req.isSubmit())`を`if (false && ...)`に変更）→ `update_draftSubmitTrue_returns200PendingWithApprovalStep`（ReservationControllerTest）がred

## テスト結果

- `./gradlew test`：全208テスト成功（既存188件 + 新規20件：ReservationServiceTest 11件・ReservationControllerTest 9件）
- `./gradlew spotlessApply checkstyleMain`：差分なし。Checkstyle警告4件（すべて本ユニットより前から存在する既知WARN：`Resource.java`の`ParameterNumber`超過2件、`ReservationRepository.java`の`MethodName`パターン不一致2件）

## スコープ外（本ユニットで対応していない）

- 新規の物理削除（DELETE）APIの追加
- DRAFT作成時のバリデーション緩和
- 複数段階承認フロー等、承認フロー自体の変更
- DBマイグレーション（`DRAFT`は既存のCHECK制約に定義済みのため変更不要）
