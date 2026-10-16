# Requirements — CSV 帳票出力（予約一覧の CSV エクスポート）

## Intent Analysis Summary

- **User Request**: Issue #29 / `docs-next/docs/spec/enhancements/intermediate/csv-export.md`（CSV 帳票出力）を `/aidlc` で実装する。管理者が予約一覧を CSV（UTF-8 BOM 付き、Excel 対応）でダウンロードできるようにする。
- **Request Type**: New Feature（既存の予約データを CSV 化する新規エンドポイントと管理者画面の追加）
- **Scope Estimate**: Multiple Components（backend: presentation / application / domain の 3 層 + frontend: 新規ページ・Route Handler・ナビ項目）
- **Complexity Estimate**: Moderate（機能は単純だが、ストリーミング応答・CSV エスケープ・数式注入対策・PostgreSQL/H2 両対応の任意パラメータクエリが絡む）
- **Depth**: Standard（要件シートは明確だが、実装方式・UC 番号・設置場所・フィルタの意味など 9 点の未決定事項と、拡張機能 3 種の適用可否を確認質問で全て解消済み）

## 確認質問への回答サマリー

回答元: `requirement-verification-questions.md`（全 12 問。矛盾・曖昧さなし）

| Q | 論点 | 決定 |
|---|------|------|
| Q1 | UC 番号の食い違い | A: `requirements.md` に UC-09 を新規追加し、シートの「UC-07」表記を UC-09 に修正する |
| Q2 | ボタンの設置場所 | A: 新規ページ `/admin/reports` を作成し、`nav-items.ts` の `ADMIN_ITEMS` に「帳票出力」を追加する |
| Q3 | BE の CSV 生成方式 | A: `StreamingResponseBody` + 手書き CSV 生成（外部ライブラリなし。DB 読み出しはページ単位ループ） |
| Q4 | FE のダウンロード方式 | A: Route Handler 経由（サーバー側で JWT を付与し BE をストリーミング中継） |
| Q5 | 「承認状態」の意味 | A: `reservations.status`。日本語ラベルで出力し、`status` クエリは複数指定可 |
| Q6 | 期間絞り込みの意味 | A: `start_at` が `from` 以上 `to` 未満。片方のみ指定可。`from` >= `to` は 400 |
| Q7 | 列構成と表記 | A: 7 列のみ、日時は `yyyy-MM-dd HH:mm`、改行は CRLF |
| Q8 | CSV 数式注入対策 | A: 先頭が `=` `+` `-` `@`・タブ・CR の値に `'` を付与する |
| Q9 | 出力件数の上限 | A: 上限なし |
| Q10 | Security Baseline | A: Yes（適用） |
| Q11 | Resiliency Baseline | B: No（適用しない） |
| Q12 | Property-Based Testing | C: No（適用しない） |

## Functional Requirements

