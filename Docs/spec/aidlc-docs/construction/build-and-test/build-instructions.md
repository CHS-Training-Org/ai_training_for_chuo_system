# Build Instructions — Unit: csv-export

本ユニットは既存の BookFlow モノレポ（バックエンド: Spring Boot 4.0/Gradle、フロントエンド: Next.js 15/pnpm）に対する変更のみで、新規のビルドツール・依存関係の追加はない。`docs-next/CLAUDE.md`（プロジェクトルート `/workspace/CLAUDE.md`）の「よく使うコマンド」に準拠する。

## 前提

- **ビルドツール**: Gradle Wrapper（バックエンド）、pnpm（フロントエンド）
- **追加依存関係**: なし（既存の依存関係のみで実装。新規ライブラリの追加なし — Requirements Analysis で確定済み）
- **環境変数**: 新規追加なし（既存の `frontend/.env.local`・`BACKEND_URL` のみ）

## ビルド手順

### バックエンド

```bash
cd backend
./gradlew build
```

- **成功時の出力**: `BUILD SUCCESSFUL`。コンパイル・Spotless フォーマットチェック・Checkstyle・全ユニット/結合テストが一括実行される。
- **成果物**: `backend/build/libs/*.jar`

### フロントエンド

```bash
cd frontend
pnpm build
```

- **成功時の出力**: `✓ Compiled successfully`、型チェック成功、`/api/reports/reservations/csv` ルートが Route（app）一覧に表示される。
- **成果物**: `frontend/.next/`

## 既知の許容される警告

- Checkstyle の `MethodName` 警告（`methodName_condition_expectedBehavior` 形式のテストメソッド名に対するもの）は ADR-018 のテスト命名規約に基づく既存の許容済み警告であり、本ユニットの新規ファイルにも同様に出る（ERROR ではなく WARN のためビルドは失敗しない）。

## トラブルシューティング

- **バックエンドのテストが401で失敗する場合**: `@WithMockAdmin`/`@WithMockMember`/`@WithMockApprover` 使用時、シードデータの `users.cognito_sub` をアノテーションのデフォルト `sub`（`test-admin-sub` 等）と一致させる必要がある（`RegisteredUserInterceptor` が全リクエストで JWT sub と `users` テーブルを照合するため）。本ユニットの Code Generation でも同種の不一致により一時的に全テストが401で失敗し、`ResourceControllerTest` と同じ値に揃えて解消した。
