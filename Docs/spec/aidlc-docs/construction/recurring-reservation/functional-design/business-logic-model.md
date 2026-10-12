# Business Logic Model — recurring-reservation

## 繰り返し日の生成（`RecurrenceSchedule.startDates`）

入力は種別 `type`、1 回目の開始日時 `first`、終了日 `until`（日付）。出力は各回の開始日時の昇順のリスト。

**`NONE`**：`[first]` を返す（`until` は見ない）。

**`WEEKLY`**：`i = 0, 1, 2, ...` について `first.plusWeeks(i)` を作る。その日付が `until` より後になった時点で止める。`until` と同じ日付の回は含める。

- 例：`first` が 2026-11-02（月）10:00、`until` が 2026-11-23 なら、11/02、11/09、11/16、11/23 の 4 件
- `LocalDateTime` には夏時間がないため、各回の時刻は 1 回目と同じになる

**`MONTHLY`**：`day = first.getDayOfMonth()`、`time = first.toLocalTime()` を固定する。`i = 0, 1, 2, ...` について、月 `ym = YearMonth.from(first).plusMonths(i)` を取る。

1. `ym.atDay(1)` が `until` より後なら、その月から先に回は作れないので止める（スキップ月が続いても必ず終わる）
2. `ym.lengthOfMonth() < day` なら、その月は存在しない日のためスキップし、次の `i` に進む
3. そうでなければ `LocalDateTime.of(ym.atDay(day), time)` を作る。その日付が `until` より後なら止める。以外は追加する

- 各回は直前の回からの積み上げではなく、1 回目の日（`day`）と `i` から決まる。`plusMonths` を積み重ねると、1 月 31 日から 2 月 28 日に丸められ、その後 3 月 28 日になって日がずれる。月ごとに `day` を当て直すのは、これを避けるため
- 例 1：2026-01-31 10:00、`until` が 2026-05-31 なら、01/31、03/31、05/31 の 3 件（02 月と 04 月はスキップ）
- 例 2：2026-11-15 14:00、`until` が 2027-01-15 なら、2026-11-15、2026-12-15、2027-01-15 の 3 件
- 例 3：2026-01-28、`until` が 2026-04-28 なら、毎月 28 日の 4 件（スキップなし）

**終了日の判定の単位**：`until` は日付で、各回の開始日時の日付（`toLocalDate()`）と比べる。終了日当日の 23:59 に始まる回も含まれ、翌日 00:00 に始まる回は含まれない。

**各回の終了日時**：Service が `Duration.between(startAt, endAt)` を 1 回目の長さとして求め、各回の開始日時に足す。日をまたぐ予約も、同じ長さで各回が作られる。

## 一括作成の処理手順（`ReservationService.create`）

戻り値は `List<ReservationResponse>`。クラス単位の `@Transactional` の中で、次の順に行う。

1. **繰り返し指定の検証**（400）：`recurrenceType`（`null` は `NONE`）と `recurrenceUntil` の組み合わせを、BR-02〜BR-04 で検証する。DB には触れない
2. **リソースの悲観ロック**：`resourceRepository.findByIdForUpdate`。存在しなければ 404。以降の重複判定を、同じリソースへの他の作成・更新・承認から直列化する（現行と同じ）
3. **日時整合性**（422）：`endAt > startAt` でなければ `BusinessException(VALIDATION_ERROR)`（現行と同じ）
4. **日程の生成**：`RecurrenceSchedule.startDates` で各回の開始日時を求め、`Duration` を足して `[start, end)` の組を作る
5. **自己重複の検出**（409）：開始日時の昇順に並んだ日程について、隣り合う 2 回が `ResourceService.overlaps` で重なれば `ReservationConflictException`。長さがすべて同じなので、隣り合う 2 回が重ならなければ、それより離れた回も重ならない（隣の回の開始が前の回の終了以降なら、さらに後の回の開始もそれ以降になる）。そのため隣接の比較だけで足りる
6. **既存予約との重複**（409）：`findByResource_IdAndStatusIn(resourceId, OCCUPIED_STATUSES)` を 1 回だけ取得し、各日程について、いずれかの予約と `overlaps` すれば `ReservationConflictException`。下書き（`draft: true`）でも、既存の `PENDING` / `APPROVED` との重複は現行と同じく判定する
7. **ステータスの決定**：現行と同じ。`draft` なら全件 `DRAFT`、そうでなければリソースの `requiresApproval` に応じて全件 `PENDING` または全件 `APPROVED`
8. **予約の作成**：各日程について `Reservation.create(...)`（7 引数のまま）で作り、種別が `NONE` 以外なら、`joinSeries(seriesId, type, until)` を呼ぶ。`seriesId` は 1 回の作成につき 1 つ `UUID.randomUUID()` で採番し、全件で共有する。`saveAll` で保存する
9. **承認ステップ**：全件が `PENDING` のときだけ、保存した各予約に `approvalService.createInitialStep` を呼ぶ。承認者がいなければ `BusinessException(APPROVER_NOT_AVAILABLE)`（422）が出て、全件がロールバックされる
10. **レスポンス**：保存した予約を `ReservationResponse.from(r)` に変換し、開始日時の昇順のリストで返す。コントローラーは 201

