# Unit Test Execution（csv-export）

```bash
cd backend && ./gradlew test
cd frontend && pnpm test
```

## 今回の追加分
| 層 | テスト | 件数 |
|---|---|---|
| BE | `ReservationCsvWriterTest` | 14 |
| BE | `ReservationSpecificationsTest` | 9 |
| BE | `ReportControllerTest` | 14 |
| FE | `tests/unit/api/reservations-csv-route.test.ts` | 6 |
| FE | `tests/unit/admin/ReservationReportForm.test.tsx` | 6 |
| FE | `tests/unit/lib/download.test.ts` | 4 |

- 単体実行: `./gradlew test --tests "*ReservationCsvWriterTest"`、`pnpm test reservations-csv`
- **Expected**: 失敗 0（BE 189 件、FE 98 件）
- レポート: `backend/build/reports/tests/test/index.html`
