# Operations — CI 品質ゲート事前確認（resource-list-filter）

> BookFlow では OPERATIONS フェーズ（エンジン定義上はプレースホルダー）を CI 品質ゲート（`CI Frontend` / `CI Backend`）として運用する（`docs-next/docs/develop/aidlc-guide.md#phases` 参照）。デプロイ自動化・監視は対象外。本ファイルは、実際の CI ワークフローが実行するコマンドをローカルで事前に再現し、PR 作成前に合否を確認した記録。

## CI ワークフローとの対応

### `.github/workflows/ci-backend.yml`

| CIステップ | ローカル実行結果 |
|---|---|
| `./gradlew test` | ✅ Pass（Build and Test ステージで実行・再実行済み） |
| `./gradlew spotlessCheck` | ✅ Pass |
| `./gradlew checkstyleMain` | ✅ Pass（既存の無関係な警告2件のみ、エラーなし） |

### `.github/workflows/ci-frontend.yml`

| CIステップ | ローカル実行結果 |
|---|---|
| `pnpm install --frozen-lockfile` | ✅（devcontainer で既に解決済み） |
| `pnpm lint` | ✅ Pass |
| `pnpm format:check` | ✅ Pass（全79ファイル適合） |
| `pnpm build` | ✅ Pass（Build and Test ステージでは未実行だったため、Operations ステージで追加実行。`next build` 成功、`/resources` を含む全11ルートの静的ページ生成・型チェックも完走） |
| `pnpm test` | ✅ Pass（81/81） |

## 判定

ローカルで CI ワークフローの全ステップを再現し、すべて成功した。GitHub Actions 上での `CI Backend`/`CI Frontend` も green になる見込みが高い（最終的な合否は実際の CI 実行で確定する）。

## 次のアクション（本エンジンの範囲外）

- `/commit-push` で差分をコミット・push
- `/create-pr` で PR を作成（CI が自動実行される）
- セルフレビュー項目を満たしたらマージ（`docs-next/docs/develop/dev-workflow.md` 参照）
