---
type: working-doc
title: Requirements（予約の下書き保存）
description: AI-DLC Requirements Analysis ステージが生成する要件書。要件シート reservation-draft.md と確認質問 3 回分の回答を統合する
timestamp: 2026-11-14
---

# Requirements: 予約の下書き保存

## Intent Analysis Summary

- **User Request**: 予約の下書き保存（Issue #30）を実装したい。要件シート `docs-next/docs/spec/enhancements/intermediate/reservation-draft.md`。
- **Request Type**: Enhancement（既存の予約機能への新規機能追加）
- **Scope Estimate**: Multiple Components（backend / frontend / 仕様書。DB スキーマは変更しない）
- **Complexity Estimate**: Moderate
- **Requirements Depth**: Standard
- **入力**: 要件シート、Reverse Engineering 成果物、確認質問 3 回分の回答（`Docs/spec/aidlc-audit.md`）

## 確定した判断

| # | 論点 | 決定 | 補足 |
|---|---|---|---|
| D-1 | ADMIN の権限 | 他人の下書きは**閲覧のみ**（編集・削除は不可） | 現行の権限表（ADMIN は更新不可）と受入条件の両方に合う |
| D-2 | APPROVER の閲覧 | 他人の下書きは**閲覧不可（403）** | 現行の「APPROVER は全予約を閲覧可」に下書きの例外を設ける |
| D-3 | 削除 | **追加する**。`DELETE /api/reservations/{id}` で、**下書き（DRAFT）かつ本人のみ**が削除できる | 受入条件には無いが、RSV-02 の「削除」に対応する。下書きを捨てられないと一覧に残り続けるため（確認質問の回答後に、ユーザーの判断で「スコープ外」から変更） |
| D-4 | 下書きの入力 | **通常申請と同じ必須項目**（目的・開始・終了日時）。重複判定は下書き保存では行わない | DB マイグレーションは不要 |
| D-5 | 正式申請 | **新規申請と同じ分岐**。重複判定あり。承認要は PENDING と承認ステップ生成、承認不要は APPROVED | |
| D-6 | 「すべて」タブ | 下書きを**含めない**。専用「下書き」タブを追加 | |
| D-7 | ADMIN の一覧 | 「下書き」タブに**全員分**の下書きを出す | |
| D-8 | 再編集の区別 | PUT の `draft` フラグで区別（`true` は下書きのまま更新、それ以外は正式申請） | 何度でも下書きを保存し直せる |
| D-9 | 拡張機能 | Security Baseline / Resiliency Baseline / Property-Based Testing は**すべて適用しない** | 前回課題と同じ |
| D-10 | ADMIN 自身の下書き | ADMIN も、**自分の下書き**なら編集・正式申請・削除できる。他人の下書きは閲覧のみ（D-1 のとおり） | Functional Design の途中で追加。ADMIN が下書き保存すると、自分の下書きを操作できず残り続けるのを避けるため |

## Functional Requirements

| ID | 要件 | 根拠 |
|---|---|---|
| FR-01 | `POST /api/reservations` に任意の `draft` を追加する。`draft: true` のとき、ステータス `DRAFT` で予約を作成する（201）。`draft` を省略した場合の挙動は従来どおり。 | RSV-01, D-4 |
| FR-02 | 下書き保存では、必須項目の検証（目的・開始・終了日時、`endAt > startAt`）とリソースの存在確認は通常申請と同じに行う。重複判定は行わない。承認ステップは作らない。 | RSV-02, D-4 |
| FR-03 | 下書きの閲覧は、本人と ADMIN のみ。本人以外の MEMBER と APPROVER が `GET /api/reservations/{id}` を呼ぶと 403 を返す。 | RSV-02, D-1, D-2 |
| FR-04 | 下書きの更新は、本人のみ（ADMIN も、自分の下書きなら可。他人の下書きは不可）。`PUT /api/reservations/{id}` で、`draft: true` なら `DRAFT` のまま更新する。検証は FR-02 と同じ。 | RSV-03, D-1, D-8 |
| FR-05 | `PUT /api/reservations/{id}` を下書きに対して `draft` なし（または `false`）で呼ぶと、正式申請になる。FR-06 の処理を行う。 | RSV-03, D-8 |
| FR-06 | 正式申請では、リソースを悲観ロックしたうえで重複判定を行い（自分自身は除外）、重なっていれば 409 を返す。重ならなければ、承認が必要なリソースは `PENDING` にして承認ステップを生成し、承認が不要なリソースは `APPROVED` にする。 | RSV-03, D-5 |
| FR-07 | 下書きは承認一覧（`/approvals`）に出ない。下書きは空き確認・重複判定の占有に含めない（いずれも現行の動作を維持し、テストで担保する）。 | RSV-02, 受入条件 |
| FR-08 | `GET /api/reservations` は、`status` を指定しない場合に下書きを含めない。`status=DRAFT` を指定すると下書きを返す。MEMBER・APPROVER は本人の下書きのみ、ADMIN は全員分を返す。 | RSV-05, D-6, D-7 |
| FR-09 | 予約申請フォームに「下書き保存」ボタンを追加する。 | RSV-04 |
| FR-10 | 予約一覧に、専用の「下書き」タブを追加する。「すべて」タブには下書きを出さない。 | RSV-05, D-6 |
| FR-11 | 下書きの詳細画面（`/reservations/{id}`）に、本人向けの「編集」と「正式申請」の操作を出す。編集画面（`/reservations/{id}/edit`）は、本人の下書きで開けるようにし、「下書き保存」と「申請する」を持つ。他人の下書きには、ADMIN にも編集・申請の操作を出さない（ADMIN は自分の下書きなら操作できる）。 | 受入条件, D-1, D-8, D-10 |
| FR-12 | 下書きを削除できる。`DELETE /api/reservations/{id}` は、本人の `DRAFT` に限って成功し（204）、予約を物理削除する。本人以外（ADMIN も、他人の下書きなら）は 403、`DRAFT` 以外の予約は 422、存在しなければ 404 を返す。下書きの詳細画面に、本人向けの「削除」操作を出す（他人の下書きには、ADMIN にも出さない）。削除後は予約一覧へ戻る。 | RSV-02, D-1, D-3 |

