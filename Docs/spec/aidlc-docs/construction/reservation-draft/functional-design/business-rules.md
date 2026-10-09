# Business Rules — `reservation-draft`

**ユニット**: `reservation-draft`
**作成日時**: 2026-10-02T11:02:40+00:00

本ユニットで追加・変更する業務ルールを一覧にする。
各ルールに対応する受入基準（`stories.md` の AC 番号）を示し、テスト設計の起点にする。

エラーの HTTP ステータスは既存の `GlobalExceptionHandler` の割り当てに従う。
`BusinessException` は 422、`AccessDeniedException` は 403、`ResourceNotFoundException` は 404、
`ReservationConflictException` は 409 を返す。
`BusinessException` が持つ `code` は、ステータスガード違反では既存の実装に揃えて `VALIDATION_ERROR` とする。

---

## 1. 下書きの作成

| ID | ルール | エラー | 受入基準 |
|---|---|---|---|
| BR-01 | `draft` が `true` のとき、リソースの `requires_approval` の値によらずステータスを `DRAFT` にする | なし | AC-01-2 |
| BR-02 | `draft` が省略または `false` のとき、既存の振る舞いを変えない | なし | AC-01-3 |
| BR-03 | 下書きの作成では重複予約チェックを行わない | なし（409 を返さない） | AC-01-4 |
| BR-04 | 下書きの作成では承認ステップを生成しない | なし | AC-05-1 |
| BR-05 | 下書きでもリソース・開始日時・終了日時・利用目的を必須とする | 422 `VALIDATION_ERROR` | AC-01-5 |
| BR-06 | 下書きでも終了日時が開始日時より後であることを要求する | 422 `VALIDATION_ERROR` | AC-01-5 |
| BR-07 | 存在しないリソース ID を指定した場合は拒否する | 404 `NOT_FOUND` | （既存の振る舞いの維持） |

BR-05 の必須判定は、backend の Bean Validation（`@NotNull` / `@NotBlank`）がそのまま効く。
`draft` の有無でバリデーションを切り替えないため、DTO に条件分岐を入れる必要はない。

---

## 2. 下書きの更新

| ID | ルール | エラー | 受入基準 |
|---|---|---|---|
| BR-08 | `DRAFT` の予約に対する内容の更新を許可する | なし | AC-03-2 |
| BR-09 | 更新できるのは申請者本人のみ。ADMIN にも許さない | 403 `FORBIDDEN` | AC-03-4、AC-07-3 |
| BR-10 | 更新可能なステータスは `DRAFT` と `PENDING` のみ | 422 `VALIDATION_ERROR` | AC-03-5 |
| BR-11 | `DRAFT` の内容更新では重複予約チェックを行わない | なし | （BR-03 との一貫性） |
| BR-12 | `PENDING` の内容更新では従来どおり重複予約チェックを行う | 409 `RESERVATION_CONFLICT` | （既存の振る舞いの維持） |
| BR-13 | 内容の更新ではステータスを変えない | なし | AC-04-7 |

BR-09 は既存の実装がそのまま満たす。
`ReservationService.update` の所有権チェックは申請者本人のみを通し、ADMIN を例外扱いしていない。
本ユニットでこの判定を変えない。

---

## 3. 正式申請

| ID | ルール | エラー | 受入基準 |
|---|---|---|---|
| BR-14 | `status` に `"PENDING"` が指定され、現在のステータスが `DRAFT` のときのみ遷移を実行する | なし | AC-04-2 |
| BR-15 | `status` に `"PENDING"` 以外の値を指定した場合は拒否する | 422 `VALIDATION_ERROR` | AC-04-6 |
| BR-16 | 現在のステータスが `DRAFT` 以外で `status` を指定した場合は拒否する | 422 `VALIDATION_ERROR` | AC-04-5 |
| BR-17 | 正式申請では重複予約チェックを行う。自身は除外する | 409 `RESERVATION_CONFLICT` | AC-04-4 |
| BR-18 | 重複で失敗した場合、ステータスは `DRAFT` のまま残る | 409 | AC-04-4 |
| BR-19 | リソースの `requires_approval` が `true` のとき、遷移先は `PENDING` とし承認ステップを1件生成する | なし | AC-04-2 |
| BR-20 | リソースの `requires_approval` が `false` のとき、遷移先は `APPROVED` とし承認ステップを生成しない | なし | AC-04-3 |
| BR-21 | 正式申請の時点で承認者（APPROVER ロール）が存在しない場合は拒否する | 422 `APPROVER_NOT_AVAILABLE` | （既存の `createInitialStep` の振る舞い） |

