# Business Rules — CSV 帳票出力（Unit: csv-export）

## 列定義（RPT-02 準拠）

| # | 列名（日本語ヘッダ） | 由来 | 備考 |
|---|---|---|---|
| 1 | 予約ID | `Reservation.id`（UUID） | そのまま文字列化 |
| 2 | リソース名 | `Reservation.resource.name` | |
| 3 | 申請者名 | `Reservation.requester.name` | |
| 4 | 開始日時 | `Reservation.startAt` | 下記「日時フォーマット」参照 |
| 5 | 終了日時 | `Reservation.endAt` | 同上 |
| 6 | 目的 | `Reservation.purpose` | |
| 7 | 承認状態 | `Reservation.status` | 下記「ステータス表示」参照 |

列順はこの表の順序で固定する。

## 日時フォーマット

`yyyy/MM/dd HH:mm` 形式（例: `2026/09/09 10:00`）で出力する。`DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm")` を使用する。フロントエンドの一覧表示（`toLocaleString("ja-JP")`）と体裁を合わせる（`AskUserQuestion` で確認済み）。

## ステータス表示（日本語ラベル）

`ReservationStatus` を日本語ラベルに変換して出力する。バックエンドに新規のマッピングを定義する（フロントエンドの `RESERVATION_STATUS_LABELS`（`frontend/src/lib/labels.ts`）とは別管理。2箇所のマッピングの値は一致させる必要がある）。

| `ReservationStatus` | 日本語ラベル |
|---|---|
| `DRAFT` | ドラフト |
| `PENDING` | 承認待ち |
| `APPROVED` | 承認済み |
| `REJECTED` | 却下 |
| `CANCELLED` | キャンセル済み |

`ReportService` 内に `private static final Map<ReservationStatus, String>` としてこのマッピングを定義する（新規クラスは作らない。設計判断の「CSV生成ロジックはReportService内に閉じる」方針と一貫）。

## CSV エスケープ規則（RFC 4180 準拠）

セル値に次のいずれかが含まれる場合、値全体をダブルクォート `"` で囲む。

- カンマ `,`
- 改行（`\n` または `\r\n`）
- ダブルクォート `"`

値の中にダブルクォートが含まれる場合は、`"` を `""` に置き換える（二重化）。

対象列：「リソース名」「申請者名」「目的」（自由入力・可変長の文字列列。ユーザー入力に由来するためカンマ・改行・引用符を含みうる）。「予約ID」「開始日時」「終了日時」「承認状態」は固定フォーマットの値のためエスケープ不要だが、`buildCsv` の実装では列を区別せず全列に同一のエスケープ関数を適用してよい（過剰だが実装が単純になり、将来列が増えても安全なため）。

## 改行コード・文字コード

- 行区切り: CRLF（`\r\n`）。Excel との親和性を優先する（既存フロントエンドのダウンロード実装確認事項でも Excel 対応を明記している）。
- 文字コード: UTF-8、先頭に BOM（`EF BB BF`）を付与する（受入条件・Requirements Analysis で決定済み）。

## 境界値・異常系

| ケース | 挙動 |
|---|---|
| 対象期間内に予約が0件 | ヘッダ行のみのCSVを返す（200 OK）。Requirements Analysis で決定済みの推定を踏襲する。 |
| `from`・`to` の片方のみ指定 | `ValidationException` → 400（既存 `ResourceController` と同じパターン。`GlobalExceptionHandler` の既定マッピング）。 |
| `status` に無効な値を指定 | Spring の enum バインディング失敗 → 既存 `GlobalExceptionHandler` が処理する400系エラー（新規ハンドリング不要、既存 `ReservationController` の `status` パラメータと同じ挙動）。 |
| MEMBER / APPROVER がアクセス | `@PreAuthorize("hasRole('ADMIN')")` により403（Spring Security が処理。コントローラ・サービスに個別ロジック不要）。 |
| 未認証（セッションなし） | フロントエンドの Route Handler が `getSession()` で検知し401相当を返す。バックエンドに到達した場合もJWT検証エラーで401になる。 |

## フロントエンド入力検証

- 期間入力欄（開始・終了日時）は両方入力済み、または両方未入力の場合のみ「CSV ダウンロード」ボタンを活性化する。片方のみ入力の状態ではボタンを `disabled` にする（`AskUserQuestion` で確認済み）。
- 開始日時が終了日時以降の場合（不正な範囲）のクライアント側チェックは行わない。バックエンドは範囲の前後関係を検証しない設計（`from`/`to` は「重なり判定」の境界値としてのみ使われ、`from > to` の場合は該当0件になるだけで業務エラーにはならないため）。
