# Requirements Clarification Questions — CSV 帳票出力（Issue #29）

対象シート: `docs-next/docs/spec/enhancements/intermediate/csv-export.md`

既存コード（予約一覧の FE → Server Action → BE Controller → Service → Repository）と、既存の設計方針（ADR-004 / ADR-016 / ADR-018 / `requirements.md` §非機能要件 / `api-spec.md`）を調査したうえで、
シート・Issue だけでは決められない点を質問します。各質問に推奨案と根拠を付けています。
`[Answer]:` の後に選択肢の英字を記入してください（推奨案でよければ A 等をそのまま記入）。

---

## 事前に共有する調査上の発見

- **UC 番号の食い違い**: シートと Issue は「UC-07（CSV・帳票出力）」としていますが、`requirements.md` の UC-07 は「社員が自分の予約一覧を確認・編集・キャンセルする」です。CSV 出力の UC は存在せず、UC-01〜UC-08 は使用済みです。
- **管理者ページは既に存在する**: `frontend/src/app/(authenticated)/admin/` に `resources`・`users` があり、`admin/layout.tsx` が ADMIN 以外に 403 画面を出します。サイドナビの管理者項目は `nav-items.ts` の `ADMIN_ITEMS` で定義されています（前回の説明で「管理者ページは存在しない」と述べたのは誤りでした）。
- **認証トークンはサーバー側にしか無い**: `getAccessToken`（`lib/session.ts`）は cookie を参照するサーバー専用関数です。ブラウザの JS から BE を直接 fetch して JWT を付与する構成は取れません。
- **ADR-004 は Server Actions 主体**ですが、Server Action は JSON 等のシリアライズ可能な値を返す仕組みで、ファイルのストリーミング配信には向きません。一方 `architecture.md` は BFF を「App Router + API Routes」と記載しており、Route Handler は既存方針の範囲内です（`app/api/auth/[...all]/route.ts` が既存の前例）。
- **DB 互換性**: `requirements.md` の非機能要件は H2 / PostgreSQL 両対応の SQL のみ許可しています。前回（#76）、`:param IS NULL OR ...` 形式の JPQL が PostgreSQL でだけ型推論エラーを起こし `CAST(:param AS ...)` で修正した実績があります。今回も任意パラメータ（`from` / `to` / `status`）の組み立て方に影響します。

---

## Question 1: UC 番号の扱い
シートの「UC-07」は既存 UC-07 と別物です。どう整理しますか。

A) `requirements.md` に新規ユースケース UC-09「管理者が予約を CSV でエクスポートする」（ADMIN）を追加し、シートの UC-07 表記は UC-09 に修正する（推奨：UC の一意性を保てる）

B) `requirements.md` は変更せず、シート側の UC 番号表記だけ削除して RPT-01〜05 の要件 ID で管理する

C) UC-07 に CSV 出力を含めるよう既存 UC-07 の記述を拡張する

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2: 「CSV ダウンロード」ボタンの設置場所
シートは「管理者ページ（`/admin/resources` または管理者向けページ）」としか書いていません。

A) 新規ページ `/admin/reports`（帳票出力）を作成し、`nav-items.ts` の `ADMIN_ITEMS` に「帳票出力」を追加。ページ内に期間・ステータスの絞り込みフォームとダウンロードボタンを置く（推奨：既存 `admin/layout.tsx` の ADMIN ガードをそのまま使え、`/admin/resources` の責務（リソース管理）を汚さない。絞り込み条件の入力 UI が必要なので専用ページの方が自然）

B) 既存の `/reservations`（ADMIN のときだけ「全予約一覧」になる画面）にボタンを追加する（現在の URL フィルタ `?status=` をそのまま CSV に引き継げるが、ADMIN ガードが layout ではなく画面内の `isAdmin` 分岐になる）

