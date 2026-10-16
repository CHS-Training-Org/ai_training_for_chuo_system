# Integration Test Instructions

## Scenario 1: FE から BE への keyword 伝搬（手動確認）
- **Setup**: `docker compose -f .devcontainer/docker-compose.yml up -d`、`cd backend && ./gradlew bootRun`、`cd frontend && pnpm dev`。サインインは開発専用のロール別ログインボタンを使う（ブラウザの OAuth サインインはローカルでは動かない）
- **Steps**
  1. `/resources` でキーワード欄に「会議」を入れて「絞り込む」。URL に `keyword=会議` が付き、名称か説明に含むカードだけが出る
  2. 空にして「絞り込む」。条件が解除され全件に戻る
  3. カテゴリと空き確認（開始・終了日時）を同時に指定する。AND 条件で絞り込まれる
  4. 存在しない語を入れる。「キーワード『○○』に一致するリソースがありません。」が出る
  5. 2 ページ目に遷移し、`keyword` が URL に引き継がれる
  6. `%` だけを入れる。全件ヒットせず、0 件か `%` を含むものだけになる
  7. ADMIN でログインし、inactive のリソースがキーワードで検索できる。MEMBER では出ない
- **Expected**: 上記のとおり。シートの受入条件 6 項目に対応する

## Scenario 2: PostgreSQL での LIKE ... ESCAPE
- 自動テストは H2 のみ。`lower(description) LIKE ... ESCAPE '\'` の動作は、`bootRun`（PostgreSQL）で Scenario 1 の 6 と、説明文を持つリソースの検索を行って確認する

## 対象外
- Playwright の E2E（`e2e-test-coverage` 課題の範囲）、性能テスト、セキュリティテスト（拡張ルールは No）
