# Requirements — ユニット: csv-report（CSV 帳票出力）

## Intent Analysis Summary

- **User Request**: 管理者（ADMIN）が予約一覧を CSV でダウンロードできるようにする（GitHub Issue #29、ビジネス要求シート `docs-next/docs/spec/enhancements/intermediate/csv-export.md`、UC-07）
- **Request Type**: New Feature（帳票出力エンドポイントと画面ボタンの新設）
- **Scope Estimate**: Multiple Components（frontend + backend 両方）
- **Complexity Estimate**: Moderate（再利用できる既存実装はなく新規コンポーネントが中心だが、規模は小さい）
- **Requirements Depth**: Standard

## 機能要件

| # | 要件 |
|---|------|
| RPT-01 | `GET /api/reports/reservations/csv` を新設し、`Content-Type: text/csv; charset=UTF-8` で予約一覧を CSV ダウンロードできる。`Content-Disposition: attachment` でファイル名を返す |
| RPT-02 | CSV の列は予約 ID・リソース名・申請者名・開始日時・終了日時・目的・承認状態。1 行目に日本語ヘッダ行を持つ。承認状態は画面と同じ日本語ラベル（承認待ち・承認済み・却下・キャンセル済み・下書き）で出力する |
| RPT-03 | クエリパラメータ `from`・`to`・`status` で絞り込める（下記「決定事項」参照） |
| RPT-04 | ADMIN ロールのみアクセスできる（Spring Security の `@PreAuthorize("hasRole('ADMIN')")`）。MEMBER / APPROVER は 403 |
| RPT-05 | `/reservations` に ADMIN の場合のみ「CSV ダウンロード」ボタンを表示し、クリックで現在の絞り込み条件を引き継いだ CSV をブラウザにダウンロードさせる |

## 決定事項（Requirements Analysis で確定）

| # | 論点 | 決定 |
|---|------|------|
| 1 | `from`/`to` の意味 | 既存の予約一覧 API と同じ**期間重複判定**（`r.startAt < :to AND r.endAt > :from`、境界一致の隣接は含まない） |
| 2 | `from`/`to` の指定ルール | 両方指定、または両方なしのみ有効。片方だけ指定すると 400 `VALIDATION_ERROR`（既存 API と同じ）。両方なしは期間条件なしの全期間 |
| 3 | `status` 未指定時 | DRAFT を**含めない**（PENDING / APPROVED / REJECTED / CANCELLED のみ。画面一覧と同じ）。`status=DRAFT` を明示したときだけ DRAFT を出力する。`status` は複数指定可で、不正値は 400 |
| 4 | ボタン配置 | `/reservations`（既存の全予約一覧）のヘッダ行に、`profile.role === "ADMIN"` のときだけ表示する。`/admin/reservations` は新設しない |
| 5 | 件数上限 | 設けない（条件に合う全件を出力する） |
| 6 | レスポンス方式 | `ResponseEntity<byte[]>` で一括生成する。`StreamingResponseBody` は採用しない（別スレッドで動くため `open-in-view: false` の下の LAZY 取得が失敗しやすく、途中例外を JSON エラーで返せず、MockMvc テストも非同期になる） |
| 7 | CSV 生成方式 | 自前の小さな `CsvWriter` を実装する。OpenCSV・commons-csv は導入しない（7 列で足り、依存追加と ADR が不要） |
| 8 | 文字コード | UTF-8 BOM 付き（本文の先頭に `EF BB BF` を付けた `byte[]`） |
| 9 | フロントのダウンロード方式 | Route Handler がバックエンドから CSV を取得してバイト列のまま返し、ボタンは `<a download>` リンク（Bearer トークンが要るためブラウザから直接バックエンドを叩かない） |

## 既定の前提（レビューで変更可）

質問せず、次の既定値を置く。承認時に違和感があれば Request Changes で指定する。

