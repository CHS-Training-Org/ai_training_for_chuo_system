# Application Design Plan（CSV 帳票出力）

対象: `GET /api/reports/reservations/csv` と `/admin/reservations`（`requirements.md` の RPT-01〜14）。
各 `[Answer]:` の後ろに選択肢の記号を書いてください。推奨は各質問の末尾に付けています。

## Design Steps

- [x] 質問への回答を収集し、曖昧さを解消する
- [x] components.md（コンポーネント定義と責務）
- [x] component-methods.md（メソッドシグネチャ）
- [x] services.md（Service のオーケストレーション）
- [x] component-dependency.md（依存関係とデータフロー）
- [x] application-design.md（上記の統合版）
- [x] 設計の完全性・一貫性を検証する

## Questions

### Question 1: フロントエンドのダウンロード経路

JWT はサーバー側（セッションまたは `dev-id-token` cookie）にあり、ブラウザからバックエンドを直接呼べません。CSV をブラウザに渡す方法は？

A) Next.js の Route Handler（`src/app/api/reports/reservations/csv/route.ts`）が `getAccessToken` でバックエンドを呼び、CSV をそのまま返す。クライアントは `fetch` で取得して Blob からダウンロードし、失敗時は sonner のトーストで通知する（RPT-14 を満たす）

B) 同じ Route Handler を使い、ボタンを `<a href>` のリンクにする。失敗時はブラウザが JSON エラーを表示する（RPT-14 は満たせない）

C) Server Action が CSV 文字列を返し、クライアントが Blob にしてダウンロードする（`api-client.ts` に非 JSON 用のメソッドを足す。巨大な文字列が Server Action のレスポンスに載る）

X) Other (please describe after [Answer]: tag below)

[Answer]: A

推奨: A（RPT-14 を満たし、CSV が Server Action の直列化を通らない）

### Question 2: バックエンドの出力方式

CSV をどう組み立ててレスポンスに載せますか？

A) 全件を取得してメモリ上でバイト列（BOM 付き UTF-8）にし、`ResponseEntity<byte[]>` で返す。`@Transactional(readOnly = true)` の Service 内で完結する

B) `StreamingResponseBody` で書き出す。トランザクション、非同期ディスパッチ、MockMvc のテストが複雑になる

X) Other (please describe after [Answer]: tag below)

[Answer]: A

推奨: A（研修規模の件数では十分で、実装とテストが単純。上限は Question 3 で扱う）

### Question 3: 出力件数の上限

メモリ上で組み立てる場合（Question 2 の A）、件数に上限を設けますか？

A) 設けない。要件定義書（件数の上限は設けない）のとおり。既知の制約として設計書に記録する

B) 上限（例：10,000 件）を設け、超えたら 422 で「期間を絞ってください」と返す。新しいエラーコードと仕様書の追記が増える

X) Other (please describe after [Answer]: tag below)

[Answer]: A

推奨: A（研修規模では到達しにくく、スコープを増やさない）

### Question 4: CSV 生成ロジックの置き場所

ヘッダ、日時書式、RFC 4180 のエスケープ、数式対策、BOM を担当するクラスをどこに置きますか？

A) `application` 層に Spring 非依存の `ReservationCsvWriter`（行のリストを受け取りバイト列を返す純粋なクラス）を置き、`ReportService` から呼ぶ。単体テストが DB なしで書ける

B) `presentation` 層に置き、Controller が組み立てる。Service はエンティティのリストを返すだけにする

X) Other (please describe after [Answer]: tag below)

[Answer]: A

推奨: A（要件の「CSV 生成ロジックを単体テスト可能な形で分離する」に合う）

### Question 5: 期間・ステータス条件の問い合わせ方法

`start_at` の期間（片方だけの指定あり）と `status`（複数、任意）の組合せを、どう検索しますか？

A) `ReservationSpecifications`（`domain` 層、`ResourceSpecifications` と同じ流儀）で条件を合成し、`ReservationRepository` に `JpaSpecificationExecutor<Reservation>` を追加する。`resource` と `requester` は fetch join し、`startAt` 昇順、`id` 昇順で並べる

B) 任意パラメータ付きの `@Query`（`:from IS NULL OR ...`）を 1 本追加する。PostgreSQL では null を渡した日時パラメータの型が決められず失敗することがある

X) Other (please describe after [Answer]: tag below)

[Answer]: A

推奨: A（null 条件を扱いやすく、リソース一覧の前例と揃う）

### Question 6: `/admin/reservations` の画面構成

期間とステータスの入力欄をどう作りますか？

A) サーバーコンポーネントの `page.tsx` と、クライアントコンポーネント `ReservationReportForm.tsx`（`ResourceFilterForm` と同じ素朴な `FormData` 方式。日付は `type="date"`、ステータスはネイティブのチェックボックス）。`from > to` はクライアント側でも検証してトースト通知する。新しい shadcn コンポーネントは追加しない

B) React Hook Form と Zod でスキーマを定義し、shadcn の Checkbox を新規追加する。入力検証は宣言的になるが、`ui/` に新しいコンポーネントが増える

X) Other (please describe after [Answer]: tag below)

[Answer]: A

推奨: A（入力は日付 2 つとチェックボックスだけで、既存のフィルタフォームと揃う）
