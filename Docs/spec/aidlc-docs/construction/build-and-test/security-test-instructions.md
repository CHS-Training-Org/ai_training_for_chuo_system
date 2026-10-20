# Security Test Instructions — csv-export

Security Baseline 拡張（`Docs/spec/aidlc-state.md` で `Enabled: Yes`）に対する検証結果。blocking は SECURITY-05 / 08 / 15。コード生成時の判定根拠（ファイル・行）は `Docs/spec/aidlc-docs/construction/csv-export/code/summary.md` を参照。ここでは**実行して確かめた結果**を記録する。

## 検証項目

| ルール | 検証項目 | 方法 | 結果 |
|---|---|---|---|
| SECURITY-05 | 入力検証（`from` / `to` / `status`） | `ReportControllerTest`（自動）+ 実 BE への `curl`（`from` >= `to`・不正な日時・不正な `status`） | ✅ いずれも `400 VALIDATION_ERROR`（書き出し前に確定） |
| SECURITY-05 | パラメータ化クエリ | `ReservationRepository#findForReport` のレビュー | ✅ `@Param` のみ。文字列連結なし |
| SECURITY-05 | CSV 数式注入 | `ReservationCsvWriterTest`（先頭の `=` `+` `-` `@`・タブ・CR、無害化 → 引用の順序）+ 実 PostgreSQL 経由の CSV を標準の CSV パーサで往復 | ✅ `'=HYPERLINK(...)` などで出力され、元の値が復元できる。Excel での実行抑止は V-02（手動）で確認済み（2026-10-20、学習者が実施。#4・#5 ○） |
| SECURITY-05 | `error` クエリの表示 | `admin-reports-page.test.tsx` + 実機で `?error=<script>alert(1)</script>` | ✅ 許可リスト外は汎用メッセージ。値は描画されない（`constructor` 等のプロトタイプ名も許可外として扱う） |
| SECURITY-08 | ADMIN 限定 | `ReportControllerTest` + 実 BE（MEMBER / APPROVER で 403、未認証で 401）+ 実 FE（MEMBER は 303 → `?error=FORBIDDEN`、ページは 403 画面） | ✅ |
| SECURITY-15 | 事前検証・fail closed | 400 / 401 / 403 が通常の JSON エラーで返り、CSV の書き出しが始まらない | ✅ |
| SECURITY-15 | 書き出し中の失敗 | `ReservationReportServiceTest`（IOException・Repository 例外で WARN 1 行・例外を伝播）+ 実機のタイムアウト | ✅ WARN が 1 行出る。ただし**途中切断をクライアントが検知できない**点は残余リスク（`performance-test-instructions.md` V-04） |
| SECURITY-03 | ログに PII を出さない | `ReservationReportServiceTest`（利用目的・氏名・例外メッセージを含まない）+ 実機ログの目視 | ✅ `userId`・条件・件数・所要時間のみ |
| SECURITY-04 | 応答ヘッダ | 実 FE への `curl -D -` | ✅ CSV 応答に `Cache-Control: no-store` と `X-Content-Type-Options: nosniff`。アプリ全体の CSP / HSTS / `X-Frame-Options` は未設定（既知のギャップ。別課題） |

## Security Compliance サマリー

| SECURITY Rule | 判定 |
|---|---|
| SECURITY-05 | ✅ Compliant |
| SECURITY-08 | ✅ Compliant |
| SECURITY-15 | ✅ Compliant（書き出し開始後の途中切断は検知できない。残余リスクとして記録） |
| SECURITY-03 / 11 | ✅ Compliant |
| SECURITY-04 | △ Partial（CSV 応答のみ対応。全画面のヘッダは別課題） |
| SECURITY-01 / 02 / 06 / 07 / 09 / 10 / 12 / 13 / 14 | N/A（新規データストア・インフラ・認証方式・依存・シークレットの追加なし） |

non-compliant は 0 件。SECURITY-04 の全画面ヘッダは、設計時点（NFR Requirements の決定 4）から別課題と合意済みで、Build and Test の妨げにはならない。
