# Application Design — CSV 帳票出力（ユニット: csv-export）

`components.md` / `component-methods.md` / `services.md` / `component-dependency.md` の統合版。深さは Minimal。入力は `requirements.md`（FR-01〜18 / NFR-01〜07）と、確認質問 5 問の回答。

## 1. 設計判断（確認質問の回答）

| Q | 論点 | 決定 | 設計への反映 |
|---|---|---|---|
| Q1 | CSV 組み立ての配置 | A: application 層に純粋な `ReservationCsvWriter`。Service が検証・読み出し・受け渡し。Controller は呼ぶだけ | C2 / C3 の分離。Writer は DB なしでユニットテストできる |
| Q2 | ページ読み出し方式 | A: `Slice` + オフセット、500 件ずつ。1 ページ 1 トランザクション | C4 の `findForReport`。重複・欠落の可能性を制約として記録（§6） |
| Q3 | ステータスの日本語ラベル | A: Writer 内の `switch` 式（全値網羅） | `statusLabel`。`labels.ts` と同一表記。domain は変更しない |
| Q4 | ダウンロード失敗時の画面 | B: 失敗時は `/admin/reports?error=<code>` へ 303。ページが日本語で警告 | C5 のリダイレクト、C6 のエラーコード許可リスト |
| Q5 | 期間入力欄 | A: `datetime-local`。Route Handler が秒を補う | C6 の入力欄、C8 `toIsoWithSeconds` の抽出 |

回答の検査結果: 曖昧・矛盾・選択肢の組み合わせ回答なし。追加の確認質問は不要（全問が単一選択）。

## 2. 構成

- **BE（presentation → application → domain の一方向）**: `ReportController` → `ReservationReportService` → `ReservationRepository`。`ReservationReportService` は `ReservationCsvWriter` をリクエストごとに生成して使う。
- **FE（BFF）**: `/admin/reports` ページ（Server Component、通常の GET フォーム）→ Route Handler → BE。Route Handler が JWT を付与し、CSV をストリーミングのまま中継する。
- **新規 DTO・例外・`ErrorCode` なし。** 既存の `ValidationException`、`GlobalExceptionHandler`、`@PreAuthorize` を再利用する。

詳細は `components.md`（責務）、`component-methods.md`（シグネチャ）、`services.md`（オーケストレーション・トランザクション）、`component-dependency.md`（依存・図）を参照。

## 3. 主要フロー

1. 管理者が `/admin/reports` で条件を入力し、フォームを GET 送信する。
2. Route Handler が JWT を付けて BE を呼ぶ。`from` / `to` は秒を補い、空欄は送らない。
3. BE が認可（403）・型変換（400）・`validate`（400）を**書き出し開始前に**済ませる。
4. 成功なら `StreamingResponseBody` が、BOM → ヘッダ → 500 件ずつの行を逐次書き出す。
5. 3 で失敗した場合、BE は JSON エラーを返し、Route Handler が `/admin/reports?error=<code>` へ 303 する。ページは許可リストにあるコードだけを日本語の警告に変換する。

## 4. ADR-004（Server Actions 主体）の例外

Route Handler を 1 箇所だけ追加する。理由: Server Action はファイル（`Content-Disposition` 付き・ストリーミング）の応答に向かない。`architecture.md` の「App Router + API Routes」の範囲内であり、JWT をサーバー側に閉じ込める BFF 方針（NFR-06）は保たれる。この 1 箇所以外では Server Actions 主体を維持する。

## 5. セキュリティ設計（Security Baseline）

| ルール | 設計上の扱い |
|---|---|
| SECURITY-05 入力検証 | 型変換（MVC）+ `validate`（前後関係）を書き出し前に完了。DB はパラメータ化クエリのみ。CSV セルは `toCell` で無害化（数式注入 → RFC 4180 の順）。FE は `error` クエリを**許可リストでのみ**表示に使い、任意文字列を画面に出さない |
| SECURITY-08 アクセス制御 | BE の `@PreAuthorize("hasRole('ADMIN')")` が本体。FE の `admin/layout.tsx` と、ナビの ADMIN 限定表示は多層防御の一層 |
| SECURITY-11 設計原則 | 多層防御（FE ガード + BE 認可 + 入力検証）。濫用シナリオは下記。レート制限は、公開 API ではなく ADMIN 限定のため N/A（理由として記録） |
| SECURITY-15 例外処理 | 認可・検証は書き出し前に完了し、失敗時は閉じた側（fail closed）に倒す。トランザクションはページ単位で、途中切断でも DB 接続は残らない。エラー本文に内部情報を出さない（既存ハンドラ） |
| SECURITY-03 ログ | CSV の中身（PII）をログに出さない。リクエストログは既存基盤（ADR-017）を利用 |

**濫用シナリオ（入口）**