| # | 要件 | 出典 |
|---|------|------|
| FR-01 | `GET /api/reports/reservations/csv` を新設し、`Content-Type: text/csv; charset=UTF-8` で予約一覧を返す。レスポンスは `Content-Disposition: attachment; filename="reservations_yyyyMMdd_HHmmss.csv"` を持つ | RPT-01 |
| FR-02 | CSV の先頭に UTF-8 BOM（`EF BB BF`）を付ける。文字コードは UTF-8、改行コードは CRLF | 受入条件 + Q7 |
| FR-03 | CSV は日本語ヘッダ行（予約ID, リソース名, 申請者名, 開始日時, 終了日時, 利用目的, ステータス）の 1 行と、予約 1 件 = 1 行のデータ行で構成する。列は 7 列のみ | RPT-02 + Q7 |
| FR-04 | 日時列は `yyyy-MM-dd HH:mm`（秒なし・タイムゾーン変換なし、DB の値そのまま）で出力する | Q7 |
| FR-05 | ステータス列は `reservations.status` を日本語ラベルで出力する（`PENDING`=承認待ち、`APPROVED`=承認済み、`REJECTED`=却下、`CANCELLED`=キャンセル済み。表記は `frontend/src/lib/labels.ts` の `RESERVATION_STATUS_LABELS` と一致させる） | RPT-02 + Q5 |
| FR-06 | クエリパラメータ `status`（任意・複数指定可。`?status=PENDING&status=APPROVED`）で `reservations.status` を絞り込む。未指定は全ステータス。許可する値は `ReservationStatus` の列挙値 | RPT-03 + Q5 |
| FR-07 | クエリパラメータ `from` / `to`（任意・ISO 日時。形式は `GET /api/resources` と同じ `2025-06-01T09:00:00`）で、`start_at` が `from` 以上かつ `to` 未満の予約に絞り込む。片方のみの指定も許可し、未指定側は無制限とする | RPT-03 + Q6 |
| FR-08 | `from` と `to` が両方指定され、`from` が `to` 以上の場合は `400 Bad Request`（`code: VALIDATION_ERROR`）を返す。日時形式が不正な場合・`status` が不正な値の場合も 400 を返す | Q6 + SECURITY-05 |
| FR-09 | 出力対象は全ユーザーの予約（ADMIN 専用機能のため本人分に限定しない）。`status` / `from` / `to` は AND 条件で組み合わせる | RPT-01〜03 |
| FR-10 | 出力順は `start_at` 昇順、同一なら `id` 昇順とする（ページ単位読み出しでの順序安定のため） | 設計上の前提（Q3 のページ単位ループ） |
| FR-11 | 出力件数に上限は設けない。DB の読み出しはページ単位で繰り返し、メモリ使用量を一定に保つ | Q9 + Q3 |
| FR-12 | 文字列セル（リソース名・申請者名・利用目的）の値が `=` `+` `-` `@`・タブ・CR のいずれかで始まる場合、先頭に `'` を付与して数式として評価されないようにする。無害化はカンマ・改行・`"` のエスケープより先に行う | Q8 |
| FR-13 | CSV のエスケープは RFC 4180 に従う。値にカンマ・改行（CR / LF）・`"` が含まれる場合は値全体を `"` で囲み、値中の `"` は `""` にする | Q3（手書き生成） |
| FR-14 | `ADMIN` ロールのみアクセスできる。`MEMBER` / `APPROVER` は 403、未認証は 401 を返す | RPT-04 |
| FR-15 | 新規ページ `/admin/reports`（帳票出力）を作成する。期間（`from` / `to`）・ステータスの入力欄と「CSV ダウンロード」ボタンを持つ。ADMIN ガードは既存の `admin/layout.tsx` を使う | RPT-05 + Q2 |
| FR-16 | サイドナビの `ADMIN_ITEMS` に「帳票出力」（`/admin/reports`）を追加する。ADMIN のみ表示 | Q2 |
| FR-17 | ダウンロードは Next.js の Route Handler（例: `app/api/reports/reservations/csv/route.ts`）が、セッションから JWT を取得して BE の `GET /api/reports/reservations/csv` へ中継し、BE のレスポンス（ヘッダ含む）をストリーミングのままブラウザへ返す。ボタンは通常の GET ダウンロードとして動作する | RPT-05 + Q4 |
| FR-18 | 仕様書を Spec-first で更新する: `requirements.md` に UC-09「管理者が予約を CSV でエクスポートする」を追加、`api-spec.md` に §帳票出力（新セクション）、`screen-spec.md` に `/admin/reports` を追記、シート（`csv-export.md`）の UC 表記を UC-09 に修正する | シート §影響範囲 + Q1 |

## Non-Functional Requirements