C) 既存の `/admin/resources` にボタンを追加する（シート記載の候補だが、リソース管理画面に予約帳票を置くことになり責務が合わない）

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3: バックエンドの CSV 生成方式
| 観点 | A) StreamingResponseBody + 手書き | B) StreamingResponseBody + opencsv | C) `ResponseEntity<byte[]>` 一括 |
|---|---|---|---|
| 大量データ | 良い（逐次書き出し） | 良い | 全件をメモリに保持 |
| 依存追加 | なし（`build.gradle.kts` 変更なし） | あり（opencsv） | なし |
| エスケープ（カンマ・改行・`"`）| 自前実装＋単体テストが必須（RPT・受入条件の「CSV 生成ロジックのユニットテスト」と整合） | ライブラリ任せ | 自前実装 |
| 失敗時の HTTP ステータス | 書き出し開始後はステータスを変えられない（認可・パラメータ検証は書き出し前に完了させる必要あり） | 同左 | エラー時に正しいステータスを返せる |
| 既存アーキテクチャ | Controller → Service → Repository の 4 層に載せられる | 同左 | 同左 |

補足: `StreamingResponseBody` は別スレッドで実行されるため、LAZY 関連を触る場合はトランザクション境界に注意が必要です（既存の `findAllFetch` 系は `JOIN FETCH` 済みなので回避可能）。

A) StreamingResponseBody + 手書き CSV 生成（推奨：依存追加なし、エスケープ処理を自前でテストでき学習目的にも合う。DB 読み出しはページ単位のループでメモリを有界にする）

B) StreamingResponseBody + opencsv（エスケープの実装・保守を避けられるが依存が増える）

C) `ResponseEntity<byte[]>` 一括（最も単純。件数が増えるとメモリ負荷が増える）

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 4: フロントエンドのダウンロード方式
| 観点 | A) Route Handler 経由（`<a href download>` / フォーム GET） | B) Server Action が CSV 文字列を返し、クライアントで Blob 化 | C) クライアントから BE へ直接 fetch + Blob |
|---|---|---|---|
| JWT の扱い | サーバー側で付与（既存の BFF 方針と整合） | サーバー側で付与 | **不可**（トークンがサーバー専用のため） |
| ストリーミング | BE のレスポンスをそのまま中継できる | 不可（全文を 1 つの値として返す） | - |
| ADR-004（Server Actions 主体）との整合 | 例外（ファイル配信は Route Handler。`architecture.md` の「API Routes」記述の範囲内） | 整合 | - |
| クライアント JS | ほぼ不要 | Blob 生成の Client Component が必要 | - |
| 既存の前例 | `app/api/auth/[...all]/route.ts` | `src/server/actions/*.ts` | なし |

A) Route Handler（例: `app/api/reports/reservations/csv/route.ts`）がセッションからトークンを取り、BE の `GET /api/reports/reservations/csv` へ中継して `Content-Disposition` 付きでそのまま返す。ボタンは通常の GET ダウンロードにする（推奨：トークンをサーバーに閉じ込めつつ、ストリーミングを維持できる。ADR-004 への例外理由を設計成果物に明記する）

B) Server Action が CSV 文字列を返し、Client Component で Blob 化してダウンロードさせる（ADR-004 に完全準拠だが、件数が多いと Server Action の応答サイズ・メモリが問題になる）

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 5: 「承認状態」「ステータス」の意味
RPT-02 は「承認状態」を CSV 列に含め、RPT-03 は「承認ステータス（`status`）」で絞り込むとしています。

A) 予約テーブルの `reservations.status`（`PENDING` / `APPROVED` / `REJECTED` / `CANCELLED`）を指す。CSV には日本語ラベル（承認待ち・承認済み・却下・キャンセル 等。`frontend/src/lib/labels.ts` の `RESERVATION_STATUS_LABELS` と同じ表記）で出力し、`status` クエリは `GET /api/reservations` と同じ複数指定可の形式にする（推奨：既存の一覧 API・画面と一貫）

B) 承認ステップ（`approval_steps.status`）の状態を指す（承認者ごとの状態になるため 1 予約 1 行にならない可能性があり、追加設計が必要）

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 6: 期間（`from` / `to`）の絞り込み意味とバリデーション
`GET /api/resources` の `from` / `to` は ISO 日時（例 `2025-06-01T09:00:00`）で「両方同時指定必須・片方のみは 400」です。

