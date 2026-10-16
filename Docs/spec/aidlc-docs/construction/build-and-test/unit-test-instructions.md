# Unit Test Execution

```bash
cd backend && ./gradlew test                                # JUnit（H2）
cd backend && ./gradlew test --tests "*ResourceServiceTest" # 単一クラス
cd frontend && pnpm test                                    # Vitest（MSW）
cd frontend && pnpm test resources                          # 単一パターン
```

## Expected
- BE: 失敗 0。今回の関連は `ResourceSpecificationsTest` 13、`ResourceServiceTest` 20、`ResourceControllerTest` 33
- FE: 10 ファイル 82 件が pass（`resources.test.ts` は 13 件）
- レポート: `backend/build/reports/tests/test/index.html`、`backend/build/test-results/test/`
