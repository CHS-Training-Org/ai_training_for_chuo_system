# Code Quality Assessment

## Test Coverage
- **Overall**: Fair（数値は未計測）
- **Unit Tests**: Service テスト（Approval / Reservation / Resource）、FE の Server Action テストあり
- **Integration Tests**: Controller 結合テストが H2 に JDBC でシードを入れ、`@WithMockAdmin` などでロール別に検証する

## Code Quality Indicators
- **Linting**: oxlint、oxfmt、Spotless、Checkstyle（`isIgnoreFailures = false`）
- **Code Style**: 一貫している
- **Documentation**: Javadoc あり（Good）

## Technical Debt
- `api-client.ts` は JSON 前提で、CSV のような非 JSON 応答を返せない。
- `ReservationRepository` の一覧クエリは status のみで絞る固定形で、期間条件を足すには新規クエリか Specification が要る（`ResourceSpecifications` が前例）。
- 課題シートの UC 番号が要件定義書と食い違っている（Issue #162）。
- `/reservations` の `status` 絞り込みなど、予約一覧の絞り込み拡張は別課題（`reservation-list-filter`）と重なりうる。

## Patterns and Anti-patterns
- **Good Patterns**: `@PreAuthorize` による ADMIN 限定、統一エラー形式、`JOIN FETCH` による N+1 回避、Specification による条件合成
- **Anti-patterns**: 全件を一度に返す、またはストリーミングで返す API の前例がない（予約一覧はすべてページング付き）
