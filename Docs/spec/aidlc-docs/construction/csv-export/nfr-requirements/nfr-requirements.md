# NFR Requirements — csv-export

入力: `requirements.md`（NFR-01〜07 / Security Baseline 適用マッピング）、`application-design/`（承認済み）、`plans/csv-export-nfr-requirements-plan.md` の回答（Q1=A / Q2=A / Q3=A / Q4=B / Q5=A）。Functional Design はスキップしたため、Application Design を機能設計の代わりに参照した。

回答の検査結果: 全問が単一選択で、曖昧・矛盾・選択肢の組み合わせ回答なし。追加の確認質問は不要。

## 1. Scalability / Performance

| ID | 要件 | 評価基準 | 根拠 |
|---|---|---|---|
| P-01 | 想定規模は社内規模（数万件まで）。下記の数値は**目標ではなく目安**とし、合否の判定には使わない | 目安: ダウンロード開始まで数秒、全件でも数十秒以内 | Q1=A |
| P-02 | 出力件数に上限を設けず、メモリ使用量は件数に依存しない（500 件ずつ逐次書き出し） | 全件をメモリに保持するコードがない（レビューで確認）。Build and Test で数千件を流してヒープが増え続けないこと | FR-11 / Application Design |
| P-03 | 負荷テスト・大量データ投入は行わない | Build and Test に数千件の手元確認のみ記録する | Q1=A |
| P-04 | 長時間ダウンロードが途中で切れないよう、`spring.mvc.async.request-timeout` を `application.yml` に**明示設定**する（初期値: 5 分） | 設定が存在すること。既定値の挙動（Tomcat で 30 秒前後の可能性）を Build and Test で確認し、結果を記録する。無制限（`-1`）にはしない | Q2=A |

## 2. Availability / Reliability

| ID | 要件 | 評価基準 |
|---|---|---|
| A-01 | 新規インフラ・外部連携なし。可用性は既存システムと同等とし、新規の目標値は設けない（Resiliency Baseline = No） | 新規コンポーネントがインフラ構成を変えないこと |
| R-01 | 認可（403）と検証（400）は書き出し開始前に完了する。書き出し後の失敗は HTTP ステータスを変えられず CSV が途中で切れるため、既知の制約として扱う | 検証失敗・認可失敗のテストが、本文の書き出し前に応答が確定することを確認する |
| R-02 | ストリーミング中の失敗・途中切断でも DB 接続を残さない（ページ単位トランザクション） | Repository メソッドが `@Transactional(readOnly = true)` を持ち、`open-in-view: false` であること |
| R-03 | ページ読み出しは 500 件固定。オフセット方式による稀な重複・欠落は許容する（Application Design §6） | 制約として設計書に記録済み |

## 3. Security（Security Baseline: Yes）

| ID | 対象ルール | 要件 | 評価基準 | 判定方針 |
|---|---|---|---|---|
| S-01 | SECURITY-05 | `from` / `to` / `status` を書き出し前に検証。DB はパラメータ化クエリのみ。CSV セルは数式注入対策 → RFC 4180 の順で無害化 | 不正値で 400。`=` `+` `-` `@` 始まりの値がセル先頭に無害化記号付きで出力される単体テスト | **blocking**（Code Generation 完了時に compliant / non-compliant を明示） |
| S-02 | SECURITY-08 | BE の `@PreAuthorize("hasRole('ADMIN')")` を本体とする。FE のガードは多層防御の一層 | ADMIN=200、MEMBER / APPROVER=403、未認証=401 の結合テスト | **blocking** |
| S-03 | SECURITY-15 | 失敗時は fail closed。エラー本文に内部情報を出さない（既存 `GlobalExceptionHandler`）。リソースは確実に解放 | エラー応答に例外メッセージ・スタックが含まれないこと | **blocking** |
| S-04 | SECURITY-03 / 14 | **エクスポート完了時に構造化ログを 1 行（INFO）出す**。項目: 実行ユーザー ID（UUID）、条件（`status` / `from` / `to`）、出力件数、所要時間。氏名・利用目的などの PII と CSV の中身は含めない | ログ出力のテストで項目が揃い、PII を含まないこと。既存の Logstash JSON（`traceId` 付き）に乗ること | 確認対象。追加の監査テーブルは作らない（Out of Scope） |
| S-05 | SECURITY-04 | **本ユニットで新設する CSV 応答の Route Handler にだけ `X-Content-Type-Options: nosniff` を付ける**。BE が付けるヘッダを、中継で作る新しい Response が引き継がない可能性を埋める。あわせて `Cache-Control: no-store` を維持する | Route Handler の Vitest が両ヘッダを検証する | **部分対応**（下記「既知のギャップ」） |
| S-06 | SECURITY-11 | 多層防御。濫用シナリオ（管理者アカウント侵害による一括持ち出し）への軽減策は、ADMIN 限定の認可・`no-store`・リクエストログ（ADR-017）・S-04 の実行ログ。レート制限は ADMIN 限定のため N/A | 設計成果物に濫用シナリオが記述されていること（Application Design §5 で記述済み） | 確認対象 |
| S-07 | その他 | SECURITY-01 / 02 / 06 / 07 / 09 / 10 / 12 / 13 は、新規データストア・認証方式・依存の追加がないため N/A。Code Generation 時に理由を 1 行ずつ記録する | — | N/A |

