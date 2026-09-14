# Requirements — CSV 帳票出力（Issue #29）

## Intent Analysis

- **User Request**: `/aidlc` 起動。Pre-flight でブランチ `feature/CHS-MIYATO-HIROYUKI/29-csv-export` から対象タスクを特定し、`docs-next/docs/spec/enhancements/intermediate/csv-export.md`（CSV 帳票出力）を分析対象として採用した。
- **Request Type**: New Feature（既存 `reservations` ドメインを対象とした新規エンドポイント + 新規 UI 要素の追加）
- **Scope Estimate**: Multiple Components（バックエンド：新規 Controller/Service 相当の層を追加。フロントエンド：管理者ページへのボタン追加）
- **Complexity Estimate**: Moderate（新規コンポーネントの追加・認可制御・CSV エンコーディングの考慮点はあるが、既存の `Reservation`/`ReservationResponse` のフィールドをそのまま転用でき、新規データモデルは不要）

## 入力ソース

- ビジネス要求シート：`docs-next/docs/spec/enhancements/intermediate/csv-export.md`（RPT-01〜05、受入条件 5 件）
- 既存仕様：`docs-next/docs/spec/requirements.md`（ロール定義・ユースケース一覧）、`docs-next/docs/spec/api-spec.md`（既存 `/api/reservations` 系エンドポイントの様式）
- 既存コード：`ReservationController`・`ReservationService`・`ReservationResponse`（バックエンド）、`UserController`/`ResourceController`（ADMIN 限定エンドポイントの認可パターン）

## ⚠️ 発見した不整合（要フォローアップ）

`csv-export.md` の背景節は「これはユースケース UC-07（CSV・帳票出力）の実装にあたります」と記載しているが、`docs-next/docs/spec/requirements.md` を確認したところ、**UC-07 は「社員が自分の予約一覧を確認・編集・キャンセルする」であり、CSV 出力とは無関係**である。同ファイルの「対象外（学習者拡張課題）」表には「CSV / PDF 帳票出力」が学習者拡張課題として記載されているのみで、対応する UC 番号は存在しない。

本ワークフローの要件定義では、CSV 出力を**既存 UC に紐付かない新規機能**として扱う。UC 番号の記載修正は `docs-next/docs/spec/enhancements/intermediate/csv-export.md` 自体の記述誤りであり、実装が仕様に影響する範囲（`api-spec.md`・`screen-spec.md` の更新）は Build and Test 完了後に `/update-spec` で扱うが、`csv-export.md` 内の誤記自体の訂正もその際に合わせて行う必要がある。

## Functional Requirements

`csv-export.md` の要件表をそのまま採用する。

| # | 要件 | 備考 |
|---|------|------|
| RPT-01 | `GET /api/reports/reservations/csv` エンドポイントを新設し、`Content-Type: text/csv` で予約一覧を CSV ダウンロードできる | レスポンス生成方式は `ResponseEntity<byte[]>` による一括生成を採用（下記「確認済み事項」参照） |
| RPT-02 | CSV には予約 ID・リソース名・申請者名・開始日時・終了日時・目的・承認状態を含む | 既存 `ReservationResponse`（`id`・`resourceName`・`requesterName`・`startAt`・`endAt`・`purpose`・`status`）のフィールドでそのままカバーできる |
| RPT-03 | 出力対象期間（`from`・`to`）と承認ステータス（`status`）をクエリパラメータで絞り込める | `status` は既存 `GET /api/reservations` と同様、複数指定可（`List<ReservationStatus>`）とする |
| RPT-04 | ADMIN ロールのみアクセスできる（Spring Security で保護） | 既存の `UserController`/`ResourceController` と同じ `@PreAuthorize("hasRole('ADMIN')")` パターンを踏襲する |
| RPT-05 | フロントエンドの管理者ページに「CSV ダウンロード」ボタンを追加し、クリックでブラウザに CSV ファイルをダウンロードさせる | `<a href>` 直接リンク方式を採用（下記「確認済み事項」参照） |

## Non-Functional Requirements

- **文字コード**：UTF-8（BOM 付き）。Excel で開いた際の日本語ヘッダの文字化けを防ぐ（受入条件より）。
- **認可**：MEMBER / APPROVER でのアクセスは 403 を返す（RPT-04・受入条件より）。
- **パフォーマンス**：学習用途のデータ規模を前提に、`ResponseEntity<byte[]>` によるメモリ上一括生成を採用する（ストリーミング方式は今回不要と判断。確認済み事項を参照）。
- **保守性**：CSV 生成に新規ライブラリを追加せず、標準ライブラリ（`StringBuilder`）による手書き実装とする（列数が 7 列と少なく、エスケープ処理も単純なため）。
- **テスト容易性**：バックエンドに CSV 生成ロジックのユニットテストを追加する（受入条件より）。

## 確認済み事項（`AskUserQuestion` による選択）

要求シートの「AI 活用ポイント」節で AI との比較検討が推奨されていた 3 点と、シート本文に明記のなかった 1 点について、実装着手前に確認した（詳細は `Docs/spec/aidlc-audit.md`「Requirements Analysis — 確認質問」参照）。

| 論点 | 決定 | 理由 |
|------|------|------|
| レスポンス生成方式 | `ResponseEntity<byte[]>` 一括生成 | 学習用途のデータ規模では十分。実装・テストがシンプル |
| CSV 生成方法 | 標準ライブラリ（`StringBuilder` 手書き） | 列数が少なくエスケープ処理も単純なため、新規依存（`opencsv`）を追加しない |
| フロントエンドのダウンロード実装 | `<a href>` 直接リンク | 実装量が最小。認証は Cookie セッションの前提で成立する |
| `status` フィルタの多重度 | 複数選択可 | 既存 `GET /api/reservations` と同一パターンを踏襲し一貫性を保つ |

## User Scenarios

- 管理者が管理者ページで期間・ステータスを指定し「CSV ダウンロード」ボタンをクリックする → ブラウザが CSV ファイルをダウンロードする（正常系）。
- 一般社員・承認者が同エンドポイントに直接アクセスする → 403 が返る（異常系・認可）。
- 対象期間内に予約が 0 件の場合 → ヘッダ行のみの CSV が返る（境界値、シート・受入条件には明記なしだが既存パターンからの妥当な推定。Code Generation 時に空データセットのテストケースとして扱う）。

## Business Context

- 背景：`GET /api/reservations` は JSON のみを返しており、Excel 転記や社内報告向けの CSV エクスポート手段がない（`csv-export.md` 背景節より）。
- 依存関係：前提課題なし。競合課題なし（`csv-export.md` 依存関係節より）。

## Summary

CSV 帳票出力は、既存の `Reservation`/`ReservationResponse` のデータをそのまま転用できる比較的独立した機能追加であり、新規データモデルや複雑な業務ルールは発生しない。主な実装ポイントは (1) ADMIN 限定の新規エンドポイント、(2) 期間・ステータスによる絞り込み、(3) UTF-8 BOM 付き CSV 生成、(4) フロントエンドの直接リンク方式ダウンロードの 4 点に整理できる。
