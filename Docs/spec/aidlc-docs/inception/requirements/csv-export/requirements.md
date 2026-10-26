# Requirements：csv-export（予約一覧の CSV 帳票出力）

**作成日時**: 2026-10-26T01:31:09+00:00
**入力**: ビジネス要求シート `docs-next/docs/spec/enhancements/intermediate/csv-export.md`（RPT-01〜05、受入条件 5 件）、RE 補足 `../../reverse-engineering/csv-export-supplement.md`、確認質問への回答 `requirement-verification-questions.md`

## Intent Analysis

| 項目 | 内容 |
|---|---|
| User Request | 中級課題 csv-export を AI-DLC で進める（Issue #29、STEP-05） |
| Request Type | New Feature |
| Scope Estimate | Multiple Components（BE の新エンドポイントと CSV 生成、FE のダウンロード経路と新しい管理者画面、仕様 2 ファイル） |
| Complexity Estimate | Moderate |
| Requirements Depth | Standard |

## 要件の要約

ADMIN が新しい管理者画面で期間と承認ステータスを指定し、予約一覧を CSV（UTF-8 BOM 付き、日本語ヘッダ）としてダウンロードできるようにする。バックエンドに `GET /api/reports/reservations/csv`（ADMIN 限定）を新設する。レスポンス方式、CSV の生成方法、フロントエンドのダウンロード方式の 3 点は、Application Design で比較表を作ってから決める。

---

## 1. スコープ

### 1.1 対象

- 予約一覧の CSV 出力（RPT-01〜05）
- 新しい管理者画面での絞り込み入力と「CSV ダウンロード」ボタン

### 1.2 対象外

- 利用実績（リソース別の利用回数・時間などの集計）の CSV（Q1。別課題「利用実績の集計・グラフ表示」の範囲）
- PDF 帳票
- 申請者・リソース・カテゴリによる絞り込み
- `docs-next/docs/spec/requirements.md` の変更（Q2。シートの「UC-07（CSV・帳票出力）」と requirements.md の UC-07 の食い違いは、学習者が PR の任意メモに記載する）

## 2. 機能要件

### FR-1 エンドポイント（RPT-01）

- `GET /api/reports/reservations/csv` を新設する。
- 成功時は `200`、`Content-Type: text/csv; charset=UTF-8`、`Content-Disposition: attachment; filename="reservations_YYYYMMDD_HHmmss.csv"` を返す（ファイル名は FR-7）。
- ページングしない。絞り込み条件に一致する全件を 1 ファイルで返す。件数の上限は設けない。

### FR-2 CSV の列（RPT-02、Q7・Q8・Q9）

列は次の 7 列で、この順序とする。1 行目は次の見出しのヘッダ行とする。

| # | 見出し | 値 |
|---|---|---|
| 1 | 予約ID | 予約の UUID |
| 2 | リソース名 | `resources.name` |
| 3 | 申請者名 | `users.name` |
| 4 | 開始日時 | `start_at` を `yyyy-MM-dd HH:mm:ss` で出力 |
| 5 | 終了日時 | `end_at` を `yyyy-MM-dd HH:mm:ss` で出力 |
| 6 | 目的 | `purpose` |
| 7 | 承認状態 | 日本語ラベル（下表） |

承認状態のラベルは、フロントエンドの `RESERVATION_STATUS_LABELS`（`frontend/src/lib/labels.ts`）と同じ文言にする。

| status | ラベル |
|---|---|
| `PENDING` | 承認待ち |
| `APPROVED` | 承認済み |
| `REJECTED` | 却下 |
| `CANCELLED` | キャンセル済み |
| `DRAFT` | ドラフト（ベース実装では発生しないが、enum に存在するため定義する） |

### FR-3 CSV の書式（受入条件、前提として承認済み）

- 文字コードは UTF-8 で、先頭に BOM（`EF BB BF`）を付ける。
- 改行コードは CRLF。
- 値にカンマ、ダブルクォート、CR、LF のいずれかを含むセルはダブルクォートで囲み、値の中のダブルクォートは 2 つ重ねる（RFC 4180）。
- 該当する予約が 0 件のときは、BOM とヘッダ行だけの CSV を返す。

### FR-4 CSV インジェクション対策（Q11）

