# 要件定義 — 予約の下書き保存

**対象シート**: `docs-next/docs/spec/enhancements/intermediate/reservation-draft.md`
**ユニット名**: `reservation-draft`
**Issue**: #30
**作成日時**: 2026-10-02T11:02:40+00:00
**確認質問の回答**: [`requirement-verification-questions.md`](./requirement-verification-questions.md)

---

## 1. 意図分析

| 項目 | 判定 |
|---|---|
| ユーザー要求 | 予約申請を完了前に `DRAFT` として保存し、後から再編集・正式申請できるようにする |
| 要求の種別 | Enhancement（既存機能 UC-03 予約申請・管理の拡張） |
| 要求の明確さ | Clear（ビジネス要求シートに要件と受入条件が明記されている。矛盾2点は確認質問で解消済み） |
| スコープ | Multiple Components（backend の presentation / application / domain、frontend の3画面） |
| 複雑さ | Moderate（新規コンポーネントはないが、ステータス遷移と権限のルールが既存の分岐に絡む） |
| 要件定義の深度 | Standard |

### 既存実装の確認結果

実コードで検証した事実を前提として記録する。

- `DRAFT` は `V001__create_initial_schema.sql:55` の CHECK 制約に定義済み。`ReservationStatus`（backend）、`enums.ts` と `labels.ts`（frontend）にも存在する。**Flyway マイグレーションは不要**。
- 承認待ち一覧（`ApprovalService.listPending`）は `approval_steps` のみを参照する。`DRAFT` で承認ステップを作らなければ、承認一覧に現れないという受入条件は自動的に満たされる。
- 重複予約チェックの対象は `PENDING` と `APPROVED`（`OCCUPIED_STATUSES`）。`DRAFT` は時間帯を占有しないため、この定数は変更しない。
- 予約一覧画面の `ALL_STATUSES` が `DRAFT` を含まない。`GET /api/reservations` の `status` パラメータは既に複数ステータスを受け付けるため、backend の一覧 API に変更は要らない。
- 行レベルの権限判定は `ReservationService` に集約されており、`ReservationController` は `@PreAuthorize` を使わない。

---

## 2. 機能要件

### FR-01: 下書きとしての予約作成

要求シート RSV-01 に対応する。

`POST /api/reservations` のリクエストボディに省略可能な論理値 `draft` を追加する。
`draft` が `true` のとき、リソースの `requires_approval` の値にかかわらずステータス `DRAFT` で予約を作成する。
省略時および `false` のときは従来どおりの振る舞い（`requires_approval` が `false` なら `APPROVED`、`true` なら `PENDING`）とする。

下書きの作成時には重複予約チェックを行わない。
下書きは時間帯を占有せず、同じ時間帯に複数の案を並べて検討する余地を残すため。
重複の判定は正式申請の時点（FR-04）で行う。

### FR-02: 下書きは承認フローに流れない

要求シート RSV-02 の前半に対応する。

`DRAFT` で作成した予約に対しては `approval_steps` を生成しない。
現在の `ReservationService.create` は `resource.isRequiresApproval()` だけを条件に `ApprovalService.createInitialStep` を呼ぶため、`DRAFT` を除外する条件を加える。

承認待ち一覧（`/approvals`）は `approval_steps` を参照するため、ステップを作らないことで「下書きは承認一覧に表示されない」という受入条件を満たす。承認側のコードに変更は要らない。

### FR-03: 下書きの閲覧権限

要求シート RSV-02 の後半と受入条件に対応する。確認質問 Q1 の回答（選択肢 A）に基づく。

`DRAFT` の予約を閲覧できるのは、申請者本人と ADMIN に限る。
APPROVER を含むそれ以外のユーザーがアクセスした場合は 403 を返す。

現在の `ReservationService.checkReadAccess` は MEMBER のみを本人の予約に限定し、ADMIN と APPROVER には全予約の閲覧を許している。
`DRAFT` のときだけ APPROVER も除外する分岐を加える。
APPROVER が下書きを閲覧できる状態は、FR-02 の「承認フローに流れない」という位置づけと整合しないため。

### FR-04: 下書きの編集と正式申請

要求シート RSV-03 に対応する。

`PUT /api/reservations/{id}` の更新可能ステータスに `DRAFT` を加える。
現在は `PENDING` のみを許しているステータスガードを、`DRAFT` と `PENDING` の2つに広げる。
更新の権限は従来どおり申請者本人のみとし、ADMIN にも更新を許さない（既存の権限マトリクスを維持する）。

正式申請は、リクエストボディに省略可能な `status` フィールドを追加して表す。
`"PENDING"` が指定され、かつ現在のステータスが `DRAFT` のときに限り遷移を実行する。
省略時は内容のみの更新とし、ステータスは変えない。

正式申請の時点で次の3つを実行する。

