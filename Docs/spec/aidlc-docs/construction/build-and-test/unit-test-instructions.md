# Unit Test Execution（recurring-reservation）

## Run Unit Tests

### 1. Execute All Unit Tests

```bash
# backend（JUnit 5、Mockito、H2）
cd backend && ./gradlew test --max-workers=1

# frontend（Vitest、MSW。vitest.config.ts の maxForks: 1 に従い直列）
cd frontend && pnpm test
```

本ユニットのテストだけを実行する場合：

```bash
cd backend && ./gradlew test --max-workers=1 \
  --tests "*RecurrenceScheduleTest" --tests "*ReservationServiceTest*" --tests "*ReservationControllerTest"
cd frontend && pnpm test reservation-form reservation-detail-page reservations-page server/actions/reservations
```

### 2. Review Test Results

- **Expected**: backend 375 件、frontend 264 件（計 639 件）がすべて成功し、失敗 0
- **Test Coverage**: 未計測（カバレッジ計測ツールは本リポジトリの既定で未導入）
- **Test Report Location**: `backend/build/reports/tests/test/index.html`、`backend/build/test-results/test/*.xml`

### 3. 本ユニットの新規テスト（104 件）

| 区分 | ファイル | 件数 | 主な内容 |
|---|---|---|---|
| backend | `RecurrenceScheduleTest` | 21 | 毎週・毎月の件数、終了日当日と前日、31 日のスキップ、基準日からの数え直し、うるう年、年またぎ、時刻の保持、2 年分で 105 件 |
| backend | `ReservationServiceTest`（`CreateRecurring`） | 23 | 生成、同一の系列、日またぎの長さ、400 の 3 パターンとロックを取らないこと、既存との重複、自己重複、取得が 1 回、ステータスと承認ステップ、承認者なし |
| backend | `ReservationServiceTest`（`GetSeries`） | 3 | シリーズ件数と残り回数、最後の回は 0、`NONE` は null |
| backend | `ReservationControllerTest` | 26 | 配列のレスポンス、全件ロールバック、400 と 409 と 422、`DRAFT`、承認ステップの件数、各回のキャンセル・`submit`・承認・却下、詳細と一覧、OpenAPI |
| frontend | `reservation-form-schema.test.ts` | 11 | 終了日の必須・範囲・`NONE` での不要 |
| frontend | `reservation-form.test.tsx` | 10 | 種別の Select と条件付きの終了日、検証、ペイロード、トースト、下書き、409 |
| frontend | `server/actions/reservations.test.ts` | 3 | 繰り返しのペイロード、複数件の配列、400 |
| frontend | `reservation-detail-page.test.tsx` | 6 | シリーズ情報の表示と非表示 |
| frontend | `reservations-page.test.tsx` | 1 | 一覧にシリーズ情報が出ない |

既存のテストのうち、作成系（backend の `ReservationServiceTest` 5 件と構成子 8 箇所、`ReservationControllerTest` 3 件、frontend の `reservation-form.test.tsx` と `server/actions/reservations.test.ts`）は、レスポンスの配列化に追従させた。

### 4. Fix Failing Tests

失敗したら、`backend/build/reports/tests/test/index.html` か Vitest の出力で、失敗したテストを特定する。Flyway は H2 のテストで無効なため、V003 の SQL の誤りはここでは見つからない（`integration-test-instructions.md` の PostgreSQL での確認を行う）。
