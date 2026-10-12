# Requirements — ユニット: usage-report（利用実績の集計・グラフ表示）

## Intent Analysis Summary

- **User Request**: 管理者（ADMIN）がリソース別の利用実績（承認済み予約の件数と合計利用時間）を、期間を指定して集計し、棒グラフで確認できるようにする（GitHub Issue #28、ビジネス要求シート `docs-next/docs/spec/enhancements/intermediate/usage-statistics.md`）
- **Request Type**: New Feature（集計 API・統計ページ・グラフの新設）
- **Scope Estimate**: Multiple Components（frontend + backend 両方）
- **Complexity Estimate**: Moderate（H2 と PostgreSQL の両対応の集計、期間での切り詰め計算、新画面。DB・マイグレーションの変更はない）
- **Requirements Depth**: Standard

## 機能要件

要件 ID は `USG-`、ユースケースは UC-10 を採番する。ビジネス要求シートの `DASH-01`〜`05` は requirements.md の既存 `DASH-01`/`02`（ダッシュボードの件数表示）と、シートの「UC-08」は既存 UC-08（リソース登録・編集）と衝突するため使わない。

| # | 要件 | シートの要件 |
|---|------|--------------|
| USG-01 | `GET /api/statistics/resources` を新設し、リソースごとの承認済み（`APPROVED`）予約の件数と合計利用時間（分、整数）を返す | DASH-01 |
| USG-02 | 集計期間をクエリパラメータ `from`・`to` で指定できる（下記「決定事項」参照） | DASH-02 |
| USG-03 | ADMIN ロールのみアクセスできる（MEMBER / APPROVER は 403） | DASH-03 |
| USG-04 | 管理者向けの統計ページ `/admin/reports` に、リソース別の棒グラフ（件数と合計利用時間）を表示する。期間を変更するとグラフが再取得・再描画される | DASH-04 |
| USG-05 | グラフと併記の表に、リソース名・予約件数・合計利用時間（時間）を表示する | DASH-05 |
| USG-06 | 利用実績が 0 件のリソースも表示する（件数 0・合計 0 分） | （ユーザー指定） |

## 決定事項（Requirements Analysis で確定）

| # | 論点 | 決定 |
|---|------|------|
| 1 | 集計対象の予約 | `APPROVED` のみ。過去・未来は問わない（まだ始まっていない承認済み予約も含める） |
| 2 | 集計単位と内容 | リソース別。件数と合計利用時間。利用率（稼働可能時間を分母にした割合）は今回のスコープ外 |
| 3 | 対象予約の選び方 | 既存の予約一覧・CSV 帳票出力と同じ期間重複判定（`r.startAt < :to AND r.endAt > :from`、境界一致の隣接は含まない） |
| 4 | `from`/`to` の指定 | 両方指定、または両方未指定。片方だけは 400 `VALIDATION_ERROR`（文言「from と to は同時に指定してください。」）。両方未指定は全期間。両方指定のときは `from` が `to` より前であること（`from >= to` は 400 `VALIDATION_ERROR`、文言「from は to より前にしてください。」）。`from >= to` だと重複判定に引っかかる予約の切り詰め時間が負になるため。既存の予約一覧・CSV にはない、統計 API だけの検証 |
| 5 | 件数 | 期間と重複する `APPROVED` の予約の数。期間の境界をまたぐ予約も 1 件として数える |
| 6 | 合計利用時間 | 期間を指定したときは、各予約の `[startAt, endAt)` を `[from, to)` で**切り詰めた時間**を分単位で合算する（`max(startAt, from)` から `min(endAt, to)` まで）。期間未指定のときは各予約の `startAt` から `endAt` までの全時間。API は分の整数（`totalMinutes`）で返し、画面が時間（小数第 1 位）に整形する |
| 7 | 0 件のリソース | 有効（`is_active = true`）なリソースは実績が 0 件でも常に表示する。無効化済みのリソースは、期間内に実績が 1 件以上あるときだけ表示する |
| 8 | 画面の配置 | `/admin/reports` を新設し、サイドナビの管理者メニューに追加する（`admin/layout.tsx` の ADMIN ガードを継承）。ダッシュボード `/` は変更しない |
| 9 | グラフの描画 | 依存ライブラリは導入しない。既存の `--chart-N` トークンと Tailwind で、自前の棒グラフ（HTML / CSS または SVG）を描く |
| 10 | 集計の実装方式 | 取得は JPQL（H2 と PostgreSQL の方言差を避けるためネイティブ SQL と DB の日時差関数は使わない）、切り詰めと合算は Java 側（`Duration`）で行う |

## 既定の前提（レビューで変更可）

質問せず、次の既定値を置く。承認時に違和感があれば Request Changes で指定する。

- **並び順**：合計利用時間の降順、同値は件数の降順、さらに同値はリソース名の昇順（グラフの読みやすさのため）
- **レスポンスの項目**：`resourceId`・`resourceName`・`reservationCount`・`totalMinutes` の 4 つ。ページネーションなしの配列
- **グラフの構成**：「予約件数」と「合計利用時間（時間）」の 2 つの横棒グラフを並べ、その下に同じ値の表を置く。棒の長さは各グラフ内の最大値を 100% とする相対値。色は `--chart-1`・`--chart-2`
- **期間入力**：`/reservations` の絞り込みと同じ `datetime-local` の `from`・`to`（URL の searchParams で保持し、「集計する」で更新、「リセット」で全期間に戻す）。ページを開いた直後は期間未指定（全期間）
- **時間の表示**：分を 60 で割り、小数第 1 位に丸める（例 150 分は 2.5 時間）。丸めるのは表示だけで、API は分の整数を返す
- **タイムゾーン**：変換せず `LocalDateTime` をそのまま使う（既存の API と同じ）

