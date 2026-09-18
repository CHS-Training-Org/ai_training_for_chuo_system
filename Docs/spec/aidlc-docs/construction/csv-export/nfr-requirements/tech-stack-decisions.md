# Tech Stack Decisions: CSV 帳票出力

新規に選定した技術スタックは opencsv のみ。他はすべて既存スタック（Spring Boot 4.0 / Java 25、Next.js 15）の範囲内で実装する。

## opencsv 5.12.0（CSV 生成ライブラリ）

- **決定**: opencsv 5.12.0 を採用する（ユーザーの明示的な指定）
- **比較検討**: 手書き `StringBuilder` 実装との比較
  - 手書き実装：依存ゼロだが、RFC 4180 準拠のクォート・エスケープ処理を自前で正しく実装する必要があり、コーナーケース（カンマ・改行・ダブルクォートを含む値）の考慮漏れのリスクがある
  - opencsv：実績のあるライブラリで CSV エスケープを任せられる。ただし `commons-lang3`・`commons-text`・`commons-beanutils`・`commons-collections4` の4つを推移的に引き込む
- **バージョン選定根拠**: 2026-09-11 時点で Maven Central の `maven-metadata.xml` を確認し、最新安定版 5.12.0 を採用。Java 8 ターゲットのため Java 25 でも問題なく動作する
- **未対応事項**: opencsv には CSV インジェクション対策機能がないため、`ReservationCsvWriter` 側で自前のサニタイズ（BR-04）を実装する
- **記録先**: この決定は ADR-033 として正式に記録する（Code Generation ステージで作成）

## 既存スタックの再利用（新規選定なし）

| 技術 | 用途 | 備考 |
|---|---|---|
| Spring MVC `StreamingResponseBody` | ストリーミング出力 | 標準機能。追加依存不要 |
| Spring Data JPA `@QueryHints` | フェッチサイズ指定 | 標準機能 |
| Next.js Route Handlers | BFF プロキシ | フレームワーク標準機能。新規パッケージ追加なし |

**新規フロントエンド依存はゼロ**。`react-day-picker` 等の日付ピッカーライブラリは、`type="date"` の HTML 標準入力を採用することで不要になった（Functional Design・Application Design で確定済み）。
