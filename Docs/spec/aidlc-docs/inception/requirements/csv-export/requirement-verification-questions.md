# Requirements Clarification Questions（csv-export）

ビジネス要求シート（`docs-next/docs/spec/enhancements/intermediate/csv-export.md`）の RPT-01〜05 と受入条件を入力として、シートで決まっていない挙動、シートと既存仕様の食い違い、シートの「AI 活用ポイント」が比較を求めている実装方式、テスト範囲、拡張機能の opt-in を質問します。各質問の `[Answer]:` の後ろに選択肢の記号を記入してください（チャットで「Q1: A, Q2: B …」の形で返していただいても構いません）。「推奨」は私の見立てで、従う必要はありません。

## 回答（2026-10-26T01:31:09+00:00、チャットで受領）

| 質問 | 回答 | 質問 | 回答 |
|---|---|---|---|
| Q1 | A | Q11 | A |
| Q2 | A | Q12 | C |
| Q3 | B | Q13 | C |
| Q4 | A | Q14 | C |
| Q5 | A | Q15 | B |
| Q6 | A | Q16 | A |
| Q7 | A | Q17 | B |
| Q8 | A | Security | B |
| Q9 | B | Resiliency | B |
| Q10 | A | PBT | C |

補足（学習者）:

- 前提（UTF-8 BOM 付き、日本語ヘッダ、RFC 4180、CRLF、0 件はヘッダのみ、MEMBER / APPROVER は 403、未認証 401、ADMIN は全ユーザー対象、ページングなし）はそのまま承認する。
- Q2: UC-07 の食い違いは PR の任意メモに記載する。
- Q12〜Q14: シートの「AI 活用ポイント」が比較を求めているので、Application Design で比較表を作ってから決める。
- Security: B（ADMIN 限定の認可と Q11 の CSV インジェクション対策は要件として入れるので、拡張ルールの全面適用はしない）。

回答の検証: 未回答なし。回答どうしの矛盾なし（Q3 B と Q4 A の組み合わせは「開始日が `from` 以上 `to` 以下」と解釈でき一意に決まる。Q15 B の新規画面は screen-spec の範囲内で、Q2 A の「api-spec と screen-spec のみ更新」と整合する）。追加の質問は不要と判断した。

---

## 前提（質問せずに要件として扱う事項）

シートや既存規約から決まると判断した事項です。異論があれば、どの質問の Other に書いていただいても構いません。

- 文字コードは UTF-8（BOM 付き）、1 行目は日本語のヘッダ行とする（受入条件どおり）
- 値にカンマ、ダブルクォート、改行を含むセルはダブルクォートで囲み、値の中のダブルクォートは 2 つ重ねる（RFC 4180）。改行コードは CRLF とする（RFC 4180、Excel との相性）
- 該当する予約が 0 件のときは、ヘッダ行だけの CSV を返す（エラーにしない）
- ADMIN 以外（MEMBER / APPROVER）は `403 FORBIDDEN`（既存と同じ JSON のエラー形式）。未認証は `401`
- ADMIN は全ユーザーの予約が対象（申請者で絞り込む条件は設けない）
- ページングはしない（絞り込み条件に一致する全件を 1 ファイルで返す）。件数の上限は設けない

---

## Question 1
シートの背景には「予約一覧・利用実績を CSV で」とありますが、要件 RPT-01〜05 は予約一覧の CSV だけを定めています。対象範囲は？

A) 予約一覧の CSV のみ（要件 RPT-01〜05 どおり）。推奨: 利用実績の集計は別課題（利用実績の集計・グラフ表示）があり、背景の「利用実績」は予約一覧の CSV を外部ツールで集計する用途と読める

B) 利用実績（リソース別の利用回数・時間などの集計）の CSV も含める（要件の拡張になる）

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2
シートは本課題を「ユースケース UC-07（CSV・帳票出力）の実装」としていますが、`requirements.md` の UC-07 は「社員が自分の予約一覧を確認・編集・キャンセルする」です。また `requirements.md` では「CSV / PDF 帳票出力」が対象外（学習者拡張課題）の表に載っています。仕様側の扱いは？

A) `requirements.md` は変更しない。シートの「更新が必要な spec」どおり `api-spec.md` と `screen-spec.md` だけを更新し、UC 番号の食い違いは PR 本文に記載して運営者に伝える

B) `requirements.md` も更新する（新しい UC を追加し、対象外の表の「CSV / PDF 帳票出力」に CSV 実装済みの旨を書く）

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3
期間（`from`・`to`）で絞り込むとき、どの予約を対象にしますか？