| # | 要件 | 出典 |
|---|------|------|
| NFR-01 | CSV 生成は外部ライブラリ（opencsv 等）を使わず手書きし、`build.gradle.kts` に依存を追加しない | Q3 |
| NFR-02 | 応答は `StreamingResponseBody` で逐次書き出す。認可（403）とパラメータ検証（400）は、書き出し開始前に完了させる（書き出し開始後は HTTP ステータスを変更できないため） | Q3 |
| NFR-03 | DB 互換性: H2（テスト）と PostgreSQL（本番）の両方で動作する JPQL のみ使用する。任意パラメータ（`from` / `to` / `status`）の `IS NULL OR ...` 形式は、PostgreSQL の null バインド変数の型推論エラー（#76 で実際に発生）を避けるため `CAST(:param AS ...)` 等で対策し、**実 PostgreSQL 上でも検証する** | `requirements.md` §非機能要件 + #76 の教訓 |
| NFR-04 | N+1 を避けるため、`resource` / `requester` を `JOIN FETCH` で読み出す（既存 `ReservationRepository` の方針を踏襲）。ストリーミングは別スレッドで実行されるため、LAZY 関連への遅延アクセスに依存しない | 既存方針 + Q3 |
| NFR-05 | 4 層アーキテクチャを厳守する。CSV の組み立てロジックは `application` 層（または CSV 専用のクラス）に置き、Controller は入出力の受け渡しに限定する。CSV エスケープ・無害化は、単体テスト可能な純粋なロジックとして分離する | CLAUDE.md + 受入条件（単体テスト） |
| NFR-06 | FE の BFF 方針: JWT はサーバー側に閉じ込める。Route Handler の採用は ADR-004（Server Actions 主体）に対する例外であり、その理由（Server Action はファイルのストリーミング配信に向かない。`architecture.md` の「App Router + API Routes」の範囲内）を設計成果物に明記する | Q4 + ADR-004 |
| NFR-07 | テスト: BE に CSV 生成ロジックのユニットテスト（エスケープ・BOM・ヘッダ・日時書式・ステータスラベル・数式注入対策・空結果）、Controller の結合テスト（ADMIN で 200、MEMBER / APPROVER で 403、未認証で 401、`from` >= `to` で 400、`status` / 期間絞り込み）を追加する。FE は既存の Vitest + MSW 方式で追加し、`nav-items.test.ts` に「帳票出力」の表示制御を追加する。Property-Based Testing は適用しない | 受入条件 + Q12 + ADR-009 / ADR-018 |

## Extension Configuration（本タスクへの適用結果）

| Extension | Enabled | 本タスクへの適用範囲 |
|---|---|---|
| Security Baseline | Yes | 下記「Security Baseline 適用マッピング」参照。blocking 項目は SECURITY-05 / 08 / 15（および 03 / 11 の確認） |
| Resiliency Baseline | No | 適用しない（既存システムへの読み取り専用機能の追加であり、新規インフラ・外部連携なし） |
| Property-Based Testing | No | 適用しない（CSV エスケープは通常のユニットテストで境界値を列挙して検証する） |

### Security Baseline 適用マッピング

| ルール | 本タスクとの関係 | 想定判定 |
|---|---|---|
| SECURITY-03 アプリケーションログ | 既存のリクエストログ（ADR-017、クエリストリング含む・ヘッダ／ペイロード除外）を使用。CSV の中身（申請者名等の PII）をログに出さない | 確認対象（既存基盤を利用） |
| SECURITY-05 入力検証 | `from` / `to`（形式・前後関係）、`status`（列挙値）を書き出し前に検証。DB アクセスは `@Param` によるパラメータ化クエリのみ（文字列連結禁止）。CSV 出力値の無害化（FR-12）を入力値由来の出力として扱う | blocking（Code Generation 完了時に compliant/non-compliant を明示） |
| SECURITY-08 アクセス制御 | `@PreAuthorize("hasRole('ADMIN')")` を BE 側で強制（画面側の非表示だけに頼らない）。FE の `admin/layout.tsx` ガードは多層防御の一層 | blocking |
| SECURITY-11 設計原則 | 多層防御（FE ガード + BE 認可 + 入力検証）。濫用シナリオとして「管理者アカウント侵害による予約データの一括持ち出し」を設計成果物で 1 件以上記述する。レート制限は公開 API ではなく ADMIN 限定のため N/A とし理由を記録する | 確認対象 |
| SECURITY-15 例外処理 | ストリーミング中の失敗でも DB 接続・リソースを解放する。エラー時のレスポンスに内部情報を出さない（既存 `GlobalExceptionHandler` を利用）。認可・検証は書き出し前に完了し、エラー時に fail closed とする | blocking |
| SECURITY-01 / 02 / 04 / 06 / 07 / 09 / 10 / 12 / 13 / 14 | 新規データストア・インフラ・認証方式・依存の追加なし（NFR-01） | N/A（Code Generation 時に理由を 1 行ずつ記録） |

