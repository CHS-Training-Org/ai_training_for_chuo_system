# Business Rules — reservation-draft

## ステータスガード（`update()`）

| 現在のステータス | `submit` | 結果 | エラーコード |
|---|---|---|---|
| `DRAFT` | `false`／未指定 | 内容更新、`DRAFT` のまま | — |
| `DRAFT` | `true` | 内容更新＋`requires_approval`分岐（下表）で `APPROVED`／`PENDING` へ遷移 | — |
| `PENDING` | `false`／未指定 | 内容更新、`PENDING` のまま（既存の挙動） | — |
| `PENDING` | `true` | **不正遷移**（`submit` は `DRAFT` からの正式申請専用） | 422 `VALIDATION_ERROR` |
| `APPROVED`／`REJECTED`／`CANCELLED` | 任意 | 更新不可（既存の挙動） | 422 `VALIDATION_ERROR` |

## 正式申請時の `requires_approval` 分岐（`update()` で `submit=true` かつ現在 `DRAFT` の場合のみ）

| `requires_approval` | 遷移先ステータス | `approval_steps` |
|---|---|---|
| `false` | `APPROVED`（即時確定） | 生成しない |
| `true` | `PENDING`（承認待ち） | 生成する（`step_order=1`、`approver_id`=`APPROVER`ロールのユーザー） |

## 重複予約チェックの適用可否

| 操作 | チェック実行 | 理由 |
|---|---|---|
| `create()` で `draft=false`（既存の申請） | 実行する | 既存の挙動（変更なし） |
| `create()` で `draft=true`（下書き作成） | **実行しない** | `DRAFT` は `OCCUPIED_STATUSES`（`PENDING`/`APPROVED`）に含まれず他者の枠を占有しないため、作成側にだけ制約を課すと非対称になる（D5） |
| `update()` で対象が `DRAFT`・`submit=false`（下書きの再編集） | **実行しない** | 作成時と対称にする。下書きである間は重複していても保存・再編集できる（実行すると、重複する時間帯の下書きが時間帯を変えない限り再編集不能になり、D5の意図と矛盾するため） |
| `update()` で対象が `PENDING`・`submit=false`（既存のPENDING編集） | 実行する | 既存の挙動（変更なし）。自己除外あり |
| `update()` で `submit=true`（正式申請） | 実行する | 下書き保存中に他の予約で枠が埋まっている可能性があるため（D7）。自己除外あり |

## アクセス制御（`checkReadAccess()`）

| 対象予約のステータス | MEMBER（本人） | MEMBER（他人） | APPROVER（本人） | APPROVER（他人） | ADMIN |
|---|---|---|---|---|---|
| `DRAFT` | 可 | 403 | 可 | **403（D4）** | 可 |
| `PENDING`／`APPROVED`／`REJECTED`／`CANCELLED` | 可 | 403 | 可 | 可（既存） | 可 |

## 操作権限（`update()`／`cancel()`）

| 操作 | 許可されるユーザー | 対象ステータス |
|---|---|---|
| 内容更新・正式申請（`update()`） | 申請者本人のみ（ADMIN も不可、既存どおり） | `DRAFT`／`PENDING` |
| キャンセル（`cancel()`） | 申請者本人 または ADMIN（既存どおり） | `DRAFT`／`PENDING`／`APPROVED` |

## `POST /api/reservations` の必須項目（`draft` の値に関わらず不変）

| フィールド | 必須 |
|---|---|
| `resourceId` | ✅ |
| `startAt` | ✅ |
| `endAt`（`endAt > startAt`） | ✅ |
| `purpose` | ✅ |
| `attendeesCount` | ❌（既存どおり任意） |

DB マイグレーションは発生しない（D1）。
