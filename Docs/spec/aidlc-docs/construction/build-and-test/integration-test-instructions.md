# Integration Test Instructions（csv-report）

## Purpose

モノリス構成のため、サービス間統合ではなくレイヤー間の統合（Controller、Security、Service、Repository、H2）と、frontend の Route Handler とバックエンド API の契約を確認する。

## Test Scenarios

### Scenario 1: ReportController から DB まで（backend）

- **Description**: `GET /api/reports/reservations/csv` が、認可・パラメータ変換・Repository の JOIN FETCH クエリ・CSV 整形・応答ヘッダまで一貫して仕様どおりに動く
- **Setup**: `ReportControllerTest`（`BaseControllerTest`、`@SpringBootTest`、H2、`@WithMockAdmin` 等）。JdbcTemplate で部署・ユーザー（申請者と認証用）・リソース・予約 5 件（APPROVED 2、PENDING、DRAFT、CANCELLED）を seed する
- **Test Steps**: ADMIN・MEMBER・APPROVER・未認証で呼び、期間・ステータスの組合せを変える
- **Expected Results**:
  - ADMIN は 200、先頭 3 バイトが BOM、`Content-Type: text/csv;charset=UTF-8`、`Content-Disposition: attachment; filename="reservations_yyyyMMdd.csv"`、`Cache-Control: no-store`
  - MEMBER・APPROVER は 403（`FORBIDDEN`）、未認証は 401（`UNAUTHORIZED`）
  - `from` のみ・`to` のみは 400（`VALIDATION_ERROR`）、不正な `status` は 400
  - 期間重複と境界隣接の除外、`status` 未指定で DRAFT 除外、`status=DRAFT` で DRAFT のみ、開始日時の昇順、0 件はヘッダのみ
  - LAZY の関連（リソース名・申請者名）が例外なく出力される
- **Cleanup**: `@AfterEach` で予約・リソース・ユーザー・部署を削除する

### Scenario 2: Route Handler とバックエンド API の契約（frontend）

- **Description**: Route Handler が、バックエンドの契約（パス、Bearer、`Accept: */*`、3 項目のクエリ、秒付き日時）どおりに呼び、結果をバイト列のまま中継する
- **Setup**: `reports-csv-route.test.ts`。MSW で `BACKEND_URL`（`http://backend.test`）の `GET /api/reports/reservations/csv` をテストごとにスタブし、`@/lib/session` をモックする
- **Expected Results**: トークンなしは 401、`status`・`from`・`to` の転送と 16 文字の日時への `:00` 補完、`resourceName`・`page` の非転送、非 2xx の透過、BOM を含むバイト列の保持、接続失敗で 502

## Run Integration Tests

```bash
cd backend && ./gradlew test --tests '*ReportControllerTest' --max-workers=1
cd frontend && pnpm test reports-csv-route
```

- **Logs Location**: `backend/build/test-results/test/TEST-com.example.bookflow.presentation.ReportControllerTest.xml`
- **Setup/Cleanup**: 外部サービスの起動は不要（H2 と MSW のみ）