1. 重複予約チェック（FR-01 で下書き保存時に省いた判定をここで行う）
2. ステータスを `PENDING` にする。リソースの `requires_approval` の値によらない
3. `requires_approval` が `true` の場合のみ `approval_steps` の生成

不正な遷移は 422 で拒否する。対象は、`DRAFT` 以外のステータスからの遷移指定、および `PENDING` 以外の値の指定である。

### FR-05: 予約申請フォームの下書き保存ボタン

要求シート RSV-04 に対応する。

`/reservations/new` のフォームに「下書き保存」ボタンを追加する。
既存の申請ボタンと並べて配置し、押下時は `draft` を `true` として送信する。

入力項目の必須条件は通常の申請と変えない（確認質問 Q2 の回答、選択肢 A）。
リソース・開始日時・終了日時・利用目的がすべて揃っていることを、下書き保存でも要求する。

### FR-06: 予約一覧の下書きフィルタ

要求シート RSV-05 に対応する。

`/reservations` のステータスフィルタのタブに「ドラフト」を追加する。
画面の `ALL_STATUSES` に `DRAFT` を加える変更で足り、`GET /api/reservations` 側の変更は要らない。

### FR-07: 予約詳細画面の下書き操作

受入条件の「下書き詳細ページから再編集・正式申請ができる」に対応する。

`/reservations/{id}` で、ステータスが `DRAFT` かつ申請者本人の場合に次の導線を表示する。

- 編集ボタン。現在は `PENDING` のときのみ表示している条件に `DRAFT` を加える
- 正式申請ボタン。`status` を `"PENDING"` として `PUT` を呼ぶ

キャンセルボタンは `DRAFT` では表示しない。下書きの破棄は今回のスコープ外のため（FR-S01）。

---

## 3. 非機能要件

### NFR-01: 既存アーキテクチャの踏襲

- backend は4レイヤー（domain / application / presentation / infrastructure）を維持する。
- ステータス遷移の可否判定は `ReservationService` に置く（確認質問 Q6 の推奨案）。既存のステータスガードがすべて Service 層にあり、`Reservation` エンティティは状態を書き換えるメソッドだけを持つという構成に合わせる。
- 権限判定も `ReservationService` に置き、`@PreAuthorize` は使わない（確認質問 Q7 の推奨案）。要求シートの「AI 活用ポイント」は `@PreAuthorize` での実装を挙げているが、`ReservationController` の Javadoc が明記するとおり、既存の5エンドポイントはすべて Service 層で判定している。下書きだけ方式を変えると権限ルールの所在が分散する。
- frontend は Server Components を優先し、クライアント状態を増やさない。

### NFR-02: テスト

- `ReservationServiceTest` に `DRAFT` から `PENDING` への遷移ケースを追加する（受入条件に明記）。
- 不正遷移（`APPROVED` からの遷移指定、`PENDING` 以外の値）が 422 になることを検証する。
- `DRAFT` 作成時に `approval_steps` が生成されないことを検証する。
- 本人以外（APPROVER を含む）が `DRAFT` の詳細にアクセスすると 403 になり、ADMIN は 200 になることを `ReservationControllerTest` で検証する。
- frontend は既存の Vitest ユニットテストに下書き保存とフィルタの分岐を追加する。

### NFR-03: 既存フローへの非回帰

`draft` と `status` をいずれも省略可能なフィールドとして追加することで、既存のリクエストの振る舞いを変えない。
既存の予約申請・更新・キャンセル・承認のテストがすべて通ることを確認する。

### NFR-04: 適用しない拡張ルール

確認質問 Q5 のとおり、Security Baseline・Resiliency Baseline・Property-Based Testing はいずれも適用しない。
本課題の権限制御は既存の予約ドメインの権限モデルの延長であり、新規のインフラ構成要素や外部連携もない。
ステータス遷移の分岐は JUnit のパラメータ化テストで網羅できる。

---

## 4. スコープ外

### FR-08: 下書きの削除（2026-10-09 追加）

当初は確認質問 Q3 の回答（選択肢 A）によりスコープ外としていたが、AI レビュー（観点1）が要求シート RSV-02 の「削除できる」が未実装であることを NG の根拠としたため、学習者の判断でスコープに含めた。

`DELETE /api/reservations/{id}` を新設する。
対象は `DRAFT` の予約に限り、操作できるのは申請者本人のみとする。ADMIN も削除できない。
レコードごと削除する。確定前の予約に履歴を残す必要がないため。
`DRAFT` 以外を指定した場合は 422 を返す。確定済みの予約はキャンセルで `CANCELLED` に遷移させて履歴を残す。

### FR-S02: 入力途中の保存

確認質問 Q2 の回答（選択肢 A）に基づく。
`purpose` と `start_at` と `end_at` の `NOT NULL`、および `end_at > start_at` の CHECK 制約を外すマイグレーションが必要になり、一覧・詳細画面の欠損表示対応も伴う。工数見積り（半日から1日）に収まらない。

