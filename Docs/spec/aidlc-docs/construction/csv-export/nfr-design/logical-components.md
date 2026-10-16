# Logical Components — csv-export

NFR を満たすために新設・変更する論理コンポーネントと設定値。新規のインフラ要素は追加しない。

## 1. コンポーネントへの NFR の割り当て

| コンポーネント（`components.md`） | 追加される NFR 上の責務 | パターン |
|---|---|---|
| C1 `ReportController` | `@CurrentUser User` からユーザー ID を取り出して渡す。書き出し前に `validate` を同期で呼ぶ。`Cache-Control: no-store` 等のヘッダを設定 | D-01 / D-04 / D-06 |
| C2 `ReservationReportService` | 500 件ページのループ。`try / finally` で完了 INFO / 未完了 WARN を 1 行出す（件数・所要時間・失敗種別） | D-02 / D-04 |
| C3 `ReservationCsvWriter` | `toCell`（数式注入 → RFC 4180）、ステータス 5 値のラベル。ログは出さない | D-03 |
| C4 `ReservationRepository` | `findForReport` に `@Transactional(readOnly = true)`、`JOIN FETCH`、`CAST` 付き任意パラメータ | D-02 |
| C5 CSV 中継 Route Handler | `nosniff` と `no-store` を応答に付与。BE のヘッダを引き継ぐ | D-06 |
| `application.yml`（設定） | `spring.mvc.async.request-timeout: 300s` | D-05 |

`ReservationCsvWriter` は Spring に依存しないため、ログも出さない。ログは Service に集約する。

## 2. 設定値

| キー | 値 | 場所 | 備考 |
|---|---|---|---|
| `spring.mvc.async.request-timeout` | `300s` | `application.yml` | 暫定。Build and Test の V-04 で確認 |
| ページサイズ | 500 | `ReservationReportService` の定数 | 設定ファイルには出さない |
| `spring.jpa.open-in-view` | `false` | `application.yml`（既存） | 変更なし |

## 3. 新規インフラ・依存の有無

| 項目 | 追加の有無 | 備考 |
|---|---|---|
| キュー・キャッシュ・サーキットブレーカー | なし | Resiliency Baseline = No |
| 専用の実行基盤（Executor） | なし | 既定の `applicationTaskExecutor`（Q2=A） |
| 同時実行制御（セマフォ・429） | なし | Q2=A |
| 監査テーブル・Flyway マイグレーション | なし | Q3（NFR）=A |
| 依存ライブラリ | なし | `logstash-logback-encoder:8.0` は導入済み（`StructuredArguments` を使用） |
| FE のヘッダ設定（`next.config.ts` / ミドルウェア） | なし | Route Handler の応答のみ |

## 4. ログ出力の定義

項目は `nfr-design-patterns.md` D-04 の表を正とする。出力先は既存の Logstash JSON（`logback-spring.xml`）。ロガー名は `ReservationReportService` のクラス名。

| レベル | `event` | 条件 |
|---|---|---|
| INFO | `csv_export_completed` | 全ページを書き出し終えた |
| WARN | `csv_export_aborted` | 途中の例外（切断・DB エラー・タイムアウト）で終えた |

PII（氏名・メール・利用目的）と CSV の中身、例外メッセージは、どちらの行にも含めない。

## 5. テストへの影響（Code Generation に引き継ぐ）

- `ReservationReportServiceTest`（Mockito）: 完了時に INFO、書き出し中の例外で WARN が出ること。項目が揃い、PII を含まないこと。例外が伝播すること。ログの検証には、`ListAppender` 等の既存手段を確認して使う（新しい依存は足さない）。
- `ReportControllerTest`: `application.yml` の `request-timeout` の値そのものは検証しない（V-04 の手動確認）。
- FE: Route Handler の Vitest で `nosniff` / `no-store` と BE ヘッダの引き継ぎを検証する。
