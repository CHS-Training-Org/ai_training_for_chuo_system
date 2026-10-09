# 要件確認質問 — 予約の下書き保存

**対象**: `docs-next/docs/spec/enhancements/intermediate/reservation-draft.md`
**ステージ**: INCEPTION / Requirements Analysis
**作成日時**: 2026-10-02T11:02:40+00:00

要求シートの読み取りと実コードの確認から、仕様を確定させるために解消が必要な論点を挙げる。
Q1 から Q4 はチャットの選択肢で回答いただく。Q5 以降は推奨案を併記しているので、異論があれば回答で指摘いただきたい。

---

## Q1: `DRAFT` 予約を閲覧できるロール

要求シートの中で記述が食い違っている。

- 要件 RSV-02：「申請者本人のみが閲覧・編集・削除できる」
- 受入条件：「申請者本人以外が `DRAFT` 予約の詳細にアクセスすると 403 が返る（**ADMIN は除く**）」

前者は ADMIN も閲覧不可と読め、後者は ADMIN を例外としている。

実装の現状（`ReservationService.checkReadAccess`）では、MEMBER だけが本人の予約に限定され、ADMIN と APPROVER は全予約を閲覧できる。
したがって APPROVER の扱いも決める必要がある。APPROVER が `DRAFT` を閲覧できる状態は、RSV-02 の「承認フローに流れない」という意図と整合しない。

- **A) ADMIN は閲覧可、APPROVER と他の MEMBER は 403**（推奨）
  受入条件の括弧書きに合わせる。`checkReadAccess` に「`DRAFT` は本人または ADMIN のみ」という分岐を足す。
- **B) 本人のみ閲覧可。ADMIN も APPROVER も 403**
  RSV-02 の字句どおり。ただし ADMIN が全予約を見られるという既存の権限モデルに例外ができる。
- **C) 既存の権限モデルを変えない。ADMIN と APPROVER は `DRAFT` も閲覧可**
  実装は最小になるが、受入条件の「本人以外は 403」を満たさない。

[Answer]: A（2026-10-02 回答）

---

## Q2: 下書きで必須とする入力項目

要求シートの背景は「フォーム入力途中の予約を `DRAFT` として保存し」と述べているが、
現在のスキーマ（`V001__create_initial_schema.sql`）は下書きの途中保存を許さない作りになっている。

```sql
start_at        TIMESTAMP    NOT NULL,
end_at          TIMESTAMP    NOT NULL,
purpose         VARCHAR(255) NOT NULL,
CONSTRAINT chk_reservations_time CHECK (end_at > start_at)
```

利用目的・開始日時・終了日時が未入力の下書きを保存するには、これらの制約を外す Flyway マイグレーションが必要になる。
一方、受入条件には途中保存に触れた項目がなく、「`DRAFT` ステータスで予約が保存される」としか書かれていない。

- **A) 通常の予約申請と同じ必須項目を要求する**（推奨）
  下書きは「正式申請の前に内容を確定させずに取り置く」ための状態と位置づける。マイグレーション不要で、工数見積り（半日から1日）とも整合する。
- **B) 必須項目を緩和し、未入力のまま保存できるようにする**
  背景の記述に忠実だが、`NOT NULL` と CHECK 制約を外すマイグレーションが必要になる。
  加えて、一覧・詳細画面が日時や目的の欠損を表示できるようにする改修と、正式申請時に全項目を再検証する仕組みが要る。工数は1日を超える見込み。

[Answer]: A（2026-10-02 回答）

---

## Q3: 下書きの削除を今回のスコープに含めるか

RSV-02 は「申請者本人のみが閲覧・編集・**削除**できる」と述べているが、受入条件に削除の項目はない。
現在の API には削除エンドポイントがなく、`POST /api/reservations/{id}/cancel` も `PENDING` と `APPROVED` のみを対象としている。

- **A) 今回は含めない**（推奨）
  受入条件に沿ってスコープを絞る。削除は別課題として切り出す。
- **B) 含める。`DELETE /api/reservations/{id}` を新設する**
  下書きの物理削除。RSV-02 の字句を満たすが、API 仕様と権限マトリクスの追加が必要。
- **C) 含める。既存のキャンセルを `DRAFT` にも許可する**
  `CANCELLABLE_STATUSES` に `DRAFT` を加え、`CANCELLED` に遷移させる。新規エンドポイント不要だが、「下書きの破棄」が履歴に残る。

[Answer]: A（2026-10-02 回答）

---

## Q4: AI-DLC 成果物の配置

前回のワークフロー（`resource-keyword-search`）の成果物が、タスク名を含まない汎用パスに置かれている。

- `inception/requirements/requirements.md`
- `inception/user-stories/stories.md`、`personas.md`
- `inception/plans/execution-plan.md`
- `construction/build-and-test/` 配下

今回の成果物を同じパスに書くと、前回分が上書きされ、このブランチの差分に無関係な変更として現れる。

- **A) タスク名のディレクトリで分ける**（推奨）
  `inception/requirements/reservation-draft/requirements.md` のように1段挟む。`construction/reservation-draft/` という既存の命名と揃う。前回分はそのまま残る。
