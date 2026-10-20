# Tech Stack Decisions — csv-export

本ユニットでは新規の技術選定は発生しない。依存・インフラを追加しない根拠と、既存スタックの使い方・設定値の決定を記録する。

## 決定1: 外部ライブラリを追加しない

- **決定**: CSV 生成は手書き（`ReservationCsvWriter`）とし、opencsv 等を導入しない。`backend/build.gradle.kts` と `frontend/package.json` は変更しない。
- **理由**: 出力形式が固定（7 列・BOM・CRLF）で、必要な処理はセルの無害化と RFC 4180 エスケープのみ。依存を足すと脆弱性管理の対象が増える（SECURITY-10 の観点）。要件 NFR-01 で決定済み。
- **却下した代替案**: opencsv / Apache Commons CSV（上記の理由で却下）。

## 決定2: ストリーミング方式

- **決定**: Spring MVC の `StreamingResponseBody` を使う。FE の Route Handler は BE の本文をストリームのまま中継する。
- **理由**: 件数上限なしでメモリを一定に保つため（FR-11）。要件 NFR-02 で決定済み。
- **却下した代替案**: 全件を `byte[]` / `String` に組み立てて返す方式（件数に比例してメモリを使うため却下）。

## 決定3: 非同期タイムアウトの設定（Q2=A）

- **決定**: `application.yml` に `spring.mvc.async.request-timeout` を明示する。初期値は **5 分**（`300s`）。
- **理由**: 既定値（コンテナ依存。Tomcat で 30 秒前後の可能性があり、要検証）では、件数が多いと途中で切れた CSV を利用者が受け取る恐れがある。無制限（`-1`）は遅いクライアントが接続とスレッドを占有し続けられるため採用しない。
- **確認**: Build and Test（V-04）で既定値の挙動を確認して記録する。5 分は暫定値で、結果に応じて調整してよい。
- **却下した代替案**: 既定のまま（途中切断が残る）、無制限（資源占有）。

## 決定4: 実行ログ（Q3=A）

- **決定**: 既存のログ基盤（`logback-spring.xml` の Logstash JSON、`traceId` / `spanId` の MDC 出力、`RequestLoggingConfig`）をそのまま使い、エクスポート完了時に INFO で構造化ログを 1 行出す。新しいログライブラリ・ログ基盤は作らない。項目は実行ユーザー ID（UUID）・条件・出力件数・所要時間で、PII と CSV の中身は含めない。
- **理由**: 管理者アカウント侵害時の持ち出し規模を追跡する材料になり、実装は小さい。
- **却下した代替案**: リクエストログのみ（件数が追えない）、DB 監査テーブル（Flyway・Entity・画面が必要で Out of Scope を超える）。

## 決定5: HTTP セキュリティヘッダ（Q4=B）

- **決定**: 新設する Route Handler の応答にだけ `X-Content-Type-Options: nosniff` を付ける（`Cache-Control: no-store` も維持）。`next.config.ts` の `headers()` やミドルウェアは変更しない。
- **理由**: 触る範囲に限定した軽い対策で、全画面への回帰リスクを避けられる。アプリ全体の CSP / HSTS / `X-Frame-Options` の不在は、既知のギャップとして `nfr-requirements.md` §3 に記録し、別課題とする。
- **却下した代替案**: 記録のみ（中継 Response が BE のヘッダを引き継がない可能性が残る）、全ページ向けヘッダ一式（CSP が Next.js のインラインスクリプトと衝突しやすく、既存画面に回帰リスクが及ぶ）。

## 決定6: DB アクセス

- **決定**: 新規テーブル・Flyway マイグレーションなし。`ReservationRepository` に `@Query`（JPQL、`JOIN FETCH`、`CAST` 付き任意パラメータ）を 1 件追加し、`Slice` で 500 件ずつ読む。H2 と PostgreSQL の両方で動く JPQL のみ使用する。
- **理由**: NFR-03 / NFR-04。`CAST` の書き方は Code Generation で確定し、実 PostgreSQL で検証する（V-01）。代替は番兵値方式。

## 決定7: テスト・検証

- **決定**: 既存スタックのみ使う。BE は JUnit 5 + H2 + Mockito、FE は Vitest + MSW。PostgreSQL 固有の挙動と Excel での見え方は自動テストの対象外とし、手動確認（V-01 / V-02）で補う（Q5=A）。Property-Based Testing は適用しない。
- **理由**: #76 の再発防止と、受入条件「Excel でそのまま開ける」の実証の両方が得られ、手順は短い。
