# NFR Requirements Plan — CSV 帳票出力（ユニット: csv-export）

入力: `requirements.md`（NFR-01〜07 / Security Baseline 適用マッピング）、`application-design/`（承認済み）。Functional Design はスキップしたため、Application Design の成果物を機能設計の代わりに参照する。

## 評価スコープ

NFR-01〜07 は要件段階で方針まで確定済み。本ステージでは、これらを**評価基準つき**の NFR として確定し、未決の数値・方式だけを質問で決める。

### 既存コードの調査で確定した前提（質問なしで採用）

- **ログ基盤**: `logback-spring.xml`（Logstash JSON、`traceId` / `spanId` を MDC で出力）と `RequestLoggingConfig`（ADR-017）が既にある。新しいログ基盤は作らない。CSV の中身（PII）はログに出さない（SECURITY-03）。
- **認可・検証・例外**: `@PreAuthorize("hasRole('ADMIN')")`、`ValidationException`、`GlobalExceptionHandler` を再利用する（SECURITY-05 / 08 / 15）。
- **DB**: 新規テーブル・マイグレーションなし。1 ページ 500 件（コード内定数）、1 ページ 1 トランザクション、`open-in-view: false`（Application Design で確定）。
- **依存**: 外部ライブラリを追加しない（NFR-01）。技術スタックの新規選定は発生しない（`tech-stack-decisions.md` は「追加なし」の根拠を記録する）。
- **可用性（Resiliency Baseline = No）**: 新規インフラ・外部連携なし。可用性は既存システムと同等とし、新規の目標値は設けない。

## NFR Requirements Plan（実行チェックリスト）

- [x] Step 1: Application Design・要件・既存コードの分析
- [x] Step 2: NFR Requirements Plan の作成（本ファイル）
- [x] Step 3: 確認質問の作成（本ファイル下部）
- [x] Step 4: 質問への回答を受領し、曖昧さ・矛盾がないか検査する
- [x] Step 5: `nfr-requirements.md` を生成（性能・信頼性・セキュリティ・保守性・ユーザビリティの NFR と評価基準。Security Baseline の項目別判定方針を含む）
- [x] Step 6: `tech-stack-decisions.md` を生成（追加なしの根拠、設定値の決定）
- [x] Step 7: 完了メッセージの提示と承認待ち

---

## 確認質問

回答は `[Answer]:` の後に選択肢の英字で記入してください。各質問に推奨案と理由を付けています。

## Question 1: 性能の目標とデータ規模
要件では「出力件数の上限なし」とし、メモリを一定に保つ設計にしました。一方、「どのくらいの件数を、どのくらいの時間で出せればよいか」は決まっていません。

A) 社内規模（数万件まで）を想定し、数値目標は**目安**として設計書に記録する（目安: ダウンロード開始まで数秒、全件は数十秒以内）。厳密な負荷テストは行わず、Build and Test で数千件程度を手元で流して確認する（推奨：この課題は学習用で実データ規模が小さい。メモリ一定の設計と合わせて十分。数値を目標として固定すると、検証の手間が増える）

B) 目標値（例: 10 万件を 60 秒以内）を要件として固定し、Build and Test で大量データを投入して計測する（性能を客観的に保証できるが、データ作成・計測の手間が大きい）

C) 目標は設けない（記録も省略。後で「遅い」と言われたときに判断基準がない）

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2: 長時間ダウンロードのタイムアウト
`StreamingResponseBody` は、サーバーの非同期処理のタイムアウトの対象です。現在 `application.yml` にこの設定はなく、既定値（コンテナ依存。Tomcat では 30 秒程度の可能性があり、要検証）が適用されます。件数が多く出力に時間がかかると、途中で切断される恐れがあります。切断されると、ステータスは変更できないため CSV が途中で切れます。

A) `spring.mvc.async.request-timeout` を明示的に設定する（例: 5 分）。値は設定として `application.yml` に置き、Build and Test で既定値の挙動を確認する（推奨：途中切断を意図して防げて、無限に接続を占有することもない。設定は 1 行で済む）

B) 既定のままとし、「大量出力では途中切断されうる」を制約として記録する（変更が不要だが、件数が増えたときに利用者が壊れた CSV を受け取る可能性が残る）

C) 無制限（`-1`）にする（切断はなくなるが、遅いクライアントが接続とスレッドを長時間占有し続けられる）

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3: エクスポート実行の記録（SECURITY-03 / 14、濫用シナリオ対策）
Application Design では、濫用シナリオとして「管理者アカウント侵害による予約データの一括持ち出し」を挙げ、既存のリクエストログ（ADR-017）を軽減策としました。ただし、リクエストログだけでは「何件出力されたか」は分かりません。

A) 出力の完了時に、構造化ログを 1 行だけ追加する（INFO）。内容は、実行ユーザー ID（UUID）、条件（`status` / `from` / `to`）、出力件数、所要時間。氏名・利用目的などの PII は含めない（推奨：濫用の検知・追跡の材料になり、実装は小さい。既存のログ基盤にそのまま乗る）

B) 既存のリクエストログのみとし、追加のログは出さない（実装は不要。出力件数は追えない）

C) DB に監査テーブルを追加し、エクスポート履歴を保存する（追跡は最も確実だが、Flyway マイグレーション・Entity・画面が必要になり、要件の Out of Scope（新規テーブルなし）を超える）

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 4: HTTP セキュリティヘッダの扱い（SECURITY-04）
要件の Security Baseline マッピングでは、SECURITY-04 を「新規インフラ・依存の追加なし」の理由で N/A としていました。ただし、本ユニットは**新しい HTML ページ（`/admin/reports`）**を追加します。調査の結果、FE（`next.config.ts`・ミドルウェア）には、CSP・HSTS・`X-Frame-Options` などのヘッダ設定が現在ありません。これは本ユニット以前からの、アプリ全体の状況です。

A) 本ユニットでは変更せず、「アプリ全体の既知のギャップ」として記録するのみとする（ヘッダの追加は全画面に影響する別課題）

B) A に加えて、本ユニットで新設する Route Handler（CSV 応答）にだけ `X-Content-Type-Options: nosniff` を付ける（推奨：触る範囲に限定した軽い対策。BE が付ける nosniff を、中継で作る新しい Response が引き継がない可能性を埋められる。全画面のヘッダは A と同じく別課題）

C) 本ユニットで `next.config.ts` の `headers()` に全ページ向けのヘッダ一式（CSP を含む）を追加する（SECURITY-04 を満たせるが、CSP は Next.js のインラインスクリプトと衝突しやすく、既存の全画面に回帰リスクが及ぶ）

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 5: 手動検証の範囲（Build and Test）
自動テスト（H2）では、PostgreSQL 固有の挙動（null バインド変数の型推論。#76）と、Excel で実際に開いたときの見え方（文字化け・数式の非実行）は確認できません。

A) PostgreSQL（`docker compose` の実 DB）での実行確認と、Excel で CSV を開く確認の**両方**を、Build and Test の手動確認手順として記録・実施する（推奨：#76 の再発防止と、受入条件「Excel でそのまま開ける」の実証の両方が得られる。手順は短い）

B) PostgreSQL での実行確認のみを行う（Excel の確認は、BOM・CRLF のユニットテストで代替する。見え方の実証は省略）

X) Other (please describe after [Answer]: tag below)

[Answer]: A
