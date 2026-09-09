# Components — CSV 帳票出力（Issue #29）

新規追加・変更するコンポーネントの一覧と責務。詳細な業務ロジック（エスケープ処理・重複判定の実装等）は CONSTRUCTION フェーズの Functional Design で定義する。

## バックエンド

### ReportController（新規）

- **パッケージ**: `presentation`
- **責務**: `GET /api/reports/reservations/csv` の受付。リクエストパラメータのバリデーション（`from`・`to` の同時指定チェック）、ADMIN 限定の認可制御（`@PreAuthorize("hasRole('ADMIN')")`）。業務ロジックは持たず `ReportService` に委譲する。
- **参考**: 既存 `ResourceController`（ADMIN 限定エンドポイントの `@PreAuthorize` パターン、`from`/`to` 同時指定バリデーションパターン）を踏襲する。

### ReportService（新規）

- **パッケージ**: `application`
- **責務**: 予約データの取得条件を組み立て、CSV（UTF-8 BOM 付き）バイト列を生成するユースケースの中核。
- **既存 `ReservationService` との違い**: 既存サービスは所有権チェック（本人 or ADMIN）を持つが、`ReportService` は常に ADMIN 限定エンドポイントからのみ呼ばれるため `currentUser` 引数・所有権フィルタは不要。全件を対象にする点が異なる。既存サービスへのメソッド追加ではなく新規サービスとする理由もここにある（責務・呼び出し元の性質が異なるため）。

### ReservationRepository（既存・拡張）

- **変更内容**: 期間フィルタに対応する新規クエリメソッドを 2 件追加する（`findByPeriodFetch` / `findByPeriodAndStatusInFetch`）。
- **再利用**: 期間指定なしの場合は既存の `findAllFetch(Pageable)` / `findByStatusInFetch(statuses, Pageable)` を `Pageable.unpaged()` で呼び出して再利用する（新規メソッド追加は期間フィルタが絡む 2 パターンのみで済む）。

## フロントエンド

### CSV エクスポート UI（`/reservations` ページ、既存 Server Component の拡張）

- **責務**: ADMIN 表示時のみ、期間指定（開始・終了日時）入力欄と「CSV ダウンロード」リンクを表示する。
- **既存コンポーネントとの関係**: 新規コンポーネントの追加ではなく、既存の `src/app/(authenticated)/reservations/page.tsx` の `isAdmin` 分岐に要素を追加する（現状 ADMIN は「全予約一覧」としてこのページを使っており、`csv-export.md` が言及する「管理者向けページ」はここに該当すると判断した）。

### CSV レポート Route Handler（新規、`src/app/api/reports/reservations/csv/route.ts`）

- **責務**: セッション検証（`getSession()`）、バックエンドへの認証済みリクエスト実行（`api-client.ts` の `createApiClient(getAccessToken)` 経由）、レスポンス（CSV バイト列・`Content-Type`・`Content-Disposition` ヘッダ）の透過的な転送。
- **追加理由**: バックエンドは JWT Bearer トークン認証のみで Cookie セッションに対応しないため、ブラウザからバックエンドへの直接リンクは認証を通せない（詳細は `application-design.md` の「設計判断」節）。この Route Handler が「フロントエンドの BFF 層が認証を代行する」という既存アーキテクチャの原則を維持したまま、UI 上は `<a href>` によるシンプルなダウンロード体験を成立させる。

### api-client.ts（既存・拡張）

- **変更内容**: 新規メソッド `getRaw` を追加する。JSON パース・Zod 検証を行わず、生の `Response`（バイナリボディ・ヘッダ）をそのまま返す。CSV のようなバイナリ/非 JSON レスポンスを扱う初めてのケースのため、既存の `get`/`getPaginated`/`getArray` とは別メソッドとして追加する。