BR-20 は要求シートの受入条件「正式申請（`PENDING` に変更）」からの意図的な逸脱である。
理由は要件定義 §7 に記す。

BR-18 はトランザクションのロールバックによって成立する。
`ReservationService` はクラスに `@Transactional` が付いており、
`ReservationConflictException` は非チェック例外のため、送出時点で巻き戻る。
内容の更新も同時に巻き戻るため、利用者から見れば操作がなかったことになる。

---

## 4. 下書きの閲覧

| ID | ルール | エラー | 受入基準 |
|---|---|---|---|
| BR-22 | `DRAFT` の予約を閲覧できるのは申請者本人と ADMIN のみ | 403 `FORBIDDEN` | AC-06-1、AC-06-2、AC-07-1 |
| BR-23 | APPROVER は他人の `DRAFT` を閲覧できない | 403 `FORBIDDEN` | AC-06-1 |
| BR-24 | `DRAFT` 以外の予約に対する APPROVER と ADMIN の可視範囲は変えない | なし | AC-06-3 |
| BR-25 | 予約一覧の可視範囲は変えない。ADMIN は全件、それ以外は本人分のみ | なし | AC-06-4、AC-07-2 |

BR-23 は、本ユニットで唯一、既存の権限が狭まる変更である。
現在の `checkReadAccess` は MEMBER のみを本人の予約に限定しており、APPROVER には全予約の閲覧を許している。

### ロールとステータスの組み合わせ

`GET /api/reservations/{id}` の結果を一覧にする。

| 予約のステータス | 申請者本人 | 他の MEMBER | APPROVER（他人の予約） | ADMIN（他人の予約） |
|---|---|---|---|---|
| `DRAFT` | 200 | **403** | **403** | **200** |
| `PENDING` | 200 | 403 | 200 | 200 |
| `APPROVED` | 200 | 403 | 200 | 200 |
| `REJECTED` | 200 | 403 | 200 | 200 |
| `CANCELLED` | 200 | 403 | 200 | 200 |

太字が本ユニットで新たに定まる振る舞いである。
`DRAFT` 以外の行は既存のまま変わらない。

---

## 5. 下書きのキャンセル

| ID | ルール | エラー | 受入基準 |
|---|---|---|---|
| BR-26 | `DRAFT` の予約はキャンセルできない | 422 `VALIDATION_ERROR` | （要件定義 FR-S01 によりスコープ外） |

既存の `CANCELLABLE_STATUSES` を変えないことで自動的に成立する。
下書きの破棄を求める声があれば別課題として扱う。

---

## 6. 受入基準との対応の網羅

バックエンドで検証する受入基準と業務ルールの対応を確認する。

| 受入基準 | 対応するルール |
|---|---|
| AC-01-2、AC-01-3 | BR-01、BR-02 |
| AC-01-4 | BR-03 |
| AC-01-5 | BR-05、BR-06 |
| AC-03-2 | BR-08 |
| AC-03-4 | BR-09 |
| AC-03-5 | BR-10 |
| AC-04-2 | BR-14、BR-19 |
| AC-04-3 | BR-20 |
| AC-04-4 | BR-17、BR-18 |
| AC-04-5 | BR-16 |
| AC-04-6 | BR-15 |
| AC-04-7 | BR-13 |
| AC-05-1 | BR-04 |
| AC-05-2 | BR-04（承認ステップがなければ承認待ち一覧に現れない） |
| AC-06-1、AC-06-2 | BR-22、BR-23 |
| AC-06-3 | BR-24 |
| AC-06-4 | BR-25 |
| AC-07-1 | BR-22 |
| AC-07-2 | BR-25 |
| AC-07-3 | BR-09 |

フロントエンドで検証する受入基準（AC-01-1、AC-01-6、AC-02-1 から AC-02-4、AC-03-1、AC-03-3、AC-04-1、AC-04-8、AC-07-4）は
[`frontend-components.md`](./frontend-components.md) で扱う。
