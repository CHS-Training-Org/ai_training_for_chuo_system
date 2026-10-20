# NFR Design Plan — CSV 帳票出力（ユニット: csv-export）

入力: `construction/csv-export/nfr-requirements/`（承認済み）、`application-design/`（承認済み）。

## 設計スコープ

| NFR | 設計対象 | 状態 |
|---|---|---|
| P-02 / R-02 | 500 件ページ読み出し + ページ単位トランザクション（Application Design `services.md` §3 で確定済み） | 確定（質問なし。パターンとして整理するのみ） |
| P-04 | `spring.mvc.async.request-timeout` = 5 分（確定済み）。非同期の実行基盤の扱いは未決 | **質問 Q2** |
| S-04 | 完了時の構造化ログ 1 行。出力位置・項目の形式・失敗時の扱いが未決 | **質問 Q1 / Q3** |
| S-01〜03 | 書き出し前の検証・認可、`toCell` の無害化、fail closed（確定済み） | 確定（パターンとして整理するのみ） |
| S-05 | CSV 用 Route Handler への `nosniff` / `no-store`（確定済み） | 確定 |

## 既存コードの調査で確定した前提（質問なしで採用）

- **実行ユーザーの取得**: 既存 Controller は `@CurrentUser User currentUser` をリクエストスレッドで解決している。`ReportController` も同じ方式で取得し、ユーザー ID（UUID）を値としてストリーミング側へ渡す。`SecurityContext` のスレッド間伝播（`DelegatingSecurityContext...`）は使わない。
- **ログ基盤**: `GlobalExceptionHandler` が `LoggerFactory` の SLF4J を使う前例がある。`logstash-logback-encoder:8.0` は導入済みで、`StructuredArguments`（`kv()`）が使える。追加依存なし。
- **非同期実行**: `WebMvcConfig` に `configureAsyncSupport` はなく、実行器の明示設定もない。Spring Boot が自動構成する `applicationTaskExecutor`（既定: コアスレッド 8、キュー無制限）が `StreamingResponseBody` の実行に使われる想定で、Code Generation で実機確認する。
- **論理コンポーネント**: キュー・キャッシュ・サーキットブレーカーなどの新規インフラは追加しない（Resiliency Baseline = No、NFR A-01）。

## NFR Design Plan（実行チェックリスト）

- [x] Step 1: NFR Requirements の分析
- [x] Step 2: NFR Design Plan の作成（本ファイル）
- [x] Step 3: 確認質問の作成（本ファイル下部）
- [x] Step 4: 質問への回答を受領し、曖昧さ・矛盾がないか検査する
- [x] Step 5: `nfr-design-patterns.md` を生成（性能・信頼性・セキュリティ・保守性のパターンと、NFR ID との対応）
- [x] Step 6: `logical-components.md` を生成（論理コンポーネントと設定値、ログの項目定義、新規インフラなしの確認）
- [x] Step 7: 完了メッセージの提示と承認待ち

---

## 確認質問

回答は `[Answer]:` の後に選択肢の英字で記入する。各質問に推奨案と理由を付けている。

## Question 1: 完了しなかったエクスポートのログ（S-04、Resilience）
NFR Requirements で、完了時に INFO を 1 行出すと決めた。一方、クライアントの切断や DB エラーで**書き出しが最後まで届かなかった場合**は、完了ログが出ない。濫用の追跡では「途中までに何件持ち出されたか」も手がかりになる。

A) 完了しなかった場合は WARN を 1 行出す（実行ユーザー ID・条件・**そこまでの出力件数**・所要時間・失敗の種別のみ。例外メッセージや PII は含めない）。例外自体は従来どおり伝播させる（推奨：途中までの持ち出し件数が追え、完了ログとセットで実行が必ず 1 行残る。実装は `try / finally` 程度で小さい）

B) 完了時の INFO のみとし、失敗時は既存のサーバーログ（例外のログ）だけに任せる（実装は最小。途中切断では、何件出たかが残らない）

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2: 同時実行の扱い（Scalability / Performance）
ストリーミングは、Spring Boot 既定の実行基盤（コアスレッド 8、キュー無制限と想定。実機確認する）で動く。ダウンロードは長時間になりうるため、同時に多数実行されるとスレッドを占有し、**ほかの非同期処理が待たされる**可能性がある。ADMIN 限定の社内システムなので同時実行は少ない想定。

A) 既定のまま、同時実行の制限は設けない。想定（ADMIN 限定・少人数）と、スレッド占有の可能性を制約として記録する（推奨：現状、非同期処理は本機能のみで、追加の仕組みは過剰。必要になったときに実行基盤を足せる）

B) 同時実行数に上限を設け、超過した要求は 429 で拒否する（保護は強いが、セマフォ等の新しい仕組み・エラーコード・FE 側の表示が必要になり、Out of Scope に近づく）

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3: ログ項目の出力形式（Maintainability）
S-04 のログ項目（ユーザー ID・条件・件数・所要時間）の出し方。

A) `logstash-logback-encoder` の `StructuredArguments`（`kv()`）で、項目を JSON のフィールドとして出す（推奨：既存の依存・Logstash JSON 出力にそのまま乗り、項目で検索・集計できる。追加依存なし）

B) 1 つのメッセージ文字列に埋め込む（例: `user=... count=...`）（実装は単純だが、項目ごとの検索・集計ができない）

X) Other (please describe after [Answer]: tag below)

[Answer]: A