## 非機能要件

- **セキュリティ（機能要件として扱う）**：Security Baseline 拡張は適用しない。ADMIN 限定（USG-03）は Controller メソッドの `@PreAuthorize("hasRole('ADMIN')")`（既存の `ReportController`・`UserController` と同じ方式）。未認証は 401、MEMBER / APPROVER は 403（`{code:"FORBIDDEN"}`）。フロントのページは `admin/layout.tsx` が非 ADMIN に 403 画面を出し、API の 403・401 はそのまま扱う
- **N+1 回避**：予約取得は `JOIN FETCH` でリソースを同時に取得する（`open-in-view: false` と LAZY のため必須）。取得から集計までを `@Transactional(readOnly = true)` 内で行う
- **性能**：件数上限・ページネーションなし（条件に合う `APPROVED` 予約を全件取得して Java で集計する）。データが大量になるとメモリ使用量が増える点は受け入れる。`start_at`/`end_at` にインデックスは無く、本課題では追加しない
- **互換性**：テストは H2（PostgreSQL 互換モード）、本番は PostgreSQL。集計ロジックを DB に依存させない（決定事項 10）
- **OpenAPI**：`GET /api/statistics/resources` が Springdoc の OpenAPI ドキュメントに反映される（Controller の追加で自動反映。受入条件のため、反映されることをテストまたは手動で確認する）
- **コード品質**：Checkstyle（`ParameterNumber` 最大 7 など）・Spotless（googleJavaFormat）に適合させる。条件は record にまとめる。テストの UUID プレフィックスは `73` を使う
- **テスト容易性**：切り詰め・合算は純粋関数に切り出してユニットテストする。フロントはグラフの値を表にも出すため、表で値を検証できる。Property-Based Testing は適用しない
- **画面**：グラフは数値の表を併記し、色だけに頼らずラベルと数値でも読めるようにする（アクセシビリティ）

## 受入条件（シートと決定事項より）

- [ ] ADMIN で `/admin/reports` を開くと、リソース別の予約件数と合計利用時間の棒グラフと表が表示される
- [ ] 期間（`from`・`to`）を変更して集計すると、グラフと表が再取得・再描画される
- [ ] 集計対象は `APPROVED` のみで、他のステータスは件数にも時間にも含まれない
- [ ] 期間を指定したとき、境界をまたぐ予約は件数に 1 件として数えられ、合計利用時間は期間で切り詰めた時間になる
- [ ] `from` と `to` の片方だけを指定すると 400 になる。両方未指定のときは全期間が対象になる。`from` が `to` 以降（`from >= to`）でも 400 になる
- [ ] 利用実績が 0 件の有効なリソースも、件数 0・合計 0 で表示される。無効化済みのリソースは期間内に実績があるときだけ表示される
- [ ] MEMBER / APPROVER が API にアクセスすると 403、未認証は 401。サイドナビの「利用実績」は ADMIN にだけ表示される
- [ ] `GET /api/statistics/resources` が OpenAPI ドキュメント（Springdoc）に反映される
- [ ] バックエンドに集計ロジック（切り詰め・合算・0 件のリソース・ステータス絞り込み）のユニットテストがある

## 影響範囲（RE 成果物に基づく変更予定ファイル）

仕様（Spec-first で先に更新）
- `docs-next/docs/spec/api-spec.md`：§統計（新セクション）と `GET /api/statistics/resources`
- `docs-next/docs/spec/screen-spec.md`：`/admin/reports` と、サイドナビの管理者メニュー
- `docs-next/docs/spec/requirements.md`：UC-10 と `USG-01`〜`06`、API 権限マトリクス、画面アクセス権限表

バックエンド（`backend/src/main/java/com/example/bookflow/`）
- `presentation/StatisticsController.java`（新規）、`application/StatisticsService.java`（新規）
- `presentation/dto/`：集計条件の record とレスポンス DTO（新規）
- `domain/ReservationRepository.java`・`domain/ResourceRepository.java`：集計用の取得クエリの追加
- テスト（新規）：`StatisticsServiceTest`、`StatisticsControllerTest`

フロントエンド（`frontend/src/`）
- `app/(authenticated)/admin/reports/page.tsx`（新規）、期間フィルタ（Client）、棒グラフのコンポーネント（新規）
- `server/actions/statistics.ts`（新規）、`lib/types/api.ts`（スキーマ追加）、`components/layout/nav-items.ts`（ナビ追加）
- テスト（新規・変更）：Server Action・ページ・棒グラフ・期間フィルタ、`nav-items.test.ts`、`tests/unit/msw/handlers.ts`

## スコープ外

- 利用率（稼働可能時間を分母にした割合）、日別・月別などの時系列（期間別）集計、カテゴリ別の集計、統計の CSV・PDF 出力、ダッシュボードへのグラフ追加、グラフライブラリの導入、`start_at`/`end_at` へのインデックス追加
