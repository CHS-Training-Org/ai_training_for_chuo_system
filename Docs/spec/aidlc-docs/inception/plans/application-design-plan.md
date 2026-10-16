# Application Design Plan — CSV 帳票出力（ユニット: csv-export）

深さ: **Minimal**（新規コンポーネントの責務・メソッド・依存方向を固定する。業務ルールの詳細は `requirements.md` の FR-03〜13 で確定済みのため再定義しない）

## 設計スコープ

`requirements.md` の FR-01〜18 / NFR-01〜07 を、次の新規・変更コンポーネントに割り当てる。

| 層 | コンポーネント | 新規 / 変更 | 概要（案） |
|---|---|---|---|
| BE presentation | `ReportController` | 新規 | `GET /api/reports/reservations/csv`。`@PreAuthorize("hasRole('ADMIN')")`、パラメータ受付、ヘッダ設定、`StreamingResponseBody` の返却 |
| BE application | `ReservationReportService` | 新規 | 条件の検証（`from` >= `to` で `ValidationException`）、ページ単位の読み出しループ、CSV Writer への受け渡し |
| BE application | `ReservationCsvWriter`（配置は Q1） | 新規 | BOM・ヘッダ・行の組み立て、RFC 4180 エスケープ、数式注入対策、日時書式、ステータスラベル |
| BE domain | `ReservationRepository` | 変更 | 期間・ステータス条件つき `JOIN FETCH` クエリを追加（`CAST` 対策つき。読み出し方式は Q2） |
| FE route | `app/api/reports/reservations/csv/route.ts` | 新規 | JWT を付与して BE を中継するストリーミング Route Handler（ADR-004 の例外） |
| FE page | `app/(authenticated)/admin/reports/page.tsx` ほか | 新規 | 絞り込みフォームとダウンロードボタン（`admin/layout.tsx` の ADMIN ガードを利用） |
| FE nav | `components/layout/nav-items.ts` | 変更 | `ADMIN_ITEMS` に「帳票出力」を追加 |

### 既存コードの調査で確定した前提（質問なしで採用）

- 例外: クエリパラメータの型変換失敗（`from` / `to` の形式不正、`status` の不正値）は、既存の `GlobalExceptionHandler#handleMethodArgumentTypeMismatch` が 400 に変換する。`from` >= `to` は既存の `ValidationException`（→ 400）を使う。`@PreAuthorize` 違反は既存の `handleAccessDenied` / `RestAccessDeniedHandler` が 403 にする。新しい例外クラス・ハンドラは追加しない。
- 命名・配置: `application/` は現在フラット構成（`ReservationService` 等）のため、新規 Service も同じ階層に置く。DTO を `presentation/dto` に置く既存方針に従い、新規 DTO は原則作らない（CSV はストリームで返すため）。
- パラメータ受付: 既存 Controller と同じく、個別の `@RequestParam`（`List<ReservationStatus> status`、`LocalDateTime from` / `to`）で受ける。
- 認可: 既存の `UserController` と同じ `@PreAuthorize("hasRole('ADMIN')")` をメソッドに付ける。
- ファイル名: `reservations_yyyyMMdd_HHmmss.csv`（サーバー現在時刻・ローカル日時）。
- 日時書式・BOM・CRLF・ヘッダ: `requirements.md` の FR-02〜04 のとおり。
- テスト配置: BE は `ReservationCsvWriterTest`（純粋ロジックのユニット）、`ReservationReportServiceTest`（Mockito）、`ReportControllerTest`（`BaseControllerTest` 継承の結合テスト）。FE は `tests/unit/layout/nav-items.test.ts` の追記と、Route Handler の Vitest + MSW テスト。

## Application Design Plan（実行チェックリスト）

- [x] Step 1: 要件・実行計画・既存コードの分析
- [x] Step 2: 確認質問の作成（本ファイル下部）
- [x] Step 3: 質問への回答を受領し、曖昧さ・矛盾がないか検査する
- [x] Step 4: `components.md` を生成（コンポーネント定義と責務）
- [x] Step 5: `component-methods.md` を生成（メソッドシグネチャ、入出力型）
- [x] Step 6: `services.md` を生成（サービス定義とオーケストレーション。ストリーミング時のトランザクション境界を含む）
- [x] Step 7: `component-dependency.md` を生成（依存関係・通信パターン・データフロー図）
- [x] Step 8: `application-design.md` を生成（上記 4 文書の統合版。ADR-004 の例外理由、濫用シナリオの入口を含む）
- [x] Step 9: 設計の完全性・一貫性を検証（FR-01〜18 / NFR-01〜07 の全項目がいずれかのコンポーネントに割り当てられているか）

---

## 確認質問

回答は `[Answer]:` の後に選択肢の英字で記入してください。各質問に推奨案と理由を付けています。

## Question 1: CSV 組み立てロジックの配置と分割
CSV のエスケープ・数式注入対策・BOM・書式は、単体テストで直接検証したい純粋なロジックです（NFR-05）。

