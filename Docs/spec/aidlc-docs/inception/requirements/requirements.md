# Requirements — ユニット: reservation-draft（予約の下書き保存）

## Intent Analysis Summary

- **User Request**: 既に DB・enum・表示ラベルには定義済みだが実質到達不能コードパスである `DRAFT` ステータスを実際に機能させ、予約の下書き保存・再編集・正式申請・一覧表示・アクセス制御を実現する（Issue #30、ビジネス要求シート `docs-next/docs/spec/enhancements/intermediate/reservation-draft.md`）
- **Request Type**: Enhancement（既存の未使用コードパスの実装）
- **Scope Estimate**: Multiple Components（frontend + backend 両方）
- **Complexity Estimate**: Moderate〜Complex（ステータス遷移ロジックの再利用設計、承認ステップ生成条件の分岐、ステータス別アクセス制御の強化が絡む）

## 機能要件

| # | 要件 |
|---|------|
| RSV-01 | `POST /api/reservations` に下書き保存オプションを追加し、`"draft": true` を指定するとステータス `DRAFT` で予約を作成する |
| RSV-02 | `DRAFT` ステータスの予約は承認フローに流れない（`approval_steps` が作成されない）。申請者本人（およびADMIN）のみが閲覧・編集・削除できる |
| RSV-03 | `PUT /api/reservations/{id}` で `DRAFT` → `PENDING`/`APPROVED` への遷移（正式申請）をサポートする |
| RSV-04 | 予約申請フォームに「下書き保存」ボタンを追加する |
| RSV-05 | 予約一覧の「下書き」タブまたはフィルタで `DRAFT` 予約を確認できる |

## 決定事項（Requirements Analysis で確定）

### 1. 新規作成時の状態遷移

```
POST /api/reservations
  if draft == true:
    status = DRAFT
    approval_steps は作成しない（resource.requiresApproval の値に関わらず）
  else（従来どおり）:
    status = resource.requiresApproval ? PENDING : APPROVED
    resource.requiresApproval == true の場合のみ approval_steps を作成する
```

`CreateReservationRequest` に `draft`（boolean、既定値 `false`、任意項目）を追加する。

### 2. DRAFT → PENDING の状態遷移（正式申請）

**決定：正式申請時は、新規作成時と同じ判定ロジック（`resource.requiresApproval`）を再実行してステータスを確定する。**「常に `PENDING` 固定」ではない。

- **理由**：常に `PENDING` 固定にすると、承認不要リソース（`requires_approval=false`）の下書きを正式申請した場合、`approval_steps` が存在しないまま `PENDING` に留まり続け、誰にも承認されない状態になる（既存のPENDING/APPROVEDとrequires_approvalの1対1対応が崩れる）。新規作成時と同じロジックを再実行すれば、この矛盾を避けられる

```
PUT /api/reservations/{id}（本人のみ、status == DRAFT の場合のみ submit 可）
  submit == true の場合:
    status = resource.requiresApproval ? PENDING : APPROVED
    resource.requiresApproval == true の場合のみ approval_steps を作成する
  submit == false または未指定の場合:
    内容（startAt/endAt/purpose/attendeesCount）のみ更新し、status は DRAFT のまま
```

`UpdateReservationRequest` に `submit`（boolean、既定値 `false`、任意項目）を追加する。新規エンドポイントは追加しない（既存の `PUT /api/reservations/{id}` を拡張する）。

既存のステータスガード（`status != PENDING` なら一律422）を、「`status == PENDING`」または「`status == DRAFT` かつ本人」のいずれかを許可するよう拡張する。`DRAFT` 時に `submit=false` で更新する場合は `DRAFT` のまま維持し、`submit=true` の場合のみ上記の遷移を行う。

### 3. approval_steps 作成条件（統一ルール）

**決定：`approval_steps` は「ステータスが `PENDING` になる瞬間」にのみ作成する。**これは新規作成時に直接 `PENDING` になる場合と、`DRAFT` から正式申請で `PENDING` になる場合の両方に共通のルールとする。`DRAFT` 作成時・`DRAFT` のまま更新する場合には一切作成しない。

