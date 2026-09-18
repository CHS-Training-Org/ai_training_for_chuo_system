# Security Test Instructions: csv-export

Requirements Analysis で有効化した Security Baseline 拡張（SECURITY-01〜15）のうち、本タスクで「準拠」と判定した項目を実際に検証する手順。

## SECURITY-08（アプリケーション層アクセス制御）

`ReportControllerTest` の以下のテストで自動検証済み：

```bash
cd backend && ./gradlew test --tests "*ReportControllerTest.exportReservationsCsv_with*"
```

- `exportReservationsCsv_withMember_returns403Forbidden`
- `exportReservationsCsv_withApprover_returns403Forbidden`
- `exportReservationsCsv_withoutAuth_returns401Unauthorized`
- `exportReservationsCsv_withAdmin_returnsCsvWithBomAndJapaneseHeader`

## SECURITY-05（入力検証・インジェクション対策）

CSV インジェクション対策（BR-04）は `ReservationCsvWriterTest`（`CsvInjection` ネストクラス）と、`ReportControllerTest`
の `exportReservationsCsv_withFromAndTo_filtersByStartAt`（`=1+1` を含むシード行のサニタイズを確認）で検証済み。

追加の手動確認（推奨）：

1. ADMIN で `/reservations/new` から目的欄に `=SUM(A1:A10)` を含む予約を作成する
2. `/admin/reports` から CSV をダウンロードし、テキストエディタで開いて `'=SUM(A1:A10)`（先頭にアポストロフィ）になっていることを確認する
3. Excel で同じ CSV を開き、数式として実行されず文字列として表示されることを確認する

## 対象外（Requirements Analysis で N/A・許容と判定済み）

- **SECURITY-10（依存脆弱性スキャン）**：リポジトリ全体に未導入。本タスクでは新規導入しない（別 Issue 推奨）
- **SECURITY-11（レート制限）**：本エンドポイント・既存エンドポイントいずれにも未実装。リポジトリ全体の課題として切り離し済み

判定の根拠は `Docs/spec/aidlc-docs/inception/requirements/requirements.md` の Security Baseline 適用結果を参照。
