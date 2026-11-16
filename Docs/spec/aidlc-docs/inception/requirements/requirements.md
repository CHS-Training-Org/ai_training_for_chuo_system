# Requirements — 予約の下書き保存

## Intent Analysis

- **User Request**: `docs-next/docs/spec/enhancements/intermediate/reservation-draft.md` の要求を分析し、AI-DLC で実行計画を立てる
- **Request Type**: Enhancement（既存の予約申請フローへの機能追加。UC-03 の拡張）
- **Scope Estimate**: Multiple Components（バックエンド4層のうち presentation / application / domain、フロントエンドの予約フォーム・一覧・詳細・編集・Server Actions、関連 spec 4点）
- **Complexity Estimate**: Moderate（新規テーブルなし・DB スキーマ変更なし。ただし権限分岐、状態遷移、承認ステップ生成の条件分岐が絡む）
- **Requirements Depth**: Standard（シートに要件と受入条件があるため、シート内の矛盾・空白の解消と実装方式の確定を中心に行う）

## Source

- ビジネス要求シート: `docs-next/docs/spec/enhancements/intermediate/reservation-draft.md`
- 既存実装の把握: `Docs/spec/aidlc-docs/inception/reverse-engineering/reservation-domain.md`

## Extension Configuration（確定）

| Extension | Enabled | 理由 |
|---|---|---|
| Security Baseline | No | 学習用チュートリアルのため。権限チェックは本書の FR-05 で個別に定義する |
| Resiliency Baseline | No | 可用性・DR の要件がない |
| Property-Based Testing | No | 状態遷移は例示ベースの JUnit テストで網羅できる |

## 確定事項（確認質問の回答）

| 論点 | 決定 | 影響 |
|---|---|---|
| 他人の下書きの閲覧 | 本人と ADMIN のみ閲覧可。APPROVER と他の MEMBER は 403 | シートの RSV-02（本人のみ）と受入条件（ADMIN は除く）の食い違いは、受入条件に合わせて解消する。RSV-02 の記述は spec 更新時に直す |
| 下書きの必須項目 | 現行の必須項目（リソース・開始日時・終了日時・利用目的）を満たす入力のみ保存可 | DB スキーマ変更なし。Flyway 追加なし |
| 重複チェックの時期 | 正式申請時のみ | 下書き保存では検査しない。下書きは時間帯を占有しない（既存の `OCCUPIED_STATUSES` は変更しない） |
| 正式申請の遷移先 | リソースの `requires_approval` で決定 | 要承認なら `PENDING` + 承認ステップ生成、承認不要なら `APPROVED`。受入条件の「`PENDING` に変更」は要承認リソースの場合と読み替える |
| 下書きの削除 | `DELETE /api/reservations/{id}` を新設し物理削除 | API・画面・テスト・仕様の追加が必要。シートの影響範囲に無い追加スコープ |

## Functional Requirements

| # | 要件 | 由来 |
|---|------|------|
| FR-01 | `POST /api/reservations` が `draft: true`（省略時は `false`）を受け取り、`true` のときステータス `DRAFT` で予約を作成する。このとき重複チェックと `approval_steps` 生成は行わない。必須項目の検証は通常申請と同一 | RSV-01 |
| FR-02 | `DRAFT` 予約は `approval_steps` を持たず、承認一覧（`/approvals`）に表示されない | RSV-02 |
| FR-03 | `PUT /api/reservations/{id}` が `DRAFT` 予約を更新できる。更新のみの場合は `DRAFT` のまま。正式申請を指示する項目（名称は spec 更新時に確定。仮称 `submit: true`）を受け取ったとき、重複チェック（自己除外）を行い、`requires_approval=true` なら `PENDING` へ遷移して承認ステップを生成、`false` なら `APPROVED` へ遷移する | RSV-03 |
| FR-04 | `DELETE /api/reservations/{id}` を新設する。`DRAFT` 予約のみ、申請者本人のみ物理削除できる（成功は 204）。`DRAFT` 以外は 422、本人以外は 403 | RSV-02（削除） |
| FR-05 | `DRAFT` 予約の権限: 閲覧（`GET /api/reservations/{id}`）は本人と ADMIN のみ可（APPROVER・他の MEMBER は 403）。更新・正式申請・削除は本人のみ可（ADMIN も 403）。一覧は既存どおり本人分のみ（ADMIN は全件）で、ADMIN の全予約一覧に他人の下書きも含まれる | RSV-02・受入条件 |
| FR-06 | 予約申請フォーム（`/reservations/new`）に「下書き保存」ボタンを追加する。押下で `draft: true` として保存し、予約一覧へ遷移する | RSV-04 |
| FR-07 | 予約一覧（`/reservations`）に「下書き」フィルタタブ（`status=DRAFT`）を追加する。「すべて」には下書きも含まれる | RSV-05 |
| FR-08 | 予約詳細（`/reservations/{id}`）で `DRAFT` かつ本人の場合、「編集」「正式申請」「削除」の操作を表示する。編集画面（`/reservations/{id}/edit`）は `DRAFT` も開ける | 受入条件 |
| FR-09 | 既存の `PUT` の `PENDING` 以外への 422 ガードは `PENDING` / `DRAFT` のみ許可に変更する。`POST /api/reservations/{id}/cancel` は `DRAFT` を引き続き 422 とする（削除は DELETE で行う） | 整合性 |

