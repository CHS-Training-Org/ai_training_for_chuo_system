# Business Rules — usage-report

## ルール一覧

| # | ルール | 根拠 |
|---|---|---|
| BR-01 | `GET /api/statistics/resources` は ADMIN のみ。Controller のメソッドに `@PreAuthorize("hasRole('ADMIN')")` を付ける。MEMBER・APPROVER は 403、未認証は 401 | USG-03、`ReportController` の既存方式 |
| BR-02 | `from` と `to` は両方指定か両方なしのみ有効。片方だけは 400（`VALIDATION_ERROR`、文言「from と to は同時に指定してください。」） | 要件の決定事項 4、既存の予約一覧・CSV と同じ |
| BR-03 | 両方指定のとき `from` は `to` より前であること。`from >= to`（同値を含む）は 400（`VALIDATION_ERROR`、文言「from は to より前にしてください。」）。統計 API だけの検証 | 要件の決定事項 4（User Stories で追加） |
| BR-04 | 集計の対象は `status = APPROVED` の予約のみ。過去か未来かは問わない。`APPROVED` は Service が Repository の引数として渡す | 要件の決定事項 1 |
| BR-05 | 対象予約の選び方は期間重複（`r.startAt < :to AND r.endAt > :from`、既存の `PERIOD_MATCH` を再利用）。境界一致の隣接は含まない。両方なしは期間条件なし | 要件の決定事項 3・4 |
| BR-06 | 件数は対象予約の数。期間の境界をまたぐ予約も 1 件として数える | 要件の決定事項 5 |
| BR-07 | 時間は予約ごとに、期間指定ありなら `max(startAt, from)` から `min(endAt, to)` までを秒で求める（期間なしは `startAt` から `endAt`）。リソースごとに秒を合算し、最後に 60 で割って切り捨てた分（整数）を `totalMinutes` とする。負になる場合は 0 | 要件の決定事項 6 |
| BR-08 | 表示するリソース：全リソース（無効化済みを含む）を取得し、`is_active = true` のものは常に、無効化済みのものは件数が 1 以上のときだけ残す。実績のないリソースは件数 0・合計 0 | 要件の決定事項 7 |
| BR-09 | 並び順は `totalMinutes` の降順、同値は `reservationCount` の降順、さらに同値は `resourceName` の昇順 | 既定の前提 |
| BR-10 | 応答はページネーションなしの配列で、各要素は `resourceId`・`resourceName`・`reservationCount`・`totalMinutes` の 4 項目 | 既定の前提 |
| BR-11 | 取得は JPQL の構築子射影（`ApprovedUsage`）で行い、ネイティブ SQL と DB の日時差関数は使わない。切り詰めと合算は Java で行う。取得から集計までを `@Transactional(readOnly = true)` で行う | 要件の決定事項 10、H2 と PostgreSQL の両対応 |
| BR-12 | `/admin/reports` は `admin/layout.tsx` の ADMIN ガードを継承する。非 ADMIN には 403 画面が出て、ページも Server Action も実行されない | USG-03、US-05 |
| BR-13 | 期間入力は `datetime-local`。フォームは送信前に、片方だけの入力と `from >= to` を画面内のメッセージで止める（遷移しない）。URL 直打ちで API が `VALIDATION_ERROR` を返したときは、ページがその文言を画面内に表示し、集計は出さない。それ以外のエラーは再 throw する | US-02 |
| BR-14 | 時間の表示は `Math.round(minutes / 6) / 10` を小数第 1 位で表示し、単位「時間」を付ける（150 分は 2.5 時間）。丸めるのは表示のみ | 要件の既定の前提 |
| BR-15 | 棒グラフ 2 本（「予約件数」と「合計利用時間（時間）」）の棒の長さは、各グラフ内の最大値を 100% とした相対値。最大値が 0 のときは全行 0%。各行に数値を併記し、色は件数が `bg-chart-1`、時間が `bg-chart-2` | 要件の既定の前提、アクセシビリティ要件 |
| BR-16 | 表は「リソース名」「予約件数」「合計利用時間」の 3 列で、行は API の並び順のまま | USG-05 |
| BR-17 | 応答の配列が空のときは、グラフと表の代わりに「表示するリソースがありません。」を表示する | US-01 |
| BR-18 | Server Action は `from`/`to` が 16 文字（`datetime-local`）のとき `:00` を補い、片方だけの指定はそのまま API に渡して 400 を受ける。`status` や他のパラメータは送らない | 既存の `toIsoWithSeconds` と同じ規則 |
| BR-19 | サイドナビの `ADMIN_ITEMS` に「利用実績」（`/admin/reports`）を追加する。ADMIN のときだけ表示される | US-05 |

