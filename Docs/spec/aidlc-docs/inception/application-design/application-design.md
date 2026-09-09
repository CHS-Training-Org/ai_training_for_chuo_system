# Application Design — CSV 帳票出力（Issue #29）

`components.md`・`component-methods.md`・`services.md`・`component-dependency.md` を統合した設計文書。

## スコープ

`docs-next/docs/spec/enhancements/intermediate/csv-export.md`（RPT-01〜05）を対象に、新規コンポーネント（`ReportController`/`ReportService`/CSV レポート Route Handler）の責務境界とメソッドシグネチャを定義する。詳細な業務ルールは CONSTRUCTION フェーズの Functional Design で定義する。

## コンポーネント一覧（要約）

| コンポーネント | 種別 | 配置 |
|---|---|---|
| `ReportController` | 新規 | `backend/.../presentation` |
| `ReportService` | 新規 | `backend/.../application` |
| `ReservationRepository` | 既存拡張（新規クエリ2件） | `backend/.../domain` |
| CSV エクスポート UI | 既存拡張（`/reservations` page.tsx） | `frontend/src/app/(authenticated)/reservations` |
| CSV レポート Route Handler | 新規 | `frontend/src/app/api/reports/reservations/csv` |
| `api-client.ts`（`getRaw`） | 既存拡張 | `frontend/src/lib` |

詳細は `components.md`・`component-methods.md`・`services.md`・`component-dependency.md` を参照。

## 設計判断

Requirements Analysis の完了時点では確定していなかった、コンポーネント設計上の判断点を記録する。

### 1. 期間フィルタの意味論

予約期間 `[startAt, endAt]` が指定期間 `[from, to]` と重なるものを対象とする（重複判定）。既存の空き状況照会（`ResourceService.overlaps`）と同じ考え方を採用し、一貫性を保つ。

### 2. from・to の指定要否

`ResourceController` の空き状況照会と同じパターンを採用し、同時指定必須とする（片方のみ指定は400）。両方省略時は全期間を対象とする。

### 3. CSV 生成ロジックの置き場所

`ReportService` 内の private メソッドとして実装する。列数が 7 列と少なくエスケープ処理も単純なため、別クラスへの分離は過剰設計と判断した。

### 4. 対象予約データの取得方法

`ReservationRepository` に新規クエリメソッドを追加する（期間フィルタ、期間＋ステータスフィルタの 2 件）。期間指定なしの場合は既存メソッドを `Pageable.unpaged()` で再利用する。

### 5. 認証方式の前提修正（Requirements Analysis からの変更）

Requirements Analysis の確認済み事項では「フロントエンドのダウンロード実装は `<a href>` 直接リンク方式（認証は Cookie セッションの前提で成立する）」と決定していた。しかし Application Design でフロントエンド（`api-client.ts`）・バックエンド（`SecurityConfig.java`）の実装を確認した結果、この前提は成立しないことが判明した。

- バックエンドは Spring Security の OAuth2 Resource Server として構成されており、認証は JWT Bearer トークンのみを受け付ける（`SessionCreationPolicy.STATELESS`）。Cookie セッションでの認証には対応していない。
- フロントエンドの既存 API 呼び出し（Server Actions）は全て `createApiClient(getAccessToken)` 経由で `Authorization: Bearer <token>` ヘッダを付与している。ブラウザのリンク遷移（`<a href>` によるナビゲーション）はこのヘッダを付与できないため、バックエンドへの直接リンクは認証エラー（401/403）になる。

この矛盾を `AskUserQuestion` で確認し、次の修正方針で進めることとした。

- UI 上の「リンククリックでダウンロード」という体験（`<a href>`）自体は維持する。
- 実体として、新規の Next.js Route Handler（`/api/reports/reservations/csv/route.ts`）を追加し、これがバックエンドへの認証済みリクエストを代行する。フロントエンドの `<a href>` はこの Route Handler を指す（バックエンドへの直接リンクではない）。
- Route Handler はセッション検証（`getSession()`）→ `api-client.ts`（`getRaw` 拡張）経由でのバックエンド呼び出し → レスポンスの透過転送、という処理を行う。

この修正は Requirements Analysis 文書（`Docs/spec/aidlc-docs/inception/requirements/requirements.md`）の該当箇所と矛盾するため、後続の `/update-spec` で `docs-next/docs/spec/api-spec.md`・`screen-spec.md` に反映する際に、あわせて注記が必要である。

### 6. 期間絞り込み UI の追加

受入条件「期間・ステータスを絞り込んで対象データを限定した CSV をダウンロードできる」を UI から実証可能にするため、`/reservations` ページ（ADMIN 表示時）に開始・終了日時の入力欄を追加する。既存の status フィルタと同様、URL の `searchParams`（`from`・`to`）で状態を管理する。

## 次のステージへの引き継ぎ

- Functional Design（CONSTRUCTION フェーズ）: CSV エスケープ処理の具体的な文字集合・改行コード、日時整合性チェック、空データセット時の挙動を定義する。
- Code Generation: 本設計に基づき `ReportController`/`ReportService`/`ReservationRepository` 拡張/フロントエンド 3 コンポーネントを実装する。
- `/update-spec`（Build and Test 完了後）: `api-spec.md`（新セクション「帳票出力」）・`screen-spec.md`（`/reservations` ページの ADMIN 向け要素追記）に、本設計判断（特に認証方式の修正・期間絞り込み UI）を反映する。`csv-export.md` の UC-07 誤記訂正も合わせて行う（Requirements Analysis での発見事項）。