- 値の先頭文字が `=` `+` `-` `@`、タブ（`\t`）、CR（`\r`）のいずれかであるセルは、先頭にシングルクォート `'` を付けて出力する。
- 対策は FR-3 のエスケープより先に適用する（`'` を付けた後の値に対して RFC 4180 のエスケープを判定する）。
- 対策の対象は全列とする。現在の 7 列で先頭が対象文字になりうるのは自由入力のリソース名、申請者名、目的だが、列ごとに判定を変えない。

### FR-5 絞り込み（RPT-03、Q3〜Q6）

| パラメータ | 型 | 必須 | 規則 |
|---|---|---|---|
| `from` | 日付 `YYYY-MM-DD` | 任意 | 開始日時が `from` の 00:00:00 以降の予約に絞る |
| `to` | 日付 `YYYY-MM-DD` | 任意 | 開始日時が `to` の翌日 00:00:00 より前の予約に絞る（`to` の日を含む） |
| `status` | string（複数指定可） | 任意 | `?status=PENDING&status=APPROVED` の形で複数指定。指定したいずれかに一致する予約に絞る。未指定なら全ステータス |

- 期間は「開始日時が期間内にある予約」で判定する（Q3 B）。終了日時は判定に使わない。月をまたぐ予約は開始日の月にだけ載る。
- `from` と `to` は片方だけの指定も可（Q4 A）。両方未指定なら期間で絞らない。
- `from` と `to` を両方指定し、`from` が `to` より後のときは `400 VALIDATION_ERROR` を返す。同じ日付は許容する（その 1 日が対象）（Q5 A）。
- 日付として解釈できない `from` / `to`、enum にない `status` は `400 VALIDATION_ERROR` を返す（既存の型変換失敗の扱いと同じ）。
- 期間とステータスは AND で組み合わせる。

### FR-6 並び順（Q10）

開始日時の昇順。開始日時が同じ場合は予約 ID の昇順。

### FR-7 ファイル名（Q16）

`reservations_YYYYMMDD_HHmmss.csv`（ASCII のみ）。日時は CSV を生成したサーバーの現在時刻とする。どのサーバー（backend、Next.js）が付けるかは Q14 の方式に依存するため Application Design で決める。

### FR-8 認可（RPT-04、前提として承認済み）

- ADMIN のみアクセスできる。MEMBER / APPROVER は `403 FORBIDDEN`（既存と同じ JSON のエラー形式）。
- 未認証（JWT なし、不正、期限切れ）は `401`。
- ADMIN は全ユーザーの予約が対象。

### FR-9 管理者画面（RPT-05、Q15）

- 新しい管理者ページ（仮称 `/admin/reports`、画面名「帳票出力」）を追加する。パスと画面名は Application Design で確定する。
- ADMIN のみ表示する。他ロールのアクセスは既存の `/admin/*` 共通ガードで 403 画面とする。
- サイドナビの ADMIN 専用項目に、このページへのリンクを追加する。
- 画面には期間（開始日、終了日）とステータス（複数選択）の入力欄と、「CSV ダウンロード」ボタンを置く。
- ボタンを押すと、入力した条件で絞り込んだ CSV がブラウザにファイルとしてダウンロードされる。
- 入力欄の検証（`from` が `to` より後のとき等）をフロントエンドでも行うか、エラーをどう表示するかは、ダウンロード方式（Q14）と合わせて Application Design で決める。

## 3. 非機能要件

| ID | 区分 | 要件 |
|---|---|---|
| NFR-1 | セキュリティ | ADMIN 限定の認可（FR-8）をサーバー側で強制する。画面の非表示だけに依存しない |
| NFR-2 | セキュリティ | CSV インジェクション対策（FR-4）を行う。DB へのクエリはパラメータバインドで組み立てる |
| NFR-3 | セキュリティ | JWT をブラウザに露出させない。ダウンロード経路でもトークンはサーバー側で付与する（RE 補足 2.1・2.2） |
| NFR-4 | 性能 | 一覧取得で N+1 を起こさない（リソース名、申請者名を JOIN で取得する）。大量件数でのメモリ使用はレスポンス方式（Q12）の比較で扱う。数値の性能目標は設けない |
| NFR-5 | 互換性 | Excel（日本語環境）で開いたときに文字化けしない（BOM 付き UTF-8）。既存 API（`GET /api/reservations` 等）の挙動を変えない |
| NFR-6 | 保守性 | 4 レイヤーアーキテクチャに従う。CSV 生成ロジックは HTTP や DB に依存せず単体でテストできる形にする |
| NFR-7 | テスト容易性 | 受入条件の「CSV 生成ロジックのユニットテスト」を満たす。テスト範囲は第 5 節 |

