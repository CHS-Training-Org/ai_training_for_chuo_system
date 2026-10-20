# Integration Test Instructions — csv-export

## Purpose

`ReportControllerTest`（MockMvc + H2）は結合テストとして自動実行されるが、H2 と PostgreSQL は方言と型推論が異なる。前ユニット（#76）では、H2 で全 pass していたクエリが PostgreSQL で 500 になった。本ユニットも任意パラメータ（`from` / `to`）を持つクエリを追加したため、**実 PostgreSQL・実 BE・実 FE を通した手動確認**を行った（V-01）。

## Setup Integration Test Environment

```bash
docker compose -f .devcontainer/docker-compose.yml up -d
# BE（実 PostgreSQL に接続）
cd backend && DB_URL=jdbc:postgresql://postgres:5432/bookflow DB_USERNAME=bookflow DB_PASSWORD=bookflow \
  COGNITO_JWKS_URI=http://cognito-local:9229/local_user_pool_id/.well-known/jwks.json ./gradlew bootRun
# FE（別ターミナル）
cd frontend && pnpm dev
# JWT（ロール別）
bash scripts/provision-cognito.sh --jwt taro.kanri@example.com      # ADMIN
bash scripts/provision-cognito.sh --jwt hanako.tanaka@example.com   # MEMBER
bash scripts/provision-cognito.sh --jwt ichiro.suzuki@example.com   # APPROVER
```

FE の Route Handler は、開発専用ログインの cookie `dev-id-token=<JWT>` を付けて `curl` で確認できる（ブラウザのサインインはローカルでは動作しないため。`CLAUDE.md` 参照）。

## Test Scenarios

### Scenario 1（V-01）: 条件の全組み合わせを実 PostgreSQL で実行する

- **Test Steps**: `curl -H "Authorization: Bearer $ADMIN" -G http://localhost:8080/api/reports/reservations/csv` に、`from` / `to` / `status` の未指定・単独・組み合わせを付けて実行する
- **Expected Results**: すべて `200`。null バインド変数の型推論エラー（`function lower(bytea)` 型のエラー）が出ない

| ケース | 結果（実測） |
|---|---|
| 条件なし | 200 |
| `from` のみ / `to` のみ / `from`+`to` | 200 / 200 / 200 |
| `status` 単一 / 複数 | 200 / 200 |
| `status`+`from` / `status`+`to` / 全指定 | 200 / 200 / 200 |
| 該当なし（2080 年） | 200、ヘッダ行のみ |
| MEMBER / APPROVER | 403 / 403 |
| 未認証 | 401 |
| `from` >= `to` / 不正な日時 / 不正な `status` | 400 / 400 / 400（`VALIDATION_ERROR`） |

→ **`CAST(:from AS LocalDateTime)` 方式は H2・PostgreSQL の両方で通る。番兵値方式への切り替えは不要。**

### Scenario 2: FE（Route Handler とページ）→ BE → 実 PostgreSQL

| ケース | 結果（実測） |
|---|---|
| ADMIN で `/api/reports/reservations/csv?status=...&from=2026-06-01T00:00&to=...`（16 桁） | 200。BOM あり、`Content-Disposition`・`Content-Type` を中継、`Cache-Control: no-store`・`X-Content-Type-Options: nosniff` を付与、秒の補完が効いて BE が受理 |
| MEMBER | 303 → `/admin/reports?error=FORBIDDEN` |
| ADMIN で `from` >= `to` | 303 → `?error=VALIDATION_ERROR` |
| Cookie なし | 303 → `?error=UNAUTHORIZED` |
| `/admin/reports`（ADMIN） | 200。フォーム・入力欄・5 ステータスのチェックボックス・ボタンが描画される |
| `/admin/reports?error=FORBIDDEN` | 定型の日本語警告を表示 |
| `/admin/reports?error=<script>alert(1)</script>` | 汎用メッセージを表示。`<script>` は描画されない（Next.js の内部ペイロードに `<` でエスケープされて現れるのみで、実行されない） |
| `/admin/reports`（MEMBER） | 403 画面（`admin/layout.tsx`） |

## 発見した問題と修正

**症状**: 実機確認で、303 リダイレクトの `Location` が `http://0.0.0.0:3000/admin/reports?error=...` になっていた。単体テスト（絶対 URL を `new URL()` で読むだけ）は pass していた。

**原因**: `Response.redirect(new URL(path, request.url))` が `request.url` の origin（開発サーバーの待ち受けアドレス `0.0.0.0`）をそのまま使っていた。ブラウザでは `0.0.0.0` に遷移できない環境があり、本番でもリバースプロキシ配下では内部ホストが露出する。

**修正**: `Location` を相対パス（`/admin/reports?error=<code>`）にした（RFC 9110 で許可。ブラウザが現在のオリジンで解決する）。単体テストに「Location が `/admin/reports?` で始まる相対パスであること」の検証を追加し、実機で再確認した。

## Cleanup

```bash
# bootRun / pnpm dev を終了する
# テスト用に投入した予約データは削除済み（seed の 2 件のみが残る状態に戻した）
```