- 新規作成かつ `draft=false` かつ `requiresApproval=true` → 作成する
- 新規作成かつ `draft=true` → 作成しない（RSV-02）
- 正式申請（`submit=true`）かつ `requiresApproval=true` → 作成する
- 上記以外（`APPROVED` になる場合、`DRAFT` のまま更新する場合等） → 作成しない

### 4. DRAFT 一覧の取得方法

**決定：予約一覧のデフォルト表示（ステータス未指定の「すべて」タブ）からは `DRAFT` を除外する。** `DRAFT` は専用の「下書き」タブ（`?status=DRAFT`）でのみ表示する。

- **実装方針**：バックエンドの一覧API自体は変更しない（既存の複数ステータス指定フィルタ機能をそのまま使う）。フロントエンドの「すべて」タブのリンクを、ステータス未指定ではなく `?status=PENDING&status=APPROVED&status=REJECTED&status=CANCELLED`（`DRAFT` を除く4ステータスを明示指定）に変更し、別途「下書き」タブ（`?status=DRAFT`）を追加する
- **理由**：バックエンドAPIの「フィルタなし＝全件」という既存の一貫した挙動を変えずに済み、変更をフロントエンドの表示ロジックに閉じ込められる

### 5. 他人の DRAFT を見せない制御

**決定：`DRAFT` は申請者本人または `ADMIN` のみ閲覧・編集・削除（キャンセル）できる。`APPROVER` であっても本人でなければ `PENDING`/`APPROVED` 等とは異なり閲覧できない（403）。**

- **詳細取得（`GET /api/reservations/{id}`）**：既存の `checkReadAccess` は `MEMBER` のみ本人チェックを行い、`ADMIN`/`APPROVER` は無条件に全件閲覧可という role ベースの判定（`ReservationService.java` の Javadoc「MEMBER は本人の予約のみ参照可。ADMIN / APPROVER は全件可。」に明記）。対象予約が `DRAFT` の場合はこの判定を拡張し、`APPROVER` の閲覧許可を無効化する（本人または `ADMIN` のみ通過）
- **一覧取得（`GET /api/reservations`）**：`list` メソッドは `isAdmin`（`Role.ADMIN` か否か）のみで分岐しており、**`APPROVER` は `MEMBER` と同じく `requesterId` スコープ（本人の予約のみ）のクエリが使われている**（既存実装の確認済み事実。`checkReadAccess` の「APPROVERは全件可」という単一取得時の挙動とは異なる）。したがって一覧取得については `APPROVER` 向けの追加対応は不要（既に本人の予約以外は返らないため、他人の `DRAFT` も自然に含まれない）。`ADMIN` のみ既存どおり全件対象（`DRAFT` を含む、受入条件の「ADMIN は除く」と整合）

## 非機能要件

| # | 要件 |
|---|------|
| NFR-01 | `DRAFT` 作成時も通常の予約申請と同じ入力必須項目（`resourceId`・`startAt`・`endAt`・`purpose`）を維持する。バリデーションを緩和しない |
| NFR-02 | 「削除」（RSV-02）は新規の物理削除APIを追加せず、既存のキャンセル機構（`CANCELLED` への状態遷移、`cancelReservationAction`/`CancelButton`）を `DRAFT` にも適用する |
| NFR-03 | 既存のステータス遷移（`PENDING`→`APPROVED`/`REJECTED`、`PENDING`/`APPROVED`→`CANCELLED`）の挙動・既存テストを壊さない |

## 拡張設定（いずれも不採用）

