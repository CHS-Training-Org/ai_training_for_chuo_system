# Functional Design Plan — `reservation-draft`

**ユニット**: `reservation-draft`（単一・縦切り）
**入力**: [`requirements.md`](../../inception/requirements/reservation-draft/requirements.md)、[`stories.md`](../../inception/user-stories/reservation-draft/stories.md)、[`execution-plan.md`](../../inception/plans/reservation-draft/execution-plan.md)
**作成日時**: 2026-10-02T11:02:40+00:00

> 確認質問は `.claude/rules/aidlc-questions.md` に従い `AskUserQuestion` ツールで行う。
> 本ステージでユーザー判断を要する論点は Requirements Analysis で解消済みのため、新たな質問は設けない。
> 設計上の判断はすべて根拠とともに下記に記録する。

---

## Requirements Analysis から引き継いだ決定

| 論点 | 決定 | 出典 |
|---|---|---|
| `DRAFT` の閲覧権限 | 申請者本人と ADMIN のみ。APPROVER を含む他は 403 | 確認質問 Q1（回答 A） |
| 下書きの必須入力項目 | 通常の申請と同じ | 確認質問 Q2（回答 A） |
| 下書きの削除 | スコープ外 | 確認質問 Q3（回答 A） |
| 遷移バリデーションの実装場所 | `ReservationService`（ドメイン層ではない） | 確認質問 Q6 |
| 権限チェックの方式 | `ReservationService`。`@PreAuthorize` は使わない | 確認質問 Q7 |
| 正式申請の API 設計 | `PUT` のボディに省略可能な `status` | 確認質問 Q8 |
| 正式申請後のステータス | `requires_approval` に応じて `PENDING` または `APPROVED` | 受入条件からの意図的な逸脱（要件定義 §7） |

## 本ステージで決める論点

| 論点 | 決定 | 根拠 |
|---|---|---|
| `draft` フラグを Zod スキーマに含めるか | 含めない。Server Action の第2引数として渡す | `draft` はフォームの入力項目ではなく、押されたボタンの種別を表す。スキーマに入れると、利用者が入力していない値がフォームの状態に混ざる |
| `status` を Zod スキーマに含めるか | 含めない。Server Action の第3引数として渡す | 同上。これにより `UpdateReservationSchema` と `UpdateReservationInput` は変更不要になり、要件定義 §8 が挙げた波及範囲は4箇所から2箇所に減る |
| 下書き作成時にリソース行の悲観ロックを取るか | 取らない。`findById` を使う | 悲観ロックは重複チェックを直列化するために取っている。下書きは重複チェックを行わないため、ロックを取る理由がない |
| エンティティに追加する状態遷移メソッド | `Reservation.markPending()` のみ | 既存の `cancel()` / `markApproved()` / `markRejected()` はいずれも引数なしで固定のステータスを書き込む形に揃っている。遷移先が `APPROVED` の場合は既存の `markApproved()` をそのまま使えるため、追加は `markPending()` 1つで足りる。遷移先の決定と可否判定は Service が行う |
| 正式申請ボタンの確認ダイアログ | 出す。`CancelButton` と同じ Dialog パターン | 正式申請は承認依頼を発生させる後戻りしにくい操作であり、既存のキャンセル操作と同じ重みを持つ |

---

## 実行チェックリスト

### 1. ドメインモデルの整理

- [x] 1.1 `Reservation` エンティティの既存の状態遷移メソッドを確認する
- [x] 1.2 `DRAFT` を含むステータス遷移図を作る（許可される遷移と禁止される遷移）
- [x] 1.3 追加する状態遷移メソッドのシグネチャを決める
- [x] 1.4 `domain-entities.md` を生成する

### 2. 業務ロジックの設計

- [x] 2.1 予約作成の処理の流れに `draft` の分岐を組み込む
- [x] 2.2 予約更新の処理の流れに `DRAFT` の許可と正式申請の分岐を組み込む
- [x] 2.3 重複予約チェックの実行タイミングを、作成・更新・正式申請それぞれについて定める
- [x] 2.4 承認ステップ生成の条件を定める
- [x] 2.5 読み取り権限の判定ロジックを定める
- [x] 2.6 `business-logic-model.md` を生成する

### 3. 業務ルールの明文化

- [x] 3.1 ステータス遷移の可否ルールを一覧にする
- [x] 3.2 権限ルールをロールとステータスの組み合わせで一覧にする
- [x] 3.3 バリデーションルールとエラーコードの対応を定める
- [x] 3.4 各ルールを受入基準（AC-xx-x）に対応づける
- [x] 3.5 `business-rules.md` を生成する

### 4. フロントエンドの設計

- [x] 4.1 変更する画面4つの責務を整理する
- [x] 4.2 新規に作るクライアントコンポーネントを特定する
- [x] 4.3 Server Action のシグネチャ変更を定める
- [x] 4.4 利用者の操作の流れとエラー表示を定める
- [x] 4.5 `frontend-components.md` を生成する

### 5. 整合性の確認

- [x] 5.1 受入基準34件がいずれかの設計要素で扱われていることを確認する
- [x] 5.2 既存の振る舞いを変えない箇所（非回帰）を明示する

### 6. 状態更新

- [x] 6.1 本プランのチェックボックスをすべて `[x]` にする
- [x] 6.2 `Docs/spec/aidlc-state.md` を更新する
- [x] 6.3 `Docs/spec/aidlc-audit.md` に記録する

---

## 生成する成果物

- [x] `construction/reservation-draft/functional-design/domain-entities.md`
- [x] `construction/reservation-draft/functional-design/business-logic-model.md`
- [x] `construction/reservation-draft/functional-design/business-rules.md`
- [x] `construction/reservation-draft/functional-design/frontend-components.md`

## 本ステージで扱わないこと

- 変更対象ファイルの列挙と変更手順（Code Generation の Part 1）
- 仕様書（`docs-next/docs/spec/`）の文面（Spec Update）
- テストコードの実装（Code Generation の Part 2）