### FR-S03: スキーマ変更

`DRAFT` は既存の CHECK 制約に含まれるため、Flyway マイグレーションを追加しない。

---

## 5. 受入条件との対応

| 受入条件 | 対応する要件 |
|---|---|
| 「下書き保存」ボタンで `DRAFT` ステータスの予約が保存される | FR-01、FR-05 |
| 下書きが予約一覧の `DRAFT` フィルタで表示される | FR-06 |
| 下書き詳細ページから再編集・正式申請ができる | FR-04、FR-07（下記の注記を参照） |
| 下書き予約が承認一覧に表示されない | FR-02 |
| 申請者本人以外が `DRAFT` の詳細にアクセスすると 403（ADMIN は除く） | FR-03 |
| ステータス遷移テストに `DRAFT` から `PENDING` のケースを追加 | NFR-02 |

---

## 6. 仕様書への反映（Spec Update ステージで実施）

| ファイル | 更新内容 |
|---|---|
| `docs-next/docs/spec/api-spec.md` | `POST /api/reservations` に `draft` フラグ。`PUT /api/reservations/{id}` に `status` フィールドと `DRAFT` の更新許可。権限マトリクスに `DRAFT` の閲覧ルール |
| `docs-next/docs/spec/screen-spec.md` | `/reservations/new` の下書き保存ボタン。`/reservations` の `DRAFT` タブ。`/reservations/{id}` の下書き時の操作 |
| `docs-next/docs/spec/requirements.md` | 予約ステータス遷移に `DRAFT` の遷移パターン |

ER 図（`er-diagram.md`）はスキーマを変更しないため更新しない。

---

## 7. 正式申請の遷移先に関する判断の経緯

2026-10-02 の時点では、正式申請後のステータスを `requires_approval` に応じて `PENDING` または `APPROVED` に決める設計としていた。
`requires_approval` が `false` のリソースでは承認ステップを生成しないため、`PENDING` に固定すると
承認一覧（`/approvals`）から到達できないまま予約が滞留し、キャンセル以外に進む手段がなくなるためである。

2026-10-09 の AI レビュー（観点1）は、この設計を受入条件「正式申請（`PENDING` に変更）ができる」からの逸脱として NG と判定した。
レビューは「理由の妥当性は判定に使わない。シートの受入条件が改訂されない限り条件と異なる挙動として扱う」としている。

学習者の判断により、**実装をシートに合わせることとした**（研修の目的がシートどおりに実装することにあるため、シートの改訂は選ばない）。
正式申請の遷移先は `requires_approval` の値によらず `PENDING` とする。

### 残る既知の制約

この変更により、`requires_approval = false` のリソースを下書きから正式申請すると、
承認ステップが生成されないまま `PENDING` になる。
この予約は承認待ち一覧に現れず承認できないため、キャンセル以外に進む手段がない。

承認不要のリソースは通常の申請（`POST`）で即時確定するのが本来の経路であり、
下書きを経由する運用は要件として想定されていない。
解消には要件の変更が必要である。
この制約は `api-spec.md` と `requirements.md`（仕様書側）、および実装のコメントに明記した。

---

## 8. 再点検で判明した実装上の注意

受入条件を実コードに突き合わせた際に判明した事項を、Code Generation の計画に織り込むために記録する。

### 403 の画面表示

frontend にエラーバウンダリ（`error.tsx`）が存在せず、`getReservationAction` が投げる `ApiClientError` は未捕捉のまま Next.js の既定エラー画面に出る。
これは他人の予約にアクセスした場合の既存挙動と同一であり、本課題で生じる回帰ではない。
受入条件「本人以外は 403 が返る」を検証できるのは backend のテスト（`ReservationControllerTest`）である。
エラーバウンダリの追加は本課題のスコープに含めない。

### 予約編集画面の修正箇所

`DRAFT` を編集可能にするには、`frontend/src/app/(authenticated)/reservations/[id]/edit/page.tsx` の3箇所を直す。

1. `reservation.status !== "PENDING"` で `notFound()` する条件（28行目）
2. 画面の説明文「承認待ち（PENDING）の予約の日時・目的・参加人数を変更できます。」
3. ファイル冒頭の Javadoc コメント「`PENDING` 以外の予約は編集対象外」

### `status` フィールドの波及範囲

`PUT` のリクエストに `status` を足す変更は、backend の DTO だけでは完結しない。
Zod スキーマは `'use server'` ファイルからエクスポートできないという Next.js の制約で `lib/schemas/reservation.ts` に分離されているため、次の4箇所に波及する。

1. `UpdateReservationRequest`（backend の DTO）
2. `UpdateReservationSchema`（frontend の Zod スキーマ）
3. `UpdateReservationInput`（スキーマから導出される型）
4. `updateReservationAction`（Server Action）

正式申請ボタンが `updateReservationAction` を再利用するか専用の Server Action を設けるかは、Functional Design で決める。