## Non-Functional Requirements

| # | 要件 |
|---|------|
| NFR-01 | 正式申請（`DRAFT` → `PENDING`/`APPROVED`）は、リソース行の悲観ロック取得後に重複チェックを行い、既存の `update()` と同じ直列化方式に揃える |
| NFR-02 | 承認者不在（`APPROVER_NOT_AVAILABLE`）などで正式申請が失敗した場合、トランザクションをロールバックして予約は `DRAFT` のまま残す |
| NFR-03 | 4 レイヤー構成を維持する。ステータス遷移の判定と権限チェックは `application`（Service）層に置く。ドメイン層（`Reservation`）には遷移を表すメソッドを追加する |
| NFR-04 | 新規 DB 変更なし。API のエラー形式は既存の共通エラーレスポンスに従う |

## 受入条件（シートの条件を確定事項で補正）

- [ ] 「下書き保存」ボタンで `DRAFT` ステータスの予約が保存される
- [ ] 下書きが予約一覧の「下書き」フィルタに表示される
- [ ] 下書き詳細から再編集と正式申請ができる。正式申請後は、要承認リソースなら `PENDING`、承認不要リソースなら `APPROVED` になる
- [ ] 下書きは承認一覧に表示されない
- [ ] 本人と ADMIN 以外が下書き詳細にアクセスすると 403（APPROVER も 403）
- [ ] 下書きの削除は本人のみ可能で、`DRAFT` 以外の削除は 422
- [ ] 正式申請時に時間帯が重複していれば 409 を返し、予約は `DRAFT` のまま残る
- [ ] バックエンドの状態遷移テストに `DRAFT` → `PENDING` と `DRAFT` → `APPROVED` のケースを追加する

## 更新が必要な spec（シートの記載に追加）

- `api-spec.md`: `POST` の `draft`、`PUT` の `DRAFT` 更新と正式申請、`DELETE` の新設、エンドポイント一覧・権限マトリクス・エラー表、レスポンスの `status` 説明
- `screen-spec.md`: `/reservations/new`、`/reservations`、`/reservations/{id}`、`/reservations/{id}/edit`
- `requirements.md`: §予約の「下書き保存はベース実装の対象外」、予約ステータス遷移図（`.drawio` / `.svg` を含む）と注記、UC-07 の機能要件
- `er-diagram.md`: `status` 列の備考（`DRAFT` はベース実装では未使用）の更新（スキーマ変更はなし）

## 想定リスクと留意点

- 課題シートの RSV-02 と受入条件の食い違いは本書で解消した。spec 更新時に RSV-02 側の記述を揃えないと、シートと仕様が乖離する。
- シートの競合課題（繰り返し予約、予約一覧のフィルタ拡張）は `POST /api/reservations` と予約一覧を同時に変更する。両課題とも未着手であることを前提とする。
- 予約ステータス遷移図は draw.io 図（`requirements-reservation-status.drawio.svg`）なので、更新時は `drawio-skill` の利用を検討する。
- スコープはシートの見積り（半日〜1日）より大きい。DELETE API の新設が主な増分である。