- **ソート順**：開始日時の昇順、同値は予約 ID の昇順（出力の再現性のため）
- **日時書式**：`yyyy-MM-dd HH:mm`（タイムゾーン変換なし。既存どおり `LocalDateTime` をそのまま整形する）
- **改行コード**：CRLF（Excel 互換）
- **ファイル名**：`reservations_yyyyMMdd.csv`（出力日。日本語を含めない）
- **件数 0 のとき**：ヘッダ行のみの CSV を返す（エラーにしない）

## 非機能要件

- **セキュリティ（機能要件として扱う）**：Security Baseline 拡張は適用しない。ただし ADMIN 限定（RPT-04）に加え、CSV 数式インジェクション対策として、セルの先頭が `=` `+` `-` `@` タブ・復帰のいずれかの場合は先頭に `'` を付ける。フィールドにカンマ・二重引用符・改行を含む場合は RFC 4180 に従い二重引用符で囲み、内部の `"` は `""` にエスケープする
- **アクセス制御の厚み**：未認証は 401、MEMBER / APPROVER は 403（`{code:"FORBIDDEN"}`）。フロントはボタンを出さないだけでなく、Route Handler もバックエンドの 401/403 をそのまま返す
- **N+1 回避**：全件取得クエリは `JOIN FETCH r.resource JOIN FETCH r.requester` を付ける（`open-in-view: false` のため必須）
- **コード品質**：Checkstyle（`ParameterNumber` 最大 7 など）・Spotless（googleJavaFormat）に適合させる。条件は record（例 `ReportCondition`）にまとめる
- **性能**：上限なしのため大量データ時はメモリ使用量が増える（受け入れ済みのトレードオフ）。`start_at`/`end_at` にインデックスは無い（本課題では追加しない）
- **テスト容易性**：`CsvWriter` と `ReservationReportService` はユニットテスト、`ReportController` は MockMvc で BOM・ヘッダ・403 を検証する。Property-Based Testing は適用しない

## 受入条件（シートより）

- [ ] ADMIN が `/reservations` で「CSV ダウンロード」を押すと、予約一覧が CSV ファイルとしてダウンロードされる
- [ ] CSV に日本語ヘッダ行があり、文字コードは UTF-8（BOM 付き）
- [ ] 期間・ステータスで絞り込んだ CSV をダウンロードできる
- [ ] MEMBER / APPROVER が API にアクセスすると 403
- [ ] バックエンドに CSV 生成ロジックのユニットテストがある

## 影響範囲（RE 成果物に基づく変更予定ファイル）

仕様（Spec-first で先に更新）
- `docs-next/docs/spec/api-spec.md`：「帳票出力」セクションを追記
- `docs-next/docs/spec/screen-spec.md`：`/reservations` の ADMIN 用ボタンを追記
- `docs-next/docs/spec/requirements.md`：RPT-01〜05 を反映

バックエンド（`backend/src/main/java/com/example/bookflow/`）
- `presentation/ReportController.java`（新規）
- `application/ReservationReportService.java`（新規）
- `application/csv/CsvWriter.java`（新規）
- `presentation/dto/ReportCondition.java`（新規、record）
- `domain/ReservationRepository.java`（ページングなし全件取得クエリを追加）
- テスト（新規）：`CsvWriterTest`、`ReservationReportServiceTest`、`ReportControllerTest`

フロントエンド（`frontend/src/`）
- `app/api/reports/reservations/csv/route.ts`（新規）
- `app/(authenticated)/reservations/CsvDownloadButton.tsx`（新規。ページ専用コンポーネントはページと同じディレクトリに置く既存の運用に合わせる）
- `app/(authenticated)/reservations/page.tsx`（ADMIN のときボタンを表示）
- テスト（新規）：Route Handler、ボタン、ページの ADMIN / MEMBER 出し分け

## スコープ外

- PDF 帳票、利用実績（集計）の CSV、非同期ジョブ化、`/admin/reservations` の新設、`start_at` 系インデックスの追加、`resourceName` 絞り込みの CSV 対応（画面の `resourceName` は CSV に引き継がない）