## User Scenarios

- **主シナリオ**: ADMIN が `/admin/reports` を開き、期間（例: 2026-10-01〜2026-11-01）とステータス（例: 承認済み）を指定して「CSV ダウンロード」を押すと、該当する予約が `reservations_20261014_153000.csv` としてダウンロードされる。Excel で開くと、日本語のヘッダ・値が文字化けせず、1 予約 1 行で表示される。
- **全件出力**: 条件を何も指定せずにダウンロードすると、全期間・全ステータスの予約が出力される。
- **片側のみの期間指定**: `from` だけ指定すると、その日時以降に開始する予約が出力される。
- **条件に合う予約がない**: ヘッダ行のみの CSV（BOM 付き）が返る。エラーにはしない。
- **権限なし**: MEMBER / APPROVER が `/admin/reports` を開くと 403 画面（既存の `admin/layout.tsx`）。API を直接呼んだ場合は BE が 403 を返す。未ログインの場合は 401。
- **不正な条件**: `from` が `to` 以上、日時形式が不正、`status` が不正な値の場合、BE が 400（`VALIDATION_ERROR`）を返す。
- **数式注入（エッジケース）**: 申請者が利用目的に `=HYPERLINK(...)` と入力していても、CSV 上では `'=HYPERLINK(...)` として出力され、Excel で開いても数式として実行されない。
- **特殊文字（エッジケース）**: 利用目的に「A,B 会議」「改行を含む文」「"引用"」が含まれていても、列が崩れず元の値が復元できる。

## Business Context

- **Goals**: 予約データを Excel 等へ転記する・社内報告に使う用途のため、管理者が予約を CSV で取得できるようにする（シート §背景）。
- **Constraints**: 推定工数はシートが半日〜1 日、Issue が 2〜3 日と食い違うが、実装に影響しない（学習者向けの目安として 1 日以上を見込む）。既存の 4 層アーキテクチャ・Server Actions 主体の BFF 方針からの逸脱は Route Handler の 1 箇所に限定する。
- **Success Criteria**: シートの受入条件 5 項目（ボタンでダウンロード、日本語ヘッダ + UTF-8 BOM、期間・ステータス絞り込み、MEMBER / APPROVER は 403、BE ユニットテスト追加）をすべて満たし、既存の BE / FE テストが pass し続けること。

## Technical Context

- **Integration Points**: 新規エンドポイント `GET /api/reports/reservations/csv`（BE）。FE は新規 Route Handler と新規ページ `/admin/reports`、ナビ項目の追加。既存の予約一覧 API（`GET /api/reservations`）は変更しない。
- **Data Requirements**: 新規テーブル・カラムなし。既存の `reservations`（+ `resources.name`・`users.name` の JOIN）を読み取る。Flyway マイグレーションは不要。
- **System Boundaries**: 変更範囲は BE の `presentation` / `application` / `domain`（`ReservationRepository` への期間・ステータス条件付きクエリ追加）と、FE の `app/(authenticated)/admin/reports/`・`app/api/reports/...`・`components/layout/nav-items.ts`。`infrastructure/security` は既存の `@EnableMethodSecurity` を利用するため変更しない。
- **既存資産の再利用**: `@PreAuthorize("hasRole('ADMIN')")`（`UserController` の前例）、`ReservationStatus`、`RESERVATION_STATUS_LABELS`（`labels.ts`）、`ReservationRepository` の `JOIN FETCH` クエリ方針、`createApiClient` の認証付き呼び出しの考え方、`admin/layout.tsx` の ADMIN ガード、テスト基盤（`BaseControllerTest` / `@WithMockAdmin` 等 / MSW）。