どの段階で例外が出ても、`RuntimeException` なので、クラスの `@Transactional` により予約も承認ステップもすべてロールバックされる。

## 重複判定の実装方針

- 既存の `private checkConflict(resourceId, excludeId, startAt, endAt)` は、更新（`update`）が使うため、そのまま残す
- 一括作成は、既存予約のリストを引数に取る小さなメソッド（例：`conflictsWith(List<Reservation> existing, LocalDateTime start, LocalDateTime end)`）を新設し、取得は呼び出し側で 1 回だけ行う。`create` が `NONE` の 1 件でも同じ経路を通す（1 経路に統一し、取得は常に 1 回）
- 計算量は「日程の数 × 既存予約の数」。終了日を開始日から 2 年以内に限る決定（要件の決定事項 4）により、日程は毎週で最大 105 件に収まるため許容する。リスクは下記に記載
- `create` が長くなりすぎないよう、手順 1（検証）、手順 4〜6（日程の生成と重複判定）、手順 8（作成）をそれぞれ private メソッドに切り出す（Checkstyle の `MethodLength` 最大 150 に余裕を持たせる）

## 詳細 API のシリーズ情報（`ReservationService.get`）

1. 現行どおり、予約の取得と閲覧権限の確認を行う
2. `reservation.getSeriesId()` が null なら、`ReservationResponse.from(reservation)`（シリーズ件数・残り回数は null）を返す
3. null でなければ、`countBySeriesId(seriesId)` と `countBySeriesIdAndStartAtAfter(seriesId, reservation.getStartAt())` を呼び、`ReservationResponse.from(reservation, seriesCount, remainingCount)` を返す

- 件数はキャンセル済み・却下済みを含む全ステータスで数える（要件の決定事項 9・10）
- 同じ系列の予約は同じ申請者が作ったものなので、件数を返しても他の利用者の情報は見えない
- 一覧 API（`list`）は `from(r)` のままで、N+1 を避ける（要件の決定事項 11）

## 他の操作との関係

- **更新・キャンセル・承認・却下**：系列の 3 項目に触れない。1 件の操作が他の回に影響しない（US-06）。下書きの各回の正式申請は、既存の更新 API（`submit: true`）で 1 件ずつ行い、その時点で重複を再判定する
- **変更で日時をずらした予約**：`series_id` は変わらない。残り回数は `startAt` で数えるため、ずらした予約の位置に応じて、他の回の残り回数が変わりうる（件数の定義どおり）

## 設計上の判断（レビューで変更可）

- **生成が 1 件でも `series_id` を付ける**：種別が `NONE` 以外なら `series_id` は必ず付く。終了日が開始日と同じ日の `WEEKLY` は 1 件だけ生成され、シリーズ件数は 1 になる。「種別が `NONE` 以外なら 3 列がそろう」という規則を単純に保ち、CHECK 制約（`domain-entities.md`）で守れるようにするため
- **CHECK 制約の追加**：3 列が食い違った行は、アプリのバグでしか生まれない。DB でも拒否すると、バグの発見が早まる。ただしテストで実行されないため、PostgreSQL での手動確認が前提になる
- **400 の検証を 422 より前に置く**：入力だけで判定できる検証を先に済ませ、不正な入力でロックを取らない。繰り返し指定と日時の整合が同時に誤っている場合は、400 が先に返る
- **`create` の署名を保つ**：系列を `joinSeries` で設定する形は、`create` の引数を増やす案（Checkstyle 違反）や引数オブジェクトに替える案（既存の呼び出しの変更）より、変更が小さい。作成直後の 1 回しか呼ばれないため、`create` と `joinSeries` の間に不整合な状態が外に出ることはない

## リスクと、終了日の上限による緩和

当初は件数上限なしを受け入れたが、PR #150 の AI レビュー（Should fix）で、終了日を開始日から 2 年以内に限る検証を `validateRecurrence` に追加した（BR-04b、要件の決定事項 4）。これにより、下記の影響のうち、際限のない増大と範囲外の日付による 500 は起きなくなった。残る影響は、上限（毎週で 105 件）の範囲で、ロックの保持時間とメモリが増えることである。

- **ロックの保持時間**：日程が増えるほど、手順 5〜9 の間、同じリソースへの他の作成・更新・承認が待たされる
- **メモリと処理量**：終了日を極端に遠い将来にすると、日程のリストと予約の保存が際限なく大きくなる。1 回の `saveAll` が数千件を超えると、トランザクションが長くなり、メモリも圧迫される
- **範囲外の日付**：終了日の上限（2 年）で解消した。開始日の `plusYears(2)` を超える終了日は、日程を生成する前に 400 になる
- **見直し候補**：2 年でも重いと分かった場合は、上限の年数（`MAX_RECURRENCE_YEARS`）を縮める。件数そのものの上限は、現状の毎週 105 件が上限のため不要と判断している
