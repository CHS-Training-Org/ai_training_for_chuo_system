# Functional Design Plan — ユニット: csv-report（CSV 帳票出力）

## Unit Context

- **Stories**: US-01〜US-05（`Docs/spec/aidlc-docs/inception/user-stories/stories.md`）
- **Application Design**: SKIP 済みのため、requirements.md・stories.md と既存コードの実調査を入力として使う。クラスの署名と責務は本ステージで定義する
- **対象範囲**: backend（`ReportController`・`ReservationReportService`・`CsvWriter`・`ReportCondition`・`ReservationRepository` への 2 クエリ追加）、frontend（Route Handler・`CsvDownloadButton`・`/reservations` ページ）

## Functional Design 実施中に確定した追加事実

Code Generation 前の設計検証として、既存コードを確認して次を確定した。

- **`CsvDownloadButton` の置き場所**：frontend に `src/components/reservations/` は存在せず、ページ専用コンポーネントは `app/(authenticated)/reservations/ReservationFilterForm.tsx` のようにページと同じディレクトリに置かれている。これに倣い `app/(authenticated)/reservations/CsvDownloadButton.tsx` とする（requirements.md の影響範囲を修正済み）
- **ボタンは Server Component にできる**：`page.tsx` は `searchParams`（`status`・`from`・`to`）と `isAdmin` をサーバー側で持っているため、リンクの `href` をサーバー側で組み立てられる。Client Component・`useSearchParams`・Blob 処理は不要
- **Repository のクエリは個別メソッドにする**：既存の `ReservationRepository` は null 許容パラメータ（`:from IS NULL OR ...`）を使わず、条件の組合せごとに専用メソッドを持つ（Postgres で null の timestamp パラメータの型が決まらない問題を避けるため）。CSV 用も同じ方針で 2 メソッド（期間なし／期間あり）とし、`status` は Service が必ず非空の集合（未指定時は DRAFT 以外の 4 値）にして渡す
- **`ReservationController` は `@PreAuthorize` を使わない**（行レベル制御のため）が、`UserController`・`ResourceController` は使う。`ReportController` はロール単位の制御なので後者に倣い、メソッドに `@PreAuthorize("hasRole('ADMIN')")` を付ける
- **`from`/`to` の同時指定チェック**は既存の予約一覧が Controller で `ValidationException` を投げている。CSV も同じ場所・同じメッセージで揃える
- **`Clock` は未使用**：既存コードに `Clock` の注入はない。ファイル名の日付は `LocalDate.now()` で取り、テストでは `reservations_\d{8}\.csv` の形式を検証する
- **`Accept` ヘッダ**：Route Handler は `Accept: */*` でバックエンドを呼ぶ。`text/csv` のみを受理する指定にすると、エラー応答（JSON）の内容協商が 406 になる

## 実行チェックリスト

- [x] Step 1: `business-logic-model.md` を生成する（取得から CSV 化・中継・ボタン URL 組み立てまでのフロー）
- [x] Step 2: `business-rules.md` を生成する（BR-01〜BR-15 と、ストーリー・テストとの対応）
- [x] Step 3: `domain-entities.md` を生成する（新規クラスの署名、Repository クエリ、既存への変更点）
- [x] Step 4: `frontend-components.md` を生成する（Route Handler・ボタン・ページの変更点）

## 確認事項

requirements.md の決定事項（9 件）と既定の前提により、設計に必要な曖昧点はすべて解消済みと判断する。追加の確認質問はない。
