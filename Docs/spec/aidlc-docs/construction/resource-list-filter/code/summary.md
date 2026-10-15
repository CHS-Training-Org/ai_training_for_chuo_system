# Code Generation Summary: resource-list-filter

## 変更したファイル（Modified）

**仕様**
- `docs-next/docs/spec/api-spec.md`：§`GET /api/resources` に `keyword` を追加
- `docs-next/docs/spec/screen-spec.md`：§`/resources` にキーワード入力欄を追加

**backend**
- `backend/src/main/java/com/example/bookflow/domain/ResourceRepository.java`：`searchByKeyword`（ページあり・なし）の JPQL を 2 本追加。既存の派生クエリは変更なし
- `backend/src/main/java/com/example/bookflow/application/ResourceService.java`：`list(category, keyword, from, to, isAdmin, pageable)` を追加。旧シグネチャは委譲のオーバーロードとして残した
- `backend/src/main/java/com/example/bookflow/presentation/ResourceController.java`：`keyword` パラメータを追加
- `backend/src/test/java/com/example/bookflow/application/ResourceServiceTest.java`：`ListWithKeyword`（8 件）を追加
- `backend/src/test/java/com/example/bookflow/presentation/ResourceControllerTest.java`：キーワード検索の統合テスト（10 件）を追加

**frontend**
- `frontend/src/server/actions/resources.ts`：`keyword` を API クエリに渡す
- `frontend/src/app/(authenticated)/resources/page.tsx`：`keyword` を URL から読み、API とフォームへ渡す
- `frontend/src/app/(authenticated)/resources/ResourceFilterForm.tsx`：キーワード入力欄を追加（`data-testid="resource-filter-keyword-input"`）。送信時に前後空白を除去し、空なら `keyword` を付けない
- `frontend/tests/unit/server/actions/resources.test.ts`：`keyword` のテストを 3 件追加

## 作成したファイル（Created）

- 本書を含む `Docs/spec/aidlc-docs/` 配下の AI-DLC 成果物のみ。アプリケーションコードの新規ファイルはない

## 要件との対応

| 要件 | 実装 |
|---|---|
| FR-01、FR-02、FR-08、FR-09 | `ResourceRepository.searchByKeyword`（`LOWER` + `LIKE`、`name` OR `description`） |
| FR-03、FR-04 | `ResourceService.normalizeKeyword`（`strip`、空なら条件なし。分割しない） |
| FR-05 | `ResourceService` の 2 経路（ページ経路と空き確認経路）の両方で候補取得を差し替え |
| FR-06 | `ResourceFilterForm` |
| FR-07 | `page.tsx`、`PaginationNav`（既存の `query` 引き継ぎ） |

## 実装上の注意

- キーワードが空・未指定のときは既存コードをそのまま通る（旧シグネチャと派生クエリは変更していない）
- JPQL には null を渡さない（カテゴリ未指定は全カテゴリの `IN`、有効無効は boolean）
- `%` と `_` はエスケープしない（要件 Q2 の決定。`api-spec.md` に明記済み）
- `ResourceService.list` の旧シグネチャは既存テストが呼ぶために残した。将来テストを直せば削除できる
