# Business Logic Model — CSV 帳票出力（Unit: csv-export）

Application Design で定義したコンポーネント（`ReportController`/`ReportService`）が実行する業務ロジックの詳細。

## 処理フロー（ReportService.generateReservationsCsv）

1. **入力の受理**: `statuses`（0件以上）、`from`・`to`（両方 `null` または両方非 `null`。コントローラでバリデーション済み）
2. **対象データの決定**（分岐ロジック）:
   - `from`/`to` が `null`（期間指定なし）かつ `statuses` が空 → `ReservationRepository.findAllFetch(Pageable.unpaged())`
   - `from`/`to` が `null` かつ `statuses` が非空 → `findByStatusInFetch(statuses, Pageable.unpaged())`
   - `from`/`to` が非 `null` かつ `statuses` が空 → `findByPeriodFetch(from, to, Pageable.unpaged())`
   - `from`/`to` が非 `null` かつ `statuses` が非空 → `findByPeriodAndStatusInFetch(from, to, statuses, Pageable.unpaged())`
   - 4分岐は既存 `ReservationService.list()`（admin/requester × status の2軸4分岐）と同型のパターン
3. **CSV 変換**: 取得した `List<Reservation>` を行データに変換する（`business-rules.md` の列マッピング・エスケープ規則に従う）
4. **バイト列化**: UTF-8 BOM（`EF BB BF`）+ CSV 文字列本体を `byte[]` に変換して返す

## データ変換パイプライン（1予約 → 1 CSV 行）

```
Reservation（resource・requester 初期化済み）
  → id, resource.name, requester.name, startAt, endAt, purpose, status
  → 日時2項目: 人が読みやすい形式にフォーマット（business-rules.md 参照）
  → status: 日本語ラベルに変換（business-rules.md 参照）
  → 各セル値をCSVエスケープ規則に通す
  → カンマ区切りで結合 + 行末 CRLF
```

## フロントエンド側の処理フロー（CSV エクスポート UI）

1. ADMIN でページを表示 → クライアントコンポーネントが `searchParams` の `from`/`to`（あれば）を初期値として表示
2. ユーザーが開始・終了日時を入力（両方 or 両方空でのみボタン活性化。`business-rules.md` の入力検証規則を参照）
3. 「CSV ダウンロード」ボタンクリック → 現在の `status`（URL 由来）・入力済み `from`/`to` を付与した URL（`/api/reports/reservations/csv?...`）へブラウザがナビゲートする
4. Route Handler がセッション検証 → バックエンド呼び出し → レスポンス透過転送
5. ブラウザが `Content-Disposition: attachment` を見てファイルダウンロードを開始する