## ストーリーとテストの対応

| ルール | ストーリー | テスト（種別） |
|---|---|---|
| BR-01 | US-05 | `StatisticsControllerTest`：ADMIN の 200、MEMBER・APPROVER の 403、未認証の 401 |
| BR-02・BR-03 | US-02 | `StatisticsControllerTest`：`from` のみ・`to` のみ・`from >= to`（同値を含む）で 400 |
| BR-04 | US-03 | `StatisticsServiceTest`：Repository を `APPROVED` で呼ぶ。`StatisticsControllerTest`：PENDING・REJECTED・CANCELLED・DRAFT の予約が集計に含まれない、未来の承認済みが含まれる |
| BR-05 | US-02 | `StatisticsControllerTest`：重複する予約のみ、境界隣接の除外、期間なしは全件 |
| BR-06・BR-07 | US-02 | `UsageCalculatorTest`：期間なし・完全に含む・前をまたぐ・後ろをまたぐ・両側をまたぐ・負の防御。`StatisticsServiceTest`：合算（秒の合計を最後に分へ切り捨て）。`StatisticsControllerTest`：22:00〜02:00 の予約を 0:00 起点の期間で 120 分 |
| BR-08 | US-04 | `StatisticsServiceTest`：有効で実績なし（0・0）、無効で実績あり（表示）、無効で実績なし（非表示）。`StatisticsControllerTest`：同上を結合で確認 |
| BR-09 | US-01 | `StatisticsServiceTest`：合計の降順、件数の降順、名前の昇順 |
| BR-10 | US-01 | `StatisticsControllerTest`：配列と 4 項目 |
| BR-11 | US-02 | `StatisticsControllerTest`（H2）：LAZY エラーなく集計できる。PostgreSQL での実行は CI とローカル実機で確認（H2 のみのため手動確認事項として記録） |
| BR-12 | US-05 | `admin-layout.test.tsx`：ADMIN は子要素を表示、MEMBER・APPROVER・プロフィール取得失敗は 403 画面で子要素を表示しない（Code Generation で追加。`admin/layout.tsx` には当初テストがなく、設計時の「既存テストで確認済み」は誤りだった） |
| BR-13 | US-02 | `usage-filter-form.test.tsx`：片方のみ・`from >= to` で遷移せずメッセージ、正常時の `router.push`、リセット。`admin-reports-page.test.tsx`：`VALIDATION_ERROR` でインライン表示、他のエラーは再 throw |
| BR-14 | US-01 | `usage-format.test.ts`：150 分が 2.5、0 分が 0.0、3 分が 0.1、59 分が 1.0 |
| BR-15 | US-01 | `usage-format.test.ts`：棒の幅、最大値 0。`usage-bar-chart.test.tsx`：幅のスタイルと数値の併記 |
| BR-16・BR-17 | US-01 | `admin-reports-page.test.tsx`：表の行と並び、空の状態メッセージ |
| BR-18 | US-02 | `statistics.test.ts`（Server Action）：秒の補完、片方だけの指定は補完のみで転送、パラメータの転送 |
| BR-19 | US-05 | `nav-items.test.ts`：ADMIN に「利用実績」が出る、MEMBER・APPROVER には出ない |