A) 予約の開始日時（`start_at`）が `from` 以上 `to` 未満のものを対象にする。`from` / `to` は `GET /api/resources` と同じ ISO 日時形式で、片方のみの指定も許可する（未指定側は無制限）。`from` が `to` 以上の場合は 400（`VALIDATION_ERROR`）（推奨：帳票の「対象期間の予約」として直感的で、SQL も単純）

B) 予約の利用時間帯が `from`〜`to` と少しでも重なるものを対象にする（期間をまたぐ予約も含められるが条件が複雑）

C) `GET /api/resources` と同様に `from` / `to` は両方同時指定必須とし、片方のみは 400。意味は A と同じく `start_at` 基準

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 7: CSV の列構成と表記
RPT-02 は「予約 ID・リソース名・申請者名・開始日時・終了日時・目的・承認状態」の 7 列を定めています（`ReservationResponse` には他に参加人数・申請日時・更新日時があります）。

A) 7 列のみ。ヘッダは日本語（予約ID, リソース名, 申請者名, 開始日時, 終了日時, 利用目的, ステータス）、日時は `yyyy-MM-dd HH:mm`（Excel で扱いやすい形式）、改行コードは CRLF（推奨：シートの要件どおり最小構成）

B) 7 列＋参加人数・申請日時の 9 列

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 8: CSV インジェクション（数式注入）対策
利用目的（`purpose`）は申請者が自由入力する文字列です。`=` `+` `-` `@` 等で始まる値を Excel で開くと数式として評価されるリスクがあります。

A) 先頭が `=` `+` `-` `@`（およびタブ・CR）の文字列セルは、先頭にシングルクォート `'` を付与して無害化する。単体テストで検証する（推奨：管理者が Excel で開く用途のため必須級の対策）

B) 対策しない（受け取ったデータをそのまま出力する）

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 9: 出力件数の上限
ストリーミング方式でも、極端に巨大な出力は DB 負荷になります。

A) 上限は設けない（チュートリアル規模のデータ量のため。ページ単位のループ読み出しでメモリのみ有界にする）（推奨：シート・受入条件に件数上限の要求がなく、スコープを広げない）

B) 上限（例: 10,000 件）を設け、超過時は 422 を返して絞り込みを促す

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## 拡張機能（Extension）の適用可否

## Question 10: Security Baseline Extension
Should security extension rules be enforced for this project?

（参考: 本課題は ADMIN 専用の新規エンドポイントで、申請者名などの個人情報を含むデータを一括エクスポートします。入力バリデーション・アクセス制御・CSV インジェクション・アクセスログが関連します。前回 #76 は Yes でした。）

A) Yes — enforce all SECURITY rules as blocking constraints (recommended for production-grade applications)

B) No — skip all SECURITY rules (suitable for PoCs, prototypes, and experimental projects)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 11: Resiliency Extension
Should the resiliency baseline be applied to this project?

（参考: 本課題は単一の読み取り専用エンドポイントで、新規インフラ・外部連携はありません。前回 #76 は No でした。）

A) Yes — apply the resiliency baseline as directional best practices and design-time guidance (recommended for business-critical workloads, as an informed starting point that you can validate and harden before go-live)

B) No — skip the resiliency baseline (suitable for PoCs, prototypes, and experimental projects where rapid iteration matters more than reliability)

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 12: Property-Based Testing Extension
Should property-based testing (PBT) rules be enforced for this project?

（参考: CSV のエスケープ処理は「任意の文字列を出力 → 解析して元の値に戻る」というラウンドトリップ性が性質として書きやすい箇所ですが、ライブラリ（jqwik 等）の追加が必要になります。前回 #76 は No でした。）

A) Yes — enforce all PBT rules as blocking constraints (recommended for projects with business logic, data transformations, serialization, or stateful components)

B) Partial — enforce PBT rules only for pure functions and serialization round-trips (suitable for projects with limited algorithmic complexity)

C) No — skip all PBT rules (suitable for simple CRUD applications, UI-only projects, or thin integration layers with no significant business logic)

X) Other (please describe after [Answer]: tag below)

[Answer]: C