A) 期間と一部でも重なる予約（開始日時 < 期間の終わり、かつ 終了日時 > 期間の始まり）

B) 開始日時が期間内にある予約。推奨: 月ごとに出力したとき、月をまたぐ予約が 2 つのファイルに重複して載らない

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 4
`from`・`to` の型と指定ルールは？

A) 日付（`YYYY-MM-DD`）。どちらも任意で、片方だけの指定も可。`to` はその日の終わりまでを含む。推奨: 画面の入力が日付で済み、「10 月分」のような報告用途に合う

B) 日時（ISO 8601 ローカル日時、`2026-10-01T00:00:00`）。どちらも任意で、片方だけの指定も可

C) 日時。`from` と `to` は同時指定必須（リソース一覧の空き確認と同じ規則）

D) 日付。`from` と `to` は同時指定必須

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 5
`from` が `to` より後の日付（日時）で指定された場合の扱いは？

A) `400 VALIDATION_ERROR` を返す（同じ値は許容する）。推奨: 入力ミスに気づける

B) エラーにせず、0 件（ヘッダ行のみ）の CSV を返す

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 6
承認ステータス（`status`）の指定方法と、未指定時の扱いは？

A) 複数指定可（`?status=PENDING&status=APPROVED`）。未指定なら全ステータス。推奨: 既存の `GET /api/reservations` と同じ規則で、「承認待ちと承認済み」のような組み合わせを 1 回で出せる

B) 単一指定のみ。未指定なら全ステータス

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 7
CSV の「承認状態」列の表記は？

A) 日本語ラベル（承認待ち / 承認済み / 却下 / キャンセル済み。画面の表示と同じ）。推奨: 社内報告で Excel にそのまま貼る用途に合う

B) enum 値（`PENDING` / `APPROVED` / `REJECTED` / `CANCELLED`。API と同じ）

C) 両方を別の列に出す

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 8
CSV の列構成は？

A) RPT-02 の 7 列のみ。順序と見出しは「予約ID, リソース名, 申請者名, 開始日時, 終了日時, 目的, 承認状態」。推奨: 要件どおりの最小構成

B) 上記 7 列に「参加人数」「申請日時」を加える（要件の拡張になる）

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 9
開始日時・終了日時の書式は？

A) `yyyy-MM-dd HH:mm`（秒なし）

B) `yyyy-MM-dd HH:mm:ss`。推奨: Excel が日時として認識しやすく、秒の情報も落とさない

C) `2026-06-02T10:00:00`（API の ISO 8601 形式と同じ）

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 10
行の並び順は？

A) 開始日時の昇順（同じ開始日時なら予約 ID の昇順）。推奨: 期間の報告として時系列に読める

B) 開始日時の降順

C) 申請日時（`created_at`）の降順

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 11
表計算ソフトでの数式実行（CSV インジェクション）への対策は？ 目的、リソース名、申請者名は自由入力で、`=HYPERLINK(...)` のような値が入りうるため、Excel で開いたときに数式として解釈されるおそれがあります。

A) 先頭が `=` `+` `-` `@`（およびタブ、CR）のセルの先頭にシングルクォート `'` を付けて、文字列として扱わせる。推奨: OWASP が示す対策。ただし該当セルの値は元の値と変わる（先頭に `'` が付く）

B) 対策しない（RFC 4180 のエスケープのみ）

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 12
バックエンドのレスポンス方式は？（シートの AI 活用ポイント 1。Question 14 の選択と関係します）

A) `StreamingResponseBody` で 1 行ずつ書き出す（全件をメモリに載せない。ただし書き出し中も DB の読み出しを続けるため、トランザクションと遅延読み込みの扱いに注意が要る）

B) `ResponseEntity<byte[]>` で一括生成して返す（実装とテストが簡単。件数に比例してメモリを使う）

C) 方式は設計ステージで比較してから決める

X) Other (please describe after [Answer]: tag below)

[Answer]: C

## Question 13
CSV の生成方法は？（シートの AI 活用ポイント 2）

A) 自前で書く（`StringBuilder` / `Writer`。RFC 4180 のエスケープと Question 11 の対策を自前で実装し、ユニットテストで確かめる。依存の追加なし）

B) `opencsv` を依存に追加して使う（エスケープはライブラリに任せる。Question 11 の対策は別途必要）

C) 方式は設計ステージで比較してから決める

X) Other (please describe after [Answer]: tag below)

[Answer]: C

