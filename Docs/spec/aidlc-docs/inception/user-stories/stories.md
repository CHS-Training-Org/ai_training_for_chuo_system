# User Stories — usage-report

## US-01: リソース別の利用実績の表示

**ADMIN として**、リソースごとの予約件数と合計利用時間を、グラフと表で見たい。**それによって** どのリソースがどれだけ使われているかを一目で把握できる。

### 受入条件

```gherkin
Scenario: 統計ページにリソース別の棒グラフ 2 本と表が表示される
  Given ADMIN が統計ページ（/admin/reports）を開く
  When 期間を指定せずに表示する
  Then 「予約件数」と「合計利用時間（時間）」の 2 つの横棒グラフがリソースごとに表示される
  And 同じ値の表（リソース名・予約件数・合計利用時間）がグラフの下に表示される
  And 期間は全期間として集計されている

Scenario: 合計利用時間は時間に整形して表示される
  Given あるリソースの合計利用時間が 150 分である
  When 統計ページを表示する
  Then 表とグラフには 2.5 時間と表示される
  And 小数第 1 位に丸めるのは表示だけで、API は totalMinutes（整数の分）を返す

Scenario: 並び順は合計利用時間の降順になる
  Given リソース A（合計 60 分・2 件）、リソース B（合計 120 分・1 件）、リソース C（合計 60 分・3 件）がある
  When 統計ページを表示する
  Then B、C、A の順に並ぶ（合計時間の降順、同値は件数の降順、さらに同値はリソース名の昇順）

Scenario: 棒の長さは各グラフ内の最大値に対する相対値になる
  Given 件数が 4 件のリソースと 2 件のリソースがある
  When 統計ページを表示する
  Then 4 件の棒は 100%、2 件の棒は 50% の長さになる
  And すべての値が 0 のときは、棒の長さは 0 になり、0 で割る計算は起きない

Scenario: 表示するリソースが 1 件もないときは空の状態を示す
  Given 集計対象のリソースが 1 件もない
  When 統計ページを表示する
  Then グラフと表の代わりに、表示するリソースがないことを示すメッセージが表示される

Scenario: API は配列でリソース別の集計を返す
  When ADMIN が GET /api/statistics/resources を呼ぶ
  Then 200 で、各要素に resourceId・resourceName・reservationCount・totalMinutes を持つ配列が返る
  And ページネーションはない
```

## US-02: 期間を指定した集計

**ADMIN として**、期間を指定して集計したい。**それによって** 月次や四半期の稼働状況を比較できる。

### 受入条件

```gherkin
Scenario: 期間と重複する予約だけが対象になる
  Given 2030-10-01 から 2030-10-31 の間に重なる承認済み予約と、重ならない承認済み予約がある
  When from=2030-10-01T00:00:00 と to=2030-10-31T00:00:00 を指定して集計する
  Then 期間と重複する予約だけが件数と合計利用時間に反映される（r.startAt < to かつ r.endAt > from）
  And 境界が一致しているだけの隣接する予約は含まれない

Scenario: 境界をまたぐ予約は件数に 1 件と数え、合計利用時間は期間で切り詰める
  Given 承認済み予約が 2030-10-09 22:00 から 2030-10-10 02:00 まである（全体で 240 分）
  When from=2030-10-10T00:00:00 と to=2030-10-11T00:00:00 を指定して集計する
  Then そのリソースの予約件数に 1 件として数えられる
  And 合計利用時間は 120 分（期間内の重なり部分）になる

Scenario: 期間が予約を完全に含むときは予約の全時間になる
  Given 承認済み予約が 2030-10-10 09:00 から 11:00 まである
  When from=2030-10-01T00:00:00 と to=2030-10-31T00:00:00 を指定して集計する
  Then 合計利用時間は 120 分になる

Scenario: 期間を指定しないときは全期間の全時間で集計する
  Given 承認済み予約が複数の月にまたがってある
  When from と to を両方指定せずに集計する
  Then すべての承認済み予約が対象になり、各予約の startAt から endAt までの全時間が合算される

Scenario: from と to の片方だけを指定すると 400 になる
  When from だけ、または to だけを指定して GET /api/statistics/resources を呼ぶ
  Then 400（code: VALIDATION_ERROR、文言「from と to は同時に指定してください。」）が返る

Scenario: from が to 以降だと 400 になる
  When from=2030-10-10T12:00:00 と to=2030-10-10T10:00:00 を指定する（from >= to）
  Then 400（code: VALIDATION_ERROR、文言「from は to より前にしてください。」）が返る
  And from と to が同じ値のときも 400 になる

Scenario: 期間を変更して集計するとグラフと表が再取得される
  Given ADMIN が統計ページで全期間の結果を見ている
  When 期間（開始日時・終了日時）を入力して「集計する」を押す
  Then URL の searchParams（from・to）が更新され、その期間でグラフと表が再取得・再描画される

Scenario: リセットすると全期間に戻る
  Given ADMIN が期間を指定して集計している
  When 「リセット」を押す
  Then 期間の指定が外れ、全期間の結果が表示される
```

