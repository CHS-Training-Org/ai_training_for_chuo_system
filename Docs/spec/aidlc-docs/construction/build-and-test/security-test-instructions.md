# Security Test Instructions — resource-list-filter

Security Baseline 拡張（`Docs/spec/aidlc-state.md` で `Enabled: Yes`）のうち、本ユニットに直接関連するのは **SECURITY-05（入力バリデーション）** のみ（他ルールは新規エンドポイント・新規データストア・新規認証機構を伴わないため N/A。根拠は `requirements.md` Extension Configuration 節参照）。

## SECURITY-05 検証項目

| 検証項目 | 方法 | 結果 |
|---|---|---|
| 長さ上限の強制 | `ResourceControllerTest.list_keywordExceeding100Chars_returns400ValidationError`（自動）+ 手動 `curl` で101文字の `keyword` を送信 | ✅ 両方で `400 VALIDATION_ERROR` を確認 |
| パラメータ化クエリ（インジェクション対策） | `ResourceRepository.search(...)` のコードレビュー：`@Param("keyword")` でバインドしており、文字列連結による JPQL 組み立てを行っていないことを確認 | ✅ コードレビューで確認済み |
| ワイルドカード文字の無害化 | `ResourceServiceTest.PrepareKeyword` 系テスト（自動）+ 手動 `curl` で `keyword=%` を送信し0件になることを確認 | ✅ 両方で確認（`integration-test-instructions.md` 参照） |

## Security Compliance サマリー

| SECURITY Rule | 判定 |
|---|---|
| SECURITY-01〜04, 06, 07, 09, 10, 13, 14 | N/A（新規データストア・新規ネットワーク構成・新規認証機構を伴わないため対象外） |
| SECURITY-05 | ✅ Compliant（上記3項目すべて確認済み） |
| SECURITY-08 | ✅ Compliant（既存の `@CurrentUser`・ロールチェックを変更せず維持） |
| SECURITY-11, 12, 15 | N/A（セキュリティクリティカルなロジックの新規追加・認証機構変更・新規例外パスなし。既存の `ValidationException`/`GlobalExceptionHandler` パターンをそのまま踏襲） |

blocking な非準拠項目はないため、Build and Test 完了の妨げにはならない。
