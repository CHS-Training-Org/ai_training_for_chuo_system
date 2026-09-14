# Integration Test Instructions — Unit: csv-export

## 目的

CSV 帳票出力のコンポーネント間連携（Controller → Service → Repository → DB、および フロントエンド Route Handler → バックエンド）が正しく機能することを確認する。

## 自動化済みの結合テスト

`ReportControllerTest`（`backend/src/test/java/com/example/bookflow/presentation/ReportControllerTest.java`）が、Spring Security のフィルタチェーン・`@PreAuthorize`・JPA・H2 インメモリ DB を含む実際のコンポーネント連携を検証する（`ResourceControllerTest` と同じ結合テストの粒度）。

### シナリオ1: ADMIN → ReportController → ReportService → ReservationRepository → DB

- **セットアップ**: `@BeforeEach` で部署・ユーザー（MEMBER/APPROVER/ADMIN）・リソース・予約2件（承認済み・承認待ち、月をずらして期間フィルタと区別可能に）を H2 に投入
- **テスト手順**: `@WithMockAdmin` で `GET /api/reports/reservations/csv` を呼び出す
- **期待結果**: 200・`Content-Type: text/csv`・`Content-Disposition: attachment`・CSV本文に両予約が日本語ステータスラベル付きで含まれる

### シナリオ2: MEMBER/APPROVER → ReportController（認可拒否）

- **テスト手順**: `@WithMockMember`・`@WithMockApprover` で同エンドポイントを呼び出す
- **期待結果**: 403（`@PreAuthorize("hasRole('ADMIN')")` により Service に到達しない）

### シナリオ3: 期間・ステータス絞り込みの伝播

- **テスト手順**: `from`/`to`・`status` クエリパラメータを付与して呼び出す
- **期待結果**: `ReservationRepository` の該当クエリメソッドが呼ばれ、対象外の予約が CSV に含まれない

実行コマンド: `cd backend && ./gradlew test --tests "*ReportControllerTest"`

## 自動化されていない結合範囲（既知のギャップ）

フロントエンドの Route Handler（`frontend/src/app/api/reports/reservations/csv/route.ts`）→ **実際の** バックエンド（Spring Boot）への HTTP 呼び出しチェーンには自動テストがない。この経路はブラウザでの手動確認を推奨する。

**Round 2（PR #113 観点2対応）で追加した範囲**: `frontend/tests/unit/lib/api-client.test.ts`（`getRaw` の `skipAssertOk` によるエラー透過ロジック）・`frontend/tests/unit/app/api/reports/reservations/csv/route.test.ts`（未認証時401分岐・バックエンドの status/`Content-Type`/`Content-Disposition` の透過転送）が、MSWでバックエンドをスタブした上でこれらのロジックをユニットテストレベルで検証する。`CsvExportControls.test.tsx`（`href` の組み立てのみ）と合わせて、Route Handler単体の分岐・契約は自動テストでカバーされた。**ただし、これらはMSWによるスタブであり、実際のSpring Bootバックエンドとの結合ではない**ため、上記の「自動化されていない結合範囲」の性質は変わらない。

### 手動確認手順（開発者・学習者向け）

1. `docs-next/CLAUDE.md`「よく使うコマンド」に従い、バックエンド（`./gradlew bootRun`）・フロントエンド（`pnpm dev`）を起動する
2. サインイン画面の「開発専用ロール別ログインボタン」から ADMIN ユーザーでログインする（ブラウザサインインはローカルでは動作しないため、`CLAUDE.md`「ローカル環境セットアップ（Gotcha）」の手順に従う）
3. `/reservations` ページで開始・終了日時を入力し、「CSV ダウンロード」ボタンをクリックする
4. CSV ファイルがダウンロードされ、Excel 等で開いて日本語ヘッダ・文字化けなし（UTF-8 BOM）・絞り込み結果が正しいことを確認する
5. MEMBER/APPROVER ユーザーでログインし、`/reservations` ページに CSV ダウンロード UI 自体が表示されないこと（`isAdmin` 分岐）を確認する

この手動確認はマージ前に実施することを推奨する。将来的な自動化は `docs-next/docs/spec/enhancements/beginner/e2e-test-coverage.md`（`csv-export.md` の推奨着手順序に記載）で Playwright E2E として扱う想定であり、本ユニットのスコープには含めない。