## 4. 未決事項（Application Design で決める）

シートの「AI 活用ポイント」に従い、学習者の希望で比較表を作ってから決める（Q12〜Q14）。

| # | 論点 | 比較する候補 |
|---|---|---|
| D-1 | backend のレスポンス方式 | `StreamingResponseBody` / `ResponseEntity<byte[]>` |
| D-2 | CSV の生成方法 | 自前実装（`StringBuilder` / `Writer`） / `opencsv` |
| D-3 | frontend のダウンロード方式 | Route Handler で中継し `<a href download>` / Server Action と Blob |

D-1 と D-3 は互いに影響する（例：Server Action は本文を一度メモリに載せるため、D-1 でストリーミングを選んでも端から端まではストリーミングにならない）。D-3 はエラー時の画面表示（FR-9）とファイル名を付ける場所（FR-7）にも影響する。

## 5. テスト要件（Q17 B）

| 層 | 確認すること |
|---|---|
| BE ユニット | CSV 生成ロジック：ヘッダ行、列順、日時書式、ステータスのラベル、RFC 4180 のエスケープ（カンマ、ダブルクォート、改行）、CSV インジェクション対策（各対象文字、対象外の文字）、0 件、CRLF。BOM を付ける箇所がこの層なら BOM も |
| BE ユニット | Service：期間とステータスの条件の組み立て、`from` > `to` の検証、`to` の日を含む境界 |
| BE 結合 | Controller（H2 + MockMvc）：ADMIN で 200、`Content-Type`、`Content-Disposition`、BOM、絞り込み（期間の境界、複数ステータス、AND）、並び順、MEMBER / APPROVER で 403、未認証で 401、不正な日付や `status` と `from` > `to` で 400 |
| FE ユニット | ダウンロード経路が絞り込み条件を backend に渡すこと、JWT を付けること、エラー時の扱い。絞り込みフォームとボタンの挙動。サイドナビの ADMIN 項目（`nav-items.test.ts`） |

E2E（Playwright）は追加しない。PostgreSQL と画面での確認は学習者が行う（前回と同じ運用）。

## 6. 拡張機能

| Extension | Enabled | 理由 |
|---|---|---|
| Security Baseline | No | 中級課題の範囲。必要なセキュリティ要件（NFR-1〜3）は本書に個別に入れる |
| Resiliency Baseline | No | 学習用の機能追加で、可用性の目標を扱わない |
| Property-Based Testing | No | CSV 生成は例示ベースのユニットテストで確認する |

## 7. 更新が必要な仕様（Code Generation より前に `/update-spec` で統合する）

- `docs-next/docs/spec/api-spec.md`：§帳票出力（新セクション）に `GET /api/reports/reservations/csv` を追記する。エンドポイント一覧表に行を追加する。API 設計方針の「レスポンス形式：JSON」に、CSV を返す本エンドポイントが例外であることを書く。
- `docs-next/docs/spec/screen-spec.md`：画面一覧に新しい管理者ページを追加し、サイドナビ表に ADMIN 専用項目を追加する。新しいページの節（UI 要素、アクセス制御）を追加する。
- `docs-next/docs/spec/requirements.md`：変更しない（Q2 A）。

## 8. 受入条件との対応

| 受入条件（シート） | 対応する要件 |
|---|---|
| 「CSV ダウンロード」ボタンで予約一覧が CSV としてダウンロードされる | FR-1、FR-9 |
| 日本語ヘッダ行、UTF-8（BOM 付き） | FR-2、FR-3 |
| 期間・ステータスで絞り込んだ CSV をダウンロードできる | FR-5、FR-9 |
| MEMBER / APPROVER は 403 | FR-8 |
| CSV 生成ロジックのユニットテスト | NFR-7、第 5 節 |