## Question 14
フロントエンドのダウンロード方式は？（シートの AI 活用ポイント 3） JWT はブラウザの JavaScript から読めず、`/api/backend` の rewrite は Authorization ヘッダを付けないため、ブラウザから backend へ直接リンクする方式は使えません（RE 補足の 2.2）。サーバー側でトークンを付ける経路が必要です。

A) Next.js の Route Handler（例：`src/app/api/reports/reservations/csv/route.ts`）が JWT を付けて backend を呼び、レスポンスをそのまま中継する。ボタンは絞り込み条件をクエリ文字列に入れた `<a href download>`。ブラウザ標準のダウンロードになり、ストリーミングも中継できる。ただしエラー（403 など）のときは、画面上のメッセージではなくブラウザのダウンロード失敗やエラー内容の表示になる

B) Server Action が CSV の本文を返し、Client Component で Blob にしてダウンロードさせる（Fetch + Blob 相当）。エラーを画面上のメッセージで出しやすい。ただし本文を一度メモリに載せ、文字列経由で BOM が保たれるかの確認が要る

C) 方式は設計ステージで比較してから決める

X) Other (please describe after [Answer]: tag below)

[Answer]: C

## Question 15
「CSV ダウンロード」ボタン（と、期間・ステータスの絞り込み入力）の置き場所は？

A) 既存の `/admin/resources`（リソース管理）に追加する。画面とナビの追加はない

B) 新しい管理者ページ（例：`/admin/reports`「帳票出力」）を追加し、サイドナビの ADMIN 専用項目に加える。推奨: 予約データの出力はリソース管理とは扱う対象が違う。ただし screen-spec の画面一覧とサイドナビ表、`nav-items.ts` とそのテストの更新が伴う

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 16
ダウンロードされるファイル名は？

A) `reservations_YYYYMMDD_HHmmss.csv`（ASCII のみ。日時はサーバーでの生成時刻）。推奨: `Content-Disposition` の扱いが単純で、ブラウザ間の差が出にくい

B) `予約一覧_YYYYMMDD.csv`（日本語。`Content-Disposition` に RFC 5987 の `filename*` を使う）

C) `reservations.csv`（固定）

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 17
テストの範囲は？（受入条件が求めているのはバックエンドの CSV 生成ロジックのユニットテストです）

A) バックエンドのみ（CSV 生成のユニットテストに加え、Controller の結合テストで 403、Content-Type、BOM、絞り込みを確認する）

B) バックエンドに加え、フロントエンドの Vitest（ダウンロード経路が条件を backend に渡すこと、絞り込みフォームとボタンの挙動）も追加する。推奨: 前回の PR #157 では FE の未テストがレビューで NG になった

C) B に加え、Playwright の E2E テストも追加する

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question: Security Extensions
Should security extension rules be enforced for this project?

A) Yes — enforce all SECURITY rules as blocking constraints (recommended for production-grade applications)

B) No — skip all SECURITY rules (suitable for PoCs, prototypes, and experimental projects)

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question: Resiliency Extensions
Should the resiliency baseline be applied to this project?

**What this extension is.** Enabling it applies a set of **directional, design-time best practices** for building resilient systems, derived from the **AWS Well-Architected Framework (Reliability Pillar)** and resilience-review guidance. It steers requirements, design, and code toward fault tolerance, high availability, observability, and recoverability — covering 15 practice areas across business goals, change management, observability, high availability, disaster recovery, and continuous improvement.

**What this extension is NOT.** Enabling it does **not** make your workload production-ready, nor does it certify or guarantee any availability, RTO, or RPO target. It is a **starting point** that scaffolds good resiliency decisions early — it is not a substitute for a formal **AWS Well-Architected Review** of the built system.

Treat the output as a well-grounded **first draft of your resiliency posture** to build on and validate — not a finished, production-certified result.

A) Yes — apply the resiliency baseline as directional best practices and design-time guidance (recommended for business-critical workloads, as an informed starting point that you can validate and harden before go-live)

B) No — skip the resiliency baseline (suitable for PoCs, prototypes, and experimental projects where rapid iteration matters more than reliability)

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question: Property-Based Testing Extension
Should property-based testing (PBT) rules be enforced for this project?

A) Yes — enforce all PBT rules as blocking constraints (recommended for projects with business logic, data transformations, serialization, or stateful components)

B) Partial — enforce PBT rules only for pure functions and serialization round-trips (suitable for projects with limited algorithmic complexity)

C) No — skip all PBT rules (suitable for simple CRUD applications, UI-only projects, or thin integration layers with no significant business logic)

X) Other (please describe after [Answer]: tag below)

[Answer]: C
