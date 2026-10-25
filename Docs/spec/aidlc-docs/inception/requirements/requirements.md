# Requirements: CSV 帳票出力（Issue #29）

## Intent Analysis Summary

- **User Request**: Issue #29「CSV 帳票出力」。ビジネス要求シート `docs-next/docs/spec/enhancements/intermediate/csv-export.md` を前提に AI-DLC で開発する
- **Request Type**: New Feature（新規エンドポイント `GET /api/reports/reservations/csv` と、管理者向けダウンロード UI の追加）
- **Scope Estimate**: Multiple Components（backend と frontend の縦切り + spec 2〜3 ファイル）
- **Complexity Estimate**: Moderate（新しい Controller と Service、非 JSON レスポンス、BFF の新しい中継経路、ADMIN 限定の認可）
- **Requirements Depth**: Standard
- **Extensions**: Security Baseline = No / Resiliency Baseline = No / Property-Based Testing = No

## Functional Requirements

シートの RPT-01〜05 を正とし、確認質問の回答（Round 1・2）と下記「確定した解釈」で補う。

| ID | 要件 |
|----|------|
| RPT-01 | `GET /api/reports/reservations/csv` を新設し、`Content-Type: text/csv` で予約一覧を CSV としてダウンロードできる |
| RPT-02 | CSV には予約 ID・リソース名・申請者名・開始日時・終了日時・目的・承認状態を含む |
| RPT-03 | 出力対象期間（`from`・`to`）と承認ステータス（`status`）をクエリパラメータで絞り込める |
| RPT-04 | ADMIN ロールのみアクセスできる（Spring Security で保護） |
| RPT-05 | 管理者向けに「CSV ダウンロード」ボタンを追加し、クリックでブラウザに CSV ファイルをダウンロードさせる |

### 確定した解釈（回答）

- **ボタンの配置（Round 1）**: `/reservations`（予約一覧画面）に置き、ADMIN のときだけ表示する。MEMBER / APPROVER には表示しない
- **期間の判定（Round 1）**: 開始日時（`start_at`）が `from` 以上かつ `to` 未満の予約を対象にする。終了日時は判定に使わない
- **期間の指定（Round 1）**: `from` と `to` は両方そろえて指定する。片方だけの指定は `400 Bad Request`（`VALIDATION_ERROR`）。両方とも未指定なら全期間を対象にする
- **前後関係（Round 2）**: `from` ≧ `to` の場合は `400 Bad Request`（`VALIDATION_ERROR`）
- **値の表記（Round 1・2）**:
  - 承認状態列は画面と同じ日本語表示名（`DRAFT` ドラフト / `PENDING` 承認待ち / `APPROVED` 承認済み / `REJECTED` 却下 / `CANCELLED` キャンセル済み。`frontend/src/lib/labels.ts` の `RESERVATION_STATUS_LABELS` と同じ文言）
  - 日時列は `yyyy/MM/dd HH:mm`（ゼロ埋め、秒なし。例 `2026/06/02 10:00`）
- **0 件時（Round 2）**: ヘッダ行だけの CSV を通常どおり返す（200）
- **並び順（Round 2）**: 開始日時の昇順

### 確定した解釈（シート・既存仕様からの導出）

- **ヘッダ行**: 日本語。列の並びと名称は RPT-02 の列挙順に合わせて「予約ID, リソース名, 申請者名, 開始日時, 終了日時, 目的, 承認状態」とする（根拠: RPT-02 の文言と受入条件「日本語ヘッダ行」）
- **文字コード**: UTF-8、BOM 付き（根拠: 受入条件）
- **対象ユーザー**: ADMIN のみが呼べるため、全ユーザーの予約が対象（申請者で絞り込む条件は要件にない）
- **エラー応答**: 未認証は 401、ADMIN 以外は 403、パラメータ不正は 400。形式は既存の `{code, message}`（根拠: `api-spec.md` §共通）

### 仮定（承認時に異論があれば指摘してください）

- **A1 status の指定方法**: `status` は既存の `GET /api/reservations` と同じく複数指定可（`status=PENDING&status=APPROVED`）。未指定なら全ステータスを対象にする（根拠は既存実装 `ReservationController#list` のみで、シートには「承認ステータス（`status`）」としか書かれていない）
- **A2 from / to の形式**: `api-spec.md` §日時フォーマットに従い、ISO 8601 拡張形式のローカル日時（例 `2026-06-01T00:00:00`）。オフセット付きは 400。タイムゾーン変換はしない
- **A3 CSV のエスケープ**: カンマ・ダブルクォート・改行を含む値はダブルクォートで囲み、値の中のダブルクォートは二重にする（RFC 4180 の規則）。目的（`purpose`、自由入力の最大 255 文字）にこれらの文字が入りうるため、エスケープしないと列がずれる

## Non-Functional Requirements

- **後方互換**: 既存の `GET /api/reservations` と `/reservations` 画面の挙動は ADMIN 以外では変えない。ADMIN の画面には CSV ダウンロード UI が加わるだけ
- **性能**: 現行規模で実用的に動くこと。大量データ時の扱い（ストリーミング、件数上限）は Application Design で検討する（シートの AI 活用ポイントが論点として挙げている）
- **セキュリティ**: RPT-04 は `@PreAuthorize` による Controller 単位の制御で満たし、既存の `UserController` / `ResourceController` と同じ方式にそろえる。JWT はブラウザに渡さない（現行の BFF 方式を維持）。Security Baseline 拡張は適用しない
- **保守性**: `ReservationRepository` の `@Query` の組み合わせ増加を悪化させない。具体策（Specification / `@Query` / その他）は Application Design で決める
- **DB 互換**: PostgreSQL（本番）と H2（テスト）の両方で動くこと
- **規約**: 4 層アーキテクチャ厳守、Server Components 優先、Conventional Commits、Spotless / Checkstyle / oxlint / oxfmt を通す