## US-03: 承認済みのみの集計

**ADMIN として**、承認済みの予約だけが利用実績として数えられてほしい。**それによって** 申請中や却下された予約が稼働状況を水増ししない。

### 受入条件

```gherkin
Scenario: APPROVED 以外のステータスは件数にも時間にも含まれない
  Given あるリソースに PENDING・REJECTED・CANCELLED・DRAFT の予約がそれぞれ 1 件、APPROVED の予約が 1 件ある
  When 集計する
  Then そのリソースの予約件数は 1 で、合計利用時間は APPROVED の予約の分だけになる

Scenario: 過去か未来かは問わず、承認済みなら数える
  Given 過去の承認済み予約と、まだ始まっていない未来の承認済み予約がある
  When 期間を指定せずに集計する
  Then どちらも件数と合計利用時間に含まれる
```

## US-04: 実績 0 件のリソースの表示

**ADMIN として**、利用実績が 0 件のリソースも見たい。**それによって** まったく使われていないリソースを廃止や見直しの候補として見つけられる。

### 受入条件

```gherkin
Scenario: 実績がない有効なリソースも 0 件で表示される
  Given 有効（is_active = true）なリソースに、期間内の承認済み予約が 1 件もない
  When 集計する
  Then そのリソースが予約件数 0・合計利用時間 0 で表示される

Scenario: 実績がある無効化済みのリソースは表示される
  Given 無効化済み（is_active = false）のリソースに、期間内の承認済み予約が 1 件以上ある
  When 集計する
  Then そのリソースが実績どおりの件数と合計利用時間で表示される

Scenario: 実績がない無効化済みのリソースは表示されない
  Given 無効化済みのリソースに、期間内の承認済み予約が 1 件もない
  When 集計する
  Then そのリソースは結果に含まれない

Scenario: 期間を指定しないときの無効化済みのリソース
  Given 無効化済みのリソースに、過去に承認済み予約が 1 件以上ある
  When 期間を指定せずに集計する
  Then そのリソースが表示される
```

## US-05: 権限のないロールの拒否

**MEMBER・APPROVER として**、自分の権限では全リソースの利用実績を取得できないことを保証してほしい。**それによって** 利用状況が権限のない人に見えない。

### 受入条件

```gherkin
Scenario: MEMBER が API を呼ぶと 403 になる
  Given MEMBER としてログインしている
  When GET /api/statistics/resources を呼ぶ
  Then 403（code: FORBIDDEN）が返る

Scenario: APPROVER が API を呼ぶと 403 になる
  Given APPROVER としてログインしている
  When GET /api/statistics/resources を呼ぶ
  Then 403（code: FORBIDDEN）が返る

Scenario: 未認証だと 401 になる
  Given 認証トークンがない
  When GET /api/statistics/resources を呼ぶ
  Then 401（code: UNAUTHORIZED）が返る

Scenario: サイドナビの「利用実績」は ADMIN にだけ表示される
  Given MEMBER または APPROVER がサイドナビを見ている
  Then 「利用実績」は表示されない
  And ADMIN には表示され、/admin/reports へ遷移する

Scenario: 非 ADMIN が統計ページを直接開くと 403 画面になる
  Given MEMBER または APPROVER が /admin/reports を URL で直接開く
  Then 「アクセス権限がありません」の 403 画面が表示され、グラフと表は表示されない
```

## 受入条件との対応

| requirements.md の受入条件 | 対応するストーリー |
|---|---|
| グラフと表が表示される | US-01 |
| 期間を変更するとグラフと表が再取得・再描画される | US-02 |
| 集計対象は `APPROVED` のみ | US-03 |
| 境界をまたぐ予約の件数と切り詰め時間 | US-02 |
| `from`/`to` の片方だけ・`from >= to` は 400、両方未指定は全期間 | US-02 |
| 0 件の有効なリソースの表示、無効化済みのリソースの表示条件 | US-04 |
| MEMBER / APPROVER は 403、未認証は 401、ナビは ADMIN だけ | US-05 |
| OpenAPI（Springdoc）への反映 | 非機能要件。Controller の追加で自動反映され、`StatisticsControllerTest` または手動で確認する（Build and Test で扱う） |
| 集計ロジックのユニットテスト | US-02・US-03・US-04 の各 Scenario を `StatisticsServiceTest` のテスト項目に対応付ける |