1. **管理者アカウント侵害による予約データの一括持ち出し**: 攻撃者が ADMIN の認証情報を得ると、全ユーザーの予約（申請者名・利用目的）を、件数上限なしで一括取得できる。軽減策: ADMIN 限定の認可、`Cache-Control: no-store`（ブラウザ・中間キャッシュに残さない）、リクエストログ（ADR-017）。残余リスク: エクスポート専用の監査ログと件数上限は本ユニットの対象外（Out of Scope）。運用で検知する前提とし、設計成果物に残す。
2. **利用目的欄への数式の混入**: 申請者が `=HYPERLINK(...)` を入力し、管理者が Excel で開くと実行される恐れがある。軽減策: FR-12 の無害化を `toCell` で必ず通す。

## 6. 既知の制約・注意点

1. オフセット方式のため、出力中の予約の追加・変更で、まれに行の重複・欠落が起きうる（許容。改善案はキーセット方式）。
2. 書き出し開始後の失敗（DB エラー等）では CSV が途中で切れる。リダイレクトで通知できるのは書き出し前に確定する 400 / 401 / 403 のみ。
3. FE の `labels.ts` と BE の `statusLabel` は同一表記を 2 か所で持つ。変更時は両方を直す。
4. `findForReport` の `CAST` の書き方は Code Generation で確定し、実 PostgreSQL で検証する（#76 の教訓）。代替は番兵値方式。

## 7. 要件との対応検証（完全性・一貫性）

### 機能要件

| 要件 | 担当 |
|---|---|
| FR-01 エンドポイント・ヘッダ | C1 |
| FR-02 BOM・UTF-8・CRLF | C3 `writeBom` / 行末 CRLF |
| FR-03 ヘッダ行・7 列 | C3 `writeHeader` / `writeRows` |
| FR-04 日時書式 | C3 `formatDateTime` |
| FR-05 ステータスラベル | C3 `statusLabel`（※下記 指摘 1） |
| FR-06 `status` 絞り込み | C1（受付）/ C2（未指定 = 全値に正規化）/ C4（`IN`） |
| FR-07 `from` / `to` | C1（受付）/ C4（`>=` と `<`、片側可） |
| FR-08 400 の条件 | C2 `validate` / 既存 `handleMethodArgumentTypeMismatch` |
| FR-09 全ユーザー・AND 条件 | C4 |
| FR-10 出力順 | C4 `ORDER BY startAt, id` |
| FR-11 件数上限なし・メモリ一定 | C2 ループ / C4 `Slice` / `open-in-view: false` |
| FR-12 数式注入対策 | C3 `toCell` |
| FR-13 RFC 4180 | C3 `toCell` |
| FR-14 ADMIN のみ | C1 `@PreAuthorize` / 既存ハンドラ |
| FR-15 帳票出力ページ | C6 |
| FR-16 ナビ項目 | C7 |
| FR-17 Route Handler 中継 | C5（+ C8） |
| FR-18 仕様書の Spec-first 更新 | 本ステージの対象外。Spec Integration（`/update-spec`、Code Generation 直前）で実施 |

### 非機能要件

| 要件 | 担当 |
|---|---|
| NFR-01 外部ライブラリなし | C3（手書き）。`build.gradle.kts` は変更しない |
| NFR-02 検証・認可は書き出し前 | C1 が `validate` を同期で呼ぶ（`services.md` §2） |
| NFR-03 H2 / PostgreSQL 両対応 | C4 の `CAST`。実 PostgreSQL での検証は Build and Test |
| NFR-04 `JOIN FETCH`・遅延参照なし | C4 |
| NFR-05 4 層・ロジック分離 | C1 / C2 / C3 の分担（Q1=A） |
| NFR-06 JWT をサーバー側に閉じ込める・ADR-004 例外理由 | C5 / §4 |
| NFR-07 テスト | BE: `ReservationCsvWriterTest`（純粋ロジック）、`ReservationReportServiceTest`（Mockito）、`ReportControllerTest`（`BaseControllerTest` 継承）。FE: `tests/unit/layout/nav-items.test.ts` の追記、Route Handler の Vitest + MSW（成功の中継・各エラーのリダイレクト・空欄の除外・秒の補完）、`datetime.ts` の単体テスト |

### 検証で見つかった指摘（設計上の扱い）

1. **FR-05 に `DRAFT` のラベルがない。** `ReservationStatus` は 5 値（`DRAFT` を含む）で、`switch` 式は全値の網羅が必要なため、`DRAFT` = 「ドラフト」（`labels.ts` と同一）を補う。要件の記載漏れとして、Spec Integration で `requirements.md` ではなく `api-spec.md` の §帳票出力 に 5 値で明記する。
2. **`Cache-Control: no-store` は要件にない設計上の追加。** PII を含む応答のため、キャッシュさせない（SECURITY-11 の軽減策）。意図に反する場合は Code Generation 前に外せる。
3. **`toIsoWithSeconds` の抽出は、既存の `reservations.ts` への小さなリファクタを伴う。** 挙動は変えず、既存テストで担保する。
4. 上記のほか、FR-01〜17 / NFR-01〜07 に未割り当ての項目はなく、コンポーネント間の依存方向の矛盾もない。