## Acceptance Criteria（シート準拠）

- [ ] 「CSV ダウンロード」ボタンをクリックすると、予約一覧が CSV ファイルとしてダウンロードされる
- [ ] CSV には日本語ヘッダ行が含まれ、文字コードは UTF-8（BOM 付き、Excel での文字化けを防ぐ）
- [ ] 期間・ステータスを絞り込んで対象データを限定した CSV をダウンロードできる
- [ ] MEMBER / APPROVER ロールでアクセスすると 403 が返る
- [ ] バックエンドに CSV 生成ロジックのユニットテストを追加する

### テスト方針（RE の所見を反映）

- CSV 生成ロジック（ヘッダ、BOM、日時の書式、状態の日本語表示名、エスケープ、0 件時）はユニットテストで検証する（受入条件）
- 認可は `UserControllerTest` と同じ様式の Controller 結合テストで、ADMIN 200 / MEMBER 403 / APPROVER 403 / 未認証 401 を検証する
- 期間・ステータスの絞り込みと並び順は、実クエリを通るテスト（Controller 結合テストまたは Repository テスト、H2）で検証する。方式は Code Generation の計画で確定する
- パラメータ検証（片方だけの指定、`from` ≧ `to`）の 400 を検証する
- FE は CSV 取得経路（Server Action または Route Handler）と、ADMIN のときだけボタンが表示されることを Vitest で検証する。具体的な対象は設計の確定後に決める

## 設計上の検討事項（Application Design で確認する）

要件としては規定しない。シートの AI 活用ポイントが比較を求めている事項と、シート・spec・既存実装のいずれにも記述がない事項を、設計段階で決める。

- **ダウンロード経路**: JWT がサーバー側にしかないため、Route Handler で中継するか、Server Action で CSV を返してブラウザ側で Blob にするか（シートの「`<a href>` か Fetch + Blob か」に相当）
- **レスポンスの返し方**: `StreamingResponseBody` か `ResponseEntity<byte[]>` か（シートの論点）
- **CSV の生成方法**: `opencsv` を導入するか、手書きか（シートの論点）
- **承認状態の日本語表示名の持ち方**: CSV はバックエンドで生成するため、FE の `labels.ts` と同じ文言をバックエンド側にも持つ必要がある。二重管理をどう扱うか
- **ファイル名と改行コード**: `Content-Disposition` のファイル名（日付を含めるか等）、改行を CRLF にするか LF にするか
- **画面上の入力 UI**: `/reservations` に期間・ステータスの入力をどう置くか。既存のステータスタブ（画面の絞り込み）と CSV の条件を連動させるか、独立させるか。ボタンの文言と位置
- **一覧取得の実装**: ページングなしの全件取得、期間条件、開始日時の昇順を、どのクエリ方式で実現するか
- **大量データ**: 件数上限を設けるか。設けるならその値と超過時の挙動
- **CSV インジェクション対策**: `=` `+` `-` `@` で始まる値を Excel が数式として解釈する問題への対処の要否（Security Baseline は不適用のため任意）

## Impact（更新対象）

- **Spec（Spec-first・Code Generation より前に `/update-spec` で統合）**:
  - `docs-next/docs/spec/api-spec.md`：新しく §帳票出力 を設け `GET /api/reports/reservations/csv` を追記。エンドポイント一覧にも追加
  - `docs-next/docs/spec/screen-spec.md` §`/reservations`：ADMIN にだけ表示する CSV ダウンロード UI を追記（シートの影響範囲は「`/admin/resources` または管理者向けページ」だが、回答により `/reservations` に変更）
  - `docs-next/docs/spec/requirements.md`：シートの「UC-07（CSV・帳票出力）」と同ファイルの UC-07（予約一覧の確認・編集・キャンセル）が一致しない。修正の要否と方法は `/update-spec` の段階で確認する
- **Backend**: 新規 Controller と Service（帳票）、`ReservationRepository`（または Specification）、各テスト
- **Frontend**: `reservations/page.tsx`、CSV 取得経路（新規）、ダウンロード UI（新規コンポーネント）、Vitest
- **対象外**: PDF 帳票、申請者での絞り込み、利用率などの集計レポート、OpenAPI クライアント自動生成（後続課題）、DB スキーマ変更

## 前提・リスク

- シートの説明文と背景には「予約一覧・利用実績」とあるが、要件（RPT-01〜05）と受入条件は予約一覧の CSV だけを規定している。本要件では、別形式の「利用実績」帳票は作らず、予約一覧 CSV を期間とステータスで絞り込めることで利用実績の用途も満たすものとして扱う
- RPT-05 は「管理者ページ」と書くが、回答により `/reservations` に置く。ADMIN 以外に表示しないことと、API 側の 403 で ADMIN 限定を担保する
- 後続課題（OpenAPI クライアント自動生成、E2E テスト追加）が本エンドポイントを前提にするため、パラメータ名と応答形式は api-spec に明記して固定する
