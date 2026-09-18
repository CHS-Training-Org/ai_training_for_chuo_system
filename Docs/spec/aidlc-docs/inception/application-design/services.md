# Services: CSV 帳票出力

## ReservationReportService

- **役割**: 帳票出力ユースケースの唯一のオーケストレーター
- **責務**: `ReportController` から呼ばれ、`ReservationRepository`（データ取得）と `ReservationCsvWriter`（書き出し）の間を仲介する。**トランザクション境界を確立する主体はこのサービスであり、これが本機能の設計上の要**（`StreamingResponseBody` のコールバック内から呼ばれるため）
- **オーケストレーション順序**: フィルタ正規化 → リポジトリから `Stream` を取得（トランザクション開始） → `ReservationCsvWriter.write()` に委譲 → `Stream` をクローズ（トランザクション終了）
- **既存サービスとの関係**: `ReservationService`（予約 CRUD のユースケース）とは別サービスとして新設する。既存の `ReservationService.list()` は所有権に基づく絞り込み（本人/ADMIN）を行うのに対し、帳票出力は常に全ユーザー分を対象とする点で責務が異なるため、既存サービスへのメソッド追加ではなく新設が妥当

## Route Handler（フロントエンドの BFF 層）

- **役割**: フロントエンドにおける「サービス層」に相当。認証の解決とストリーミング中継を担う
- **責務**: `getAccessToken()` でトークンを取得し、バックエンドへ転送する。認可の判定は行わない（バックエンドの `@PreAuthorize` に一任する）
- **既存の Server Actions との関係**: 既存の `server/actions/*.ts` は JSON レスポンスの BFF だが、本機能は非 JSON ストリーミングレスポンスを扱うため、既存の `api-client.ts` は使わず独立した Route Handler として新設する
