# Integration Test Instructions（usage-report）

## Purpose

モノリス構成のため、サービス間統合ではなくレイヤー間の統合（Controller、Security、Service、Repository、H2）と、frontend の Server Action・ページと backend API の契約を確認する。

## Test Scenarios

### Scenario 1: StatisticsController から DB まで（backend）

- **Description**: `GET /api/statistics/resources` が、認可・パラメータ変換・Repository の JPQL（構築子射影）・集計・応答まで一貫して仕様どおりに動く
- **Setup**: `StatisticsControllerTest`（`BaseControllerTest`、`@SpringBootTest`、H2、`@WithMockAdmin` 等）。JdbcTemplate で部署・ユーザー（申請者と認証用）・リソース 5 件（有効 3、無効 2）・予約 9 件（A に承認済み 3 とそれ以外 4、B に境界をまたぐ承認済み 1、無効なリソースに承認済み 1）を seed する
- **Test Steps**: ADMIN・MEMBER・APPROVER・未認証で呼び、期間を変える
- **Expected Results**:
  - ADMIN は 200、配列で各要素に 4 項目。期間なしは承認済みのみ全時間（A は 3 件・270 分）、PENDING・REJECTED・CANCELLED・DRAFT は含まれない
  - 期間ありは期間重複の予約だけが対象で、境界をまたぐ予約は件数 1・時間は切り詰め（B は 120 分）、境界ちょうどの隣接予約は含まれない
  - 有効で実績なしは 0・0 で表示、無効で実績ありは表示、無効で実績なしは非表示。合計時間の降順
  - `from` のみ・`to` のみ・`from >= to`・同値は 400（`VALIDATION_ERROR`）、MEMBER・APPROVER は 403（`FORBIDDEN`）、未認証は 401（`UNAUTHORIZED`）
  - `GET /v3/api-docs` に `/api/statistics/resources` が載る
- **Cleanup**: `@AfterEach` で予約・リソース・ユーザー・部署を削除する

### Scenario 2: Server Action とページと API の契約（frontend）

- **Description**: Server Action が backend の契約（パス、秒付き日時、Zod 検証）どおりに呼び、ページが応答と 400 を正しく画面に反映する
- **Setup**: `server/actions/statistics.test.ts`（MSW でテストごとにスタブ）、`admin-reports-page.test.tsx`（Server Action をモック）
- **Expected Results**: `from`/`to` の転送と 16 文字の日時への `:00` 補完、パラメータなしでクエリなし、400・403 は `ApiClientError`、契約外の形は Zod で失敗。ページは `VALIDATION_ERROR` を画面内に表示してグラフを出さず、それ以外のエラーは再 throw

## Run Integration Tests

```bash
cd backend && ./gradlew test --tests '*StatisticsControllerTest' --max-workers=1
cd frontend && pnpm test statistics admin-reports
```

- **Logs Location**: `backend/build/test-results/test/TEST-com.example.bookflow.presentation.StatisticsControllerTest.xml`
- **Setup/Cleanup**: 外部サービスの起動は不要（H2 と MSW のみ）
