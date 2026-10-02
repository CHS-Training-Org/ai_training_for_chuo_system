# Build Instructions — resource-search

## 前提

- **Build Tool**: Gradle Wrapper（backend）/ pnpm（frontend）
- **依存関係**: 既存の `backend/build.gradle.kts` / `frontend/package.json` から追加・変更なし（本ユニットは既存依存関係のみで実装）
- **環境変数**: 変更なし（`frontend/.env.local` は既存セットアップのまま）

## Backend ビルド

```bash
cd backend
./gradlew build
```

- **期待される結果**: `BUILD SUCCESSFUL`。`build/libs/bookflow-0.0.1-SNAPSHOT.jar` が生成される
- **含まれる処理**: コンパイル、Spotless/Checkstyle 検証、JUnit テスト実行（`./gradlew build` は `test` を含む）

## Frontend ビルド

```bash
cd frontend
pnpm build
```

- **期待される結果**: `✓ Compiled successfully`、型チェック・静的ページ生成まで成功し `/resources` ルートを含む全ルートが一覧に出力される

## トラブルシューティング

- **Checkstyle 警告（`MethodName` パターン不一致）**：`ADR-018` のテスト命名規約（`methodName_condition_expectedBehavior`、アンダースコア区切り）に起因する既知の WARN であり、本ユニットの変更とは無関係。ビルド失敗の原因ではない