### 既知のギャップ（SECURITY-04）

`requirements.md` の Security Baseline マッピングは SECURITY-04 を N/A としていたが、本ユニットは新しい HTML ページ（`/admin/reports`）を追加する。FE（`next.config.ts`・ミドルウェア）には CSP・HSTS・`X-Frame-Options` などのヘッダ設定がなく、これは本ユニット以前からのアプリ全体の状況である。全画面向けのヘッダ追加は既存画面への回帰リスクがあるため、**本ユニットでは行わず、別課題として記録する**（Q4=B）。要件書側の「N/A」記載は本書で上書きし、Spec Integration で整合を取る。

## 4. Maintainability

| ID | 要件 | 評価基準 |
|---|---|---|
| M-01 | 外部ライブラリを追加しない（NFR-01）。`build.gradle.kts` / `package.json` は変更しない | 依存差分がない |
| M-02 | 4 層アーキテクチャを厳守し、CSV 書式ロジックは純粋なクラスとして分離する（NFR-05） | `ReservationCsvWriter` が Spring / JPA に依存しない |
| M-03 | テスト命名は ADR-018（`methodName_condition_expectedBehavior`）、BE 結合テストは `BaseControllerTest` 継承（NFR-07） | 既存規約と一致 |
| M-04 | FE の `labels.ts` と BE の `statusLabel` の表記を 2 か所で持つ。変更時は両方を直すことをコメントではなくテストで担保する | 5 値すべてのラベルを検証する単体テスト |
| M-05 | Lint / Format を通す: FE は `pnpm lint` / `pnpm format:check`、BE は `spotlessApply` / `checkstyleMain` | CI が成功する |

## 5. Usability

| ID | 要件 | 評価基準 |
|---|---|---|
| U-01 | Excel でそのまま開ける（BOM 付き UTF-8・CRLF・日本語ヘッダ） | **手動確認で実証する**（V-02） |
| U-02 | ダウンロード失敗時は `/admin/reports` に日本語の警告を出す。`error` は許可リストのコードだけを表示に使う | Route Handler と page のテストで、許可外の値が画面に出ないこと |
| U-03 | 期間入力欄の説明に「終了日時は含みません」を併記する。フォームのラベルを入力欄に関連付ける | ページのテストでラベルと説明文を確認 |

## 6. 検証方針（Build and Test に引き継ぐ）

| ID | 内容 | 根拠 |
|---|---|---|
| V-01 | **実 PostgreSQL**（`docker compose` の DB）で `findForReport` を実行し、`from` / `to` / `status` の未指定・単独・全指定の各組み合わせでエラーが出ないことを確認する（null バインド変数の型推論。#76 の再発防止） | NFR-03 / Q5=A |
| V-02 | **Excel で CSV を開く**手動確認を行う。文字化けしないこと、数式注入を狙った値が実行されないことを確認し、手順と結果を記録する | U-01 / Q5=A |
| V-03 | 数千件を出力し、ダウンロードが完走することとメモリが増え続けないことを手元で確認する（合否ではなく目安の確認） | P-01〜03 / Q1=A |
| V-04 | `spring.mvc.async.request-timeout` の既定値での挙動と、設定後の挙動を確認して記録する | P-04 / Q2=A |
| V-05 | 自動テスト（H2）の対象外であることを手順書に明記する: PostgreSQL 固有の挙動、Excel での見え方 | Q5=A |

## 7. NFR Design への申し送り

1. **S-04 の実装位置**: ストリーミングは別スレッドで実行され、`SecurityContext` が引き継がれない。実行ユーザー ID は Controller で書き出し開始前に取り出して渡す必要がある。ログを出す場所（Service の読み出しループ完了時か、`StreamingResponseBody` の末尾か）と、件数・所要時間の集計方法を NFR Design で確定する。
2. **途中切断時のログ**: S-04 は「完了時」に 1 行と決めた。クライアント切断や DB エラーで完了しなかった場合に記録するか（例: WARN）は、回答の範囲外のため NFR Design で提案して承認を得る。
3. **非同期実行の設定**: `StreamingResponseBody` が使うタスク実行基盤（既定の実行器の挙動）が長時間ダウンロードに適するかを確認し、P-04 のタイムアウト設定とあわせて設計する。
4. **P-04 の初期値 5 分**は暫定。V-04 の結果に応じて Code Generation で調整してよい。