| Extension | Enabled | 理由 |
|---|---|---|
| Security Baseline | No | 本課題はDRAFTのアクセス制御を扱うが、既存の所有者チェックパターン（`checkReadAccess`等）を拡張するのみで、新たな認証方式・暗号化等の基盤変更はない |
| Resiliency Baseline | No | 既存のトランザクション・標準例外処理パターンで十分。新たな耐障害性要求はない |
| Property-Based Testing | No | 状態遷移の組み合わせは有限（DRAFT/PENDING/APPROVED/REJECTED/CANCELLED×操作）であり、例挙テストで十分カバーできる |

## 受入条件（ビジネス要求シートより。真実の源として再掲のみ）

- [ ] 「下書き保存」ボタンをクリックすると、`DRAFT` ステータスで予約が保存される
- [ ] 下書きは予約一覧（`/reservations`）の `DRAFT` フィルタで表示される
- [ ] 下書き詳細ページ（`/reservations/{id}`）から再編集・正式申請（`PENDING` に変更）ができる
- [ ] 下書き予約は承認一覧（`/approvals`）に表示されない
- [ ] 申請者本人以外が `DRAFT` 予約の詳細にアクセスすると 403 が返る（ADMIN は除く）
- [ ] バックエンドのステータス遷移テストに `DRAFT` → `PENDING` のケースを追加する

## 影響ファイル（Reverse Engineering の一次見立てを決定事項に基づき確定）

### バックエンド
- `backend/.../presentation/dto/CreateReservationRequest.java`：`draft`（boolean、任意）追加
- `backend/.../presentation/dto/UpdateReservationRequest.java`：`submit`（boolean、任意）追加
- `backend/.../application/ReservationService.java`：`create`（draft分岐・ステータス決定の共通化）、`update`（ステータスガード拡張、DRAFT→PENDING/APPROVED遷移、approval_steps作成条件の統一）、`checkReadAccess`（DRAFT時のAPPROVER除外）。`list`は変更不要（確認済み：APPROVERは既にrequesterIdスコープのため他人のDRAFTは混入しない）
- `backend/.../presentation/ReservationController.java`：Javadocの整合（既存コメントがRSV-01文言と異なる）

### フロントエンド
- `frontend/src/lib/schemas/reservation.ts`：`CreateReservationSchema`に`draft`、`UpdateReservationSchema`に`submit`追加
- `frontend/src/server/actions/reservations.ts`：`createReservationAction`・`updateReservationAction`が新フィールドを中継
- `frontend/src/app/(authenticated)/reservations/new/ReservationForm.tsx`：「下書き保存」ボタン追加
- `frontend/src/app/(authenticated)/reservations/page.tsx`：「すべて」タブを非DRAFT4ステータス明示指定に変更、「下書き」タブ追加
- `frontend/src/app/(authenticated)/reservations/[id]/page.tsx`：`canEdit`・`canCancel`判定にDRAFT対応を追加、「正式申請」導線の追加
- `frontend/src/app/(authenticated)/reservations/[id]/edit/page.tsx`：アクセス制御にDRAFT許可を追加
- `frontend/src/app/(authenticated)/reservations/[id]/edit/ReservationEditForm.tsx`：「正式申請」ボタン追加（`submit=true`で送信）

### spec
- `docs-next/docs/spec/api-spec.md`・`requirements.md`・`er-diagram.md`：「DRAFTはベース実装では未使用」という記述の更新（`/update-spec`で対応）

### テスト
- `ReservationServiceTest.java`・`ReservationControllerTest.java`：DRAFT作成・DRAFT→PENDING/APPROVED遷移・承認ステップ作成条件・アクセス制御（403）のテストケース追加
- フロントエンド：`reservation-form.test.tsx`（下書き保存ボタン）、`server/actions/reservations.test.ts`（draft/submitパラメータ中継）、予約一覧・詳細・編集画面のテスト追加

## スコープ外

- 新規の物理削除（DELETE）APIの追加（NFR-02の決定どおり既存キャンセル機構を転用）
- DRAFT作成時のバリデーション緩和（NFR-01の決定どおり通常と同じ必須項目を維持）
- 複数段階承認フロー等、承認フロー自体の変更（本課題はDRAFT⇔PENDING遷移のみを対象とする）