- **B) 汎用パスを上書きする**
  前回分は git 履歴（PR #116 でマージ済み）から復元できる。差分は増えるが、常に最新のワークフローだけが作業ツリーに残る。

[Answer]: A（2026-10-02 回答）

---

## Q5: 拡張ルールの適用（AI-DLC 標準の opt-in 質問）

前回ワークフローではいずれも opt-out だった。今回も同じ判断を引き継ぐことを推奨する。
異論があれば指摘いただきたい。

### Q5-1: Security Baseline

セキュリティ拡張ルールをこのプロジェクトで強制するか。

- **A) Yes。SECURITY ルールをすべて必須制約として強制する**
- **B) No。SECURITY ルールを適用しない**（推奨・前回を踏襲）
  本課題の権限制御は既存の予約ドメインの権限モデルの延長であり、BookFlow は学習用アプリケーションのため。

[Answer]: B

### Q5-2: Resiliency Baseline

AWS Well-Architected Framework（信頼性の柱）由来の回復性ベースラインを適用するか。

- **A) Yes。設計時の指針として適用する**
- **B) No。適用しない**（推奨・前回を踏襲）
  新規のインフラ構成要素や外部連携がないため。

[Answer]: B

### Q5-3: Property-Based Testing

プロパティベーステストのルールを強制するか。

- **A) Yes。すべてに強制する**
- **B) Partial。純粋関数とシリアライズの往復のみに適用する**
- **C) No。適用しない**（推奨・前回を踏襲）
  本課題の中心はステータス遷移の分岐であり、JUnit のパラメータ化テストで網羅できる範囲のため。

[Answer]: C

---

## Q6: ステータス遷移バリデーションの実装場所

要求シートの「AI 活用ポイント」が相談事項として挙げている論点。
Service 層とドメイン層のどちらに `DRAFT` から `PENDING` への遷移ルールを置くか。

既存実装では、ステータスガード（更新は `PENDING` のみ、キャンセルは `PENDING` と `APPROVED` のみ）はすべて `ReservationService` に置かれており、
`Reservation` エンティティは `cancel()` のように状態を書き換えるメソッドだけを持つ。

- **推奨**: 既存の配置に合わせ、遷移の可否判定は `ReservationService` に置く。
  エンティティには `submit()` のような状態遷移メソッドを足し、判定そのものは Service が行う。
  レイヤーをまたぐ設計変更を今回の課題に持ち込まないため。

この論点は Functional Design ステージで設計案として提示する。現時点で別の方針を希望する場合は指摘いただきたい。

[Answer]:

---

## Q7: 権限チェックの実装方式

要求シートの「AI 活用ポイント」は Spring Security の `@PreAuthorize` での実装を挙げているが、
`ReservationController` の Javadoc には「行レベルの所有権チェック（本人 or ADMIN）は `ReservationService` が担当する（`@PreAuthorize` 不使用）」と明記されている。

- **推奨**: 既存方針どおり `ReservationService` で判定する。
  `@PreAuthorize` は SpEL 式の中で予約の所有者を解決する必要があり、リポジトリ呼び出しを式に埋め込むことになる。
  既存の5つのエンドポイントがすべて Service 層で判定している中で、下書きだけ方式を変えると権限ルールの所在が分散する。

要求シートの記述と既存コードの方針が食い違っているため、ここで確認しておく。別の方針を希望する場合は指摘いただきたい。

[Answer]:

---

## Q8: 正式申請（`DRAFT` から `PENDING`）の API 設計

RSV-03 は `PUT /api/reservations/{id}` でこの遷移をサポートすると述べているが、リクエストボディでの指定方法までは定めていない。

- **推奨**: `UpdateReservationRequest` に省略可能な `status` フィールドを追加し、`"PENDING"` が指定されたときのみ遷移させる。
  省略時は従来どおり内容のみの更新とする。`DRAFT` 以外からの遷移指定、および `PENDING` 以外の値は 422 で拒否する。
  正式申請の時点で重複予約チェックと承認ステップ生成を実行する（下書きの保存時には実行しない）。

別案として `POST /api/reservations/{id}/submit` の新設も考えられるが、RSV-03 が `PUT` を名指ししているため推奨しない。

[Answer]:

---

## 補足: 確認済みの事実

回答の前提として、実コードで検証した内容を記しておく。

- `DRAFT` は `V001__create_initial_schema.sql:55` の CHECK 制約に定義済み。backend の `ReservationStatus`、frontend の `enums.ts` と `labels.ts` にも存在する。Q2 で A を選ぶ場合、Flyway マイグレーションは不要。
- 予約一覧画面の `ALL_STATUSES` が `DRAFT` を含まないため、RSV-05 のタブ追加はこの配列への追加で足りる。`GET /api/reservations` の `status` パラメータは既に複数ステータスを受け付ける。
- 重複予約チェックの対象は `PENDING` と `APPROVED`（`OCCUPIED_STATUSES`）。`DRAFT` は時間帯を占有しないため、この定数の変更は不要。
- 要求シートが競合課題として挙げる「予約一覧のフィルタ拡張」は未着地のため、競合は発生しない。
