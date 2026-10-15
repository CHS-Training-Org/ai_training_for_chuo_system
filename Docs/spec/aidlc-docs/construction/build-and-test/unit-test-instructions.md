# Unit Test Execution

## Run Unit Tests

### 1. Execute All Unit Tests
```bash
cd frontend
pnpm test                          # 全件
pnpm test calendar-utils           # 日付ロジックのみ
pnpm test availability-calendar    # 表示部品のみ
pnpm test reservation-prefill      # 予約フォームの初期値のみ
```

### 2. Review Test Results
- **Expected**: 14 ファイル、155 件すべて pass、failed 0（今回追加は 3 ファイル 70 件。既存は 85 件のまま pass）
- **Test Coverage**: カバレッジの閾値は設定されていない。下表の観点を確認した

| テストファイル | 件数 | 主な観点 |
|---|---|---|
| `tests/unit/calendar-utils.test.ts` | 43 | 週（月曜始まり、月またぎ、年またぎ）、月グリッド（月初が月曜、2 月、12 月）、前へ・次への月末丸め、占有判定の半開区間（境界、複数枠、日またぎ、小数秒）、枠の状態の優先順位、現在時刻（UTC から Asia/Tokyo、0 時が 24 時にならない）、不正な `view`/`date`、リンク生成 |
| `tests/unit/availability-calendar.test.tsx` | 15 | 週グリッド 84 枠（8〜19 時の 12 枠 × 7 日）、予約済み・過去は非リンクで `aria-disabled`、空き枠のリンク先、非アクティブで予約リンクなし、ツールバーのリンク先、月の件数（重複なし）と週表示への遷移、取得失敗時のメッセージ |
| `tests/unit/reservation-prefill.test.ts` | 12 | `YYYY-MM-DDTHH:mm` のみ受理。秒つき、空、日付のみ、存在しない日時、`undefined`、配列は無視 |

### 3. Fix Failing Tests
- 失敗したら、テストを弱めて通さず、実装か仕様（`requirements.md` の FR）のどちらが誤りかを先に判断する
- 日時の失敗は、実行環境のタイムゾーンに依存していないかを確認する（`TZ=UTC pnpm test` と `TZ=Asia/Tokyo pnpm test` の両方で通ることが望ましい）

## Static Checks
```bash
cd frontend
pnpm lint
pnpm format:check
npx tsc --noEmit
```
- **Expected**: いずれも警告・エラーなし