## Quality Attributes

- **Reliability**: ストリーミング中の例外時もリソースを解放する。書き出し開始前の検証漏れによる「200 で壊れた CSV」を防ぐ。
- **Maintainability**: CSV エスケープ・無害化・書式変換を純粋なロジックとして分離し、単体テストで意図を示す（ADR-018 の命名規約に従う）。
- **Testability**: ユニットテスト（CSV 生成ロジック）と結合テスト（認可・絞り込み）を分離する。PostgreSQL 固有の挙動は実 DB での手動検証を Build and Test に含める。
- **Usability**: Excel でそのまま開ける（BOM・CRLF・日時書式）。ダウンロード失敗時の見せ方は Functional Design / Code Generation で決める。
- **Accessibility**: `/admin/reports` の入力欄には `label` を関連付ける（既存フォームのパターンを踏襲）。

## Out of Scope（本タスクで扱わない）

- 利用実績（稼働率・集計）の CSV 出力（シートの description に記載があるが、RPT-01〜05 は予約一覧のみ）
- PDF 帳票出力（`requirements.md` §スコープに「CSV / PDF 帳票出力」とあるが、本課題は CSV のみ）
- 出力件数の上限、非同期ジョブでのファイル生成（データが大規模化した場合の別課題）
- 承認ステップ（`approval_steps`）の情報（承認者・承認日時）の出力
- 参加人数・申請日時・更新日時の列
- 管理者以外（MEMBER / APPROVER）への自分の予約の CSV 出力
- Resiliency Baseline / Property-Based Testing の適用

## 調査で判明した既存ドキュメント・Issue の食い違い（記録）

- Issue #29 本文のシートパス `Docs/spec/enhancements/csv-export.md` は誤りで、正しくは `docs-next/docs/spec/enhancements/intermediate/csv-export.md`（Issue 本文は本タスクでは変更しない。必要ならレビュー時に修正を依頼する）。
- シート・Issue の「UC-07（CSV・帳票出力）」は既存 UC-07（自分の予約一覧の確認・編集・キャンセル）と衝突する → Q1 により UC-09 を新設して解消（FR-18）。
- シートの「`/admin/resources` または管理者向けページ」の記載 → Q2 により `/admin/reports` に確定（FR-15）。`screen-spec.md` の追記先もこれに合わせる。
- 工数の食い違い（Issue 2〜3 日 / シート半日〜1 日）は実装に影響しないため放置する。

## Summary（要点）

本タスクは、ADMIN が予約を CSV でダウンロードできる機能の追加である。バックエンドは `GET /api/reports/reservations/csv` を `StreamingResponseBody` + 手書き CSV 生成で実装し、BOM・CRLF・日本語ヘッダ・RFC 4180 エスケープ・数式注入対策を備える。フロントエンドは新規ページ `/admin/reports` と、JWT をサーバー側で付与して BE を中継する Route Handler を追加する（ADR-004 の例外として理由を記録）。絞り込みは `status`（予約ステータス・複数可）と `start_at` 基準の `from`/`to`（片方のみ可、`from` >= `to` は 400）。出力件数の上限は設けない。Security Baseline を適用し、SECURITY-05 / 08 / 15 が blocking の確認項目となる。PostgreSQL の null バインド変数型推論（#76 の教訓）への対策と実 DB での検証が最大の技術的リスクである。
