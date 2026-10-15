# Integration Test Instructions

## Purpose
frontend のみの変更で、Backend の API は変更していない。自動化された結合テストは追加していない（MSW を使った Server Component のページ単位のテストは、既存にない）。代わりに、画面での動作確認の手順を示す。

## 自動で確認できた範囲
- カレンダーの部品の組み合わせ（`AvailabilityCalendar` が `CalendarToolbar` と `WeekGrid`/`MonthGrid` を振り分ける）：`availability-calendar.test.tsx`
- `getAvailabilityAction` の `from`/`to` の渡し方：既存の `resources.test.ts`（変更なし、14 件 pass）

## 画面での動作確認（未実施、PR 作成前に手元で行うこと）

### 準備
```bash
docker compose -f .devcontainer/docker-compose.yml up -d
cd backend && ./gradlew bootRun       # 別ターミナル
cd frontend && pnpm dev               # 別ターミナル（http://localhost:3000）
```
サインイン画面の「開発専用ロール別ログインボタン」でログインする（ブラウザの OAuth サインインはローカルでは動作しない）。予約が数件あるリソースを用意する（シードデータ、または予約申請で作成）。

### Scenario 1: 週表示（有効なリソース）
1. `/resources/{id}` を開く。今日を含む週が表示され、8:00〜19:00 の 12 行、月曜から日曜の 7 列が出る
2. 予約済みの枠がグレーで「予約済み」と出て、クリックできない
3. 過去の枠が薄いグレーでクリックできない
4. 空き枠をクリックすると `/reservations/new` に遷移し、リソース、開始日時、終了日時（1 時間後）が入っている
5. 「前へ」「次へ」「今日」で期間が移動し、URL の `date` が変わる。移動先の予約が反映される

### Scenario 2: 月表示
1. 「月」を押す。日セルのグリッドが出て、予約のある日に「N件」が出る
2. セルをクリックすると、その日を含む週の週表示になる
3. 「前へ」「次へ」で月が移動する。月末（例：1/31 から 2 月）で 2/28 に丸まる

### Scenario 3: 非アクティブなリソース（ADMIN で無効にしたリソース）
1. 全ての枠がクリックできない。「このリソースを予約する」ボタンも出ない
2. 予約済みの枠は「予約済み」と表示される

### Scenario 4: 異常系
1. `?view=day&date=2026-02-30` のような不正な値で開き、画面が壊れず、週表示・今日になる
2. `/reservations/new?startAt=abc` で開き、開始日時が空のままになる
3. backend を止めた状態で `/resources/{id}` を開き、カレンダー領域に取得失敗のメッセージが出る。ただしリソースの取得も失敗するため、ページ全体がエラーになる可能性がある（空き状況の取得だけを失敗させるには、API の応答を遅延・失敗させる手段が要る）

### Scenario 5: タイムゾーン（実行環境が UTC の場合）
1. 日本時間の 0:00〜9:00 の間に開き、「今日」と過去の枠が日本時間で判定されていること（UTC の日付ではなく）を確認する

### 確認後の後始末
```bash
docker compose -f .devcontainer/docker-compose.yml down
```