A) `application` 層に `ReservationCsvWriter`（Spring / JPA に依存しない純粋なクラス。`OutputStream` へ BOM・ヘッダ・行を書く）を置き、`ReservationReportService` が「検証 → ページ単位の読み出し → Writer に渡す」を担当する。`ReportController` は `StreamingResponseBody` から Service を呼ぶだけにする（推奨：4 層の責務が明確で、Writer を DB なしでユニットテストできる。既存で application が `presentation.dto` を参照している前例とも矛盾しない）

B) CSV 組み立てを `presentation` 層（Controller の隣）に置き、Service は予約のページ（`Slice`）を返すだけにする（CSV は出力形式＝表現の関心事という考え方。ただし Service とのやり取りが細かくなり、ストリーミング中のトランザクション管理が Controller 側に漏れやすい）

C) Service 1 クラスに、検証・読み出し・CSV 組み立てをすべて入れる（クラス数は最小だが、ユニットテストの単位が大きくなる）

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2: 予約のページ単位読み出し方式
質問3（要件）で「DB の読み出しはページ単位のループでメモリを一定にする」と決めました。その具体的な方式です。`StreamingResponseBody` は別スレッドで動くため、トランザクション境界の置き方にも関わります。

A) `Slice<Reservation>` を返す `@Query`（`JOIN FETCH`、`start_at` 昇順・`id` 昇順）を、500 件ずつオフセット方式で繰り返す。1 ページの読み出しごとに `@Transactional(readOnly = true)` のメソッドを呼び、ページを書き出したらエンティティを手放す（推奨：件数を数える `count` クエリが不要で、実装・テストが単純。弱点は、出力中に予約が追加・変更されると、まれに行の重複・欠落が起きうること。社内システムの規模では許容でき、設計成果物に注意点として記録する）

B) キーセット方式（直前ページの最後の `start_at` / `id` を条件にして次ページを読む）。出力中のデータ変更に強いが、`(start_at, id)` の複合比較を H2 / PostgreSQL 両対応の JPQL で書く必要があり、複雑さと PostgreSQL 型推論の落とし穴（#76）が増える

C) 1 本の `Stream<Reservation>`（JPA のストリーム読み出し）を、ダウンロードが終わるまで開いたままにする。コードは短いが、ダウンロード中ずっと DB 接続とトランザクションを保持するため、遅いクライアントが DB 接続を占有する

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3: ステータスの日本語ラベルの持ち場所
CSV には `PENDING` ではなく「承認待ち」と出す必要があります（FR-05）。FE の `labels.ts` には既にラベル定義がありますが、BE にはありません。`ReservationStatus` には `DRAFT` もあります（FE ラベルは「ドラフト」）。

A) `ReservationCsvWriter` の中に、`ReservationStatus` から表示名への対応（`switch` 式で全値を網羅）を持つ。`labels.ts` と同じ表記にし、「全ステータスにラベルがある」ことをユニットテストで確認する（推奨：ドメインに表示文言を持ち込まず、CSV 出力の関心事に閉じる。`switch` の網羅性により、列挙値が増えたときにコンパイルエラーで気づける）

B) `ReservationStatus` 列挙型に `getLabel()` を持たせる（他の用途でも再利用しやすいが、domain 層に日本語の表示文言が入る）

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 4: ダウンロードが失敗したときの画面の扱い（FE）
要件ではダウンロードを「通常の GET ダウンロード」としました。通常の GET では、BE が 400（条件不正）や 403（権限なし）を返すと、ブラウザが JSON の本文をそのまま表示してしまいます。この課題では Functional Design をスキップしているため、ここで決めます。

A) Route Handler は BE のステータスと JSON 本文をそのまま返す（最も単純。失敗時はブラウザに生の JSON が表示される）

B) 成功時（200）は CSV をストリーミングで返し、BE が 400 / 401 / 403 / 5xx を返したときは、Route Handler が `/admin/reports?error=<エラーコード>` へリダイレクトする。ページ側が `error` を読み取り、わかりやすい日本語の警告メッセージを表示する（推奨：「通常の GET ダウンロード」を保ったまま、クライアント JavaScript なしで失敗を利用者に伝えられる。エラーコードは既存の `{ code, message }` の `code` をそのまま使う）

C) Client Component が Route Handler を `fetch` し、`Blob` としてダウンロードさせる。失敗時はトースト（`sonner`）で表示する（エラー表示は最も親切だが、全件をブラウザのメモリに載せるため、要件で選んだ「通常の GET ダウンロード」「ストリーミング中継」の利点が失われる）

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 5: 期間の入力欄の形式（FE）
API の `from` / `to` は ISO 日時で、意味は「開始日時が `from` 以上 `to` 未満」と決まっています。画面の入力欄をどうするかです。

A) 既存の `ResourceFilterForm` と同じ `datetime-local` を使い、Route Handler が秒を補って（`2026-10-01T00:00` → `2026-10-01T00:00:00`、既存の `toIsoWithSeconds` と同じ規則）BE に渡す（推奨：既存画面と同じ操作感で、API の意味（`to` は未満）が画面でもそのまま見える）

B) `date`（日付のみ）の入力欄にし、Route Handler が「`from` = 選択日の 0:00、`to` = 選択日の翌日 0:00」に変換する（月次出力は入力しやすいが、画面の「終了日」と API の「`to` 未満」の意味がずれ、変換仕様の説明とテストが増える）

X) Other (please describe after [Answer]: tag below)

[Answer]: A