## Non-Functional Requirements

| ID | 区分 | 要件 |
|---|---|---|
| NFR-01 | セキュリティ | 権限チェックは、バックエンドで強制する（画面のボタン表示だけに頼らない）。予約系は、現行方針どおり `@PreAuthorize` を使わず Service で手書きする。 |
| NFR-02 | 互換性 | `draft` を省略した `POST` / `PUT` と、`status` を明示した一覧取得の挙動は変えない。変わるのは、`status` 未指定の一覧が下書きを除く点だけ。 |
| NFR-03 | データ | DB スキーマは変更しない（Flyway の追加なし）。`DRAFT` は既存の CHECK 制約に定義済み。 |
| NFR-04 | 保守性 | 4 層の責務を守る。状態遷移の検証は Service に置く（現行方針）。 |
| NFR-05 | テスト | 受入条件の「`DRAFT` から `PENDING` のケースを、ステータス遷移テストに追加する」を含め、バックエンドの Service・Controller、フロントエンドの Server Action と MSW のモックに、下書きのテスト（削除を含む）を追加する。 |
| NFR-06 | Spec-first | 実装より先に、次の仕様書を更新する（下表）。 |
| NFR-07 | 性能 | 追加のクエリはなく、既存の一覧・取得の範囲で収まる。性能要件は追加しない。 |

## 更新が必要な仕様書（Spec-first）

要件シートの一覧に、Reverse Engineering で見つかった追加分を足している。

| ファイル | 更新内容 |
|---|---|
| `docs-next/docs/spec/api-spec.md` | `POST` の `draft` と `DRAFT` 作成、`PUT` の `draft` と `DRAFT` から `PENDING` / `APPROVED`、一覧の `status` 列挙と、未指定時に下書きを除く説明、下書きの閲覧権限（403）、`GET /{id}` の権限、`DELETE /api/reservations/{id}` の新設（エンドポイント一覧・エラー表を含む） |
| `docs-next/docs/spec/screen-spec.md` | `/reservations/new`（下書き保存ボタン）、`/reservations`（下書きタブ）、`/reservations/{id}`（編集・正式申請・削除）、`/reservations/{id}/edit`（下書きで開ける） |
| `docs-next/docs/spec/requirements.md` | ステータス遷移（`DRAFT` の遷移）、RSV-01 の status 記述、「下書き保存はベース実装の対象外」の記述、権限マトリクスの下書きの扱い（削除の行を追加） |
| `docs-next/docs/spec/er-diagram.md` | `status` 列の「ベース実装では未使用」の記述 |
| `docs-next/static/diagrams/spec/requirements-reservation-status.drawio`（と `.svg`） | 遷移図に `DRAFT` を追加（図のソース） |

## 受入条件との対応

| 要件シートの受入条件 | 対応する要件 |
|---|---|
| 「下書き保存」ボタンで `DRAFT` として保存される | FR-01, FR-02, FR-09 |
| 下書きは予約一覧の `DRAFT` フィルタで表示される | FR-08, FR-10 |
| 下書き詳細から再編集・正式申請ができる | FR-04, FR-05, FR-06, FR-11 |
| 下書きは承認一覧に表示されない | FR-07 |
| 本人以外が詳細にアクセスすると 403（ADMIN は除く） | FR-03 |
| ステータス遷移テストに `DRAFT` から `PENDING` のケースを追加する | NFR-05 |
| （受入条件には無いが、RSV-02 の「削除」）下書きを削除できる | FR-12 |

## 前提・解釈（承認時に確認してほしい点）

回答では決まっておらず、こちらで置いた前提です。違えば、修正を依頼してください。

1. **一覧の除外はバックエンドで行う**（FR-08）。「すべて」タブの除外を、画面側の絞り込みではなく、`status` 未指定の API が下書きを返さない形にする。他の呼び出し元（ダッシュボードなど）は `status` を明示しているため影響しない。
2. **表示名**: 一覧のタブ名は要件シートの「下書き」とする。現在の `DRAFT` の表示名は「ドラフト」（`frontend/src/lib/labels.ts`）なので、「下書き」に揃える。
3. **`draft: true` を下書き以外に指定した場合**（例: PENDING の予約に `draft: true` で PUT）の扱いは、Functional Design で決める。拒否（422）を想定している。
4. **削除の仕様**（FR-12）: 削除は物理削除とする（下書きには承認ステップが無いため、他テーブルへの影響がない）。`DRAFT` 以外への削除は、既存の状態ガードと同じ扱いで 422 とする。削除前の確認ダイアログを設けるかは、Functional Design で決める。

## Out of Scope（今回やらないこと）

- ADMIN による他人の下書きの編集・削除（D-1）
- 目的・日時が未入力の下書き保存と、そのための DB マイグレーション（D-4）
- 下書きの取消（`cancel` の対象に `DRAFT` を加えること）
- 拡張機能（Security / Resiliency / Property-Based Testing。D-9）
